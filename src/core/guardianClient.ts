/**
 * Badge side of the online Guardián (Phase 3). Pure TypeScript: the HTTPS transport
 * and the timer are injected, so this runs the same in Node tests, the browser
 * simulator and Moddable on the badge.
 *
 * Offline first: every failure (no network, timeout, HTTP error, bad JSON, text the
 * badge can't draw) resolves to null and the game keeps its local text.
 */
import { isBadgeLine } from "./badgeText";
import type { GuardianRequest } from "./game/game";

/** POST `body` as JSON to `path` (e.g. "/v1/message"); resolve with the parsed JSON body. */
export type Transport = (path: string, body: unknown) => Promise<{ status: number; json: unknown }>;
export type Delay = (ms: number) => Promise<void>;

export interface GuardianClientStats {
  sent: number;
  applied: number;
  failed: number;
  dropped: number;
  lastError: string;
  lastMs: number;
}

export class GuardianClient {
  private busy = false;
  readonly stats: GuardianClientStats = { sent: 0, applied: 0, failed: 0, dropped: 0, lastError: "", lastMs: 0 };

  constructor(
    private readonly transport: Transport,
    private readonly delay: Delay,
    private readonly now: () => number,
    private readonly timeoutMs = 8000,
  ) {}

  get inFlight(): boolean {
    return this.busy;
  }

  /**
   * Ask the backend for one Guardián line. Only one request at a time: while one is in
   * flight (TLS on the ESP32 is slow and memory-hungry) new ones are dropped, and the
   * game shows its local line. A timed-out request keeps the slot until it settles.
   */
  async line(req: GuardianRequest): Promise<string | null> {
    if (this.busy) {
      this.stats.dropped++;
      return null;
    }
    this.busy = true;
    this.stats.sent++;
    const t0 = this.now();
    const call = this.transport("/v1/message", toBody(req)).finally(() => {
      this.busy = false;
    });
    let timedOut = false;
    try {
      const r = await Promise.race([
        call,
        this.delay(this.timeoutMs).then(() => {
          timedOut = true;
          return null;
        }),
      ]);
      this.stats.lastMs = this.now() - t0;
      if (r === null || timedOut) return this.fail("timeout");
      if (r.status !== 200) return this.fail(`http ${r.status}`);
      const j = r.json as { v?: unknown; text?: unknown } | null;
      if (!j || j.v !== 1) return this.fail("bad response");
      if (!isBadgeLine(j.text)) return this.fail("unprintable text");
      this.stats.applied++;
      return j.text;
    } catch (e) {
      return this.fail(e instanceof Error ? e.message : "error");
    } finally {
      // keep the rejected/late transport promise from becoming an unhandled rejection
      call.catch(() => undefined);
    }
  }

  private fail(reason: string): null {
    this.stats.failed++;
    this.stats.lastError = reason.slice(0, 60);
    return null;
  }
}

/** Request body for /v1/message: only the contract's fields, never free text. */
export function toBody(req: GuardianRequest): Record<string, string | number> {
  const b: Record<string, string | number> = { kind: req.kind };
  if (req.concept) b.concept = req.concept;
  if (req.questionId) b.questionId = req.questionId;
  if (req.attempt !== undefined) b.attempt = req.attempt;
  if (req.flowers !== undefined) b.flowers = req.flowers;
  if (req.petals !== undefined) b.petals = req.petals;
  if (req.seconds !== undefined) b.seconds = req.seconds;
  return b;
}
