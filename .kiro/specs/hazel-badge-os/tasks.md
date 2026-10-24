# Tasks — Hazel Badge OS

Legend: 🔌 touches the device (read-only unless stated) and needs your go-ahead · ⚡ writes flash, needs explicit approval for the exact command.

## M1. Hardware discovery and verification  ← current
- [x] 1.1 Check `ElectronicCats/badge_JSCON_2026` and related repos (result: 404, not public) — R0.6
- [x] 1.2 Identify components from photos; write `docs/hardware.md` with confidence tags — R0.6
- [x] 1.3 Passive USB enumeration (VID/PID, port) — R0.6
- [ ] 1.4 Locate or recreate `~/esp32-dev/.venv` and the backup (currently missing on this Mac) — R0.4
- [ ] 1.5 🔌 Full backup read twice + SHA-256 match + `verify-flash` — R0.4
- [ ] 1.6 🔌 Capture full `chip-id` / `flash-id` output and `espefuse summary` — R0.4
- [ ] 1.7 Parse partition table and app descriptor from the backup (offline) — R0.4
- [ ] 1.8 Static string analysis of the app image for driver/library hints (offline) — R1
- [ ] 1.9 🔌 Capture boot log over serial — R1
- [ ] 1.10 Macro photos: WROOM-1 variant label, display flex code, VOLLGO marking (you)
- [ ] 1.11 Continuity mapping of 10 FPC pads and 4 front buttons to module pins (power off) — R1.1
- [ ] 1.12 🔌 (optional) RAM-only input-scan probe via `esptool load-ram` (no flash write) — R1
- [ ] 1.13 Update `docs/hardware.md`; promote facts to VERIFIED; fill partition table in backup doc
- **Exit criteria:** controller, resolution, display pins, backlight pin, 4 button GPIOs + active level, PSRAM, bus sharing with LoRa all VERIFIED; backup verified.

## M2. ESP-IDF environment setup (no device access)
- [ ] 2.1 Install ESP-IDF v5.5.x under `~/esp` (outside repo) — D1
- [ ] 2.2 Scaffold `firmware/` ESP-IDF project with `bsp`, `display_esp`, `input_esp` components (no pin values yet) — R1.1
- [ ] 2.3 `idf.py set-target esp32s3 && idf.py build` passes — R1
- [ ] 2.4 Write `firmware/partitions.csv` after 1.7 and record in `design.md` §5

## M2b. Host core + simulator (can run in parallel with M1, no hardware needed)
- [ ] 2b.1 CMake host build + Unity tests for `core/` — R2.20
- [ ] 2b.2 `core/font` + `tools/fontgen.py` (JetBrains Mono subset incl. á é í ó ú ñ · ¿ ¡) — R2.8–9
- [ ] 2b.3 `core/anim` typewriter with UTF-8 code-point stepping + tests — R2.3–5
- [ ] 2b.4 `core/input_fsm` debounce/long-press/repeat + timeline tests — R2.16–17
- [ ] 2b.5 `core/ui_nav` screen stack + menu, card, links screens — R2.11–15, R2.18
- [ ] 2b.6 SDL2 simulator with configurable resolution (switch to the verified one after M1) — D6

## M3. Minimal display initialization ⚡
- [ ] 3.1 Pre-flash checklist in `docs/backup-and-recovery.md` §6 complete
- [ ] 3.2 Display probe (RAM-load first if possible): fill red/green/blue, check orientation, offsets, color order
- [ ] 3.3 ⚡ First flash with your approval; verify; rehearse restore

## M4. Button input verification ⚡
- [ ] 4.1 Firmware prints input events over serial; confirm all 4 buttons + long press + repeat

## M5. Animated terminal UI ⚡
- [ ] 5.1 Intro typewriter on the badge; measure boot-to-first-frame and FPS — R2.1, R2.10

## M6. Digital card and navigation ⚡
- [ ] 6.1 Menu, card, links, QR (if feasible), About — Phase 1 acceptance

## M7–M8. Frog game (after theme decision)
## M9–M10. AWS backend and secure AI integration
