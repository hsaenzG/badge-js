/**
 * Mictlán.js sound, as data. Each effect is a list of [frequencyHz, durationMs]
 * steps (0 Hz = rest), so a one-channel piezo on the badge (LEDC PWM) and the
 * simulator's WebAudio can play exactly the same thing. All music is original.
 */

export const SND_JUMP = 0;
export const SND_PETAL = 1;
export const SND_FLOWER = 2;
export const SND_CORRECT = 3;
export const SND_WRONG = 4;
export const SND_HIT = 5;
export const SND_GAMEOVER = 6;
export const SND_VICTORY = 7;
export const SND_MOVE = 8;
export const SND_SELECT = 9;

export type Step = readonly [hz: number, ms: number];
export type Tune = readonly Step[];

// equal-tempered notes used below
const C4 = 262, D4 = 294, E4 = 330, G4 = 392, A4 = 440;
const C5 = 523, D5 = 587, E5 = 659, G5 = 784, A5 = 880, B5 = 988;
const C6 = 1047, D6 = 1175, E6 = 1319, G6 = 1568;
const A2 = 110, C3 = 131, D3 = 147, E3 = 165, G3 = 196, A3 = 220;
const R = 0;

export const SFX: readonly Tune[] = [
  /* jump    */ [[G4, 35], [C5, 35], [E5, 55]],
  /* petal   */ [[C6, 35], [E6, 70]],
  /* flower  */ [[C5, 70], [E5, 70], [G5, 70], [C6, 160]],
  /* correct */ [[G5, 80], [B5, 80], [D6, 80], [G6, 220]],
  /* wrong   */ [[E4, 140], [R, 30], [C4, 260]],
  /* hit     */ [[G3, 50], [R, 25], [D3, 140]],
  /* gameover*/ [[G4, 150], [E4, 150], [C4, 150], [A3, 420]],
  /* victory */ [[C5, 110], [E5, 110], [G5, 110], [C6, 220], [R, 60], [A5, 110], [C6, 110], [E6, 440]],
  /* move    */ [[A5, 22]],
  /* select  */ [[E5, 30], [B5, 55]],
];

/** Background loop while running: A-minor pentatonic lead over a walking bass, 140 bpm. */
const E8 = 214; // eighth note at 140 bpm
export const MUSIC_RUN = {
  lead: [
    [A4, E8], [C5, E8], [E5, E8], [C5, E8], [D5, E8], [E5, E8], [G5, 2 * E8],
    [E5, E8], [D5, E8], [C5, E8], [A4, E8], [G4, E8], [A4, E8], [C5, 2 * E8],
    [A4, E8], [C5, E8], [E5, E8], [G5, E8], [A5, E8], [G5, E8], [E5, 2 * E8],
    [D5, E8], [E5, E8], [D5, E8], [C5, E8], [A4, 2 * E8], [R, 2 * E8],
  ] as Tune,
  bass: [
    [A2, 2 * E8], [E3, 2 * E8], [A2, 2 * E8], [E3, 2 * E8],
    [C3, 2 * E8], [G3, 2 * E8], [A2, 2 * E8], [E3, 2 * E8],
    [A2, 2 * E8], [E3, 2 * E8], [D3, 2 * E8], [A3, 2 * E8],
    [G3, 2 * E8], [D3, 2 * E8], [A2, 4 * E8],
  ] as Tune,
} as const;

export const tuneMs = (t: Tune): number => t.reduce((a, [, ms]) => a + ms, 0);
