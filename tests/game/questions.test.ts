import { describe, expect, it } from "vitest";
import vm from "node:vm";
import { FLOWER_ORDER, QUESTIONS, questionFor, type Question } from "../../src/core/game/questions";

const all: Question[] = FLOWER_ORDER.flatMap((c) => [...QUESTIONS[c]]);

/** Format a logged value the way the options show it ("listo" vs 7). */
const show = (v: unknown): string => (typeof v === "string" ? JSON.stringify(v) : String(v));

/** Run a snippet in a sandbox and return everything console.log printed, in order. */
async function run(code: readonly string[]): Promise<string[]> {
  const out: string[] = [];
  const sandbox = { console: { log: (...a: unknown[]) => out.push(a.map(show).join(" ")) }, Promise };
  vm.runInNewContext(code.join("\n"), sandbox, { timeout: 500 });
  await new Promise((r) => setTimeout(r, 0)); // flush microtasks (promises)
  return out;
}

describe("question bank", () => {
  it("has two variants for each of the four flowers, with unique ids", () => {
    expect(FLOWER_ORDER).toEqual(["variables", "functions", "promises", "objects"]);
    expect(all).toHaveLength(8);
    expect(new Set(all.map((q) => q.id)).size).toBe(8);
  });

  it.each(all.map((q) => [q.id, q] as const))("%s: the marked answer is what JavaScript prints", async (_id, q) => {
    const printed = await run(q.code);
    expect(printed.length).toBeGreaterThan(0);
    // questions ask for the first value printed
    expect(printed[0]).toBe(q.options[q.answer]);
    // and no other option is also correct
    expect(q.options.filter((o) => o === printed[0])).toHaveLength(1);
  });

  it.each(all.map((q) => [q.id, q] as const))("%s: fits the 428×142 challenge layout", (_id, q) => {
    expect(q.code.length).toBeGreaterThanOrEqual(1);
    expect(q.code.length).toBeLessThanOrEqual(3);
    for (const line of q.code) expect(Array.from(line).length).toBeLessThanOrEqual(30);
    for (const o of q.options) expect(Array.from(o).length).toBeLessThanOrEqual(12);
    expect(Array.from(q.question).length).toBeLessThanOrEqual(34);
    expect(Array.from(q.intro).length).toBeLessThanOrEqual(100);
  });

  it("matches the four challenges specified in game.md", () => {
    expect(questionFor(0, 0).code.join(" ")).toContain("x += 2");
    expect(questionFor(1, 0).options[questionFor(1, 0).answer]).toBe("8");
    expect(questionFor(2, 0).options[questionFor(2, 0).answer]).toBe('"listo"');
    expect(questionFor(3, 0).options[questionFor(3, 0).answer]).toBe('"Kiro"');
  });

  it("alternates variants on replay", () => {
    expect(questionFor(0, 1).id).toBe("var-2");
    expect(questionFor(0, 2).id).toBe("var-1");
  });
});
