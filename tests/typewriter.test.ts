import { describe, expect, it } from "vitest";
import { Typewriter, newSample } from "../src/core/typewriter";
import { INTRO_LINES, WHOAMI_LINES } from "../src/core/content";

const line = (text: string, deleteMs = 0) => ({ text, typeMs: 10, holdMs: 100, deleteMs, pauseMs: 50 });

describe("Typewriter", () => {
  it("types one code point per tick, counting accents as one", () => {
    const tw = new Typewriter([line("Sáenz")]);
    const s = newSample();
    expect(tw.sample(0, s).text).toBe("");
    expect(tw.sample(10, s).text).toBe("S");
    expect(tw.sample(20, s).text).toBe("Sá");
    expect(tw.sample(29, s).count).toBe(2);
    expect(tw.sample(50, s)).toMatchObject({ text: "Sáenz", phase: "holding" });
  });

  it("keeps a line without a delete phase and reports done", () => {
    const tw = new Typewriter([line("ok")]);
    expect(tw.totalMs).toBe(2 * 10 + 100);
    expect(tw.sample(10_000, newSample())).toMatchObject({ text: "ok", phase: "done", line: 0 });
  });

  it("deletes, pauses, then moves to the next line", () => {
    const tw = new Typewriter([line("ab", 5), line("cd")]);
    const s = newSample();
    // type 0-20, hold 20-120, delete 120-130, pause 130-180
    expect(tw.sample(121, s)).toMatchObject({ phase: "deleting", text: "ab" });
    expect(tw.sample(125, s)).toMatchObject({ phase: "deleting", text: "a" });
    expect(tw.sample(150, s)).toMatchObject({ phase: "pausing", text: "" });
    expect(tw.sample(190, s)).toMatchObject({ line: 1, phase: "typing", text: "c" });
  });

  it("shows a solid cursor while typing and blinks while holding", () => {
    const tw = new Typewriter([{ text: "x", typeMs: 10, holdMs: 5000, deleteMs: 0, pauseMs: 0 }]);
    const s = newSample();
    expect(tw.sample(5, s).cursorOn).toBe(true);
    expect(tw.sample(600, s).cursorOn).toBe(false);
    expect(tw.sample(1100, s).cursorOn).toBe(true);
  });

  it("reuses the same sample object and precomputed strings (no per-frame allocation)", () => {
    const tw = new Typewriter([line("hola")]);
    const s = newSample();
    const a = tw.sample(25, s).text;
    const b = tw.sample(26, s).text;
    expect(tw.sample(25, s)).toBe(s);
    expect(a).toBe(b); // identical string instance from the prefix table
  });

  it("rejects an empty script", () => {
    expect(() => new Typewriter([])).toThrow(RangeError);
  });

  it("intro content matches the profile README lines", () => {
    const tw = new Typewriter(INTRO_LINES);
    expect(tw.lineCount).toBe(3);
    expect(tw.fullText(0)).toBe(">_ LATAM Developer Advocate @ AWS");
    expect(tw.fullText(1)).toBe(">_ Serverless + GenAI + Comunidad");
    expect(tw.fullText(2)).toBe(">_ Empoderando builders en LATAM");
    expect(tw.totalMs).toBeLessThan(12_000);
    expect(new Typewriter(WHOAMI_LINES).fullText(0)).toBe(">_ whoami");
  });
});
