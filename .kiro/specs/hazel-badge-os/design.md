# Design — Hazel Badge OS

Status: architecture draft. Panel-specific sections are placeholders until `docs/hardware.md` promotes the display and buttons to `VERIFIED`.

## 1. Guiding decisions

| # | Decision | Why | Alternatives considered |
|---|---|---|---|
| D1 | **ESP-IDF v5.5.x** (match the 5.5.5 the original firmware uses) | Same toolchain as the shipped bootloader, `esp_lcd` component covers common SPI panels, first-class ESP32-S3 support | Arduino-ESP32 (faster to start, weaker control over memory/tasks), PlatformIO (wrapper; fine later) |
| D2 | **Portable C11 core + thin hardware layer** | Animation, navigation, text layout and game logic run and get tested on macOS | C++ (fine too, but C keeps the host build trivial) |
| D3 | **Custom lightweight renderer first; LVGL deferred** | The UI is a terminal + menus + one sprite game. A full RGB565 framebuffer for any bar panel likely fits internal SRAM (e.g. 320×172×2 ≈ 110 KB; 284×76×2 ≈ 43 KB), so no PSRAM is required. LVGL adds ~100–200 KB flash and its own memory model for widgets we don't need | LVGL 9 (re-evaluate if we later want rich widgets); LovyanGFX (Arduino-centric, auto-detect is tempting but encourages guessing) |
| D4 | **Polled input at 200 Hz** in a timer task, debounced by a pure state machine | No ISR bounce storms, deterministic, host-testable | GPIO ISR + timers (lower idle power; can switch later) |
| D5 | **Bitmap font generated offline** from JetBrains Mono (SIL OFL 1.1, embedding allowed) | Exact look of the GitHub README, includes Spanish glyphs, zero runtime font parsing | Built-in 8×16 fonts (no accents), runtime TTF (too heavy) |
| D6 | **SDL2 desktop simulator** that links the same C core and shows the same framebuffer | Iterate on design without flashing; same code path as the badge | Browser/Canvas port (second implementation to keep in sync) |
| D7 | Backend in **Python** (Strands Agents SDK) on **Lambda**, infra with **AWS CDK**, model **Amazon Nova** on Bedrock | Strands Python is the most mature SDK; Nova is cheap/fast for short messages | TypeScript Strands SDK (viable); Claude (higher cost for 1–2 sentence outputs) |

## 2. Layered architecture

```
┌──────────────────────────────────────────────────────────────┐
│ apps/           intro · menu · card · links · qr · game      │  pure C, host-testable
├──────────────────────────────────────────────────────────────┤
│ core/           ui_nav (screen stack) · anim (typewriter,    │  pure C, host-testable
│                 tweens) · gfx (fb, rects, blit, text) ·      │
│                 font (UTF-8, glyph lookup) · input_fsm ·     │
│                 game (fixed-step physics, AABB)              │
├──────────────────────────────────────────────────────────────┤
│ hal/ interface  display_if · input_if · clock_if · net_if    │  headers only
├───────────────────────────┬──────────────────────────────────┤
│ firmware/ (ESP-IDF)       │ sim/ (macOS)                     │
│  bsp (pins, buses, LoRa   │  SDL2 window = display_if        │
│  CS hold, backlight)      │  keyboard    = input_if          │
│  display_esp (esp_lcd)    │                                  │
│  input_esp (gpio poll)    │                                  │
│  net_esp (Wi-Fi, HTTPS)   │                                  │
└───────────────────────────┴──────────────────────────────────┘
```

Rule: nothing above `hal/` includes an ESP-IDF header.

### 2.1 HAL contracts (sketch)

```c
// hal/display_if.h
typedef struct {
    uint16_t width, height;              // logical, after rotation
    void (*flush)(int x, int y, int w, int h, const uint16_t *rgb565); // async-safe
    void (*wait_flush)(void);            // block until previous DMA done
    void (*set_backlight)(uint8_t pct);
} display_if_t;

// hal/input_if.h
typedef enum { BTN_UP, BTN_DOWN, BTN_BACK, BTN_SELECT, BTN_COUNT } btn_t;
typedef uint8_t (*input_read_raw_fn)(void);  // bitmask, 1 = pressed (active level handled in BSP)
```

### 2.2 Input state machine (`core/input_fsm`)
Per button: `IDLE → DEBOUNCE_DOWN (25 ms) → PRESSED → (600 ms) LONG → REPEAT every 120 ms`; release path mirrors with `DEBOUNCE_UP`. Emits events into a fixed 16-entry ring buffer. Repeat is enabled for UP/DOWN only (configurable per button). Fed with `(raw_mask, now_ms)` so tests drive it with synthetic timelines.

### 2.3 Rendering
- One RGB565 framebuffer in internal DMA-capable RAM (size decided from verified resolution). If it doesn't fit, fall back to band rendering (render N lines, flush, repeat).
- Dirty-rectangle tracking: the typewriter only flushes the cell row being typed + cursor, which keeps SPI traffic tiny.
- Frame pacing: app task runs a fixed 30 Hz tick (33 ms) for UI, 60 Hz for the game if the panel bandwidth allows. Measured, not assumed: full-frame SPI time ≈ `w·h·16 / f_spi` (e.g. 320×172 at 40 MHz ≈ 22 ms).
- Byte order: panel expects big-endian RGB565; swap in `flush` or store pre-swapped. Decided with the driver.

### 2.4 Typewriter animation (`core/anim`)
State: `{script, line_idx, char_idx, next_ms, cursor_on}`. Script lines carry per-line delays (type speed ~45 ms/char, line pause ~600 ms, cursor blink 500 ms), modeled on readme-typing-svg. Operates on UTF-8 code points, not bytes, so `á` counts as one character. Pure function of time → fully testable.

### 2.5 Fonts and text
- `tools/fontgen.py` rasterizes JetBrains Mono (OFL) at 1–2 sizes to a 1-bpp or 2-bpp (anti-aliased) C array plus a sorted code-point table (ASCII 0x20–0x7E + Latin-1 subset + `·`, `>`, `_`, `¿`, `¡`).
- Monospace makes layout a column count: `cols = width / glyph_w`. The font size is chosen once the width is known so `>_ LATAM Developer Advocate @ AWS` (34 chars) fits or wraps cleanly.
- License file for the font is shipped in `assets/fonts/`.

### 2.6 Screens and navigation (`core/ui_nav`)
Fixed-depth screen stack (max 6). Each screen: `on_enter`, `on_event`, `tick(now)`, `render(gfx)`. No heap.

```
Intro ──(done/any key)──► Menu ─┬─► Card
                                ├─► Links
                                ├─► QR (only if resolution allows)
                                ├─► Frog Quest (Phase 2)
                                └─► About
BACK pops; BACK on Menu replays the intro.
```

### 2.7 QR
Use a small MIT-licensed QR encoder (e.g. Nayuki's qrcodegen C, MIT) at build time or init time into a static buffer. `https://hazelsaenz.tech` fits version 2 (25×25 modules). Needs 25×2 + quiet zone ≈ 58 px height → feasible if the panel height ≥ ~64 px. Decision recorded after resolution is known.

## 3. Phase 2 — game (outline)
- Auto-runner, fixed timestep (16.67 ms) with an accumulator; integer/fixed-point physics (Q8.8) for determinism.
- Entities in fixed arrays: frog, ≤ 16 obstacles, 4 collectibles, goal. AABB collision.
- Level defined as a compact tile/event table in flash.
- Sprites: indexed-color (4-bit) sheets converted by `tools/spritegen.py`.
- Theme (Frog Quest vs Mictlán.js) is an open decision; the engine is identical.

## 4. Phase 3 — AI backend (outline)

```
Badge ──HTTPS──► API Gateway (REST) ──► Lambda (Python, Strands Agent) ──► Bedrock (Amazon Nova)
                 · per-device auth         · max_tokens cap
                 · usage plan throttle     · 10 s timeout
                 · JSON schema validation  · reserved concurrency (e.g. 2)
                 · daily quota             · structured logs w/o tokens
```

- **Auth honesty:** any secret stored on a badge can be extracted by someone with the badge. So the device token is per-device, revocable, and quota-limited; the design caps cost and blast radius rather than pretending the token is unextractable.
- Request: `POST /v1/message {"event":"quest_complete","lang":"es","score":1234}` with `Authorization: Bearer <device-token>`.
- Response: `{"v":1,"title":"Agent assembled!","body":"Next challenge: Build a tool with Lambda."}` — server enforces length; badge re-validates (max lengths, printable glyphs it can render), and shows a local fallback on any error.
- Cost controls: usage plan (e.g. 1 rps, 50/day per device), Lambda reserved concurrency, Bedrock output cap, AWS Budgets alarm.
- Wi-Fi SSID/password and device token provisioned over the serial console into NVS, never compiled in.

## 5. Flash layout (placeholder)
To be written only after the original partition table is documented. Initial intent: keep 8 MB, DIO 80 MHz like the original; `nvs`, `phy_init`, `factory` app; reserve space for later OTA if Phase 3 needs it.

## 6. Testing strategy
- `core/` + `apps/` logic: host unit tests (CMake + CTest + Unity), run on every change.
- Golden-frame tests: render a screen into the framebuffer on the host and compare a hash/PNG.
- Simulator for visual review.
- On-device verification checklist per milestone (boot time, FPS, button behavior), done manually with your approval to flash.

## 7. Open questions
1. Display controller / resolution / pins (blocks §2.3, §2.5, §2.7, §5).
2. PSRAM present?
3. Display and LoRa on a shared SPI bus?
4. Phase 2 theme: Frog Quest or Mictlán.js?
5. Strands mascot usage permission (default: original frog).
