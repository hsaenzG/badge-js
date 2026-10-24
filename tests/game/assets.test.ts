import { describe, expect, it } from "vitest";
import { SPRITE_DEFS, decodeSprite, spriteSize, SPR_FROG_IDLE, SPR_FROG_RUN, SPR_FROG_JUMP } from "../../src/core/game/sprites";
import { PALETTE, PANEL_SAFE } from "../../src/core/game/palette";
import { buildLevel, OB_SKULL } from "../../src/core/game/level";
import { wrap } from "../../src/core/text";

describe("sprites", () => {
  it.each(SPRITE_DEFS.map((d) => [d.name, d] as const))("%s decodes with rectangular rows and known colors", (_n, d) => {
    const px = decodeSprite(d);
    expect(px.length).toBe(d.rows.length * d.rows[0]!.length);
    for (const c of px) expect(c).toBeLessThan(PALETTE.length);
  });

  it("frog animation frames share one size", () => {
    expect(spriteSize(SPR_FROG_RUN)).toEqual(spriteSize(SPR_FROG_IDLE));
    expect(spriteSize(SPR_FROG_JUMP)).toEqual(spriteSize(SPR_FROG_IDLE));
    expect(spriteSize(SPR_FROG_IDLE)).toEqual({ w: 24, h: 24 });
  });

  it("panel-safe overrides only touch known palette entries", () => {
    for (const k of Object.keys(PANEL_SAFE)) expect(Number(k)).toBeLessThan(PALETTE.length);
  });
});

describe("level", () => {
  const lv = buildLevel();

  it("has four flowers in order and ends at the ofrenda", () => {
    expect(lv.flowers).toHaveLength(4);
    for (let i = 1; i < 4; i++) expect(lv.flowers[i]!).toBeGreaterThan(lv.flowers[i - 1]!);
    expect(lv.ofrendaX).toBeGreaterThan(lv.flowers[3]!);
  });

  it("keeps a safe zone around every flower (checkpoint)", () => {
    for (const f of lv.flowers) {
      for (const ob of lv.obstacles) {
        expect(ob.x < f - 60 || ob.x > f + 180).toBe(true);
      }
    }
  });

  it("obstacles are spaced so the frog can always land and react", () => {
    const xs = lv.obstacles.map((o) => o.x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(72);
    expect(lv.obstacles.some((o) => o.kind === OB_SKULL)).toBe(true);
  });
});

describe("wrap", () => {
  it("wraps on spaces by code point count", () => {
    expect(wrap("¡Excelente! Has iluminado otra flor", 14)).toEqual(["¡Excelente!", "Has iluminado", "otra flor"]);
    expect(wrap("ñandú ñandú", 5)).toEqual(["ñandú", "ñandú"]);
  });

  it("hard-splits words longer than the line", () => {
    expect(wrap("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
  });
});
