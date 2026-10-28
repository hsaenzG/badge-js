# Tasks — Hazel Badge OS

[Español](../tasks.md) · **English**

Legend: 🔌 touches the device (read-only unless stated) and needs your go-ahead · ⚡ writes flash, needs explicit approval for the exact command.

## M1. Hardware discovery and verification — done
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

## M2. Toolchain (no device access) — done
- [x] 2.1 ESP-IDF v6.1 installed under `~/esp` (outside repo) — D1
- [x] 2.2 Moddable SDK installed under `~/Projects/moddable` (outside repo) — D0
- [x] 2.3 `package.json`, `tsconfig` (`strict`), Vitest — D6

## M2b. TS core + simulator (no hardware needed) — done
- [x] 2b.1 `src/core/typewriter.ts` + tests (code-point stepping, skip on key) — R2.3–5
- [x] 2b.2 `src/core/inputFsm.ts` + tests (debounce, long press, repeat) — R2.16–17
- [x] 2b.3 `src/core/nav.ts` + content module + tests — R2.11–15
- [x] 2b.4 JetBrains Mono with Spanish glyphs (TTF via cfeFT instead of BMFont) — R2.8–9
- [x] 2b.5 Screens: intro, menu, card, GitHub, links, about — R2.11–22
- [x] 2b.6 Browser simulator at the verified resolution (`sim/`, `npm run sim`) instead of `hosts/sim` — D6

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
- [x] 4.7 Tests: full bot playthrough (~2 min), determinism, checkpoints, every screen fits 428 px
- [ ] 4.8 Playtest with Hazel; tune difficulty, timing, texts

## M5. Mictlán.js on the badge (`game.md` Milestones 3–4)
- [x] 5.1 Poco `Gfx` adapter (palette with `PANEL_SAFE`, sprites as bitmaps, JetBrains Mono TTF)
- [x] 5.2 Launch from the Phase 1 menu; `salir` returns to it
- [x] 5.3 FPS measured on hardware: 22–24 fps with full-frame redraw (good enough, no dirty regions for now)
- [x] 5.4 ⚡ Flashed with approval; full level playable on the badge

## M6. AWS backend: El Guardián on Strands Harness — done 2026-10-24
- [x] 6.1 API contract v1 with strict Zod schemas (`backend/src/contract.ts`)
- [x] 6.2 Guardián on `createHarness()`, locked down: no tools, no session, no memory, no skills/plugins, no caching; per-request agent (`backend/src/guardian.ts`)
- [x] 6.3 AI challenges verified by running the snippet in a screened `node:vm` sandbox; bank fallback (`backend/src/snippet.ts`)
- [x] 6.4 Answers held server-side in DynamoDB with TTL and try limit (`backend/src/store.ts`)
- [x] 6.5 Handler: validation, 413/400/404, canned fallbacks, metadata-only JSON logs (`backend/src/handler.ts`)
- [x] 6.6 Bundle with code splitting + guard against eager optional peers; bundle run locally end-to-end against a closed endpoint
- [x] 6.7 CDK stack: REST API + per-badge key + usage plan, Lambda (Node 24 ARM, no reserved concurrency: account limit is 10), scoped Bedrock IAM, DynamoDB TTL, logs, error alarm, optional budget; `cdk synth --strict` clean with cdk-nag v3
- [x] 6.8 Backend tests (fake model): fallbacks, leak check, injection-proof prompts, dangerous code, try limits, logging
- [x] 6.9 ⚡☁ Deployed with approval: profile free-tier-Strands, us-east-2, budget USD 5 → hazel.saenz@gmail.com
- [x] 6.10 Smoke test on the live API: 403 without key, AI lines 1–2.8 s, 400 on bad input, AI challenge without answer, server-side answer, close after solve, logs metadata-only (0 key matches)
- [x] 6.11 Leak check also applied to AI challenge hints
- [ ] 6.11b Usage-plan burst throttling not observed in a 6-request burst (daily quota still bounds cost)

## M7. Badge online mode
- [x] 7.1 Wi-Fi + HTTPS client in Moddable; credentials + API key provisioned into NVS (`Preference`, domain `guardian`) with `scripts/provision-badge.py` — working through the phone hotspot
- [x] 7.2 Online Guardián lines in Mictlán.js (hint/cheer/final) with local fallback
- [ ] 7.3 Online challenges via /v1/challenge + /v1/answer
- [x] 7.4 ⚡ Flashed with approval (online app + NVS)
- [x] 7.5 Wi-Fi diagnostics: scan first, status line on title/pause, 30 s retries (`src/core/netStatus.ts`) — built, **not flashed**
- [ ] 7.6 Fix `XS abort: JavaScript stack overflow` after connecting (suspect: JS TLS with `creation.stack: 512`; unverified)
- [ ] 7.7 ⚡ Flash diagnostics + fix with approval
