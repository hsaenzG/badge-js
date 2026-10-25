import { describe, expect, it } from "vitest";
import { GuardianClient, toBody, type Transport } from "../src/core/guardianClient";
import { BTN_DOWN, BTN_SELECT, EV_PRESS } from "../src/core/inputFsm";
import { Game, ST_CHALLENGE, ST_FEEDBACK, ST_VICTORY, VICTORY_MAX_LINES, type GuardianRequest } from "../src/core/game/game";
import { autoplayInput, autoplayUntil } from "../src/core/game/autoplay";
import { MessageRequest } from "../backend/src/contract";
import { isBadgeLine } from "../src/core/badgeText";

const press = (g: Game, b: number) => g.input(b, EV_PRESS);
const never = () => new Promise<void>(() => undefined);
const deferred = <T>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};
const req: GuardianRequest = { token: 1, kind: "cheer", concept: "objects", flowers: 2 };
const ok = (text: unknown): Transport => async () => ({ status: 200, json: { v: 1, text, source: "ai" } });

describe("GuardianClient", () => {
  it("returns a valid line and posts only contract fields", async () => {
    const seen: unknown[] = [];
    const c = new GuardianClient(async (path, body) => (seen.push([path, body]), { status: 200, json: { v: 1, text: "¡Bien, ranita!" } }), never, () => 0);
    expect(await c.line(req)).toBe("¡Bien, ranita!");
    expect(seen).toEqual([["/v1/message", { kind: "cheer", concept: "objects", flowers: 2 }]]);
  });

  it("every body the game can produce is accepted by the backend contract", () => {
    for (const r of [
      req,
      { token: 2, kind: "hint", questionId: "pr-1", concept: "promises", attempt: 9 },
      { token: 3, kind: "final", flowers: 4, petals: 999, seconds: 3600 },
    ] as GuardianRequest[]) {
      expect(MessageRequest.safeParse(toBody(r)).success).toBe(true);
    }
  });

  it.each([
    ["http error", async () => ({ status: 503, json: { v: 1, error: "unavailable" } })],
    ["wrong version", async () => ({ status: 200, json: { v: 2, text: "hola" } })],
    ["emoji", ok("hola 🔥")],
    ["too long", ok("x".repeat(141))],
    ["empty", ok("   ")],
    ["not a string", ok(42)],
    ["network error", async () => Promise.reject(new Error("ECONNRESET"))],
  ] as Array<[string, Transport]>)("falls back on %s", async (_n, t) => {
    const c = new GuardianClient(t, never, () => 0);
    expect(await c.line(req)).toBeNull();
    expect(c.stats.failed).toBe(1);
    expect(c.inFlight).toBe(false);
  });

  it("times out, and keeps the slot until the slow request settles", async () => {
    const slow = deferred<{ status: number; json: unknown }>();
    const tick = deferred<void>();
    const c = new GuardianClient(() => slow.promise, () => tick.promise, () => 0, 8000);
    const first = c.line(req);
    tick.resolve();
    expect(await first).toBeNull();
    expect(c.stats.lastError).toBe("timeout");
    expect(c.inFlight).toBe(true); // the TLS request is still running
    expect(await c.line(req)).toBeNull(); // dropped, not queued
    expect(c.stats.dropped).toBe(1);
    slow.resolve({ status: 200, json: { v: 1, text: "tarde" } });
    await slow.promise;
    await Promise.resolve();
    expect(c.inFlight).toBe(false);
  });
});

describe("Game ⇄ Guardián", () => {
  function toFirstChallenge(): Game {
    const g = new Game();
    press(g, BTN_SELECT);
    press(g, BTN_SELECT);
    autoplayUntil(g, () => g.state === ST_CHALLENGE);
    return g;
  }

  it("a wrong answer asks for a hint; the reply replaces the local hint on that screen", () => {
    const g = toFirstChallenge();
    const q = g.question!;
    while (g.option !== (q.answer + 1) % 3) press(g, BTN_DOWN);
    press(g, BTN_SELECT);
    const r = g.nextGuardianRequest()!;
    expect(r).toMatchObject({ kind: "hint", questionId: q.id, concept: q.concept, attempt: 1 });
    expect(g.feedbackLines.join(" ")).toContain(q.hint);
    expect(g.guardianReply(r.token, "Mira bien qué valor guarda x al final.")).toBe(true);
    expect(g.feedbackLines[0]).toBe("Casi. El Guardián te deja una pista:");
    expect(g.feedbackLines.join(" ")).toContain("Mira bien qué valor guarda x");
    expect(g.guardianSource).toBe("ai");
  });

  it("a correct answer asks for a cheer and keeps the explanation", () => {
    const g = toFirstChallenge();
    const q = g.question!;
    while (g.option !== q.answer) press(g, BTN_DOWN);
    press(g, BTN_SELECT);
    const r = g.nextGuardianRequest()!;
    expect(r).toMatchObject({ kind: "cheer", concept: q.concept, flowers: 1 });
    g.guardianReply(r.token, "¡La primera flor ya brilla, ranita!");
    expect(g.feedbackLines[0]).toBe("¡La primera flor ya brilla, ranita!");
    expect(g.feedbackLines.join(" ")).toContain(q.explain);
    expect(g.feedbackLines.length).toBeLessThanOrEqual(5);
  });

  it("a late reply for a screen the player already left is ignored", () => {
    const g = toFirstChallenge();
    const q = g.question!;
    while (g.option !== q.answer) press(g, BTN_DOWN);
    press(g, BTN_SELECT);
    const r = g.nextGuardianRequest()!;
    const before = [...g.feedbackLines];
    press(g, BTN_SELECT); // leave feedback
    expect(g.state).not.toBe(ST_FEEDBACK);
    expect(g.guardianReply(r.token, "demasiado tarde")).toBe(false);
    expect(g.guardianSource).toBe("local");
    expect(before.length).toBeGreaterThan(0);
  });

  it("victory asks for a final message that fits the victory box", () => {
    const g = new Game();
    press(g, BTN_SELECT);
    press(g, BTN_SELECT);
    let final: GuardianRequest | undefined;
    for (let i = 0; i < 60 * 600 && g.state !== ST_VICTORY; i++) {
      g.tick(autoplayInput(g));
      for (let r = g.nextGuardianRequest(); r; r = g.nextGuardianRequest()) if (r.kind === "final") final = r;
    }
    expect(g.state).toBe(ST_VICTORY);
    expect(final).toMatchObject({ kind: "final", flowers: 4 });
    expect(final!.seconds).toBeGreaterThan(60);
    const long = "¡Felicidades, ranita! Has completado el Mictlán con cuatro flores. Ahora crea una herramienta con AWS Lambda y compártela con tu comunidad.";
    expect(isBadgeLine(long)).toBe(true);
    expect(g.guardianReply(final!.token, long)).toBe(true);
    expect(g.finalLines.length).toBeLessThanOrEqual(VICTORY_MAX_LINES);
    expect(g.finalLines.every((l) => Array.from(l).length <= 26)).toBe(true);
  });

  it("only the newest, still-relevant request is handed to the host", () => {
    const g = toFirstChallenge();
    const q = g.question!;
    for (let i = 0; i < 10; i++) {
      while (g.option !== (q.answer + 1) % 3) press(g, BTN_DOWN);
      press(g, BTN_SELECT); // wrong → feedback (+request)
      press(g, BTN_SELECT); // back to the challenge
    }
    expect(g.state).toBe(ST_CHALLENGE); // the last feedback screen was left
    expect(g.nextGuardianRequest()).toBeUndefined(); // so its request is stale: nothing to send
    while (g.option !== (q.answer + 1) % 3) press(g, BTN_DOWN);
    press(g, BTN_SELECT); // a fresh wrong answer
    const r = g.nextGuardianRequest()!;
    expect(r).toMatchObject({ kind: "hint", attempt: 9 });
    expect(g.nextGuardianRequest()).toBeUndefined(); // handed out once
  });
});
