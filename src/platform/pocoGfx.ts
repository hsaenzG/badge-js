/**
 * Gfx on the badge: Commodetto Poco + JetBrains Mono TTF.
 * Palette goes through PANEL_SAFE (NV3007 renders very dark levels bright).
 * Sprites are pre-encoded at startup into horizontal runs, so drawing one is a
 * handful of fillRectangle calls and nothing is allocated per frame.
 */
import type { FontId, Gfx } from "core/gfx";
import { PALETTE, PANEL_SAFE, rgb } from "core/game/palette";
import { SCALE, SPRITE_DEFS, decodeSprite } from "core/game/sprites";

/** Per sprite: [x, y, w, color, x, y, w, color, ...] in screen px (already scaled). */
type Runs = Int16Array;

export class PocoGfx implements Gfx {
  readonly width: number;
  readonly height: number;
  private readonly colors: number[];
  private readonly runs: Runs[];
  private readonly widths: number[];

  constructor(
    private readonly poco: any,
    private readonly fonts: Readonly<Record<FontId, any>>,
  ) {
    this.width = poco.width;
    this.height = poco.height;
    this.colors = PALETTE.map((hex, i) => {
      const [r, g, b] = rgb(PANEL_SAFE[i] ?? hex);
      return poco.makeColor(r, g, b);
    });
    this.widths = SPRITE_DEFS.map((d) => d.rows[0]!.length * SCALE);
    this.runs = SPRITE_DEFS.map((def) => {
      const px = decodeSprite(def);
      const w = def.rows[0]!.length;
      const out: number[] = [];
      for (let y = 0; y < def.rows.length; y++) {
        let x = 0;
        while (x < w) {
          const c = px[y * w + x]!;
          let e = x + 1;
          while (e < w && px[y * w + e] === c) e++;
          if (c !== 0) out.push(x * SCALE, y * SCALE, (e - x) * SCALE, c);
          x = e;
        }
      }
      return Int16Array.from(out);
    });
  }

  fill(c: number, x: number, y: number, w: number, h: number): void {
    this.poco.fillRectangle(this.colors[c], x | 0, y | 0, w | 0, h | 0);
  }

  sprite(id: number, x: number, y: number, flip = false): void {
    const r = this.runs[id]!;
    const sw = this.widths[id]!;
    const x0 = x | 0;
    const y0 = y | 0;
    for (let i = 0; i < r.length; i += 4) {
      const rx = flip ? sw - r[i]! - r[i + 2]! : r[i]!;
      this.poco.fillRectangle(this.colors[r[i + 3]!], x0 + rx, y0 + r[i + 1]!, r[i + 2]!, SCALE);
    }
  }

  text(s: string, font: FontId, c: number, x: number, y: number): void {
    this.poco.drawText(s, this.fonts[font], this.colors[c], x | 0, y | 0);
  }

  textWidth(s: string, font: FontId): number {
    return this.poco.getTextWidth(s, this.fonts[font]);
  }
}
