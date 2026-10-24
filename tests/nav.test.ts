import { describe, expect, it } from "vitest";
import { BTN_BACK, BTN_DOWN, BTN_SELECT, BTN_UP, EV_LONG, EV_PRESS, EV_REPEAT } from "../src/core/inputFsm";
import { MENU, Nav, SCR_ABOUT, SCR_CARD, SCR_GITHUB, SCR_INTRO, SCR_LINKS, SCR_MENU, SCR_QR, SCR_WHOAMI } from "../src/core/nav";
import { LINKS } from "../src/core/content";

const press = (nav: Nav, b: number, now = 0) => nav.handle(b, EV_PRESS, now);

describe("Nav", () => {
  it("intro → whoami → menu", () => {
    const nav = new Nav(LINKS.length);
    nav.introDone(100);
    expect(nav.screen).toBe(SCR_WHOAMI);
    expect(nav.enteredAt).toBe(100);
    press(nav, BTN_SELECT);
    expect(nav.screen).toBe(SCR_MENU);
  });

  it("any key skips the intro", () => {
    const nav = new Nav(LINKS.length);
    press(nav, BTN_DOWN);
    expect(nav.screen).toBe(SCR_WHOAMI);
  });

  it("UP/DOWN move the menu focus, clamped at both ends", () => {
    const nav = new Nav(LINKS.length);
    nav.screen = SCR_MENU;
    press(nav, BTN_UP);
    expect(nav.menuIndex).toBe(0);
    for (let i = 0; i < 10; i++) nav.handle(BTN_DOWN, EV_REPEAT, i);
    expect(nav.menuIndex).toBe(MENU.length - 1);
  });

  it("SELECT opens each menu item and BACK returns", () => {
    const nav = new Nav(LINKS.length);
    nav.screen = SCR_MENU;
    const seen: number[] = [];
    for (let i = 0; i < MENU.length; i++) {
      nav.menuIndex = i;
      press(nav, BTN_SELECT);
      seen.push(nav.screen);
      press(nav, BTN_BACK);
      expect(nav.screen).toBe(SCR_MENU);
    }
    expect(seen).toEqual([SCR_CARD, SCR_GITHUB, SCR_LINKS, SCR_ABOUT]);
  });

  it("held SELECT/BACK never repeat the action", () => {
    const nav = new Nav(LINKS.length);
    nav.screen = SCR_MENU;
    nav.handle(BTN_SELECT, EV_REPEAT, 0);
    nav.handle(BTN_SELECT, EV_LONG, 0);
    expect(nav.screen).toBe(SCR_MENU);
  });

  it("links: choose one, SELECT shows its QR, BACK goes back to the list", () => {
    const nav = new Nav(LINKS.length);
    nav.screen = SCR_LINKS;
    press(nav, BTN_DOWN);
    press(nav, BTN_DOWN);
    press(nav, BTN_DOWN);
    expect(nav.linkIndex).toBe(LINKS.length - 1);
    press(nav, BTN_SELECT);
    expect(nav.screen).toBe(SCR_QR);
    press(nav, BTN_UP);
    expect(nav.screen).toBe(SCR_QR);
    press(nav, BTN_BACK);
    expect(nav.screen).toBe(SCR_LINKS);
  });

  it("BACK on the menu replays the intro", () => {
    const nav = new Nav(LINKS.length);
    nav.screen = SCR_MENU;
    press(nav, BTN_BACK, 42);
    expect(nav.screen).toBe(SCR_INTRO);
    expect(nav.enteredAt).toBe(42);
  });

  it("bumps version on every visible change", () => {
    const nav = new Nav(LINKS.length);
    nav.screen = SCR_MENU;
    const v = nav.version;
    press(nav, BTN_UP); // already at top: no change
    expect(nav.version).toBe(v);
    press(nav, BTN_DOWN);
    expect(nav.version).toBe(v + 1);
  });
});
