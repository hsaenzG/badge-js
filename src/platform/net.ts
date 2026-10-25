/**
 * Badge network for the online Guardián: Wi-Fi + NTP + HTTPS fetch on Moddable.
 *
 * Credentials are NOT compiled in. They are read at runtime from preferences (NVS),
 * domain "guardian": ssid, password, apikey, url. They get there through a separate
 * NVS image built by scripts/provision-badge.py (kept outside the repo).
 *
 * Wi-Fi starts only when Mictlán.js opens (Phase 1 boots with no network), and any
 * failure leaves the badge offline: the game always has local text.
 * Logs never include the SSID, password, API key, or Guardián text.
 */
import WiFi from "embedded:network/interface/wifi";
import Preference from "preference";
import Time from "time";
import Timer from "timer";
import { fetch, Headers } from "fetch";
import type { Transport } from "core/guardianClient";

declare const device: any;

const DOMAIN = "guardian";
const CONNECT_TIMEOUT_MS = 20_000;

export type NetState = "unconfigured" | "off" | "connecting" | "online" | "failed";

interface NetConfig {
  ssid: string;
  password: string;
  apiKey: string;
  url: string; // base, e.g. https://xxxx.execute-api.us-east-2.amazonaws.com/prod
}

function readConfig(): NetConfig | null {
  try {
    const get = (k: string): string => {
      const v = Preference.get(DOMAIN, k);
      return typeof v === "string" ? v : "";
    };
    const cfg = { ssid: get("ssid"), password: get("password"), apiKey: get("apikey"), url: get("url").replace(/\/+$/, "") };
    if (!cfg.ssid || !cfg.apiKey || !cfg.url.startsWith("https://")) return null;
    return cfg;
  } catch {
    return null;
  }
}

export class Net {
  state: NetState;
  private readonly cfg: NetConfig | null;
  private wifi: WiFi | undefined;
  private timer: unknown;
  private wasConnecting = false;

  constructor() {
    this.cfg = readConfig();
    this.state = this.cfg ? "off" : "unconfigured";
  }

  /** Connect once; later calls are no-ops unless the last attempt failed. */
  start(): void {
    if (!this.cfg || this.state === "connecting" || this.state === "online") return;
    this.state = "connecting";
    this.wasConnecting = false;
    trace("guardian: wifi connecting\n");
    try {
      const cfg = this.cfg;
      const self = this;
      this.wifi = new WiFi({
        onChanged() {
          const c = this.connection;
          if (c >= 300) self.wasConnecting = true;
          if (c >= 500 && self.state === "connecting") self.onAddress(this.address);
          else if (c <= 200 && self.wasConnecting) self.fail(self.state === "online" ? "disconnected" : "rejected");
        },
      });
      this.wifi.connect(cfg.password ? { SSID: cfg.ssid, password: cfg.password } : { SSID: cfg.ssid });
      this.timer = Timer.set(() => {
        this.timer = undefined;
        if (this.state === "connecting") this.fail("timeout");
      }, CONNECT_TIMEOUT_MS);
    } catch (e) {
      this.fail(e instanceof Error ? e.message : "wifi error");
    }
  }

  private onAddress(address: string | undefined): void {
    trace(`guardian: wifi ip ${address ?? "?"}\n`);
    // TLS checks certificate dates, so get the time before going online
    try {
      const ntp = new device.network.ntp.client.io({ ...device.network.ntp.client, servers: ["pool.ntp.org", "time.google.com"] });
      ntp.getTime((error: unknown, value: number) => {
        ntp.close();
        if (error) {
          trace("guardian: ntp failed\n");
          return this.fail("ntp");
        }
        Time.set(value / 1000);
        this.clearTimer();
        this.state = "online";
        trace("guardian: online\n");
      });
    } catch {
      this.fail("ntp");
    }
  }

  private fail(reason: string): void {
    this.clearTimer();
    try {
      this.wifi?.close();
    } catch {
      /* ignore */
    }
    this.wifi = undefined;
    this.state = "failed";
    trace(`guardian: offline (${reason})\n`);
  }

  private clearTimer(): void {
    if (this.timer !== undefined) Timer.clear(this.timer as never);
    this.timer = undefined;
  }

  /** HTTPS POST to the Guardián API. Only usable while online. */
  readonly transport: Transport = async (path, body) => {
    const cfg = this.cfg;
    if (!cfg || this.state !== "online") throw new Error("offline");
    const res = await fetch(cfg.url + path, {
      method: "POST",
      headers: new Headers([
        ["content-type", "application/json"],
        ["x-api-key", cfg.apiKey],
      ]),
      body: JSON.stringify(body),
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      /* non-JSON body: the client treats it as a bad response */
    }
    return { status: res.status, json };
  };
}

export const delay = (ms: number): Promise<void> => new Promise((resolve) => Timer.set(() => resolve(), ms));
