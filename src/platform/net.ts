/**
 * Badge network for the online Guardián: Wi-Fi + NTP + HTTPS fetch on Moddable.
 *
 * Credentials are NOT compiled in. They are read at runtime from preferences (NVS),
 * domain "guardian": ssid, password, apikey, url. They get there through a separate
 * NVS image built by scripts/provision-badge.py (kept outside the repo).
 *
 * Flow: scan → (our network seen?) → connect → IP → NTP → online. Each step reports a
 * specific failure (src/core/netStatus.ts) so the screen can say what went wrong, and
 * the game retries every 30 s while it is open. Phase 1 boots with the radio off.
 *
 * Logs never include the SSID, password, other networks' names, the API key, or
 * Guardián text: only counts, RSSI, channel, security type and connection codes.
 */
import WiFi from "embedded:network/interface/wifi";
import Preference from "preference";
import Time from "time";
import Timer from "timer";
import { fetch, Headers } from "fetch";
import type { Transport } from "core/guardianClient";
import { RETRY_MS, judgeScan, netLabel, type NetFailure, type NetPhase } from "core/netStatus";

declare const device: any;

const DOMAIN = "guardian";
const CONNECT_TIMEOUT_MS = 20_000;

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
  phase: NetPhase;
  failure: NetFailure | undefined;
  /** Bumped on every phase change, so screens can repaint. */
  version = 0;
  private readonly cfg: NetConfig | null;
  private wifi: WiFi | undefined;
  private timer: unknown;
  private failedAt = 0;
  private sawConnected = false;
  private lastConn = 0;

  constructor() {
    this.cfg = readConfig();
    this.phase = this.cfg ? "idle" : "unconfigured";
  }

  get online(): boolean {
    return this.phase === "online";
  }

  label(): string {
    return netLabel(this.phase, this.failure);
  }

  /** Call every frame while the game is open: starts once, retries after failures. */
  tick(now: number): void {
    if (!this.cfg) return;
    if (this.phase === "idle" || (this.phase === "failed" && now - this.failedAt >= RETRY_MS)) this.start();
  }

  private set(phase: NetPhase, failure?: NetFailure): void {
    this.phase = phase;
    this.failure = failure;
    this.version++;
  }

  private start(): void {
    const cfg = this.cfg!;
    this.set("scanning");
    this.sawConnected = false;
    this.lastConn = 0;
    try {
      const self = this;
      this.wifi = new WiFi({
        onChanged() {
          const c = this.connection;
          if (c !== self.lastConn) trace(`guardian: wifi ${c}\n`); // 200 idle · 300 connecting · 400 associated · 500 IP
          self.lastConn = c;
          if (self.phase !== "connecting") return;
          if (c >= 400) self.sawConnected = true;
          if (c >= 500) self.onAddress();
          else if (c <= 200) self.fail(self.sawConnected ? "no_ip" : "rejected");
        },
      });
      const seen: Array<{ SSID: string; RSSI: number; channel: number; security: string }> = [];
      trace("guardian: wifi scanning\n");
      this.wifi.scan({
        onFound(ap: { SSID: string; RSSI: number; channel: number; security: string }) {
          if (seen.length < 40) seen.push(ap);
        },
        onComplete() {
          const v = judgeScan(cfg.ssid, seen);
          if (!v.found) {
            trace(`guardian: scan ${seen.length} networks, ours: ${v.failure}\n`);
            return self.fail(v.failure);
          }
          trace(`guardian: scan ${seen.length} networks, ours: rssi ${v.rssi} ch ${v.channel} ${v.security}\n`);
          self.connect(cfg);
        },
      });
      this.armTimeout();
    } catch (e) {
      this.fail("error", e instanceof Error ? e.message : "wifi error");
    }
  }

  private connect(cfg: NetConfig): void {
    this.set("connecting");
    try {
      this.wifi!.connect(cfg.password ? { SSID: cfg.ssid, password: cfg.password } : { SSID: cfg.ssid });
      this.armTimeout();
    } catch (e) {
      this.fail("error", e instanceof Error ? e.message : "connect error");
    }
  }

  private armTimeout(): void {
    this.clearTimer();
    this.timer = Timer.set(() => {
      this.timer = undefined;
      if (this.phase === "scanning") this.fail("error", "scan timeout");
      else if (this.phase === "connecting") this.fail(this.sawConnected ? "no_ip" : "rejected", "timeout");
    }, CONNECT_TIMEOUT_MS);
  }

  private onAddress(): void {
    trace("guardian: wifi got ip\n");
    this.clearTimer();
    // TLS checks certificate dates, so get the time before going online
    try {
      const ntp = new device.network.ntp.client.io({ ...device.network.ntp.client, servers: ["pool.ntp.org", "time.google.com"] });
      this.timer = Timer.set(() => {
        this.timer = undefined;
        try {
          ntp.close();
        } catch {
          /* ignore */
        }
        if (this.phase === "connecting") this.fail("no_internet", "ntp timeout");
      }, 10_000);
      ntp.getTime((error: unknown, value: number) => {
        try {
          ntp.close();
        } catch {
          /* ignore */
        }
        if (this.phase !== "connecting") return;
        if (error) return this.fail("no_internet", "ntp");
        Time.set(value / 1000);
        this.clearTimer();
        this.set("online");
        trace("guardian: online\n");
      });
    } catch {
      this.fail("no_internet", "ntp");
    }
  }

  private fail(failure: NetFailure, detail?: string): void {
    this.clearTimer();
    try {
      this.wifi?.close();
    } catch {
      /* ignore */
    }
    this.wifi = undefined;
    this.failedAt = Time.ticks;
    this.set("failed", failure);
    trace(`guardian: offline (${failure}${detail ? ": " + detail.slice(0, 40) : ""}), retry in ${RETRY_MS / 1000} s\n`);
  }

  private clearTimer(): void {
    if (this.timer !== undefined) Timer.clear(this.timer as never);
    this.timer = undefined;
  }

  /** HTTPS POST to the Guardián API. Only usable while online. */
  readonly transport: Transport = async (path, body) => {
    const cfg = this.cfg;
    if (!cfg || this.phase !== "online") throw new Error("offline");
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
