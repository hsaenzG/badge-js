import { describe, expect, it } from "vitest";
import { BTN_BACK, BTN_DOWN, BTN_SELECT, BTN_UP, EV_PRESS } from "../../src/core/inputFsm";
import { Game, ST_CHALLENGE, ST_RETRY, ST_RUN, ST_VICTORY } from "../../src/core/game/game";
import { autoplayInput, autoplayUntil } from "../../src/core/game/autoplay";
import {
  MUSIC_RUN,
  SFX,
  SND_CORRECT,
  SND_FLOWER,
  SND_GAMEOVER,
  SND_HIT,
  SND_JUMP,
  SND_MOVE,
  SND_PETAL,
  SND_SELECT,
  SND_VICTORY,
  SND_WRONG,
  tuneMs,
} from "../../src/core/game/sound";

const press = (g: Game, b: number) => g.input(b, EV_PRESS);
const drain = (g: Game): number[] => {
  const out: number[] = [];
  for (let s = g.nextSound(); s >= 0; s = g.nextSound()) out.push(s);
  return out;
};

describe("sound data", () => {
  it("every effect is short and playable by a piezo (0 or 100–5000 Hz)", () => {
    expect(SFX).toHaveLength(10);
    for (const t of SFX) {
      expect(t.length).toBeGreaterThan(0);
      expect(tuneMs(t)).toBeLessThanOrEqual(1500);
      for (const [hz, ms] of t) {
        expect(hz === 0 || (hz >= 100 && hz <= 5000)).toBe(true);
        expect(ms).toBeGreaterThan(0);
      }
    }
  });

  it("the run music's lead and bass loop together", () => {
    expect(tuneMs(MUSIC_RUN.lead)).toBe(tuneMs(MUSIC_RUN.bass));
  });
});

describe("sound events", () => {
  it("title, intro, jump, petal and flower fire in order", () => {
    const g = new Game();
    press(g, BTN_SELECT);
    press(g, BTN_SELECT);
    expect(drain(g)).toEqual([SND_SELECT, SND_SELECT]);
    expect(g.state).toBe(ST_RUN);
    press(g, BTN_UP);
    expect(drain(g)).toEqual([SND_JUMP]);
    const heard = new Set<number>();
    autoplayUntil(g, () => {
      for (let s = g.nextSound(); s >= 0; s = g.nextSound()) heard.add(s);
      return g.state === ST_CHALLENGE;
    });
    for (let s = g.nextSound(); s >= 0; s = g.nextSound()) heard.add(s);
    expect(heard.has(SND_PETAL)).toBe(true);
    expect(heard.has(SND_FLOWER)).toBe(true);
    expect(heard.has(SND_HIT)).toBe(false); // the bot never gets hit
  });

  it("moving, wrong and correct answers sound different", () => {
    const g = new Game();
    press(g, BTN_SELECT);
    press(g, BTN_SELECT);
    autoplayUntil(g, () => g.state === ST_CHALLENGE);
    drain(g);
    const q = g.question!;
    while (g.option !== (q.answer + 1) % 3) press(g, BTN_DOWN);
    press(g, BTN_SELECT);
    const wrong = drain(g);
    expect(wrong[wrong.length - 1]).toBe(SND_WRONG);
    expect(wrong).toContain(SND_MOVE);
    press(g, BTN_SELECT); // back to the challenge
    while (g.option !== q.answer) press(g, BTN_DOWN);
    press(g, BTN_SELECT);
    expect(drain(g).pop()).toBe(SND_CORRECT);
  });

  it("hits, game over and victory", () => {
    const g = new Game();
    press(g, BTN_SELECT);
    press(g, BTN_SELECT);
    drain(g);
    const heard: number[] = [];
    for (let i = 0; i < 60 * 120 && g.state !== ST_RETRY; i++) {
      g.tick(0);
      for (let s = g.nextSound(); s >= 0; s = g.nextSound()) heard.push(s);
    }
    expect(heard.filter((s) => s === SND_HIT)).toHaveLength(2);
    expect(heard[heard.length - 1]).toBe(SND_GAMEOVER);

    const v = new Game();
    press(v, BTN_SELECT);
    press(v, BTN_SELECT);
    let last = -1;
    for (let i = 0; i < 60 * 600 && v.state !== ST_VICTORY; i++) {
      v.tick(autoplayInput(v));
      for (let s = v.nextSound(); s >= 0; s = v.nextSound()) last = s;
    }
    expect(v.state).toBe(ST_VICTORY);
    expect(last).toBe(SND_VICTORY);
  });

  it("the queue never grows unbounded when nobody drains it", () => {
    const g = new Game();
    for (let i = 0; i < 100; i++) {
      press(g, BTN_BACK); // title → exit request, no sound
      press(g, BTN_SELECT);
      g.reset();
    }
    expect(drain(g).length).toBeLessThanOrEqual(15);
  });
});
