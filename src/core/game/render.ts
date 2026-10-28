/**
 * Draws a Game through the Gfx interface. Shared by the simulator and the badge.
 * Per-frame paths avoid building strings or arrays; labels are precomputed.
 */
import { FONT_SIZE, type Gfx } from "../gfx";
import { Typewriter, newSample, type TypeLine } from "../typewriter";
import {
  FROG_CROUCH_H,
  FROG_H,
  FROG_SCREEN_X,
  Game,
  INTRO_LINES,
  OPTION_HINT,
  PAUSE_ITEMS,
  ST_CHALLENGE,
  ST_FEEDBACK,
  ST_INTRO,
  ST_PAUSE,
  ST_RETRY,
  ST_RUN,
  ST_TITLE,
  ST_VICTORY,
} from "./game";
import { GROUND_Y, OB_SKULL } from "./level";
import {
  C_BONE,
  C_CYAN,
  C_GLOW,
  C_GRAY,
  C_GREEN,
  C_MAGENTA,
  C_MARIGOLD,
  C_NIGHT,
  C_ORANGE,
  C_PATH,
  C_PURPLE,
  C_TEMPLE,
} from "./palette";
import { CONCEPT_LABEL, FLOWER_ORDER } from "./questions";
import {
  SPR_CALAVERITA,
  SPR_CANDLE,
  SPR_FLOR,
  SPR_FROG_CROUCH,
  SPR_FROG_IDLE,
  SPR_FROG_JUMP,
  SPR_FROG_RUN,
  SPR_GUARDIAN,
  SPR_HEART,
  SPR_PETALO,
} from "./sprites";

// ------------------------------------------------------------ precomputed labels

const HEADERS = FLOWER_ORDER.map((c, i) => `Flor ${i + 1}/4 · ${CONCEPT_LABEL[c]}`);
const RETRY_FROM = [0, 1, 2, 3, 4].map((n) => (n === 0 ? "SELECT reintentar desde el inicio" : `SELECT reintentar desde la flor ${n}`));
const PETAL_LABELS: string[] = [];
for (let i = 0; i <= 200; i++) PETAL_LABELS.push(String(i));
const STARS: ReadonlyArray<readonly [number, number]> = [
  [20, 40], [70, 58], [118, 36], [160, 66], [205, 44], [250, 60], [292, 38], [338, 54], [384, 42], [410, 64],
  [44, 76], [184, 80], [312, 78],
];
const FLAG_COLORS = [C_MAGENTA, C_ORANGE, C_MARIGOLD, C_GREEN, C_CYAN];

const introScript: TypeLine[] = INTRO_LINES.map((text) => ({ text, typeMs: 32, holdMs: 350, deleteMs: 0, pauseMs: 0 }));
const introTypers = introScript.map((l) => new Typewriter([l]));
const introSample = newSample();

/** The stats show first; the online farewell (if any) takes the box after 2.5 s. */
const FINAL_AFTER_FRAMES = 150;

let victoryCacheKey = -1;
let victoryStats = "";

const mod = (a: number, n: number): number => ((a % n) + n) % n;

// ------------------------------------------------------------ world layers

function background(g: Gfx, cam: number, frame: number): void {
  const W = g.width;
  g.fill(C_PURPLE, 0, 0, W, GROUND_Y);

  // stars (twinkle every ~half second)
  for (let i = 0; i < STARS.length; i++) {
    const s = STARS[i]!;
    const x = mod(s[0] - (cam >> 3), W);
    const c = (frame >> 5) % 3 === i % 3 ? C_GLOW : C_BONE;
    g.fill(c, x, s[1], 1, 1);
  }

  // stepped temple silhouettes, parallax 1/3
  const tp = 340;
  const off = mod(Math.floor(cam / 3), tp);
  for (let k = 0; k < 3; k++) {
    const bx = k * tp - off + 40;
    for (let t = 0; t < 4; t++) {
      const w = 120 - t * 28;
      g.fill(C_TEMPLE, bx + (t * 28) / 2, GROUND_Y - 10 * (t + 1), w, 10);
    }
    g.fill(C_TEMPLE, bx + 50, GROUND_Y - 52, 20, 12);
  }

  // papel picado strip, parallax 0.6
  const fp = 24;
  const foff = mod(Math.floor((cam * 3) / 5), fp);
  g.fill(C_BONE, 0, 16, W, 1);
  for (let i = -1; i <= Math.ceil(W / fp); i++) {
    const x = i * fp - foff;
    const ci = mod(i + Math.floor((cam * 3) / 5 / fp), FLAG_COLORS.length);
    flag(g, x + 3, 17, 18, 13, FLAG_COLORS[ci]!);
  }

  // path
  g.fill(C_PATH, 0, GROUND_Y, W, g.height - GROUND_Y);
  g.fill(C_ORANGE, 0, GROUND_Y, W, 2);
  const dp = 32;
  const doff = mod(cam, dp);
  for (let x = -doff; x < W; x += dp) {
    g.fill(C_MARIGOLD, x, GROUND_Y + 8, 3, 3);
    g.fill(C_ORANGE, x + 16, GROUND_Y + 16, 3, 3);
  }
}

/** One papel picado flag with cut-outs and a notched bottom. */
function flag(g: Gfx, x: number, y: number, w: number, h: number, c: number): void {
  g.fill(c, x, y, w, h - 3);
  for (let i = 0; i < w; i += 6) g.fill(c, x + i + 1, y + h - 3, 4, 3);
  g.fill(C_PURPLE, x + 4, y + 3, 3, 3);
  g.fill(C_PURPLE, x + w - 7, y + 3, 3, 3);
  g.fill(C_PURPLE, x + (w >> 1) - 1, y + 6, 2, 3);
}

function hud(g: Gfx, game: Game): void {
  for (let i = 0; i < 3; i++) {
    if (i < game.hearts) g.sprite(SPR_HEART, 4 + i * 16, 2);
    else g.fill(C_TEMPLE, 6 + i * 16, 5, 10, 6);
  }
  // four flower slots
  for (let i = 0; i < 4; i++) {
    const x = 330 + i * 12;
    g.fill(i < game.flowersLit ? C_ORANGE : C_TEMPLE, x, 4, 8, 8);
    if (i < game.flowersLit) g.fill(C_MARIGOLD, x + 2, 6, 4, 4);
  }
  g.text(PETAL_LABELS[Math.min(game.petals, 200)]!, "s", C_MARIGOLD, 386, 2);
  g.sprite(SPR_PETALO, 410, 4);
}

function entities(g: Gfx, game: Game): void {
  const W = g.width;
  const cam = game.cameraX >> 4;
  const lv = game.level;

  for (const ob of lv.obstacles) {
    const sx = ob.x - cam;
    if (sx < -30 || sx > W) continue;
    if (ob.kind === OB_SKULL) g.sprite(SPR_CALAVERITA, sx, GROUND_Y - 20);
    else {
      // hanging papel picado curtain: string + three flags down to y 100
      g.fill(C_BONE, sx + 12, 17, 1, 6);
      flag(g, sx, 22, 26, 26, C_MAGENTA);
      flag(g, sx, 48, 26, 26, C_ORANGE);
      flag(g, sx, 74, 26, 26, C_MARIGOLD);
    }
  }

  for (let i = 0; i < lv.petals.length; i++) {
    if (game.petalTaken[i]) continue;
    const p = lv.petals[i]!;
    const sx = p.x - cam;
    if (sx < -10 || sx > W) continue;
    g.sprite(SPR_PETALO, sx, p.y);
  }

  if (game.flowersLit < lv.flowers.length) {
    const sx = lv.flowers[game.flowersLit]! - cam;
    if (sx > -24 && sx < W) {
      const bob = (game.frame >> 3) & 1;
      if ((game.frame >> 4) & 1) {
        g.fill(C_GLOW, sx - 3, GROUND_Y - 30, 2, 2);
        g.fill(C_GLOW, sx + 21, GROUND_Y - 18, 2, 2);
        g.fill(C_GLOW, sx + 9, GROUND_Y - 36, 2, 2);
      }
      g.sprite(SPR_FLOR, sx, GROUND_Y - 22 - bob);
    }
  }

  ofrenda(g, lv.ofrendaX - cam, game.state === ST_VICTORY ? game.stateFrames : 0, game.frame);
}

function ofrenda(g: Gfx, ox: number, glow: number, frame: number): void {
  if (ox > g.width + 10 || ox < -110) return;
  const base = GROUND_Y;
  // portal behind the altar
  const ring = Math.min(10, 2 + (glow >> 4));
  g.fill(C_GLOW, ox + 26, base - 74, 48, ring);
  g.fill(C_GLOW, ox + 26, base - 74, ring, 46);
  g.fill(C_GLOW, ox + 74 - ring, base - 74, ring, 46);
  if (glow > 0 && (frame >> 2) & 1) g.fill(C_MARIGOLD, ox + 26 + ring, base - 74 + ring, 48 - 2 * ring, 46 - ring);
  // three tiers
  g.fill(C_MAGENTA, ox, base - 10, 100, 10);
  g.fill(C_ORANGE, ox + 10, base - 20, 80, 10);
  g.fill(C_MARIGOLD, ox + 20, base - 30, 60, 10);
  // candles and flowers
  g.sprite(SPR_CANDLE, ox + 4, base - 24);
  g.sprite(SPR_CANDLE, ox + 90, base - 24);
  g.sprite(SPR_CANDLE, ox + 22, base - 44);
  g.sprite(SPR_CANDLE, ox + 72, base - 44);
  g.sprite(SPR_FLOR, ox + 40, base - 50);
}

function frog(g: Gfx, game: Game): void {
  if (game.invuln > 0 && (game.invuln >> 2) & 1) return; // blink while invulnerable
  const y = game.frogTop();
  let spr = (game.frame >> 3) & 1 ? SPR_FROG_RUN : SPR_FROG_IDLE;
  if (game.crouching) spr = SPR_FROG_CROUCH;
  else if (!game.onGround) spr = SPR_FROG_JUMP;
  g.sprite(spr, FROG_SCREEN_X, y);
}

function box(g: Gfx, x: number, y: number, w: number, h: number): void {
  g.fill(C_MARIGOLD, x - 1, y - 1, w + 2, h + 2);
  g.fill(C_NIGHT, x, y, w, h);
}

function footer(g: Gfx, s: string): void {
  g.text(s, "s", C_GRAY, 12, g.height - 15);
}

/** Footer drawn over the scene: a solid strip keeps it readable over the path dots. */
function sceneFooter(g: Gfx, s: string, x: number): void {
  g.fill(C_NIGHT, x - 6, g.height - 17, g.textWidth(s, "s") + 12, 15);
  g.text(s, "s", C_BONE, x, g.height - 15);
}

// ------------------------------------------------------------ screens

export function renderGame(g: Gfx, game: Game): void {
  switch (game.state) {
    case ST_TITLE:
      return title(g, game);
    case ST_INTRO:
      return intro(g, game);
    case ST_RUN:
      return run(g, game);
    case ST_CHALLENGE:
      return challenge(g, game);
    case ST_FEEDBACK:
      return feedback(g, game);
    case ST_PAUSE:
      return pause(g, game);
    case ST_RETRY:
      return retry(g, game);
    case ST_VICTORY:
      return victory(g, game);
  }
}

function title(g: Gfx, game: Game): void {
  background(g, game.frame, game.frame);
  const t = "Mictlán.js";
  g.text(t, "lb", C_MARIGOLD, (g.width - g.textWidth(t, "lb")) >> 1, 40);
  const tag = "Every developer has a journey.";
  const tag2 = "Every agent needs a guide.";
  g.text(tag, "s", C_BONE, (g.width - g.textWidth(tag, "s")) >> 1, 66);
  g.text(tag2, "s", C_BONE, (g.width - g.textWidth(tag2, "s")) >> 1, 80);
  g.sprite((game.frame >> 4) & 1 ? SPR_FROG_RUN : SPR_FROG_IDLE, FROG_SCREEN_X, GROUND_Y - FROG_H);
  g.sprite(SPR_GUARDIAN, g.width - 60, GROUND_Y - 24);
  statusLine(g, game);
  const hint = "SELECT jugar   BACK salir";
  sceneFooter(g, hint, (g.width - g.textWidth(hint, "s")) >> 1);
}

function intro(g: Gfx, game: Game): void {
  background(g, 0, game.frame);
  box(g, 10, 34, g.width - 20, 72);
  g.sprite(SPR_GUARDIAN, 18, 46);
  let t = (game.stateFrames * 1000) / 60;
  for (let i = 0; i < introTypers.length; i++) {
    const tw = introTypers[i]!;
    const y = 40 + i * 20;
    if (t >= tw.totalMs) {
      g.text(tw.fullText(0), "s", i === 0 ? C_MARIGOLD : C_BONE, 52, y);
      t -= tw.totalMs;
      continue;
    }
    tw.sample(t, introSample);
    g.text(introSample.text, "s", i === 0 ? C_MARIGOLD : C_BONE, 52, y);
    if (introSample.cursorOn) g.fill(C_MARIGOLD, 52 + g.textWidth(introSample.text, "s") + 1, y + 2, 6, FONT_SIZE.s);
    break;
  }
  sceneFooter(g, "SELECT comenzar", 16);
}

function run(g: Gfx, game: Game): void {
  background(g, game.cameraX >> 4, game.frame);
  entities(g, game);
  frog(g, game);
  hud(g, game);
}

function challenge(g: Gfx, game: Game): void {
  const q = game.question;
  g.fill(C_NIGHT, 0, 0, g.width, g.height);
  if (!q) return;
  g.sprite(SPR_FLOR, 8, 4);
  g.text(HEADERS[game.flowersLit]!, "mb", C_MARIGOLD, 34, 7);
  // code panel
  g.fill(C_TEMPLE, 8, 28, 236, 1);
  for (let i = 0; i < q.code.length; i++) g.text(q.code[i]!, "m", C_CYAN, 12, 34 + i * 16);
  // question or hint
  const lines = game.showHint ? game.hintLines : game.questionLines;
  const color = game.showHint ? C_GLOW : C_BONE;
  for (let i = 0; i < lines.length && i < 2; i++) g.text(lines[i]!, "s", color, 12, 88 + i * 14);
  // options
  g.fill(C_TEMPLE, 252, 28, 1, 88);
  for (let i = 0; i < 4; i++) {
    const y = 32 + i * 21;
    const label = i < 3 ? q.options[i]! : game.showHint ? "ocultar pista" : "? pista";
    const focused = i === game.option;
    if (focused) {
      g.fill(C_MARIGOLD, 260, y + 3, 3, 13);
      g.text(">", "m", C_MARIGOLD, 268, y);
    }
    const c = focused ? C_MARIGOLD : i === OPTION_HINT ? C_GRAY : C_BONE;
    g.text(label, focused ? "mb" : "m", c, 282, y);
  }
  footer(g, "▲▼ elegir   SELECT confirmar   BACK pausa");
}

function feedback(g: Gfx, game: Game): void {
  g.fill(C_NIGHT, 0, 0, g.width, g.height);
  g.sprite(SPR_GUARDIAN, 14, 34);
  const lines = game.feedbackLines;
  for (let i = 0; i < lines.length && i < 5; i++) {
    const c = i === 0 ? (game.lastCorrect ? C_MARIGOLD : C_MAGENTA) : C_BONE;
    g.text(lines[i]!, i === 0 ? "mb" : "s", c, 50, 18 + i * 18);
  }
  footer(g, game.lastCorrect ? "SELECT continuar el camino" : "SELECT intentar de nuevo");
  if (game.guardianSource === "ai") onlineMark(g);
}

/** Network status from the host, in the strip above the papel picado (y 2–15). */
function statusLine(g: Gfx, game: Game): void {
  if (!game.statusLine) return;
  g.fill(C_NIGHT, 0, 0, g.width, 16);
  g.text(game.statusLine, "s", game.statusLine.endsWith("en línea") ? C_MARIGOLD : C_GRAY, 12, 2);
}

const ONLINE_MARK = "· Guardián en línea";
/** Small right-aligned marker: this text came from the online Guardián. */
function onlineMark(g: Gfx): void {
  g.text(ONLINE_MARK, "s", C_GLOW, g.width - 12 - g.textWidth(ONLINE_MARK, "s"), g.height - 15);
}

function pause(g: Gfx, game: Game): void {
  run(g, game);
  statusLine(g, game);
  box(g, 134, 28, 160, 80);
  g.text("pausa", "mb", C_MARIGOLD, 148, 34);
  for (let i = 0; i < PAUSE_ITEMS.length; i++) {
    const y = 54 + i * 17;
    const f = i === game.pauseIndex;
    if (f) g.text(">", "m", C_MARIGOLD, 148, y);
    g.text(PAUSE_ITEMS[i]!, "m", f ? C_MARIGOLD : C_BONE, 162, y);
  }
}

function retry(g: Gfx, game: Game): void {
  background(g, game.cameraX >> 4, game.frame);
  entities(g, game);
  hud(g, game);
  box(g, 40, 34, g.width - 80, 64);
  g.text("Las calaveritas ganaron esta vez.", "mb", C_MAGENTA, 54, 42);
  g.text(RETRY_FROM[game.flowersLit]!, "s", C_BONE, 54, 64);
  g.text("BACK volver al título", "s", C_GRAY, 54, 80);
}

function victory(g: Gfx, game: Game): void {
  background(g, game.cameraX >> 4, game.frame);
  entities(g, game);
  // celebrating frog: little hops on the path, in front of the ofrenda
  const ox = game.level.ofrendaX - (game.cameraX >> 4);
  const p = game.stateFrames % 36;
  const hop = Math.round((p * (36 - p)) / 18);
  g.sprite(p < 30 ? SPR_FROG_JUMP : SPR_FROG_IDLE, ox - 34, GROUND_Y - FROG_H - hop);
  if (victoryCacheKey !== game.runFrames) {
    const s = Math.floor(game.runFrames / 60);
    victoryStats = `pétalos ${game.petals} · tiempo ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    victoryCacheKey = game.runFrames;
  }
  // box to the right of the ofrenda, so the portal stays visible
  const bx = g.width - 196;
  if (game.finalLines.length > 0 && game.stateFrames >= FINAL_AFTER_FRAMES) {
    // the online Guardián's farewell replaces the stats after a moment
    const lines = game.finalLines;
    box(g, bx, 6, 188, 18 + lines.length * 14);
    g.text("El Guardián dice:", "s", C_MARIGOLD, bx + 8, 10);
    for (let i = 0; i < lines.length; i++) g.text(lines[i]!, "s", C_BONE, bx + 8, 26 + i * 14);
  } else {
    box(g, bx, 26, 188, 62);
    g.text("El agente despierta.", "mb", C_MARIGOLD, bx + 8, 32);
    g.text(victoryStats, "s", C_BONE, bx + 8, 52);
    g.text("4/4 flores iluminadas", "s", C_GLOW, bx + 8, 68);
  }
  if (game.stateFrames >= 60) sceneFooter(g, "SELECT jugar otra vez   BACK título", 16);
}

/** Heights the adapters need to reserve for sprites drawn with a vertical offset. */
export const FROG_HEIGHTS = { standing: FROG_H, crouching: FROG_CROUCH_H } as const;
