/**
 * Network status for the online Guardián, as the player sees it. Pure TS (tested in
 * Node); the Moddable adapter in src/platform/net.ts only reports events here.
 *
 * Privacy: nothing here ever holds the SSID, the password, other networks' names or the
 * API key. The scan only answers "is my network there, and how strong?".
 */

export type NetPhase = "unconfigured" | "idle" | "scanning" | "connecting" | "online" | "failed";

export type NetFailure =
  | "not_found" // our SSID was not in the scan
  | "name_mismatch" // a network with a near-identical name exists (curly apostrophe, case, spaces)
  | "rejected" // AP refused: usually the password
  | "no_ip" // associated but never got an address
  | "no_internet" // got an IP but NTP failed (hotspot without data, captive portal)
  | "error";

/** Wait this long after a failure before trying again (only while the game is open). */
export const RETRY_MS = 30_000;

/** Same name to a person: Unicode quotes → ASCII, case and surrounding spaces ignored. */
export function normalizeSsid(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u0060\u00B4]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export type ScanVerdict = { found: true; rssi: number; channel: number; security: string } | { found: false; failure: "not_found" | "name_mismatch" };

/** Decide from scan results whether to connect. Only the result leaves this function. */
export function judgeScan(target: string, seen: ReadonlyArray<{ SSID: string; RSSI: number; channel: number; security: string }>): ScanVerdict {
  let best: { RSSI: number; channel: number; security: string } | undefined;
  let similar = false;
  const t = normalizeSsid(target);
  for (const ap of seen) {
    if (ap.SSID === target) {
      if (!best || ap.RSSI > best.RSSI) best = ap;
    } else if (normalizeSsid(ap.SSID) === t) {
      similar = true;
    }
  }
  if (best) return { found: true, rssi: best.RSSI, channel: best.channel, security: best.security };
  return { found: false, failure: similar ? "name_mismatch" : "not_found" };
}

const FAILURE_LABEL: Readonly<Record<NetFailure, string>> = {
  not_found: "no veo la red (¿hotspot visible y en 2.4 GHz?)",
  name_mismatch: "nombre de red distinto (revisa el apóstrofo)",
  rejected: "la red rechazó la conexión (¿contraseña?)",
  no_ip: "conectada pero sin dirección IP",
  no_internet: "sin internet en la red",
  error: "error de Wi-Fi",
};

/** One short line for the screens (≤ 58 chars at the small font). */
export function netLabel(phase: NetPhase, failure?: NetFailure): string {
  switch (phase) {
    case "unconfigured":
      return "Guardián: sin credenciales · offline";
    case "idle":
      return "Guardián: offline";
    case "scanning":
      return "Guardián: buscando la red...";
    case "connecting":
      return "Guardián: conectando...";
    case "online":
      return "Guardián: en línea";
    case "failed":
      return `Guardián: ${FAILURE_LABEL[failure ?? "error"]}`;
  }
}
