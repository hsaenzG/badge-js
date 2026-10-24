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
- [ ] 1.7b Reconcile: the chip runs `mictlan_card` (built 2026-10-24 12:57), not the stock Meshtastic image recorded in `../mictlan-js/docs/hardware.md`. Locate the source of that build and the stock backup (SHA-256 `0640a9ca…`)
- [ ] 1.7c Rename the new backup so its name matches its contents (proposed: `badge-2026-10-24-mictlan_card.bin`)
- [ ] 1.8 Static string analysis of the current image for driver hints (offline) — R1
- [ ] 1.9 🔌 Capture boot log over serial (stock image printed `BadgeJsconButtons: UP=… DOWN=… SELECT=… BACK=…`) — R1
- [ ] 1.10 Macro photos: WROOM-1 variant label, display flex code, VOLLGO marking (you)
- [ ] 1.11 Continuity mapping of 10 FPC pads and 4 front buttons to module pins (power off) — R1.1
- [ ] 1.12 Check Moddable support for the identified panel controller — D0 risk
- [ ] 1.13 Update `docs/hardware.md`; promote facts to VERIFIED
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

## M3. First deploy to the badge ⚡ (Phase 1 deliverable)
- [ ] 3.1 Pre-flash checklist in `docs/backup-and-recovery.md` §6 complete
- [ ] 3.2 Document the Moddable-generated partition table and bootloader version in `design.md` §5
- [ ] 3.3 ⚡ Flash with your approval of the exact command; color-fill test, orientation, offsets
- [ ] 3.4 Verify the 4 buttons (events logged over serial)
- [ ] 3.5 Intro animation + card + GitHub screen on the badge; measure boot time and FPS — Phase 1 acceptance
- [ ] 3.6 Rehearse restore of the backup image

## M4–M5. Mictlán.js game (`game.md`)
## M6–M7. AWS backend (TS) and secure AI integration
