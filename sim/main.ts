/**
 * Desktop simulator for Mictlán.js: same game core and renderer as the badge,
 * drawn on a 428×142 canvas (scaled ×3, pixelated). Keyboard maps to the badge buttons.
 */
import { FONT_SIZE, type FontId, type Gfx } from "../src/core/gfx";
import { BTN_BACK, BTN_DOWN, BTN_SELECT, BTN_UP, EV_PRESS, InputFsm, eventButton, eventKind } from "../src/core/inputFsm";
import { FPS, Game, ST_CHALLENGE, ST_RETRY, ST_VICTORY } from "../src/core/game/game";
import { autoplayUntil } from "../src/core/game/autoplay";
import { ST_RUN } from "../src/core/game/game";
import { ChipAudio } from "./audio";
import { GuardianClient, type Transport } from "../src/core/guardianClient";
import { renderGame } from "../src/core/game/render";
import { PALETTE, PANEL_SAFE } from "../src/core/game/palette";
import { SCALE, SPRITE_DEFS, decodeSprite } from "../src/core/game/sprites";

const W = 428;
const H = 142;

const canvas = document.getElementById("screen") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
ctx.imageSmoothingEnabled = false;

const css = (hex: number): string => "#" + hex.toString(16).padStart(6, "0");

class CanvasGfx implements Gfx {
  readonly width = W;
  readonly height = H;
  private colors: string[] = [];
  private sprites: HTMLCanvasElement[] = [];

  constructor(panelSafe: boolean) {
    this.setPanelSafe(panelSafe);
  }

  setPanelSafe(on: boolean): void {
    this.colors = PALETTE.map((hex, i) => css(on && PANEL_SAFE[i] !== undefined ? PANEL_SAFE[i]! : hex));
    this.sprites = SPRITE_DEFS.map((def) => {
      const px = decodeSprite(def);
      const w = def.rows[0]!.length;
      const h = def.rows.length;
      const c = document.createElement("canvas");
      c.width = w * SCALE;
      c.height = h * SCALE;
      const cx = c.getContext("2d")!;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const ci = px[y * w + x]!;
          if (ci === 0) continue;
          cx.fillStyle = this.colors[ci]!;
          cx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
        }
      return c;
    });
  }

  fill(c: number, x: number, y: number, w: number, h: number): void {
    ctx.fillStyle = this.colors[c]!;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  sprite(id: number, x: number, y: number): void {
    ctx.drawImage(this.sprites[id]!, Math.round(x), Math.round(y));
  }
  text(s: string, font: FontId, c: number, x: number, y: number): void {
    ctx.font = this.font(font);
    ctx.fillStyle = this.colors[c]!;
    ctx.fillText(s, Math.round(x), Math.round(y));
  }
  textWidth(s: string, font: FontId): number {
    ctx.font = this.font(font);
    return Math.round(ctx.measureText(s).width);
  }
  private font(f: FontId): string {
    const bold = f === "mb" || f === "lb";
    return `${bold ? "700 " : ""}${FONT_SIZE[f]}px "JBM"`;
  }
}

ctx.textBaseline = "top";
const safeToggle = document.getElementById("panelSafe") as HTMLInputElement;
const gfx = new CanvasGfx(safeToggle.checked);
safeToggle.addEventListener("change", () => gfx.setPanelSafe(safeToggle.checked));

// ------------------------------------------------------------ input (keyboard → badge buttons)

const KEYS: Record<string, number> = {
  ArrowUp: BTN_UP,
  KeyW: BTN_UP,
  ArrowDown: BTN_DOWN,
  KeyS: BTN_DOWN,
  Enter: BTN_SELECT,
  Space: BTN_SELECT,
  Escape: BTN_BACK,
  Backspace: BTN_BACK,
};
let raw = 0;
const audio = new ChipAudio();
const muteToggle = document.getElementById("mute") as HTMLInputElement;
const musicToggle = document.getElementById("music") as HTMLInputElement;
audio.setMuted(muteToggle.checked);
muteToggle.addEventListener("change", () => audio.setMuted(muteToggle.checked));
addEventListener("keydown", (e) => {
  audio.unlock(); // browsers only start audio after a user gesture
  const b = KEYS[e.code];
  if (b === undefined) return;
  e.preventDefault();
  raw |= 1 << b;
});
addEventListener("keyup", (e) => {
  const b = KEYS[e.code];
  if (b !== undefined) raw &= ~(1 << b);
});
addEventListener("blur", () => (raw = 0));

// ------------------------------------------------------------ loop (fixed 60 Hz, like the badge)

const game = new Game();
const input = new InputFsm();
// ------------------------------------------------------------ simulated online Guardián
// Canned replies with real-ish latency, to preview AI text on screen without calling AWS.
const SAMPLE: Record<string, string[]> = {
  hint: ["Mira bien qué valor llega a console.log al final.", "Sigue el valor línea por línea, como quien sigue las velas del camino."],
  cheer: ["¡Otra flor encendida! El Mictlán brilla un poco más para ti, ranita.", "¡Bien hecho! Tu código ilumina el camino hacia la ofrenda."],
  final: [
    "¡Felicidades, ranita! Cruzaste el Mictlán con cuatro flores. Siguiente reto: crea una herramienta con AWS Lambda.",
  ],
};
const fakeTransport: Transport = async (_path, body) => {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 1500));
  const kind = (body as { kind: string }).kind;
  const pool = SAMPLE[kind] ?? SAMPLE.cheer!;
  return { status: 200, json: { v: 1, text: pool[Math.floor(Math.random() * pool.length)], source: "ai" } };
};
const guardian = new GuardianClient(fakeTransport, (ms) => new Promise((r) => setTimeout(r, ms)), () => performance.now());
const onlineToggle = document.getElementById("online") as HTMLInputElement;
if (new URLSearchParams(location.search).has("online")) onlineToggle.checked = true;

// dev hook for inspecting the simulator from the console
(globalThis as unknown as { __game: Game }).__game = game;

// dev: ?skip=run|challenge|feedback|victory|retry fast-forwards with the autoplay bot
const skip = new URLSearchParams(location.search).get("skip");
if (skip) {
  game.input(BTN_SELECT, EV_PRESS);
  game.input(BTN_SELECT, EV_PRESS);
  const flower = Number(new URLSearchParams(location.search).get("flower") ?? 0);
  if (skip === "challenge" || skip === "feedback")
    autoplayUntil(game, () => game.state === ST_CHALLENGE && game.flowersLit === flower);
  if (skip === "feedback") {
    while (game.option !== (game.question!.answer + 1) % 3) game.input(BTN_DOWN, EV_PRESS);
    game.input(BTN_SELECT, EV_PRESS);
  }
  if (skip === "victory") autoplayUntil(game, () => game.state === ST_VICTORY && game.stateFrames > 90);
  if (skip === "retry") for (let i = 0; i < 60 * 120 && game.state !== ST_RETRY; i++) game.tick(0);
  if (skip === "pause") game.input(BTN_BACK, EV_PRESS);
}
const status = document.getElementById("status")!;
const STEP = 1000 / FPS;
let acc = 0;
let last = performance.now();

setInterval(() => input.update(raw, performance.now()), 5);

function loop(now: number): void {
  acc += Math.min(250, now - last);
  last = now;
  while (acc >= STEP) {
    for (let e = input.next(); e >= 0; e = input.next()) game.input(eventButton(e), eventKind(e));
    game.tick(raw);
    acc -= STEP;
  }
  for (let s = game.nextSound(); s >= 0; s = game.nextSound()) audio.play(s);
  for (let r = game.nextGuardianRequest(); r; r = game.nextGuardianRequest()) {
    if (!onlineToggle.checked) continue; // offline: keep the local text
    const token = r.token;
    void guardian.line(r).then((text) => {
      if (text) game.guardianReply(token, text);
    });
  }
  audio.music(game.state === ST_RUN && musicToggle.checked);
  if (game.consumeExit()) status.textContent = "salir → (en el badge vuelve al menú de Hazel Badge OS)";
  // debug snapshot readable from devtools/automation (shared DOM)
  if ((game.frame & 7) === 0)
    canvas.dataset.debug = JSON.stringify({
      state: game.state,
      frogTop: game.frogTop(),
      onGround: game.onGround,
      invuln: game.invuln,
      hearts: game.hearts,
      flowers: game.flowersLit,
      x: game.frogWorldX(),
      audio: audio.state,
      notes: audio.notes,
    });
  ctx.textBaseline = "top";
  renderGame(gfx, game);
  requestAnimationFrame(loop);
}

document.fonts.ready.then(() => requestAnimationFrame(loop));
