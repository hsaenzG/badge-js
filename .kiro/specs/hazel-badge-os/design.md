# Design — Hazel Badge OS

Status: architecture draft, revised 2026-10-24 to make **JavaScript/TypeScript the application language** (it's a JSConf badge). Panel-specific sections stay placeholders until `docs/hardware.md` promotes the display and buttons to `VERIFIED`.

## 1. Guiding decisions

| # | Decision | Why | Alternatives considered |
|---|---|---|---|
| D0 | **Apps written in TypeScript, running on-device in the Moddable SDK's XS engine** | Real modern JS (ES2023+) on the ESP32-S3, TypeScript compiled by the build (`mcconfig`), mature graphics stack (Commodetto + Piu), ECMA-419 standard IO APIs, a desktop simulator (`mcsim`). Fits JSConf: the badge's apps are JS | Espruino (ES5-ish, weak S3 support); QuickJS or JerryScript embedded in a C host (we would write our own graphics/IO bindings); MicroPython (not JS) |
| D1 | **ESP-IDF v6.1**, the version the Moddable SDK currently targets | Required by Moddable. Means the bootloader gets replaced too, so the full-image restore path in `docs/backup-and-recovery.md` is mandatory | Staying on 5.5.5 (would force an older Moddable release, unsupported) |
| D2 | **Native C only where JS can't do it**: the panel driver (if Moddable lacks the controller) and anything time-critical. Exposed to JS as a Moddable native module | Keeps nearly all product code in TS while respecting the MCU | All-C firmware (the previous design; rejected by product direction) |
| D3 | **Piu/Commodetto for rendering; no LVGL** | Moddable ships its own UI stack with fonts, bitmaps, dirty-region updates and SPI display drivers (ST7789, ILI9341, GC9A01, others) | LVGL bindings (extra layer, not idiomatic in Moddable) |
| D4 | **Input debounced by a pure TS state machine**, fed by ECMA-419 `Digital` reads on a 5 ms timer | Same logic runs and is tested in Node | ISR callbacks (`onReadable`) — can switch later |
| D5 | **JetBrains Mono (SIL OFL 1.1) converted to BMFont** with Moddable's font tools, Latin-1 subset | Same look as the GitHub README, Spanish accents, no runtime TTF | Moddable built-in fonts (no JetBrains look) |
| D6 | **Pure TS logic modules tested with Vitest in Node**; visual review in `mcsim` | Typewriter, navigation, input FSM, game physics share one source of truth | Separate C host tests (previous design) |
| D7 | Backend in **TypeScript**: Strands Agents TypeScript SDK (`@strands-agents/sdk` from npm) on Lambda (Node.js), **AWS CDK in TypeScript**, model **Amazon Nova** on Bedrock | One language across badge, tests, backend and infra | Python Strands SDK (more mature; still a fallback) |

Risk to verify early: Moddable must support the actual panel controller. If it doesn't, we write a small native driver module (D2). This is checked in M1/M3, not assumed.

## 2. Layered architecture

```
┌──────────────────────────────────────────────────────────────┐
│ src/apps/      intro · menu · card · links · qr · game (TS)  │  Piu screens
├──────────────────────────────────────────────────────────────┤
│ src/core/      typewriter · navStack · inputFsm · layout ·   │  pure TS, no Moddable
│                game (fixed-step physics, AABB) · content     │  imports → Vitest in Node
├──────────────────────────────────────────────────────────────┤
│ src/platform/  display · buttons · clock · net               │  Moddable/ECMA-419 adapters
├───────────────────────────┬──────────────────────────────────┤
│ hosts/badge/ (manifest,   │ hosts/sim/ (mcsim manifest:      │
│  pin config from BSP,     │  keyboard → buttons, screen      │
│  native panel driver if   │  size = verified panel size)     │
│  needed, LoRa CS hold)    │                                  │
└───────────────────────────┴──────────────────────────────────┘
```

Rules:
- `src/core/` imports nothing from Moddable (`piu/*`, `embedded:*`), so Node can run it.
- Pin numbers, SPI host and panel parameters live only in `hosts/badge/` and only once `VERIFIED`.

### 2.1 Platform contracts (sketch)

```ts
// src/platform/types.ts
export type Button = "up" | "down" | "back" | "select";
export type ButtonEvent = { button: Button; kind: "press" | "release" | "long" | "repeat" };
export interface RawButtons { read(): number }            // bitmask, 1 = pressed
export interface Clock { now(): number }                  // ms, monotonic
```

### 2.2 Input state machine (`src/core/inputFsm.ts`)
Per button: `IDLE → DEBOUNCE_DOWN (25 ms) → PRESSED → (600 ms) LONG → REPEAT every 120 ms`; release mirrors with `DEBOUNCE_UP`. Repeat only for UP/DOWN. Driven by `(rawMask, nowMs)`, so tests feed synthetic timelines. Preallocated event ring (16 entries); no allocation per tick.

### 2.3 Rendering
- Piu `Application` with dirty-region rendering through Commodetto's `Poco` renderer; Moddable streams bands to the display, so no full framebuffer is required.
- Typewriter updates only the active line and cursor, keeping SPI traffic small.
- Frame pacing: 30 Hz UI tick, game up to 60 Hz if panel bandwidth allows. Measured on hardware.
- GC discipline: no object creation in per-frame code paths; reuse arrays and strings built at screen entry. XS heap sized in the manifest (`creation` section) after measurement.

### 2.4 Typewriter animation (`src/core/typewriter.ts`)
Pure function of time over a script of lines (type ~45 ms/char, line pause ~600 ms, cursor blink 500 ms), modeled on readme-typing-svg. Steps by Unicode code point (`Array.from(line)`), so `á` counts as one character.

### 2.5 Fonts and text
JetBrains Mono → BMFont at 1–2 sizes, glyph subset ASCII + `á é í ó ú ñ Á É Í Ó Ú Ñ ü ¿ ¡ ·`. Size chosen once panel width is known so `>_ LATAM Developer Advocate @ AWS` (34 chars) fits or wraps cleanly. Font license shipped in `assets/fonts/`.

### 2.6 Screens and navigation (`src/core/navStack.ts`)
Fixed-depth stack (max 6). Screens: `onEnter`, `onEvent`, `tick(now)`; Piu does the drawing.

```
Intro ──(done/any key)──► Menu ─┬─► Card
                                ├─► GitHub (hsaenzG profile card)
                                ├─► Links
                                ├─► QR (only if resolution allows)
                                ├─► Mictlán.js (Phase 2)
                                └─► About
BACK pops; BACK on Menu replays the intro.
```

### 2.7 QR
Moddable includes a QR code module (`qrcode`) and Piu `QRCode` content. `https://hazelsaenz.tech` fits version 2 (25×25 modules), needing ~58 px with quiet zone at 2 px/module → feasible if panel height ≥ ~64 px. Decided after resolution is known.

## 3. Phase 2 — Mictlán.js (outline; full brief in `game.md`)
- Auto-runner, fixed timestep (16.67 ms) with accumulator, integer physics for determinism. Pure TS in `src/core/game/`, tested in Node.
- Four cempasúchil flowers (Variables, Functions, Promises, Objects), each opening a JS challenge; checkpoints instead of full restarts; ofrenda finale.
- Fixed entity pools (frog, ≤16 obstacles, 4 flowers, goal). AABB collision.
- Sprites: indexed-color sheets converted with Moddable image tools. Original frog design unless Strands mascot permission is confirmed.
- Question bank is local data; the badge never executes challenge code, it only shows it.

## 4. Phase 3 — AI backend (outline)

```
Badge ──HTTPS──► API Gateway (REST) ──► Lambda (Node.js, Strands TS agent) ──► Bedrock (Amazon Nova)
                 · per-device auth         · max output tokens cap
                 · usage plan throttle     · 10 s timeout
                 · JSON schema validation  · reserved concurrency (e.g. 2)
                 · daily quota             · structured logs w/o tokens
```

- **Auth honesty:** any secret stored on a badge can be extracted by its holder. The device token is per-device, revocable and quota-limited; the design caps cost and blast radius.
- Online challenges: the server keeps the correct answer; the badge submits an answer id and gets a verdict. Offline mode uses the local bank.
- Badge validates every response (schema, max lengths, renderable glyphs) and falls back to local text on any error.
- Wi-Fi credentials and token provisioned at runtime into flash preferences, never compiled in.

## 5. Flash layout (placeholder)
Moddable generates its own partition table. Before the first flash, the exact table, offsets and bootloader version go here, next to the current on-chip table (documented in `docs/backup-and-recovery.md`).

## 6. Testing strategy
- `src/core/`: Vitest unit tests in Node, run on every change.
- `mcsim` for visual review of screens at the verified resolution.
- On-device checklist per milestone (boot time, FPS, buttons, heap headroom), after approved flashing.

## 7. Open questions
1. Display controller / resolution / pins (blocks rendering and QR).
2. PSRAM present (eFuse reports none embedded; module may still be N8R8 with octal PSRAM).
3. Display and LoRa on a shared SPI bus?
4. Does Moddable already support the panel controller?
5. Strands mascot usage permission (default: original frog).
