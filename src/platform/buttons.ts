/**
 * Front buttons via ECMA-419 Digital IO.
 * GPIOs and pull-up/active-low come from the stock firmware (docs/hardware.md §2.6).
 */
import Digital from "embedded:io/digital";
import { BTN_BACK, BTN_DOWN, BTN_SELECT, BTN_UP } from "core/inputFsm";

const PINS: ReadonlyArray<readonly [button: number, gpio: number]> = [
  [BTN_UP, 40],
  [BTN_DOWN, 43],
  [BTN_SELECT, 18],
  [BTN_BACK, 1],
];

export class Buttons {
  private readonly inputs: Array<{ read(): number }> = [];
  private readonly bits: number[] = [];

  constructor() {
    for (const [button, pin] of PINS) {
      this.inputs.push(new Digital({ pin, mode: Digital.InputPullUp }));
      this.bits.push(1 << button);
    }
  }

  /** Bitmask of pressed buttons (active low on the badge). */
  read(): number {
    let mask = 0;
    for (let i = 0; i < this.inputs.length; i++) {
      if (this.inputs[i]!.read() === 0) mask |= this.bits[i]!;
    }
    return mask;
  }
}
