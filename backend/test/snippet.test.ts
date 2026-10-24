import { describe, expect, it } from "vitest";
import { runSnippet, verifyAnswer } from "../src/snippet";
import { FLOWER_ORDER, QUESTIONS } from "../../src/core/game/questions";

describe("runSnippet", () => {
  it("agrees with every question in the offline bank", () => {
    for (const c of FLOWER_ORDER)
      for (const q of QUESTIONS[c]) {
        const r = verifyAnswer(q.code, q.options, q.answer);
        expect(r.ok, q.id).toBe(true);
        expect(r.verified, q.id).toBe(true);
      }
  });

  it("captures promise output and synchronous-first ordering", () => {
    const r = runSnippet(['Promise.resolve().then(', '  () => console.log("b"));', 'console.log("a");']);
    expect(r).toEqual({ ok: true, printed: ['"a"', '"b"'] });
  });

  it("rejects a wrong marked answer", () => {
    expect(verifyAnswer(["console.log(1 + 1);"], ["1", "2", "11"], 0).verified).toBe(false);
    expect(verifyAnswer(["console.log(1 + 1);"], ["1", "2", "11"], 1).verified).toBe(true);
  });

  it("rejects duplicated options even if one is right", () => {
    expect(verifyAnswer(["console.log(2);"], ["2", "2", "3"], 0).verified).toBe(false);
  });

  it("reports a thrown error as the printed value 'Error'", () => {
    expect(runSnippet(["null.x;"])).toEqual({ ok: true, printed: ["Error"] });
  });

  it.each([
    ["process", ["console.log(process.env);"]],
    ["constructor escape", ['console.log("".constructor);']],
    ["bracket escape", ['console.log(console["log"]);']],
    ["loops", ["while(1){}"]],
    ["globalThis", ["console.log(globalThis);"]],
    ["eval", ['eval("1")']],
    ["require", ['require("fs")']],
    ["new Function", ['new Function("return 1")']],
  ])("screens out %s", (_n, code) => {
    const r = runSnippet(code);
    expect(r.ok).toBe(false);
  });

  it("times out on a promise-job flood that dodges token screening", () => {
    // recursion through promise jobs: the timeout must cover microtasks too
    const r = runSnippet(["const f = () => Promise.resolve()", "  .then(f);", "f(); console.log(1);"]);
    expect(r).toEqual({ ok: false, reason: "timeout" });
  });

  it("rejects snippets that print nothing or are too long", () => {
    expect(runSnippet(["let x = 1;"])).toEqual({ ok: false, reason: "prints nothing" });
    expect(runSnippet(["console.log(1);".repeat(10)]).ok).toBe(false);
  });
});
