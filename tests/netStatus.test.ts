import { describe, expect, it } from "vitest";
import { judgeScan, netLabel, normalizeSsid, type NetFailure, type NetPhase } from "../src/core/netStatus";
import { isBadgeLine } from "../src/core/badgeText";
import { monoWidth } from "../src/core/gfx";

const ap = (SSID: string, RSSI = -60, channel = 6, security = "wpa2_psk") => ({ SSID, RSSI, channel, security });

describe("judgeScan", () => {
  it("finds the exact SSID and keeps the strongest BSSID", () => {
    expect(judgeScan("Hazel", [ap("Otra"), ap("Hazel", -70, 1), ap("Hazel", -50, 11)])).toEqual({ found: true, rssi: -50, channel: 11, security: "wpa2_psk" });
  });

  it("flags a near-identical name: iOS curly apostrophe, case, spaces", () => {
    expect(judgeScan("Hazel's iPhone", [ap("Hazel\u2019s iPhone")])).toEqual({ found: false, failure: "name_mismatch" });
    expect(judgeScan("iphone de hazel", [ap("iPhone de Hazel ")])).toEqual({ found: false, failure: "name_mismatch" });
  });

  it("reports not found when nothing matches (5 GHz-only or hidden hotspot)", () => {
    expect(judgeScan("Hazel", [ap("Vecino"), ap("Cafe")])).toEqual({ found: false, failure: "not_found" });
    expect(judgeScan("Hazel", [])).toEqual({ found: false, failure: "not_found" });
  });

  it("normalizes only what a person would not notice", () => {
    expect(normalizeSsid("  Hazel\u2019s   iPhone ")).toBe("hazel's iphone");
    expect(normalizeSsid("Red-2")).not.toBe(normalizeSsid("Red_2"));
  });
});

describe("netLabel", () => {
  const phases: NetPhase[] = ["unconfigured", "idle", "scanning", "connecting", "online"];
  const failures: NetFailure[] = ["not_found", "name_mismatch", "rejected", "no_ip", "no_internet", "error"];
  const all = [...phases.map((p) => netLabel(p)), ...failures.map((f) => netLabel("failed", f))];

  it.each(all.map((l) => [l]))("%s fits the badge and its font", (label) => {
    expect(isBadgeLine(label, 58)).toBe(true);
    expect(12 + monoWidth(label, "s")).toBeLessThanOrEqual(428);
  });
});
