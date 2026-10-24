#!/usr/bin/env node
/**
 * Convert Arduino_GFX's `nv3007_279_init_operations` (NV3007, 2.79", 142x428)
 * into the Moddable ili9341 driver "registers" format.
 *
 * Source: moononournation/Arduino_GFX src/display/Arduino_NV3007.h
 * The same byte sequence was found in the stock JSConf badge firmware at
 * flash offset 0xdc1b5 (see docs/hardware.md §2.2), which is why it is used.
 *
 * Moddable format: `cmd, count, data...`; `kDelayMS, ms` delays; `kDelayMS, 0` ends.
 * kDelayMS is 0xFF, so command 0xFF must be escaped as `0x00, 0xFF`.
 *
 * Usage:
 *   curl -sL https://raw.githubusercontent.com/moononournation/Arduino_GFX/master/src/display/Arduino_NV3007.h -o /tmp/Arduino_NV3007.h
 *   node tools/nv3007-registers.mjs /tmp/Arduino_NV3007.h [madctl]
 * Then prepend "kDelayMS, 120," (post-reset settle, matches the stock firmware) and paste into hosts/badge/manifest.json.
 */
import { readFileSync } from "node:fs";

const [, , headerPath, madctlArg = "0x60"] = process.argv;
if (!headerPath) {
  console.error("usage: nv3007-registers.mjs <Arduino_NV3007.h> [madctl]");
  process.exit(2);
}

const src = readFileSync(headerPath, "utf8");
const block = /nv3007_279_init_operations\[\]\s*=\s*\{([\s\S]*?)\};/.exec(src);
if (!block) throw new Error("nv3007_279_init_operations not found");

const NAMED = { NV3007_SLPOUT: 0x11, NV3007_DISPON: 0x29 };
const tokens = block[1]
  .replace(/\/\/.*$/gm, "")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

const hex = (n) => "0x" + n.toString(16).toUpperCase().padStart(2, "0");
const num = (t) => {
  if (t in NAMED) return NAMED[t];
  const v = Number(t);
  if (!Number.isInteger(v) || v < 0 || v > 255) throw new Error(`bad byte token: ${t}`);
  return v;
};
const cmdBytes = (c) => (c === 0xff || c === 0x00 ? [0x00, c] : [c]);

const lines = [];
const emit = (cmd, data) => lines.push([...cmdBytes(cmd), data.length, ...data].map(hex).join(", ") + ",");

let i = 0;
let pendingCmd = null;
while (i < tokens.length) {
  const op = tokens[i++];
  switch (op) {
    case "BEGIN_WRITE":
    case "END_WRITE":
      break;
    case "WRITE_C8_D8":
      emit(num(tokens[i]), [num(tokens[i + 1])]);
      i += 2;
      break;
    case "WRITE_C8_D16":
      emit(num(tokens[i]), [num(tokens[i + 1]), num(tokens[i + 2])]);
      i += 3;
      break;
    case "WRITE_COMMAND_8": {
      const c = num(tokens[i++]);
      if (tokens[i] === "WRITE_BYTES") {
        pendingCmd = c; // data follows in WRITE_BYTES
      } else {
        emit(c, []);
      }
      break;
    }
    case "WRITE_BYTES": {
      const n = num(tokens[i++]);
      const data = tokens.slice(i, i + n).map(num);
      i += n;
      if (pendingCmd === null) throw new Error("WRITE_BYTES without command");
      emit(pendingCmd, data);
      pendingCmd = null;
      break;
    }
    case "DELAY":
      lines.push(`kDelayMS, ${num(tokens[i++])},`);
      break;
    default:
      throw new Error(`unknown op ${op}`);
  }
}

// Arduino_NV3007::tftInit() then calls invertDisplay(false) with ips=false → INVOFF (0x20).
// setRotation(1) on the stock badge writes MADCTL 0x60 (landscape). Both go after DISPON.
lines.push(`${hex(0x20)}, 0,`);
lines.push(`${hex(0x36)}, 1, ${hex(Number(madctlArg))},`);
lines.push("kDelayMS, 0");

process.stdout.write(JSON.stringify(lines, null, "\t") + "\n");
