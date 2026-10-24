/**
 * The single Mictlán.js level, built once from compact pattern strings.
 * World units are screen pixels; x grows to the right.
 *
 *   J = calaverita on the path (jump)      C = papel picado hanging low (crouch)
 *   P = arc of petals                      . = breathing room
 *
 * Each stretch ends with a magic flower and a safe zone (checkpoint).
 */

export const OB_SKULL = 0;
export const OB_BANNER = 1;

export interface Obstacle {
  readonly kind: typeof OB_SKULL | typeof OB_BANNER;
  readonly x: number;
}
export interface Petal {
  readonly x: number;
  readonly y: number;
}
export interface Level {
  readonly obstacles: readonly Obstacle[];
  readonly petals: readonly Petal[];
  readonly flowers: readonly number[]; // x of each magic flower, in FLOWER_ORDER
  readonly ofrendaX: number;
  readonly length: number;
}

export const GROUND_Y = 118; // top of the path, screen px
export const START_X = 0;
const LEAD_IN = 260; // calm start before the first obstacle
const SAFE_AFTER_FLOWER = 220;

/** Stretch patterns, easier → harder (tighter spacing in later stretches). */
const STRETCHES: ReadonlyArray<{ pattern: string; step: number }> = [
  { pattern: "J..P.J..C..P.J...C..J.P..J..C", step: 92 },
  { pattern: "J.P.C..J.J..P.C.J..C.P.J..C.J", step: 84 },
  { pattern: "C.J.P.J.C..J.C.P.J.J..C.P.J.C.J", step: 78 },
  { pattern: "J.C.J.P.C.J.J.C..P.J.C.J.C.P.J.J.C", step: 72 },
];

export function buildLevel(): Level {
  const obstacles: Obstacle[] = [];
  const petals: Petal[] = [];
  const flowers: number[] = [];
  let x = START_X + LEAD_IN;
  for (const { pattern, step } of STRETCHES) {
    for (const ch of pattern) {
      if (ch === "J") obstacles.push({ kind: OB_SKULL, x });
      else if (ch === "C") obstacles.push({ kind: OB_BANNER, x });
      // low arc: the ends are collected while running, the top rewards a hop
      else if (ch === "P") for (let i = 0; i < 5; i++) petals.push({ x: x + i * 14, y: GROUND_Y - 18 - [0, 6, 22, 6, 0][i]! });
      x += step;
    }
    x += 80;
    flowers.push(x);
    x += SAFE_AFTER_FLOWER;
  }
  const ofrendaX = x + 160;
  return { obstacles, petals, flowers, ofrendaX, length: ofrendaX + 200 };
}
