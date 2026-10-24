# Tech — Hazel Badge OS

## Hard safety rules (never break)
- Never run `erase-flash`, `write-flash`, `idf.py flash`, `idf.py erase-flash`, `espefuse burn-*`, or any flash/eFuse write without Hazel's explicit approval for that exact command.
- Read-only device commands (`chip-id`, `flash-id`, `read-flash`, `verify-flash`, `espefuse summary`, serial monitor) still reset the chip: announce them first.
- Flash dumps live in `~/esp32-dev/backups/`, never in this repo, never uploaded anywhere.
- No pin number, panel controller, offset or button wiring goes into code unless `docs/hardware.md` tags it `VERIFIED`. Never borrow mappings from other Electronic Cats badges.
- No AWS credentials, Wi-Fi passwords or device tokens in source or firmware images.

## Stack
- Firmware: ESP-IDF v5.5.x (original firmware built with 5.5.5), target `esp32s3`, C11.
- Display: `esp_lcd` + custom lightweight renderer; LVGL deferred (see design D3).
- Host: CMake + CTest + Unity tests; SDL2 simulator linking the same `core/`.
- Fonts: JetBrains Mono (SIL OFL 1.1) rasterized by `tools/fontgen.py`.
- Backend (Phase 3): Python, Strands Agents SDK, Amazon Bedrock (Amazon Nova), AWS Lambda, API Gateway, AWS CDK.

## Tooling on the Mac
- Python venv: `~/esp32-dev/.venv` with `esptool==5.6.0` (needs re-creation, see backup doc).
- Serial port: `/dev/cu.usbmodem*` (native USB-Serial/JTAG, VID 0x303A PID 0x1001).

## Code rules
- `core/` and `apps/` never include ESP-IDF headers.
- No heap allocation in render/animation/game loops; allocate at init.
- Text is UTF-8; iterate by code point.
- Every logic module ships with host tests.
