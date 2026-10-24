/**
 * Screen navigation for Phase 1. Pure state machine: (state, event) → state.
 */

import { BTN_BACK, BTN_DOWN, BTN_SELECT, BTN_UP, EV_PRESS, EV_REPEAT } from "./inputFsm";

export const SCR_INTRO = 0;
export const SCR_WHOAMI = 1;
export const SCR_MENU = 2;
export const SCR_CARD = 3;
export const SCR_GITHUB = 4;
export const SCR_LINKS = 5;
export const SCR_QR = 6;
export const SCR_ABOUT = 7;

export interface MenuItem {
  readonly label: string;
  readonly screen: number;
}

export const MENU: readonly MenuItem[] = [
  { label: "tarjeta", screen: SCR_CARD },
  { label: "github", screen: SCR_GITHUB },
  { label: "links", screen: SCR_LINKS },
  { label: "about", screen: SCR_ABOUT },
];

export class Nav {
  screen = SCR_INTRO;
  menuIndex = 0;
  linkIndex = 0;
  /** Time the current screen was entered; screens animate from here. */
  enteredAt = 0;
  /** Bumped on every change so the renderer knows to repaint. */
  version = 0;

  constructor(private readonly linkCount: number) {}

  /** Called when the intro typewriter finishes. */
  introDone(now: number): void {
    if (this.screen === SCR_INTRO) this.go(SCR_WHOAMI, now);
  }

  handle(button: number, kind: number, now: number): void {
    if (kind !== EV_PRESS && kind !== EV_REPEAT) return;
    const repeat = kind === EV_REPEAT;
    switch (this.screen) {
      case SCR_INTRO:
        if (!repeat) this.go(SCR_WHOAMI, now); // any key skips the intro
        return;
      case SCR_WHOAMI:
        if (!repeat) this.go(SCR_MENU, now);
        return;
      case SCR_MENU:
        if (button === BTN_UP) this.moveMenu(-1);
        else if (button === BTN_DOWN) this.moveMenu(1);
        else if (repeat) return;
        else if (button === BTN_SELECT) this.go(MENU[this.menuIndex]!.screen, now);
        else if (button === BTN_BACK) this.go(SCR_INTRO, now); // replay the intro
        return;
      case SCR_LINKS:
        if (button === BTN_UP) this.moveLink(-1);
        else if (button === BTN_DOWN) this.moveLink(1);
        else if (repeat) return;
        else if (button === BTN_SELECT) this.go(SCR_QR, now);
        else if (button === BTN_BACK) this.go(SCR_MENU, now);
        return;
      case SCR_QR:
        if (!repeat && button === BTN_BACK) this.go(SCR_LINKS, now);
        return;
      default: // card, github, about
        if (!repeat && button === BTN_BACK) this.go(SCR_MENU, now);
        return;
    }
  }

  private moveMenu(d: number): void {
    // clamp, don't wrap: holding DOWN stops at the end instead of spinning
    const n = Math.max(0, Math.min(MENU.length - 1, this.menuIndex + d));
    if (n !== this.menuIndex) {
      this.menuIndex = n;
      this.version++;
    }
  }

  private moveLink(d: number): void {
    const n = Math.max(0, Math.min(this.linkCount - 1, this.linkIndex + d));
    if (n !== this.linkIndex) {
      this.linkIndex = n;
      this.version++;
    }
  }

  private go(screen: number, now: number): void {
    this.screen = screen;
    this.enteredAt = now;
    this.version++;
  }
}
