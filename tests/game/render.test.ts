import { describe, expect, it } from "vitest";
import { monoWidth, type FontId, type Gfx } from "../../src/core/gfx";
import { renderGame } from "../../src/core/game/render";
import { Game, ST_CHALLENGE, ST_FEEDBACK, ST_INTRO, ST_PAUSE, ST_RETRY, ST_RUN, ST_TITLE, ST_VICTORY, OPTION_HINT } from "../../src/core/game/game";
import { BTN_BACK, BTN_DOWN, BTN_SELECT, BTN_UP, EV_PRESS } from "../../src/core/inputFsm";
import { OB_BANNER, OB_SKULL } from "../../src/core/game/level";
import { FLOWER_ORDER, QUESTIONS } from "../../src/core/game/questions";
import { SPRITE_DEFS } from "../../src/core/game/sprites";

const W = 428;
const H = 142;

class RecordingGfx implements Gfx {
  readonly width = W;
  readonly height = H;
  texts: Array<{ s: string; font: FontId; x: number; y: number }> = [];
  ops = 0;
  fill(): void {
    this.ops++;
  }
  sprite(id: number): void {
    if (!SPRITE_DEFS[id]) throw new Error(`unknown sprite ${id}`);
    this.ops++;
  }
  text(s: string, font: FontId, _c: number, x: number, y: number): void {
    this.texts.push({ s, font, x, y });
    this.ops++;
  }
  textWidth(s: string, font: FontId): number {
    return monoWidth(s, font);
  }
}

function expectTextFits(g: RecordingGfx): void {
  for (const t of g.texts) {
    const right = t.x + monoWidth(t.s, t.font);
    expect(right, `"${t.s}" overflows (${right}px)`).toBeLessThanOrEqual(W);
    expect(t.y).toBeGreaterThanOrEqual(0);
    expect(t.y).toBeLessThan(H);
  }
}

const press = (g: Game, b: number) => g.input(b, EV_PRESS);

function bot(g: Game): void {
  let held = 0;
  if (g.state === ST_RUN) {
    const front = g.frogWorldX() + 24;
    for (const ob of g.level.obstacles) {
      const d = ob.x - front;
      if (ob.kind === OB_SKULL && d >= 2 && d <= 6 && g.onGround) press(g, BTN_UP);
      if (ob.kind === OB_BANNER && d <= 30 && d >= -50) held |= 1 << BTN_DOWN;
    }
  } else if (g.state === ST_CHALLENGE && g.question) {
    while (g.option !== g.question.answer) press(g, BTN_DOWN);
    press(g, BTN_SELECT);
  } else if (g.state === ST_FEEDBACK) press(g, BTN_SELECT);
  g.tick(held);
}

describe("render", () => {
  it("draws every state without overflowing the 428 px screen", () => {
    const game = new Game();
    const seen = new Set<number>();
    const check = () => {
      const gfx = new RecordingGfx();
      renderGame(gfx, game);
      expect(gfx.ops).toBeGreaterThan(0);
      expectTextFits(gfx);
      seen.add(game.state);
    };
    check(); // title
    press(game, BTN_SELECT);
    for (let i = 0; i < 400; i++) {
      game.tick(0);
      if (i % 50 === 0) check(); // intro typing at several points
    }
    press(game, BTN_SELECT);
    for (let i = 0; i < 60 * 600 && game.state !== ST_VICTORY; i++) {
      bot(game);
      if (i % 37 === 0) check();
      if (game.state === ST_CHALLENGE) {
        check();
        // hint view too
        while (game.option !== OPTION_HINT) press(game, BTN_DOWN);
        press(game, BTN_SELECT);
        check();
        press(game, BTN_SELECT);
        // wrong-answer feedback
        const q = game.question!;
        while (game.option !== (q.answer + 1) % 3) press(game, BTN_DOWN);
        press(game, BTN_SELECT);
        check();
        press(game, BTN_SELECT);
        check();
      }
      if (game.state === ST_RUN && game.flowersLit === 2 && !seen.has(ST_PAUSE)) {
        press(game, BTN_BACK);
        check();
        press(game, BTN_BACK);
      }
    }
    expect(game.state).toBe(ST_VICTORY);
    for (let i = 0; i < 80; i++) game.tick(0);
    check();
    // retry screen
    const g2 = new Game();
    press(g2, BTN_SELECT);
    press(g2, BTN_SELECT);
    for (let i = 0; i < 60 * 120 && g2.state !== ST_RETRY; i++) g2.tick(0);
    const gfx = new RecordingGfx();
    renderGame(gfx, g2);
    expectTextFits(gfx);
    seen.add(g2.state);
    for (const s of [ST_TITLE, ST_INTRO, ST_RUN, ST_CHALLENGE, ST_FEEDBACK, ST_PAUSE, ST_RETRY, ST_VICTORY]) {
      expect(seen.has(s), `state ${s} rendered`).toBe(true);
    }
  });

  it("every question variant's feedback and hint fit on screen", () => {
    for (const c of FLOWER_ORDER) {
      for (const q of QUESTIONS[c]) {
        expect(Array.from(q.hint).length).toBeLessThanOrEqual(68); // ≤ 2 lines of 34
        expect(Array.from(q.explain).length).toBeLessThanOrEqual(100); // ≤ 2 lines of 50
      }
    }
  });
});
