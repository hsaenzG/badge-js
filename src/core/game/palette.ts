/**
 * Mictlán.js palette (game.md §2). Index → design color.
 * The badge adapter may remap entries that the NV3007 panel renders badly
 * (see PANEL_SAFE); the simulator always shows the design colors.
 */

export const C_TRANSPARENT = 0;
export const C_NIGHT = 1; // #0D0D0D near-black
export const C_PURPLE = 2; // #21152E deep purple (sky)
export const C_ORANGE = 3; // #FF8C00 cempasúchil
export const C_MARIGOLD = 4; // #F5E000 marigold yellow
export const C_GREEN = 5; // #65C84D frog green
export const C_MAGENTA = 6; // #D94F9B
export const C_BONE = 7; // #F2E8D5 bone white
export const C_BLACK = 8; // #000000 outlines / eyes
export const C_DKGREEN = 9; // #2F7A2A frog shading
export const C_TEMPLE = 10; // #3B2652 temple silhouette
export const C_PATH = 11; // #7A3E12 dark path
export const C_GRAY = 12; // #9A9A9A secondary text
export const C_RED = 13; // #E03A3A hearts
export const C_CYAN = 14; // #5ED6E0 code text
export const C_GLOW = 15; // #FFE9A8 candle glow / portal

export const PALETTE: readonly number[] = [
  0x000000, // 0 transparent (never drawn)
  0x0d0d0d,
  0x21152e,
  0xff8c00,
  0xf5e000,
  0x65c84d,
  0xd94f9b,
  0xf2e8d5,
  0x000000,
  0x2f7a2a,
  0x3b2652,
  0x7a3e12,
  0x9a9a9a,
  0xe03a3a,
  0x5ed6e0,
  0xffe9a8,
];

/**
 * Badge overrides for the NV3007 panel: near-black levels render bright there,
 * so they are pushed to pure black. Mid-dark purples are lifted until verified
 * with the gray-ramp test screen.
 */
export const PANEL_SAFE: Readonly<Record<number, number>> = {
  [C_NIGHT]: 0x000000,
  [C_PURPLE]: 0x000000,
  [C_TEMPLE]: 0x4a2d6b,
};

export const rgb = (hex: number): [number, number, number] => [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
