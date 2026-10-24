/**
 * Debounce + long-press + auto-repeat for the four front buttons.
 * Feed it the raw pressed bitmask and a monotonic time; read events out.
 * Fixed-size ring buffer, no allocation after construction.
 */

export const BUTTON_COUNT = 4;
export const BTN_UP = 0;
export const BTN_DOWN = 1;
export const BTN_SELECT = 2;
export const BTN_BACK = 3;

export const EV_PRESS = 1;
export const EV_RELEASE = 2;
export const EV_LONG = 3;
export const EV_REPEAT = 4;

export interface InputTiming {
  debounceMs: number;
  longMs: number;
  repeatMs: number;
}

export const DEFAULT_TIMING: InputTiming = { debounceMs: 25, longMs: 600, repeatMs: 120 };

const ST_IDLE = 0;
const ST_DEB_DOWN = 1;
const ST_PRESSED = 2;
const ST_LONG = 3;
const ST_DEB_UP = 4;

const RING = 16;

export class InputFsm {
  private readonly state = new Uint8Array(BUTTON_COUNT);
  private readonly since = new Float64Array(BUTTON_COUNT);
  private readonly nextRepeat = new Float64Array(BUTTON_COUNT);
  private readonly releasedAt = new Float64Array(BUTTON_COUNT);
  private readonly heldState = new Uint8Array(BUTTON_COUNT); // ST_PRESSED or ST_LONG before release debounce
  private readonly repeatMask: number;
  private readonly timing: InputTiming;
  // ring buffer: event = button | (kind << 4)
  private readonly ring = new Uint8Array(RING);
  private head = 0;
  private tail = 0;

  /** @param repeatMask bit per button that auto-repeats when held (default UP + DOWN). */
  constructor(timing: InputTiming = DEFAULT_TIMING, repeatMask = (1 << BTN_UP) | (1 << BTN_DOWN)) {
    this.timing = timing;
    this.repeatMask = repeatMask;
  }

  update(rawPressed: number, now: number): void {
    const { debounceMs, longMs, repeatMs } = this.timing;
    for (let b = 0; b < BUTTON_COUNT; b++) {
      const down = (rawPressed >> b) & 1;
      switch (this.state[b]) {
        case ST_IDLE:
          if (down) {
            this.state[b] = ST_DEB_DOWN;
            this.since[b] = now;
          }
          break;
        case ST_DEB_DOWN:
          if (!down) this.state[b] = ST_IDLE;
          else if (now - this.since[b]! >= debounceMs) {
            this.state[b] = ST_PRESSED;
            this.since[b] = now;
            this.push(b, EV_PRESS);
          }
          break;
        case ST_PRESSED:
        case ST_LONG:
          if (!down) {
            this.heldState[b] = this.state[b]!;
            this.state[b] = ST_DEB_UP;
            this.releasedAt[b] = now;
          } else if (this.state[b] === ST_PRESSED && now - this.since[b]! >= longMs) {
            this.state[b] = ST_LONG;
            this.push(b, EV_LONG);
            this.nextRepeat[b] = now + repeatMs;
          } else if (this.state[b] === ST_LONG && (this.repeatMask >> b) & 1 && now >= this.nextRepeat[b]!) {
            this.push(b, EV_REPEAT);
            this.nextRepeat[b] = now + repeatMs;
          }
          break;
        case ST_DEB_UP:
          if (down) {
            // bounce while releasing: still held, keep long/repeat progress
            this.state[b] = this.heldState[b]!;
          } else if (now - this.releasedAt[b]! >= debounceMs) {
            this.state[b] = ST_IDLE;
            this.push(b, EV_RELEASE);
          }
          break;
      }
    }
  }

  /** Returns the next event as `button | (kind << 4)`, or -1 when empty. */
  next(): number {
    if (this.head === this.tail) return -1;
    const e = this.ring[this.tail]!;
    this.tail = (this.tail + 1) % RING;
    return e;
  }

  private push(button: number, kind: number): void {
    const n = (this.head + 1) % RING;
    if (n === this.tail) this.tail = (this.tail + 1) % RING; // drop oldest
    this.ring[this.head] = button | (kind << 4);
    this.head = n;
  }
}

export const eventButton = (e: number): number => e & 0x0f;
export const eventKind = (e: number): number => e >> 4;
