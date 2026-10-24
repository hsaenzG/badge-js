/**
 * Minimal drawing surface shared by the badge (Poco) and the simulator (Canvas).
 * Colors are palette indices; sprites are ids registered at startup.
 * Renderers written against this interface run unchanged on both targets.
 */

export type FontId = "s" | "m" | "l" | "mb" | "lb";

export interface Gfx {
  readonly width: number;
  readonly height: number;
  /** Fill a rectangle with palette color `c`. */
  fill(c: number, x: number, y: number, w: number, h: number): void;
  /** Draw a registered sprite (transparent pixels skipped). `flip` mirrors horizontally. */
  sprite(id: number, x: number, y: number, flip?: boolean): void;
  /** Draw text, top-left anchored. */
  text(s: string, font: FontId, c: number, x: number, y: number): void;
  /** Pixel width of `s` in `font`. */
  textWidth(s: string, font: FontId): number;
}

/** Pixel heights per font id (JetBrains Mono sizes used by both adapters). */
export const FONT_SIZE: Readonly<Record<FontId, number>> = { s: 11, m: 13, l: 15, mb: 13, lb: 20 };

/** JetBrains Mono advance width is 0.6 em on every glyph. */
export const monoWidth = (s: string, font: FontId): number => Math.round(Array.from(s).length * FONT_SIZE[font] * 0.6);
