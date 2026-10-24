# Tech — Hazel Badge OS

## Hard safety rules (never break)
- Never run `erase-flash`, `write-flash`, `idf.py flash`, `idf.py erase-flash`, `espefuse burn-*`, or any flash/eFuse write without Hazel's explicit approval for that exact command.
- Read-only device commands (`chip-id`, `flash-id`, `read-flash`, `verify-flash`, `espefuse summary`, serial monitor) still reset the chip: announce them first.
- Flash dumps live in `~/esp32-dev/backups/`, never in this repo, never uploaded anywhere.
- No pin number, panel controller, offset or button wiring goes into code unless `docs/hardware.md` tags it `VERIFIED`. Never borrow mappings from other Electronic Cats badges.
- No AWS credentials, Wi-Fi passwords or device tokens in source or firmware images.

## Stack (JavaScript/TypeScript first — this is a JSConf badge)
- Apps: **TypeScript** on the **Moddable SDK** (XS engine), Piu/Commodetto UI, ECMA-419 IO. Target `esp32/esp32s3` with a custom host for this badge.
- Native C only when JS can't do it (missing panel driver, timing-critical code), exposed as a Moddable native module.
- ESP-IDF **v6.1** (what Moddable requires). This replaces the bootloader on flash, so full-image restore must stay possible.
- Tests: pure TS logic in `src/core/` tested with **Vitest** in Node; visuals reviewed in Moddable's `mcsim`.
- Fonts: JetBrains Mono (SIL OFL 1.1) converted to BMFont.
- Backend (Phase 3): **TypeScript** — `@strands-agents/sdk` from npm (never the github: monorepo install), Lambda on Node.js, API Gateway, AWS CDK in TypeScript, Amazon Bedrock with Amazon Nova.

## Tooling on the Mac
- Python venv: `~/esp32-dev/.venv` with `esptool==5.6.0` (needs re-creation, see backup doc).
- Serial port: `/dev/cu.usbmodem*` (native USB-Serial/JTAG, VID 0x303A PID 0x1001).

## Code rules
- `src/core/` imports nothing from Moddable (`piu/*`, `embedded:*`) so it runs in Node.
- No object/array/string creation in per-frame code paths; build at screen entry and reuse (keeps the XS GC quiet).
- Text iterates by Unicode code point (`Array.from`, `for…of`), never by UTF-16 index.
- Every logic module ships with Vitest tests.
- TypeScript `strict: true`.
