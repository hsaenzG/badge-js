import { describe, expect, it } from "vitest";
import {
  BTN_DOWN,
  BTN_SELECT,
  BTN_UP,
  EV_LONG,
  EV_PRESS,
  EV_RELEASE,
  EV_REPEAT,
  InputFsm,
  eventButton,
  eventKind,
} from "../src/core/inputFsm";

/** Drive the FSM with a 5 ms poll over [from, to) holding `mask`. */
function run(fsm: InputFsm, mask: number, from: number, to: number): void {
  for (let t = from; t < to; t += 5) fsm.update(mask, t);
}

function drain(fsm: InputFsm): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let e = fsm.next(); e >= 0; e = fsm.next()) out.push([eventButton(e), eventKind(e)]);
  return out;
}

describe("InputFsm", () => {
  it("emits press after debounce and release after debounce", () => {
    const fsm = new InputFsm();
    run(fsm, 1 << BTN_SELECT, 0, 20);
    expect(drain(fsm)).toEqual([]);
    run(fsm, 1 << BTN_SELECT, 20, 100);
    expect(drain(fsm)).toEqual([[BTN_SELECT, EV_PRESS]]);
    run(fsm, 0, 100, 200);
    expect(drain(fsm)).toEqual([[BTN_SELECT, EV_RELEASE]]);
  });

  it("ignores glitches shorter than the debounce window", () => {
    const fsm = new InputFsm();
    run(fsm, 1 << BTN_UP, 0, 15);
    run(fsm, 0, 15, 100);
    expect(drain(fsm)).toEqual([]);
  });

  it("emits long press then repeats only for UP/DOWN", () => {
    const fsm = new InputFsm();
    run(fsm, (1 << BTN_DOWN) | (1 << BTN_SELECT), 0, 1000);
    const ev = drain(fsm);
    expect(ev).toContainEqual([BTN_DOWN, EV_LONG]);
    expect(ev).toContainEqual([BTN_SELECT, EV_LONG]);
    const repeats = ev.filter(([b, k]) => k === EV_REPEAT);
    expect(repeats.length).toBeGreaterThanOrEqual(2);
    expect(repeats.every(([b]) => b === BTN_DOWN)).toBe(true);
  });

  it("a bounce while releasing does not re-emit LONG", () => {
    const fsm = new InputFsm();
    run(fsm, 1 << BTN_SELECT, 0, 700);
    drain(fsm);
    run(fsm, 0, 700, 710); // release starts
    run(fsm, 1 << BTN_SELECT, 710, 720); // bounce
    run(fsm, 0, 720, 800);
    expect(drain(fsm)).toEqual([[BTN_SELECT, EV_RELEASE]]);
  });

  it("drops the oldest events when the ring overflows", () => {
    const fsm = new InputFsm({ debounceMs: 0, longMs: 1e9, repeatMs: 1e9 });
    // each cycle: two "down" samples confirm a press, two "up" samples confirm a release
    for (let i = 0; i < 40; i++) {
      const t = i * 4;
      fsm.update(1 << BTN_UP, t);
      fsm.update(1 << BTN_UP, t + 1);
      fsm.update(0, t + 2);
      fsm.update(0, t + 3);
    }
    expect(drain(fsm).length).toBe(15);
  });
});
