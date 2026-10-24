import { beforeEach, describe, expect, it } from "vitest";
import { MUSIC_RUN, SFX, SND_JUMP, SND_VICTORY, tuneMs } from "../../src/core/game/sound";

/** Minimal WebAudio stand-in: records every oscillator start. */
class FakeParam {
  value = 0;
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  setTargetAtTime() {}
  cancelScheduledValues() {}
}
class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  type = "";
  connect<T>(n: T): T {
    return n;
  }
}
const started: Array<{ t: number; hz: number; type: string }> = [];
class FakeOsc extends FakeNode {
  start(t: number) {
    started.push({ t, hz: this.frequency.value, type: this.type });
  }
  stop() {}
}
class FakeContext {
  currentTime = 0;
  state = "running";
  destination = new FakeNode();
  createGain() {
    return new FakeNode();
  }
  createOscillator() {
    return new FakeOsc();
  }
  resume() {
    return Promise.resolve();
  }
}
(globalThis as any).AudioContext = FakeContext;

const { ChipAudio } = await import("../../sim/audio");

const notesIn = (t: (typeof SFX)[number]) => t.filter(([hz]) => hz > 0).length;

describe("ChipAudio (simulator)", () => {
  beforeEach(() => {
    started.length = 0;
  });

  it("stays silent until unlocked by a user gesture", () => {
    const a = new ChipAudio();
    a.play(SND_JUMP);
    a.music(true);
    expect(started).toHaveLength(0);
    expect(a.state).toBe("locked");
  });

  it("plays each effect's notes as square waves at the right pitches", () => {
    const a = new ChipAudio();
    a.unlock();
    a.play(SND_JUMP);
    expect(started.map((n) => n.hz)).toEqual(SFX[SND_JUMP]!.map(([hz]) => hz));
    expect(started.every((n) => n.type === "square")).toBe(true);
    started.length = 0;
    a.play(SND_VICTORY);
    expect(started).toHaveLength(notesIn(SFX[SND_VICTORY]!)); // rests are skipped
    const times = started.map((n) => n.t);
    expect([...times].sort((x, y) => x - y)).toEqual(times); // in order
  });

  it("schedules the run music ~1 s ahead on two voices and does not reschedule early", () => {
    const a = new ChipAudio();
    a.unlock();
    a.music(true);
    const loopNotes = notesIn(MUSIC_RUN.lead) + notesIn(MUSIC_RUN.bass);
    expect(started).toHaveLength(loopNotes); // one loop covers > 1 s
    expect(tuneMs(MUSIC_RUN.lead)).toBeGreaterThan(1000);
    expect(started.some((n) => n.type === "triangle")).toBe(true);
    a.music(true); // same time: nothing new
    expect(started).toHaveLength(loopNotes);
  });

  it("does not hang or pile up notes when the context clock is frozen (suspended tab)", () => {
    const a = new ChipAudio();
    a.unlock();
    for (let i = 0; i < 1000; i++) a.music(true); // currentTime never advances
    const loopNotes = notesIn(MUSIC_RUN.lead) + notesIn(MUSIC_RUN.bass);
    expect(started).toHaveLength(loopNotes);
  });

  it("stopping and restarting music starts a fresh loop", () => {
    const a = new ChipAudio();
    a.unlock();
    a.music(true);
    a.music(false);
    const before = started.length;
    a.music(true);
    expect(started.length).toBeGreaterThan(before);
  });
});
