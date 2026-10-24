/**
 * Hazel Badge OS — Phase 1: animated digital business card.
 * Screen 428x142 (NV3007, landscape). Renderer: Commodetto Poco + JetBrains Mono TTF.
 *
 * Rendering rules:
 * - a screen change repaints the whole panel once;
 * - animations repaint only their own band (typing line, cursor, reveal rows);
 * - nothing in the per-frame path builds new strings or arrays.
 */
import Poco from "commodetto/Poco";
import Resource from "Resource";
import Timer from "timer";
import Time from "time";
import qrCode from "qrcode";
import "pocoqrcode";

import { InputFsm, eventButton, eventKind } from "core/inputFsm";
import { Typewriter, newSample } from "core/typewriter";
import { ABOUT, CARD, GITHUB, IDENTITY, INTRO_LINES, LINKS, WHOAMI_LINES } from "core/content";
import {
  MENU,
  Nav,
  SCR_ABOUT,
  SCR_CARD,
  SCR_GITHUB,
  SCR_INTRO,
  SCR_LINKS,
  SCR_MENU,
  SCR_PANEL_TEST,
  SCR_QR,
  SCR_WHOAMI,
} from "core/nav";
import { Buttons } from "platform/buttons";

// ---------------------------------------------------------------- setup

declare const screen: any;
const poco: any = new Poco(screen, { displayListLength: 4096 });
const W: number = poco.width;
const H: number = poco.height;

// Design color is #0D0D0D, but this NV3007 panel renders the lowest non-zero
// gray levels as bright mint (verified on hardware 2026-10-24, see docs/hardware.md).
// Pure black is the closest visual match.
const BG = poco.makeColor(0, 0, 0);
const ACCENT = poco.makeColor(0xf5, 0xe0, 0x00);
const WHITE = poco.makeColor(0xff, 0xff, 0xff);
const GRAY = poco.makeColor(0x9a, 0x9a, 0x9a);
const DIM = poco.makeColor(0x4a, 0x4a, 0x4a);
const BLACK = poco.makeColor(0, 0, 0);
const QR_WHITE = poco.makeColor(0xff, 0xff, 0xff);

/** A TrueType face at a fixed pixel size (cfeFT reads `size` from the resource). */
function face(file: string, size: number): any {
  const f: any = new Resource(file);
  f.size = size;
  return f;
}
const REG = "JetBrainsMonoNL-Regular.ttf";
const BOLD = "JetBrainsMonoNL-Bold.ttf";
const F11 = face(REG, 11);
const F13 = face(REG, 13);
const F15 = face(REG, 15);
const F18 = face(REG, 18);
const F15B = face(BOLD, 15);
const F20B = face(BOLD, 20);
const F30B = face(BOLD, 30);

const MX = 14; // left margin

// ---------------------------------------------------------------- state

const buttons = new Buttons();
const input = new InputFsm();
const nav = new Nav(LINKS.length);
const intro = new Typewriter(INTRO_LINES);
const whoami = new Typewriter(WHOAMI_LINES);
const ghTyping = new Typewriter(GITHUB.typing);
const sample = newSample();

let paintedVersion = -1;
let qrBits: any = null;
let qrForLink = -1;

// precomputed static strings (built once, reused every frame)
const MENU_FOCUSED = MENU.map((m) => "> " + m.label);
const MENU_IDLE = MENU.map((m) => "  " + m.label);
const MENU_HINT: readonly string[] = ["quién soy", GITHUB.handle, "web · github · linkedin", ABOUT.title];
const LINK_FOCUSED = LINKS.map((l) => "> " + l.label);
const LINK_IDLE = LINKS.map((l) => "  " + l.label);
const SPEC_LINE_1 = CARD.specialties.slice(0, 2).join(" · ");
const SPEC_LINE_2 = CARD.specialties.slice(2).join(" · ");

// ---------------------------------------------------------------- drawing helpers

function clear(): void {
  poco.fillRectangle(BG, 0, 0, W, H);
}

function footer(text: string): void {
  poco.drawText(text, F11, DIM, MX, H - 16);
}

/** Terminal line with a block cursor. Repaints only its own band. */
function typingBand(y: number, font: any, color: number, text: string, cursorOn: boolean): void {
  const h: number = font.size + 8;
  poco.begin(0, y, W, h);
  poco.fillRectangle(BG, 0, y, W, h);
  poco.drawText(text, font, color, MX, y);
  if (cursorOn) {
    const cx = MX + poco.getTextWidth(text, font) + 2;
    poco.fillRectangle(color, cx, y + 3, Math.round(font.size * 0.55), h - 5);
  }
  poco.end();
}

// ---------------------------------------------------------------- screens

const INTRO_Y = 56;

function paintIntroFrame(): void {
  poco.begin();
  clear();
  poco.drawText("hsaenzG@jsconf:~$", F11, DIM, MX, 8);
  poco.drawText("JSConf MX 2026", F11, DIM, W - MX - poco.getTextWidth("JSConf MX 2026", F11), H - 16);
  poco.end();
}

const WHO_PROMPT_Y = 8;
const WHO_NAME_Y = 32;
const WHO_ROLE_Y = 76;
const WHO_TAGS_Y = 102;
const REVEAL_STEP_MS = 280;

function paintWhoamiStatic(revealed: number): void {
  // revealed: 0 = prompt only, 1 = +name, 2 = +role, 3 = +tags
  poco.begin(0, WHO_NAME_Y, W, H - WHO_NAME_Y);
  poco.fillRectangle(BG, 0, WHO_NAME_Y, W, H - WHO_NAME_Y);
  if (revealed >= 1) poco.drawText(IDENTITY.name, F30B, WHITE, MX, WHO_NAME_Y);
  if (revealed >= 2) poco.drawText(IDENTITY.role, F15, GRAY, MX, WHO_ROLE_Y);
  if (revealed >= 3) {
    poco.drawText(IDENTITY.tags, F15B, ACCENT, MX, WHO_TAGS_Y);
    poco.drawText("SELECT →", F11, DIM, W - MX - poco.getTextWidth("SELECT →", F11), H - 16);
  }
  poco.end();
}

function paintMenu(): void {
  poco.begin();
  clear();
  poco.drawText(">_ menu", F13, ACCENT, MX, 6);
  const rowH = 24;
  for (let i = 0; i < MENU.length; i++) {
    const y = 28 + i * rowH;
    if (i === nav.menuIndex) {
      // Focus = accent text + accent bar on black. Dark text on a bright fill
      // is avoided: its anti-aliased edges hit the panel's bright low levels.
      poco.fillRectangle(ACCENT, MX - 8, y + 3, 3, rowH - 8);
      poco.drawText(MENU_FOCUSED[i]!, F18, ACCENT, MX, y);
    } else {
      poco.drawText(MENU_IDLE[i]!, F18, GRAY, MX, y);
    }
  }
  poco.fillRectangle(DIM, 200, 30, 1, 88);
  poco.drawText(MENU_HINT[nav.menuIndex]!, F13, WHITE, 214, 62);
  footer("▲▼ mover   SELECT abrir   BACK intro");
  poco.end();
}

function paintCard(): void {
  poco.begin();
  clear();
  poco.drawText(CARD.name, F30B, WHITE, MX, 6);
  poco.drawText(CARD.role, F15B, ACCENT, MX, 46);
  poco.drawText("> " + SPEC_LINE_1, F15, GRAY, MX, 74);
  poco.drawText("> " + SPEC_LINE_2, F15, GRAY, MX, 96);
  footer("BACK ← menú");
  poco.end();
}

const GH_TYPING_Y = 50;

function paintGithubStatic(): void {
  poco.begin();
  clear();
  poco.fillRectangle(ACCENT, MX, 12, 8, 8);
  poco.drawText(GITHUB.url, F15, WHITE, MX + 16, 6);
  poco.drawText(GITHUB.handle, F15B, ACCENT, W - MX - poco.getTextWidth(GITHUB.handle, F15B), 6);
  poco.fillRectangle(DIM, MX, 32, W - 2 * MX, 1);
  poco.fillRectangle(DIM, MX, 86, W - 2 * MX, 1);
  poco.drawText(GITHUB.stack, F13, GRAY, MX, 96);
  footer("BACK ← menú");
  poco.end();
}

function paintLinks(): void {
  poco.begin();
  clear();
  poco.drawText(">_ links", F13, ACCENT, MX, 6);
  for (let i = 0; i < LINKS.length; i++) {
    const y = 32 + i * 26;
    const focused = i === nav.linkIndex;
    poco.drawText(focused ? LINK_FOCUSED[i]! : LINK_IDLE[i]!, F15, focused ? ACCENT : GRAY, MX, y);
    poco.drawText(LINKS[i]!.display, focused ? F15B : F15, focused ? WHITE : GRAY, 130, y);
  }
  footer("▲▼ elegir   SELECT → QR   BACK ← menú");
  poco.end();
}

function paintQr(): void {
  const link = LINKS[nav.linkIndex]!;
  if (qrForLink !== nav.linkIndex) {
    qrBits = qrCode({ input: link.url, maxVersion: 5 });
    qrForLink = nav.linkIndex;
  }
  const n: number = qrBits.size;
  const quiet = 2;
  const scale = Math.max(1, Math.floor((H - 8) / (n + 2 * quiet)));
  const side = (n + 2 * quiet) * scale;
  const x0 = 10;
  const y0 = (H - side) >> 1;
  poco.begin();
  clear();
  poco.fillRectangle(QR_WHITE, x0, y0, side, side);
  poco.drawQRCode(qrBits, x0 + quiet * scale, y0 + quiet * scale, scale, BLACK);
  const tx = x0 + side + 18;
  poco.drawText(">_ " + link.label, F13, ACCENT, tx, 20);
  poco.drawText(link.display, F15B, WHITE, tx, 50);
  poco.drawText("escanéame", F13, GRAY, tx, 80);
  footer("");
  poco.drawText("BACK ← links", F11, DIM, tx, H - 16);
  poco.end();
}

function paintAbout(): void {
  poco.begin();
  clear();
  poco.drawText(ABOUT.title, F20B, ACCENT, MX, 10);
  for (let i = 0; i < ABOUT.lines.length; i++) poco.drawText(ABOUT.lines[i]!, F15, GRAY, MX, 46 + i * 24);
  footer("SELECT → panel test   BACK ← menú");
  poco.end();
}

/** Gray levels (8-bit) for the panel diagnostic, dense at the dark end. */
const RAMP: readonly number[] = [0, 2, 4, 6, 8, 10, 13, 16, 20, 24, 32, 48, 64, 96, 128, 255];
const RAMP_COLORS = RAMP.map((v) => poco.makeColor(v, v, v));
const RAMP_LABELS = RAMP.map((v) => String(v));

function paintPanelTest(): void {
  poco.begin();
  clear();
  const n = RAMP.length;
  const bw = Math.floor((W - 2 * 4) / n);
  for (let i = 0; i < n; i++) {
    const x = 4 + i * bw;
    poco.fillRectangle(RAMP_COLORS[i]!, x, 4, bw - 2, 70);
    poco.drawText(RAMP_LABELS[i]!, F11, ACCENT, x + 2, 78);
  }
  // pure primaries for color order / saturation
  const cw = Math.floor((W - 8) / 3);
  poco.fillRectangle(poco.makeColor(255, 0, 0), 4, 96, cw - 2, 26);
  poco.fillRectangle(poco.makeColor(0, 255, 0), 4 + cw, 96, cw - 2, 26);
  poco.fillRectangle(poco.makeColor(0, 0, 255), 4 + 2 * cw, 96, cw - 2, 26);
  poco.drawText("BACK ← about   (fondo = 0)", F11, DIM, MX, H - 16);
  poco.end();
}

// ---------------------------------------------------------------- loop

let lastAnimKey = -1; // avoids repainting a band when nothing visible changed

function frame(): void {
  const now = Time.ticks;

  for (let e = input.next(); e >= 0; e = input.next()) nav.handle(eventButton(e), eventKind(e), now);

  const t = now - nav.enteredAt;
  const screenChanged = paintedVersion !== nav.version;

  switch (nav.screen) {
    case SCR_INTRO: {
      if (screenChanged) paintIntroFrame();
      intro.sample(t, sample);
      const key = sample.line * 10000 + sample.count * 2 + (sample.cursorOn ? 1 : 0);
      if (screenChanged || key !== lastAnimKey) {
        typingBand(INTRO_Y, F18, ACCENT, sample.text, sample.cursorOn);
        lastAnimKey = key;
      }
      if (t >= intro.totalMs) nav.introDone(now);
      break;
    }
    case SCR_WHOAMI: {
      if (screenChanged) {
        poco.begin();
        clear();
        poco.end();
      }
      whoami.sample(t, sample);
      const after = t - whoami.totalMs;
      const revealed = after < 0 ? 0 : Math.min(3, 1 + Math.floor(after / REVEAL_STEP_MS));
      const key = sample.count * 2 + (sample.cursorOn ? 1 : 0) + revealed * 1000;
      if (screenChanged || key !== lastAnimKey) {
        typingBand(WHO_PROMPT_Y, F15, GRAY, sample.text, sample.cursorOn);
        if (screenChanged || Math.floor(lastAnimKey / 1000) !== revealed) paintWhoamiStatic(revealed);
        lastAnimKey = key;
      }
      break;
    }
    case SCR_MENU:
      if (screenChanged) paintMenu();
      break;
    case SCR_CARD:
      if (screenChanged) paintCard();
      break;
    case SCR_GITHUB: {
      if (screenChanged) paintGithubStatic();
      ghTyping.sample(t % ghTyping.totalMs, sample); // loops forever, like the README SVG
      const key = sample.line * 10000 + sample.count * 2 + (sample.cursorOn ? 1 : 0);
      if (screenChanged || key !== lastAnimKey) {
        typingBand(GH_TYPING_Y, F18, ACCENT, sample.text, sample.cursorOn);
        lastAnimKey = key;
      }
      break;
    }
    case SCR_LINKS:
      if (screenChanged) paintLinks();
      break;
    case SCR_QR:
      if (screenChanged) paintQr();
      break;
    case SCR_ABOUT:
      if (screenChanged) paintAbout();
      break;
    case SCR_PANEL_TEST:
      if (screenChanged) paintPanelTest();
      break;
  }
  if (screenChanged) paintedVersion = nav.version;
}

// buttons polled every 5 ms; UI frames at ~30 fps
Timer.repeat(() => input.update(buttons.read(), Time.ticks), 5);
Timer.repeat(frame, 33);
trace(`hazel-badge-os: ${W}x${H} ready\n`);
