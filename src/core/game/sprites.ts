/**
 * Original pixel art for Mictlán.js, drawn at SCALE× on screen.
 * One character per pixel; see CHAR_TO_COLOR. '.' is transparent.
 *
 * The frog is an original design: round eyes, marigold cheeks and a yellow
 * ">_" mark on the chest. It does not reuse Strands Agents artwork.
 */
import {
  C_BLACK,
  C_BONE,
  C_DKGREEN,
  C_GLOW,
  C_GREEN,
  C_MAGENTA,
  C_MARIGOLD,
  C_ORANGE,
  C_RED,
  C_TRANSPARENT,
} from "./palette";

export const SCALE = 2;

export const CHAR_TO_COLOR: Readonly<Record<string, number>> = {
  ".": C_TRANSPARENT,
  K: C_BLACK,
  W: C_BONE,
  G: C_GREEN,
  g: C_DKGREEN,
  Y: C_MARIGOLD,
  O: C_ORANGE,
  M: C_MAGENTA,
  R: C_RED,
  L: C_GLOW,
};

export interface SpriteDef {
  readonly name: string;
  readonly rows: readonly string[];
}

const FROG_TOP = [
  "..KKK..KKK..",
  ".KWWWKKWWWK.",
  ".KWKWKKWKWK.",
  ".KWWWGGWWWK.",
  "KGGGGGGGGGGK",
  "KGOGGGGGGOGK",
  "KGGKGGGGKGGK",
  ".KGGKKKKGGK.",
  ".KGYGGGGGGK.",
  "KGGGYGGGGGGK",
];

export const SPRITE_DEFS: readonly SpriteDef[] = [
  { name: "frogIdle", rows: [...FROG_TOP, "KgGYGYYGGGgK", "KggK....KggK"] },
  { name: "frogRun", rows: [...FROG_TOP, "KgGYGYYGGGgK", ".KggK..KggK."] },
  { name: "frogJump", rows: [...FROG_TOP, "KgGYGYYGGGgK", "Kg........gK"] },
  {
    name: "frogCrouch",
    rows: [
      "..KKK..KKK..",
      ".KWKWKKWKWK.",
      "KGGGGGGGGGGK",
      "KGOGGGGGGOGK",
      "KGGKKKKKKGGK",
      "KGGYGYYGGGGK",
      "KgGGGGGGGGgK",
      "KKggKKKKggKK",
    ],
  },
  {
    name: "calaverita",
    rows: [
      "..KKKKKK..",
      ".KWWWWWWK.",
      "KWMWWWWMWK",
      "KWKKWWKKWK",
      "KWKOWWKOWK",
      "KWWWKKWWWK",
      ".KWWWWWWK.",
      ".KWKWWKWK.",
      "..KWWWWK..",
      "...KKKK...",
    ],
  },
  {
    name: "flor",
    rows: [
      "...OYYO...",
      ".OYOYYOYO.",
      "OYOYOOYOYO",
      "YOYOLLOYOY",
      "OYOLLLLOYO",
      "YOYOLLOYOY",
      "OYOYOOYOYO",
      ".OYOYYOYO.",
      "...OggO...",
      "....gg....",
    ],
  },
  { name: "petalo", rows: [".OO.", "OYYO", "OYYO", ".OO."] },
  { name: "heart", rows: [".RR.RR.", "RRRRRRR", "RRRRRRR", ".RRRRR.", "..RRR..", "...R..."] },
  {
    name: "guardian",
    rows: [
      "..OYOYYOYO..",
      ".OYOYOOYOYO.",
      ".KKKKKKKKKK.",
      "KWWWWWWWWWWK",
      "KWKKWWWWKKWK",
      "KWKLWWWWKLWK",
      "KWWWWKKWWWWK",
      "KWMWWWWWWMWK",
      ".KWKWKWKWKK.",
      "..KWWWWWWK..",
      "...KKKKKK...",
    ],
  },
  { name: "candle", rows: [".L.", "LYL", ".O.", "WWW", "WMW", "WWW", "WWW"] },
];

/** Sprite ids, in SPRITE_DEFS order. */
export const SPR_FROG_IDLE = 0;
export const SPR_FROG_RUN = 1;
export const SPR_FROG_JUMP = 2;
export const SPR_FROG_CROUCH = 3;
export const SPR_CALAVERITA = 4;
export const SPR_FLOR = 5;
export const SPR_PETALO = 6;
export const SPR_HEART = 7;
export const SPR_GUARDIAN = 8;
export const SPR_CANDLE = 9;

export const spriteSize = (id: number): { w: number; h: number } => {
  const d = SPRITE_DEFS[id];
  if (!d) throw new RangeError(`sprite ${id}`);
  return { w: d.rows[0]!.length * SCALE, h: d.rows.length * SCALE };
};

/** Decode a sprite to palette indices (row-major), for adapters building bitmaps. */
export function decodeSprite(def: SpriteDef): Uint8Array {
  const w = def.rows[0]!.length;
  const out = new Uint8Array(w * def.rows.length);
  def.rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`${def.name}: row ${y} has ${row.length} px, expected ${w}`);
    for (let x = 0; x < w; x++) {
      const c = CHAR_TO_COLOR[row[x]!];
      if (c === undefined) throw new Error(`${def.name}: unknown pixel '${row[x]}'`);
      out[y * w + x] = c;
    }
  });
  return out;
}
