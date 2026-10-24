/**
 * Mictlán.js game state machine + physics. Pure and deterministic:
 * feed it button events with `input()` and advance with `tick(heldMask)` at 60 Hz.
 * No time, IO or rendering in here (see render.ts).
 *
 * Physics uses integer sub-pixels (1 px = 16 units) so runs replay exactly.
 */
import { BTN_BACK, BTN_DOWN, BTN_SELECT, BTN_UP, EV_PRESS, EV_REPEAT } from "../inputFsm";
import { GROUND_Y, OB_BANNER, OB_SKULL, buildLevel, type Level } from "./level";
import { FLOWER_ORDER, questionFor, type Question } from "./questions";
import { wrap } from "../text";

export const ST_TITLE = 0;
export const ST_INTRO = 1;
export const ST_RUN = 2;
export const ST_CHALLENGE = 3;
export const ST_FEEDBACK = 4;
export const ST_PAUSE = 5;
export const ST_RETRY = 6;
export const ST_VICTORY = 7;

export const FPS = 60;
export const SUB = 16; // sub-pixels per pixel
export const FROG_SCREEN_X = 64;
export const FROG_W = 24;
export const FROG_H = 24;
export const FROG_CROUCH_H = 16;
export const SPEED = 26; // sub-px per frame ≈ 97.5 px/s
export const GRAVITY = 7;
export const JUMP_VY = -112;
export const MAX_HEARTS = 3;
export const INVULN_FRAMES = 72;
export const OPTION_HINT = 3; // 4th entry in the challenge list

/** Obstacle hitboxes in screen px, relative to the obstacle x / ground. */
export const SKULL_BOX = { dx: 2, w: 16, top: GROUND_Y - 18, bottom: GROUND_Y };
// standing frog hitbox starts at y 98, crouched at 106: bottom 100 separates them
export const BANNER_BOX = { dx: 0, w: 26, top: 22, bottom: 100 };
export const FLOWER_BOX = { w: 20, top: GROUND_Y - 26, bottom: GROUND_Y - 6 };
export const PETAL_BOX = 8;

export const INTRO_LINES: readonly string[] = [
  "Bienvenida, ranita. Soy el Guardián del Código.",
  "Cuatro flores de cempasúchil iluminan el Mictlán.",
  "Resuelve su código y despertarás como agente.",
];

export const PAUSE_ITEMS: readonly string[] = ["continuar", "reiniciar", "salir"];

export class Game {
  readonly level: Level = buildLevel();

  state = ST_TITLE;
  /** Frames since the current state started (animations key off this). */
  stateFrames = 0;
  frame = 0;

  // run
  cameraX = 0; // world px at screen x = 0, in sub-px
  frogY = 0; // sub-px, top of the standing frog; 0 means "on the ground" offset (see frogTop)
  vy = 0;
  onGround = true;
  crouching = false;
  hearts = MAX_HEARTS;
  invuln = 0;
  petals = 0;
  flowersLit = 0;
  /** Bit per petal already collected. */
  readonly petalTaken: Uint8Array;
  runFrames = 0;
  playIndex = 0;

  // checkpoint snapshot
  private cpCameraX = 0;
  private cpPetals = 0;
  private readonly cpPetalTaken: Uint8Array;

  // challenge / feedback
  question: Question | null = null;
  option = 0;
  showHint = false;
  attempts = 0;
  lastCorrect = false;
  feedbackLines: string[] = [];
  hintLines: string[] = [];
  questionLines: string[] = [];

  // pause
  pauseIndex = 0;
  private pausedFrom = ST_RUN;

  /** Set when the player chose "salir"; the host returns to its menu. */
  exitRequested = false;

  constructor() {
    this.petalTaken = new Uint8Array(this.level.petals.length);
    this.cpPetalTaken = new Uint8Array(this.level.petals.length);
  }

  /** Screen y (px) of the frog's top edge. */
  frogTop(): number {
    const h = this.crouching ? FROG_CROUCH_H : FROG_H;
    return GROUND_Y - h + (this.frogY >> 4);
  }

  /** World x (px) of the frog's left edge. */
  frogWorldX(): number {
    return (this.cameraX >> 4) + FROG_SCREEN_X;
  }

  // ------------------------------------------------------------ input

  input(button: number, kind: number): void {
    if (kind !== EV_PRESS && kind !== EV_REPEAT) return;
    const repeat = kind === EV_REPEAT;
    switch (this.state) {
      case ST_TITLE:
        if (repeat) return;
        if (button === BTN_SELECT) this.go(ST_INTRO);
        else if (button === BTN_BACK) this.exitRequested = true;
        return;
      case ST_INTRO:
        if (!repeat && (button === BTN_SELECT || button === BTN_BACK)) this.startRun();
        return;
      case ST_RUN:
        if (repeat) return;
        if (button === BTN_UP && this.onGround && !this.crouching) {
          this.vy = JUMP_VY;
          this.onGround = false;
        } else if (button === BTN_BACK) this.pause();
        return;
      case ST_CHALLENGE:
        if (button === BTN_UP) this.option = (this.option + 3) % 4;
        else if (button === BTN_DOWN) this.option = (this.option + 1) % 4;
        else if (repeat) return;
        else if (button === BTN_SELECT) this.confirmOption();
        else if (button === BTN_BACK) this.pause();
        return;
      case ST_FEEDBACK:
        if (!repeat && button === BTN_SELECT) {
          if (this.lastCorrect) this.resumeAfterFlower();
          else this.go(ST_CHALLENGE);
        }
        return;
      case ST_PAUSE:
        if (button === BTN_UP) this.pauseIndex = (this.pauseIndex + PAUSE_ITEMS.length - 1) % PAUSE_ITEMS.length;
        else if (button === BTN_DOWN) this.pauseIndex = (this.pauseIndex + 1) % PAUSE_ITEMS.length;
        else if (repeat) return;
        else if (button === BTN_BACK) this.go(this.pausedFrom);
        else if (button === BTN_SELECT) {
          if (this.pauseIndex === 0) this.go(this.pausedFrom);
          else if (this.pauseIndex === 1) this.restartFromCheckpoint();
          else {
            this.reset();
            this.exitRequested = true;
          }
        }
        return;
      case ST_RETRY:
        if (repeat) return;
        if (button === BTN_SELECT) this.restartFromCheckpoint();
        else if (button === BTN_BACK) this.reset();
        return;
      case ST_VICTORY:
        if (repeat || this.stateFrames < 60) return; // let the celebration land
        if (button === BTN_SELECT) {
          this.playIndex++;
          this.reset();
          this.go(ST_INTRO);
        } else if (button === BTN_BACK) {
          this.playIndex++;
          this.reset();
        }
        return;
    }
  }

  // ------------------------------------------------------------ tick

  tick(heldMask: number): void {
    this.frame++;
    this.stateFrames++;
    if (this.state === ST_RUN) this.stepRun(heldMask);
    else if (this.state === ST_CHALLENGE || this.state === ST_FEEDBACK) this.runFrames++;
  }

  private stepRun(heldMask: number): void {
    this.runFrames++;
    const lv = this.level;

    // crouch only while DOWN is held and on the ground
    const wantCrouch = ((heldMask >> BTN_DOWN) & 1) === 1 && this.onGround;
    this.crouching = wantCrouch;

    // vertical motion
    if (!this.onGround) {
      this.vy += GRAVITY;
      this.frogY += this.vy;
      if (this.frogY >= 0) {
        this.frogY = 0;
        this.vy = 0;
        this.onGround = true;
      }
    }

    // scroll (stop at the ofrenda)
    const maxCam = (lv.ofrendaX - FROG_SCREEN_X - 40) * SUB;
    this.cameraX = Math.min(this.cameraX + SPEED, maxCam);
    if (this.invuln > 0) this.invuln--;

    const fx = this.frogWorldX();
    const top = this.frogTop();
    const bottom = top + (this.crouching ? FROG_CROUCH_H : FROG_H);
    // frog hitbox is a little smaller than the sprite (forgiving)
    const hx0 = fx + 4;
    const hx1 = fx + FROG_W - 4;
    const hy0 = top + 4;
    const hy1 = bottom - 1;

    // obstacles
    if (this.invuln === 0) {
      for (const ob of lv.obstacles) {
        const box = ob.kind === OB_SKULL ? SKULL_BOX : BANNER_BOX;
        const ox0 = ob.x + box.dx;
        if (ox0 > hx1 || ox0 + box.w < hx0) continue;
        if (box.top > hy1 || box.bottom < hy0) continue;
        this.hearts--;
        this.invuln = INVULN_FRAMES;
        if (this.hearts <= 0) {
          this.go(ST_RETRY);
          return;
        }
        break;
      }
    }

    // petals
    for (let i = 0; i < lv.petals.length; i++) {
      if (this.petalTaken[i]) continue;
      const p = lv.petals[i]!;
      if (p.x > hx1 || p.x + PETAL_BOX < hx0 || p.y > hy1 || p.y + PETAL_BOX < hy0) continue;
      this.petalTaken[i] = 1;
      this.petals++;
    }

    // next magic flower
    if (this.flowersLit < lv.flowers.length) {
      // the magic flower draws the frog in at any height: reaching its x is enough,
      // so a jump can never skip it (and lock the ofrenda)
      const flx = lv.flowers[this.flowersLit]!;
      if (hx1 >= flx) this.openChallenge();
    } else if (fx + FROG_W >= lv.ofrendaX - 30) {
      this.go(ST_VICTORY);
    }
  }

  // ------------------------------------------------------------ transitions

  private go(state: number): void {
    this.state = state;
    this.stateFrames = 0;
  }

  private startRun(): void {
    this.go(ST_RUN);
  }

  private pause(): void {
    this.pausedFrom = this.state;
    this.pauseIndex = 0;
    this.go(ST_PAUSE);
  }

  private openChallenge(): void {
    this.question = questionFor(this.flowersLit, this.playIndex);
    this.option = 0;
    this.showHint = false;
    this.attempts = 0;
    this.questionLines = wrap(this.question.question, 34);
    this.hintLines = wrap(this.question.hint, 34);
    this.crouching = false;
    this.go(ST_CHALLENGE);
  }

  private confirmOption(): void {
    const q = this.question;
    if (!q) return;
    if (this.option === OPTION_HINT) {
      this.showHint = !this.showHint;
      return;
    }
    this.attempts++;
    this.lastCorrect = this.option === q.answer;
    const head = this.lastCorrect
      ? "¡Excelente! Has iluminado otra flor del camino."
      : "Casi. El Guardián te deja una pista:";
    const body = this.lastCorrect ? q.explain : q.hint;
    this.feedbackLines = [...wrap(head, 50), ...wrap(body, 50)];
    this.go(ST_FEEDBACK);
  }

  private resumeAfterFlower(): void {
    this.flowersLit++;
    // checkpoint = just past the flower that was solved
    this.cpCameraX = this.cameraX;
    this.cpPetals = this.petals;
    this.cpPetalTaken.set(this.petalTaken);
    this.question = null;
    this.go(ST_RUN);
  }

  restartFromCheckpoint(): void {
    this.cameraX = this.cpCameraX;
    this.petals = this.cpPetals;
    this.petalTaken.set(this.cpPetalTaken);
    this.hearts = MAX_HEARTS;
    this.invuln = INVULN_FRAMES;
    this.frogY = 0;
    this.vy = 0;
    this.onGround = true;
    this.crouching = false;
    this.go(ST_RUN);
  }

  /** Back to the title screen with a fresh run (keeps playIndex for variety). */
  reset(): void {
    this.cameraX = 0;
    this.cpCameraX = 0;
    this.frogY = 0;
    this.vy = 0;
    this.onGround = true;
    this.crouching = false;
    this.hearts = MAX_HEARTS;
    this.invuln = 0;
    this.petals = 0;
    this.cpPetals = 0;
    this.petalTaken.fill(0);
    this.cpPetalTaken.fill(0);
    this.flowersLit = 0;
    this.runFrames = 0;
    this.question = null;
    this.go(ST_TITLE);
  }

  /** Clears the exit flag after the host handled it. */
  consumeExit(): boolean {
    const e = this.exitRequested;
    this.exitRequested = false;
    return e;
  }

  get totalFlowers(): number {
    return FLOWER_ORDER.length;
  }
}

export { OB_BANNER, OB_SKULL };
