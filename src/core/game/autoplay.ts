/**
 * A simple bot that plays Mictlán.js perfectly. Used by tests, by the
 * simulator's `?skip=` dev option, and as an attract mode later.
 */
import { BTN_DOWN, BTN_SELECT, BTN_UP, EV_PRESS } from "../inputFsm";
import { FROG_W, Game, ST_CHALLENGE, ST_FEEDBACK, ST_RUN } from "./game";
import { OB_BANNER, OB_SKULL } from "./level";

/** Decide inputs for one frame, apply presses to `g`, return the held mask. Does not tick. */
export function autoplayInput(g: Game, answerCorrectly = true): number {
  let held = 0;
  if (g.state === ST_RUN) {
    const front = g.frogWorldX() + FROG_W;
    for (const ob of g.level.obstacles) {
      const d = ob.x - front;
      if (d < -50 || d > 40) continue;
      if (ob.kind === OB_SKULL && d >= 2 && d <= 6 && g.onGround) g.input(BTN_UP, EV_PRESS);
      if (ob.kind === OB_BANNER && d <= 30) held |= 1 << BTN_DOWN;
    }
  } else if (g.state === ST_CHALLENGE && g.question) {
    const target = answerCorrectly ? g.question.answer : (g.question.answer + 1) % 3;
    while (g.option !== target) g.input(BTN_DOWN, EV_PRESS);
    g.input(BTN_SELECT, EV_PRESS);
  } else if (g.state === ST_FEEDBACK) {
    g.input(BTN_SELECT, EV_PRESS);
  }
  return held;
}

/** Play until `done()` or `maxFrames`. Returns true if `done()` was reached. */
export function autoplayUntil(g: Game, done: () => boolean, maxFrames = 60 * 600): boolean {
  for (let i = 0; i < maxFrames; i++) {
    if (done()) return true;
    g.tick(autoplayInput(g));
  }
  return done();
}
