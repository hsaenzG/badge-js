# Tasks — Hazel Badge OS

Legend: 🔌 touches the device (read-only unless stated) and needs your go-ahead · ⚡ writes flash, needs explicit approval for the exact command.

## M1. Hardware discovery and verification  ← current
- [x] 1.1 Check `ElectronicCats/badge_JSCON_2026` and related repos (result: 404, not public) — R0.6
- [x] 1.2 Identify components from photos; write `docs/hardware.md` with confidence tags — R0.6
- [x] 1.3 Passive USB enumeration (VID/PID, port) — R0.6
- [x] 1.4 Recreate `~/esp32-dev/.venv` (esptool 5.6.0) — R0.4
- [x] 1.5 🔌 Full backup read twice, SHA-256 match, `verify-flash` passed — R0.4
- [x] 1.6 🔌 `flash-id` and `espefuse summary` captured (Secure Boot and flash encryption disabled) — R0.4
- [x] 1.7 Partition table and app descriptor parsed (offline) — R0.4
- [x] 1.7b Reconciled: `mictlan_card` = Hazel's earlier attempt (`hsaenzG/mictlan-js`, branch `cursor/lcd-bus-pins`); stock backup kept on another computer
- [x] 1.7c Backup renamed `badge-2026-10-24-mictlan_card.bin`
- [x] 1.8 Static analysis: NV3007 2.79" init found in stock leftovers at `0xdc1b5`
- [x] 1.9 🔌 Boot log captured (prototype); stock boot log + disassembly from `mictlan-js` give buttons, LCD, LoRa pins
- [x] 1.10 Photos in `image/` (macro labels not needed after firmware evidence)
- [-] 1.11 Continuity mapping — not needed, pins verified from stock firmware and on glass
- [x] 1.12 Moddable: no NV3007 driver, but generic ili9341 driver + register list works (no C)
- [x] 1.13 `docs/hardware.md` updated; pins/panel VERIFIED
- **Exit criteria:** controller, resolution, display pins, backlight pin, 4 button GPIOs + active level, PSRAM, bus sharing with LoRa all VERIFIED; backup verified.

## M2. Toolchain (no device access)
- [ ] 2.1 Install ESP-IDF v6.1 under `~/esp` (outside repo) — D1
- [ ] 2.2 Install Moddable SDK under `~/Projects/moddable` (outside repo); build `mcsim` and run a hello-world in the simulator — D0
- [ ] 2.3 `package.json`, `tsconfig.json` (`strict`), Vitest — D6

## M2b. TS core + simulator (no hardware needed)
- [ ] 2b.1 `src/core/typewriter.ts` + tests (code-point stepping, skip on key) — R2.3–5
- [ ] 2b.2 `src/core/inputFsm.ts` + tests (debounce, long press, repeat) — R2.16–17
- [ ] 2b.3 `src/core/navStack.ts` + content module + tests — R2.11–15
- [ ] 2b.4 JetBrains Mono BMFont with Spanish glyphs — R2.8–9
- [ ] 2b.5 Piu screens: intro, menu, card, GitHub, links, about — R2.11–22
- [ ] 2b.6 `hosts/sim` at the verified resolution — D6

## M3. First deploy to the badge ⚡ (Phase 1 deliverable) — done 2026-10-24
- [x] 3.1 Pre-flash checklist in `docs/backup-and-recovery.md` §6 complete
- [x] 3.2 Partition table and bootloader version documented (`design.md` §5, backup doc §5b)
- [x] 3.3 ⚡ Flashed v0.1.0 (full) and v0.1.1 (app only) with approval; orientation, offsets, RGB order verified on glass
- [x] 3.4 All 4 buttons verified (video `image/IMG_7774.MOV`)
- [x] 3.5 Intro animation, whoami, card, GitHub, links, QR on the badge — **Phase 1 acceptance met**
- [ ] 3.5b Measure boot-to-first-frame and FPS (not measured yet)
- [ ] 3.5c Gray-ramp photo → decide on NV3007 gamma tweak (About → SELECT)
- [ ] 3.6 Rehearse a full restore of a backup image (needs approval; overwrites Hazel Badge OS)

## M4. Mictlán.js — desktop prototype (`game.md` Milestone 2) — done 2026-10-24
- [x] 4.1 Game design doc (`docs/game-design.md`): auto-runner, 4 flowers, checkpoints, ofrenda, Guardián
- [x] 4.2 Original pixel-art frog + calaverita, flor, Guardián, candle, heart (`src/core/game/sprites.ts`)
- [x] 4.3 Offline question bank, 2 variants per concept; tests **execute every snippet in Node** to prove the answer
- [x] 4.4 Deterministic 60 Hz game core (physics, collisions, hearts, checkpoints, pause, retry, victory, replay)
- [x] 4.5 Shared renderer against a `Gfx` interface (`src/core/game/render.ts`)
- [x] 4.6 Browser simulator at 428×142 ×3 with keyboard + panel-safe color toggle (`npm run sim`)
- [x] 4.7 Tests: full bot playthrough (~2 min), determinism, checkpoints, every screen fits 428 px (69 tests)
- [ ] 4.8 Playtest with Hazel; tune difficulty, timing, texts

## M5. Mictlán.js on the badge (`game.md` Milestones 3–4)
- [ ] 5.1 Poco `Gfx` adapter (palette with `PANEL_SAFE`, sprites as bitmaps, JetBrains Mono TTF)
- [ ] 5.2 Launch from the Phase 1 menu; `salir` returns to it
- [ ] 5.3 Measure FPS on hardware; switch to dirty-region rendering if full-frame redraw is too slow
- [ ] 5.4 ⚡ Flash with approval; play the full level on the badge
## M6–M7. AWS backend (TS) and secure AI integration
