import { describe, expect, it } from "vitest";
import { BTN_BACK, BTN_DOWN, BTN_SELECT, BTN_UP, EV_PRESS, EV_REPEAT } from "../../src/core/inputFsm";
import {
  FROG_W,
  Game,
  MAX_HEARTS,
  OPTION_HINT,
  SPEED,
  ST_CHALLENGE,
  ST_FEEDBACK,
  ST_INTRO,
  ST_PAUSE,
  ST_RETRY,
  ST_RUN,
  ST_TITLE,
  ST_VICTORY,
} from "../../src/core/game/game";
import { OB_BANNER, OB_SKULL } from "../../src/core/game/level";

const press = (g: Game, b: number) => g.input(b, EV_PRESS);

/** Step the bot until `done` holds; fail loudly instead of hanging. */
function until(g: Game, done: () => boolean, max = 60 * 600, step: () => void = () => botFrame(g)): void {
  for (let i = 0; i < max; i++) {
    if (done()) return;
    step();
  }
  throw new Error(`condition not reached: state=${g.state} hearts=${g.hearts} flowers=${g.flowersLit} x=${g.frogWorldX()}`);
}

function startRun(g: Game): void {
  press(g, BTN_SELECT); // title → intro
  expect(g.state).toBe(ST_INTRO);
  press(g, BTN_SELECT); // intro → run
  expect(g.state).toBe(ST_RUN);
}

/** A simple player: jumps skulls, crouches under banners, answers right. */
function botFrame(g: Game, answerCorrectly = true): number {
  let held = 0;
  if (g.state === ST_RUN) {
    const front = g.frogWorldX() + FROG_W;
    for (const ob of g.level.obstacles) {
      // d = gap between the frog's front and the obstacle
      const d = ob.x - front;
      if (d < -50 || d > 40) continue;
      // jump window worked out from the physics: d in [0, 7] px
      if (ob.kind === OB_SKULL && d >= 2 && d <= 6 && g.onGround) press(g, BTN_UP);
      // stay down until the banner (26 px wide) is fully behind the hitbox
      if (ob.kind === OB_BANNER && d <= 30) held |= 1 << BTN_DOWN;
    }
  } else if (g.state === ST_CHALLENGE && g.question) {
    const target = answerCorrectly ? g.question.answer : (g.question.answer + 1) % 3;
    while (g.option !== target) press(g, BTN_DOWN);
    press(g, BTN_SELECT);
  } else if (g.state === ST_FEEDBACK) {
    press(g, BTN_SELECT);
  }
  g.tick(held);
  return held;
}

describe("Mictlán.js game", () => {
  it("title → intro → run, and BACK on the title asks the host to exit", () => {
    const g = new Game();
    expect(g.state).toBe(ST_TITLE);
    press(g, BTN_BACK);
    expect(g.consumeExit()).toBe(true);
    expect(g.consumeExit()).toBe(false);
    startRun(g);
  });

  it("a skilled run collects all four flowers and reaches the ofrenda", () => {
    const g = new Game();
    startRun(g);
    until(g, () => g.state === ST_VICTORY);
    expect(g.state).toBe(ST_VICTORY);
    expect(g.flowersLit).toBe(4);
    expect(g.hearts).toBe(MAX_HEARTS); // the bot never gets hit
    expect(g.petals).toBeGreaterThan(0);
    const seconds = g.runFrames / 60;
    expect(seconds).toBeGreaterThan(90); // about two minutes of running
    expect(seconds).toBeLessThan(200);
  });

  it("is deterministic: the same inputs give the same state", () => {
    const a = new Game();
    const b = new Game();
    startRun(a);
    startRun(b);
    for (let i = 0; i < 3000; i++) {
      botFrame(a);
      botFrame(b);
    }
    expect([a.cameraX, a.frogY, a.hearts, a.petals, a.flowersLit, a.state]).toEqual([
      b.cameraX,
      b.frogY,
      b.hearts,
      b.petals,
      b.flowersLit,
      b.state,
    ]);
  });

  it("jumping clears a calaverita; standing still does not", () => {
    const g = new Game();
    startRun(g);
    for (let i = 0; i < 60 * 20 && g.hearts === MAX_HEARTS; i++) g.tick(0);
    expect(g.hearts).toBe(MAX_HEARTS - 1);
  });

  it("you cannot jump while crouching, and crouch only holds while DOWN is held", () => {
    const g = new Game();
    startRun(g);
    g.tick(1 << BTN_DOWN);
    expect(g.crouching).toBe(true);
    press(g, BTN_UP);
    expect(g.onGround).toBe(true);
    g.tick(0);
    expect(g.crouching).toBe(false);
  });

  it("losing all hearts → retry → back at the last checkpoint with full hearts", () => {
    const g = new Game();
    startRun(g);
    // play well until the first flower is solved
    until(g, () => g.flowersLit >= 1);
    // the checkpoint is saved when the flower is solved, before that frame's scroll step
    const checkpoint = g.cameraX - SPEED;
    // then stop playing
    until(g, () => g.state === ST_RETRY, 60 * 600, () => g.tick(0));
    expect(g.hearts).toBe(0);
    press(g, BTN_SELECT);
    expect(g.state).toBe(ST_RUN);
    expect(g.hearts).toBe(MAX_HEARTS);
    expect(g.cameraX).toBe(checkpoint);
    expect(g.flowersLit).toBe(1);
  });

  it("challenge: wrong answer shows a hint and returns to the same question", () => {
    const g = new Game();
    startRun(g);
    until(g, () => g.state === ST_CHALLENGE);
    const q = g.question!;
    while (g.option !== (q.answer + 1) % 3) press(g, BTN_DOWN);
    press(g, BTN_SELECT);
    expect(g.state).toBe(ST_FEEDBACK);
    expect(g.lastCorrect).toBe(false);
    expect(g.feedbackLines.join(" ")).toContain(q.hint.split(" ")[0]!);
    press(g, BTN_SELECT);
    expect(g.state).toBe(ST_CHALLENGE);
    expect(g.question).toBe(q);
    expect(g.flowersLit).toBe(0);
  });

  it("challenge: the pista entry toggles the hint without spending an attempt", () => {
    const g = new Game();
    startRun(g);
    until(g, () => g.state === ST_CHALLENGE);
    while (g.option !== OPTION_HINT) press(g, BTN_DOWN);
    press(g, BTN_SELECT);
    expect(g.showHint).toBe(true);
    expect(g.attempts).toBe(0);
    expect(g.state).toBe(ST_CHALLENGE);
    // UP wraps around the 4 entries
    press(g, BTN_DOWN);
    expect(g.option).toBe(0);
    g.input(BTN_UP, EV_REPEAT);
    expect(g.option).toBe(OPTION_HINT);
  });

  it("BACK pauses; continuar resumes; salir exits to the host", () => {
    const g = new Game();
    startRun(g);
    for (let i = 0; i < 30; i++) g.tick(0);
    const cam = g.cameraX;
    press(g, BTN_BACK);
    expect(g.state).toBe(ST_PAUSE);
    for (let i = 0; i < 30; i++) g.tick(0);
    expect(g.cameraX).toBe(cam); // world frozen while paused
    press(g, BTN_SELECT); // continuar
    expect(g.state).toBe(ST_RUN);
    press(g, BTN_BACK);
    press(g, BTN_DOWN);
    press(g, BTN_DOWN); // salir
    press(g, BTN_SELECT);
    expect(g.state).toBe(ST_TITLE);
    expect(g.consumeExit()).toBe(true);
  });

  it("victory → SELECT replays with the second question variants", () => {
    const g = new Game();
    startRun(g);
    until(g, () => g.state === ST_VICTORY);
    press(g, BTN_SELECT); // ignored during the first second of celebration
    expect(g.state).toBe(ST_VICTORY);
    for (let i = 0; i < 61; i++) g.tick(0);
    press(g, BTN_SELECT);
    expect(g.state).toBe(ST_INTRO);
    expect(g.flowersLit).toBe(0);
    press(g, BTN_SELECT);
    until(g, () => g.state === ST_CHALLENGE);
    expect(g.question!.id).toBe("var-2");
  });
});
