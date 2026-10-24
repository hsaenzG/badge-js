/**
 * Runs a challenge snippet to find out what it really prints, so an AI-written
 * challenge is only accepted when its marked answer is true.
 *
 * Defence in depth, not a security boundary: snippets come from our own model
 * prompt (no user text reaches it), are tiny, and are screened before running.
 * `node:vm` runs them in a fresh context with only `console`, a 50 ms timeout
 * that also covers promise jobs (microtaskMode "afterEvaluate"), and no timers,
 * modules, process or global access.
 */
import vm from "node:vm";

const MAX_CODE_CHARS = 120;
const TIMEOUT_MS = 50;

/** Tokens a 3-line teaching snippet never needs and an escape attempt usually does. */
const DENY = /\b(import|require|process|global|globalThis|Function|eval|constructor|prototype|__proto__|Reflect|Proxy|while|for|do|setTimeout|setInterval|setImmediate|queueMicrotask|Atomics|SharedArrayBuffer|WebAssembly|this|arguments|async|await|class|new|with)\b|\[\s*["'`]/;

export type RunResult = { ok: true; printed: string[] } | { ok: false; reason: string };

/** Same formatting the offline bank uses for its options: strings quoted, the rest String(). */
export function show(v: unknown): string {
  return typeof v === "string" ? JSON.stringify(v) : String(v);
}

export function runSnippet(lines: readonly string[]): RunResult {
  const code = lines.join("\n");
  if (code.length > MAX_CODE_CHARS) return { ok: false, reason: "too long" };
  if (DENY.test(code)) return { ok: false, reason: "disallowed token" };

  const printed: string[] = [];
  const hostLog = (args: unknown[]): void => {
    if (printed.length < 8) printed.push(args.map(show).join(" "));
  };
  const context = vm.createContext(
    { __host: hostLog },
    { codeGeneration: { strings: false, wasm: false }, microtaskMode: "afterEvaluate" },
  );
  try {
    // console.log is defined INSIDE the context: a host function passed to then() would
    // queue its job on the host's microtask queue and run after we read `printed`.
    new vm.Script("const console = Object.freeze({ log: (...a) => __host(a) });", { filename: "prelude.js" }).runInContext(context);
    new vm.Script(code, { filename: "challenge.js" }).runInContext(context, { timeout: TIMEOUT_MS });
  } catch (e) {
    // errors thrown by the snippet come from the context's realm, so no `instanceof Error`
    if ((e as { code?: string } | null)?.code === "ERR_SCRIPT_EXECUTION_TIMEOUT") return { ok: false, reason: "timeout" };
    printed.push("Error");
  }
  if (printed.length === 0) return { ok: false, reason: "prints nothing" };
  return { ok: true, printed };
}

/** True when the snippet's first printed line is exactly the marked option and unique among options. */
export function verifyAnswer(code: readonly string[], options: readonly string[], answer: number): RunResult & { verified?: boolean } {
  const r = runSnippet(code);
  if (!r.ok) return r;
  const first = r.printed[0]!;
  const unique = new Set(options).size === options.length;
  return { ...r, verified: unique && options[answer] === first };
}
