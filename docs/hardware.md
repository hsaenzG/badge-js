# Hardware Discovery Report — JSConf México 2026 Badge (Electronic Cats)

Status: **Milestone 1 in progress. NOT cleared for device-specific display init or flashing.**
Last updated: 2026-10-24

Every fact below carries a confidence tag:

| Tag | Meaning |
|---|---|
| `VERIFIED` | Confirmed by tool output or unambiguous physical evidence |
| `OBSERVED` | Visible in photos, but marking is partly illegible or the role is inferred from layout |
| `HYPOTHESIS` | Plausible engineering guess. **Must not be used in code** until promoted |
| `UNKNOWN` | No evidence yet |

## 1. Sources consulted

| Source | Result |
|---|---|
| `github.com/ElectronicCats/badge_JSCON_2026` (URL printed on PCB silkscreen) | **HTTP 404** on 2026-10-24. Not public (private, renamed, or not yet published). |
| `gh search repos --owner ElectronicCats jsconf` / `JSCON` | No results. |
| ElectronicCats org repo list (100 most recent) | No JSConf repo. Other badges exist (HackGDL, BugCON, REcon…) but they are **different boards** and must not be used as a pin-mapping source. |
| Web search "Electronic Cats JSConf México 2026 badge" | No documentation, schematic, or firmware found. |
| Photos in `image/` (front off, front on, back) | Component identification below. |
| macOS IORegistry (passive, no port opened) | USB descriptor below. |

## 2. Verified / observed facts

### 2.1 MCU and module

| Item | Value | Tag | Evidence |
|---|---|---|---|
| Module | Espressif **ESP32-S3-WROOM-1** (PCB antenna) | `VERIFIED` | Module shield marking, back photo |
| Chip | ESP32-S3 (QFN56) rev v0.2, dual core, 240 MHz, Wi-Fi + BLE | `VERIFIED` | User's `esptool chip-id` |
| Flash | 8 MB, Quad SPI, 3.3 V | `VERIFIED` | User's `esptool flash-id` |
| Bootloader | ESP-IDF v5.5.5, 8 MB, 80 MHz, DIO | `VERIFIED` | User's `image-info` |
| Module variant (N8 / N8R2 / N8R8) | ordering code not legible in photo | `UNKNOWN` | Determines PSRAM (0 / 2 MB quad / 8 MB octal) |
| PSRAM | — | `UNKNOWN` | Critical for framebuffer strategy and LVGL decision |
| USB | Native USB-Serial/JTAG, VID `0x303A`, PID `0x1001`, product "USB JTAG_serial debug unit" | `VERIFIED` | `ioreg` (passive) |
| Serial port | `/dev/cu.usbmodem101` (may change) | `VERIFIED` | `ls /dev/cu.usb*` |

The USB serial number equals the chip's base MAC. It is intentionally not reproduced in this repo.

### 2.2 Display

| Item | Value | Tag |
|---|---|---|
| Type | Color TFT LCD, bar/stretched form factor, mounted landscape on the front | `OBSERVED` |
| Aspect ratio | ~2.9–3.4 : 1 measured from photos (includes bezel, perspective error) | `OBSERVED` |
| Interface | FPC flex routed to the back into a connector with silkscreen **1** and **10** → 10-contact FPC | `OBSERVED` |
| Bus type | 10 contacts is consistent with a 4-wire SPI TFT (VCC, GND, SCK, MOSI, CS, DC, RST, BL…) but this is not proof | `HYPOTHESIS` |
| Backlight | Q2 (SOT-23 transistor) + R3/R13/R14 sit right next to the FPC connector → likely a GPIO-switched backlight | `HYPOTHESIS` |
| Controller | — | `UNKNOWN` |
| Resolution | — | `UNKNOWN` |
| Column/row offsets, color order (RGB/BGR), inversion | — | `UNKNOWN` |
| Behavior with original firmware | Photo shows a dark olive band across the top ~30% and a purple band below, with visible scanline texture | `OBSERVED` |

Do not choose a driver by resemblance. Bar panels from different vendors use ST7789, ST7735, GC9107, NV3007, ILI9341 variants and others, each with different offsets.

### 2.3 Other components (back side)

| Ref / marking | Likely role | Tag |
|---|---|---|
| VOLLGO module, "ISM: 915MHz LoRa", part code partially legible (`VG…S915N0S1`) | LoRa radio module | `OBSERVED` (part number to confirm) |
| AE1, SMA connector | Antenna for the LoRa module | `OBSERVED` |
| LoRa transceiver chip inside the module | — | `UNKNOWN` |
| SOT-223 "JJ33 / 902623" + C6/C7 | 3.3 V linear regulator | `OBSERVED` |
| F1, R1, R2 next to USB-C | Fuse + USB-C CC resistors | `HYPOTHESIS` |
| C4, C5, R5 near RST/BOOT | EN reset RC network | `HYPOTHESIS` |
| ON/OFF slide switch | Power switch | `VERIFIED` (silkscreen) |
| Battery holder / connector | none visible in back photo | `UNKNOWN` — how is the badge powered when unplugged? |

**New fact not in the original brief:** the board carries a 915 MHz LoRa module. That matters because:
- It probably shares an SPI bus with the display, or uses a second SPI host. Either changes the display driver design.
- Its CS line must be held inactive (normally high) when talking to the display on a shared bus, or bus traffic gets corrupted.
- The SMA connector should not be left without an antenna if we ever transmit. Phase 1–3 have no LoRa feature, so firmware will keep the radio idle/asleep.

### 2.4 Buttons

| Button | Wiring | Tag |
|---|---|---|
| UP, DOWN, BACK, SELECT (front) | GPIO numbers, active level, external pull-ups | `UNKNOWN` |
| BOOT (rear) | On every ESP32-S3 design the download-mode button drives the GPIO0 strapping pin | `HYPOTHESIS` (standard practice, still to verify on this board) |
| RST (rear) | CHIP_PU / EN | `HYPOTHESIS` |

## 3. Unknowns that block Phase 1

1. Display controller, resolution, offsets, color order, inversion.
2. Display pin mapping: SCK, MOSI, (MISO?), CS, DC, RST, backlight, SPI host.
3. Whether display and LoRa share the SPI bus; LoRa CS/RST/IRQ pins.
4. Front button GPIOs and active level.
5. PSRAM presence and size.
6. **Integrity of the flash backup** (see §5).

## 4. Proposed read-only identification plan

Ordered from zero risk to low risk. Nothing here writes to flash. Steps marked 🔌 touch the device (they reset it into the ROM bootloader, which interrupts the running firmware but changes nothing) and need your go-ahead.

### Step A — Get the repo (zero risk)
Ask Electronic Cats (or the JSConf organizers) whether `badge_JSCON_2026` will be published or can be shared. A schematic or the firmware source resolves nearly every unknown at once.

### Step B — Physical inspection (zero risk)
Please send:
1. A macro photo of the **WROOM-1 module label** (the line under the FCC ID shows `N8`, `N8R2` or `N8R8`).
2. A macro photo of the **display flex cable** printing (the part code near `…08HY` on the flex) — it often maps straight to a panel datasheet.
3. A photo of the **10-pin FPC connector** with the flex lifted, if you are comfortable (only with power off; FPC latches are fragile).
4. A photo of the **edge/back of the display** if any sticker is visible.
5. Full legible marking of the **VOLLGO module**.
6. Whether there is a battery holder somewhere I can't see.

### Step C — Re-create and verify the backup 🔌 (read-only)
See `docs/backup-and-recovery.md`. Required before anything else touches the device.

### Step D — Chip feature report 🔌 (read-only)
```sh
python -m esptool --chip esp32s3 --port /dev/cu.usbmodem101 chip-id
python -m esptool --chip esp32s3 --port /dev/cu.usbmodem101 flash-id
```
Capture the **full** output, especially the `Features:` line (e.g. "Embedded PSRAM 2MB" or "Embedded Flash"), which settles part of the PSRAM question. Octal PSRAM on N8R8 is external to the chip and may not be listed; Step F covers that.

### Step E — Partition table and app metadata (offline, on the backup file)
```sh
# Default partition table offset is 0x8000 (confirm from bootloader config / boot log)
dd if=jsconf-original.bin of=pt.bin bs=1 skip=$((0x8000)) count=$((0xC00))
python gen_esp32part.py pt.bin            # from ESP-IDF components/partition_table
python -m esptool --chip esp32s3 image-info app.bin   # after slicing the app partition at its offset
```
The app partition's `esp_app_desc_t` gives project name, version, IDF version and build date.

### Step F — Static string analysis of the app image (offline)
```sh
strings -n 6 app.bin | grep -iE 'st77|ili9|gc9|nv30|lcd|panel|lvgl|lv_|tft|lovyan|psram|spiram|sx12|lora|radiolib|gpio|width|height'
```
Looks for: driver names (`esp_lcd_st7789`, `TFT_eSPI`, `LovyanGFX`, LVGL), PSRAM init messages, LoRa library names, log tags. Pin numbers are compiled in as immediates, so strings usually won't show them; log format strings sometimes will.

Privacy rule: if the NVS partition contains Wi-Fi credentials or tokens, they stay on this Mac. Nothing from the dump is uploaded anywhere.

### Step G — Boot log capture 🔌 (read-only)
Open the serial console and press RST:
```sh
python -m serial.tools.miniterm /dev/cu.usbmodem101 115200
```
ESP-IDF prints PSRAM detection, partition selection, and any `ESP_LOGI` lines the firmware emits (driver tags, sometimes resolutions or pins).

### Step H — Continuity mapping (zero electrical risk, power OFF, USB unplugged)
With a multimeter in continuity mode, trace each front button pad and each of the 10 FPC pads to WROOM-1 castellated pins, then convert module pin → GPIO with the WROOM-1 datasheet pinout. This is the most reliable way to get the mapping if no schematic appears.

### Step I — RAM-only probe firmware 🔌 (needs explicit approval; does not write flash)
`esptool load-ram` runs a small image from SRAM without touching flash; a reset returns to the original firmware. Two probes:
1. **Input scan:** configure candidate GPIOs as inputs with internal pull-ups, print levels while you press each button. Excludes strapping pins (0, 3, 45, 46), flash pins (26–32), PSRAM pins (33–37 if octal) and USB (19/20). No pin is driven as output.
2. **Display probe:** only after B/E/F/H give a controller and pins. Sends `RDDID (0x04)` / `RDID1-3` reads if MISO exists, then a fill-color test.

Probe 1 is low risk. Probe 2 drives outputs and is only allowed once the pins are mapped.

## 5. Backup discrepancy (blocking)

On 2026-10-24 this Mac does **not** have `~/esp32-dev/` (neither the `.venv` nor `backups/jsconf-original.bin`). Spotlight finds no file named `jsconf-original.bin`. Either the backup lives on another machine/path or it was lost. Until a verified backup exists on this machine, flashing stays blocked regardless of other progress.

## 6. Change log
- 2026-10-24 — Initial report from photos, GitHub/web search, passive USB enumeration.
