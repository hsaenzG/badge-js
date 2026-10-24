/**
 * Typewriter animation, modeled on readme-typing-svg:
 * type a line, hold it, optionally delete it, pause, then the next line.
 *
 * Pure and deterministic: the state is a function of elapsed time only.
 * Strings are split by Unicode code point at construction, so "á" is one step.
 * Every visible prefix is precomputed, so `sample()` never allocates.
 */

export interface TypeLine {
  readonly text: string;
  /** Milliseconds per code point while typing. */
  readonly typeMs: number;
  /** Milliseconds the full line stays on screen. */
  readonly holdMs: number;
  /** Milliseconds per code point while deleting. 0 keeps the line (no delete phase). */
  readonly deleteMs: number;
  /** Milliseconds of empty screen after deleting (ignored when deleteMs is 0). */
  readonly pauseMs: number;
}

export type TypePhase = "typing" | "holding" | "deleting" | "pausing" | "done";

export interface TypeSample {
  line: number;
  /** Visible text for the current line (shared, precomputed string). */
  text: string;
  /** Number of visible code points. */
  count: number;
  phase: TypePhase;
  cursorOn: boolean;
}

export const CURSOR_BLINK_MS = 500;

interface CompiledLine {
  readonly prefixes: readonly string[];
  readonly length: number;
  readonly typeEnd: number;
  readonly holdEnd: number;
  readonly deleteEnd: number;
  readonly end: number;
  readonly source: TypeLine;
}

export class Typewriter {
  readonly totalMs: number;
  private readonly lines: readonly CompiledLine[];

  constructor(script: readonly TypeLine[]) {
    if (script.length === 0) throw new RangeError("script is empty");
    let t = 0;
    const lines: CompiledLine[] = [];
    for (const source of script) {
      const points = Array.from(source.text);
      const prefixes: string[] = [""];
      let acc = "";
      for (const p of points) {
        acc += p;
        prefixes.push(acc);
      }
      const start = t;
      const typeEnd = start + points.length * source.typeMs;
      const holdEnd = typeEnd + source.holdMs;
      const deleteEnd = source.deleteMs > 0 ? holdEnd + points.length * source.deleteMs : holdEnd;
      const end = source.deleteMs > 0 ? deleteEnd + source.pauseMs : holdEnd;
      lines.push({ prefixes, length: points.length, typeEnd, holdEnd, deleteEnd, end, source });
      t = end;
    }
    this.lines = lines;
    this.totalMs = t;
  }

  get lineCount(): number {
    return this.lines.length;
  }

  /** Full text of a line (for screens that show finished lines). */
  fullText(line: number): string {
    const l = this.lines[line];
    if (!l) throw new RangeError(`line ${line}`);
    return l.prefixes[l.length] ?? "";
  }

  /** Fill `out` with the state at `elapsedMs`. Never allocates. */
  sample(elapsedMs: number, out: TypeSample): TypeSample {
    const t = elapsedMs < 0 ? 0 : elapsedMs;
    out.cursorOn = Math.floor(t / CURSOR_BLINK_MS) % 2 === 0;
    let start = 0;
    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i]!;
      if (t < l.end || i === this.lines.length - 1) {
        out.line = i;
        if (t < l.typeEnd) {
          const n = Math.min(l.length, Math.floor((t - start) / l.source.typeMs));
          out.phase = "typing";
          out.count = n;
          out.cursorOn = true; // solid cursor while typing, like a real terminal
        } else if (t < l.holdEnd) {
          out.phase = "holding";
          out.count = l.length;
        } else if (t < l.deleteEnd) {
          const gone = Math.floor((t - l.holdEnd) / l.source.deleteMs);
          out.phase = "deleting";
          out.count = Math.max(0, l.length - gone);
          out.cursorOn = true;
        } else if (t < l.end) {
          out.phase = "pausing";
          out.count = 0;
        } else {
          out.phase = "done";
          out.count = l.source.deleteMs > 0 ? 0 : l.length;
        }
        out.text = l.prefixes[out.count] ?? "";
        return out;
      }
      start = l.end;
    }
    /* c8 ignore next */
    throw new Error("unreachable");
  }
}

export function newSample(): TypeSample {
  return { line: 0, text: "", count: 0, phase: "typing", cursorOn: true };
}
