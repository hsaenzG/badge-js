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
| PSRAM | eFuse `PSRAM_CAP`/`PSRAM_VENDOR` = none (no in-package PSRAM). Vendor listing says WROOM-1-**N8** (no PSRAM). Prototype boot shows only internal heap (~381 KiB) | `HYPOTHESIS` (strong): **no PSRAM**. Design must fit in ~380 KiB internal RAM |
| Security eFuses | `SECURE_BOOT_EN` = False, `SPI_BOOT_CRYPT_CNT` = Disable, `DIS_DOWNLOAD_MODE` = False | `VERIFIED` (`espefuse summary`, 2026-10-24) |
| Current flash content | `app0` = `mictlan_card` c79819f-dirty, built 2026-10-24 12:57, IDF 5.5.5 (not stock). Stock Meshtastic backup (`0640a9ca…`) kept by Hazel on another computer | `VERIFIED` |
| USB | Native USB-Serial/JTAG, VID `0x303A`, PID `0x1001`, product "USB JTAG_serial debug unit" | `VERIFIED` | `ioreg` (passive) |
| Serial port | `/dev/cu.usbmodem101` (may change) | `VERIFIED` | `ls /dev/cu.usb*` |

The USB serial number equals the chip's base MAC. It is intentionally not reproduced in this repo.

### 2.2 Display

| Item | Value | Tag |
|---|---|---|
| Type | Color TFT LCD, bar/stretched form factor, mounted landscape on the front | `OBSERVED` |
| Aspect ratio | ~2.9–3.4 : 1 measured from photos; 428/142 = 3.01 | `OBSERVED` |
| Interface | FPC flex into a connector with silkscreen **1** and **10**; vendor page says 10-pin 0.5 mm FPC | `OBSERVED` |
| Bus type | 4-wire SPI (stock firmware contains Arduino SPI / `spiLock` paths; NV3007 2.79" modules are SPI) | `HYPOTHESIS` (strong) |
| Backlight | Q2 + R3/R13/R14 next to the FPC; stock firmware logs `Power to TFT Backlight` | `HYPOTHESIS` (strong) |
| **Controller** | **NV3007, 2.79", 142×428**. The exact `nv3007_279_init_operations` byte sequence from Arduino_GFX (`ff a5`, `9a 08`, `9b 08`, `9c b0`, `9d 16`, `9e c4`, gamma pairs `6c 29`/`7c 29`/`6d 31`…) is at flash offset `0xdc1b5`, inside leftover **stock** JSConf app code (past the end of the current prototype image at `0x48e30`). No ST7789/ILI9341 init found | `VERIFIED` (firmware evidence) — final confirmation = first color-fill test |
| Resolution | 142×428 native (428×142 landscape) | `VERIFIED` (firmware evidence) |
| Offsets | Arduino_GFX's 2.79" profile uses col offset 12 / 14, row 0 (panel RAM wider than glass). To confirm on the glass | `HYPOTHESIS` |
| Color order / inversion | — | `UNKNOWN` (color-fill test) |
| Moddable support | No NV3007 driver in Moddable `modules/drivers` → native C driver required (design D2) | `VERIFIED` |
| Behavior with stock firmware | Photo shows dark olive band + purple band | `OBSERVED` |
| Behavior with current prototype | Screen goes white then nothing. Log: `st7789: ready 428x142 madctl 0x60 xoff 0 yoff 14 spi 40000000 Hz`. ST7789 init sent to an NV3007 panel explains the white screen | `VERIFIED` (boot log + your observation) |

The prototype's numbers (428×142, offset 14, ST7789) match Meshtastic's **Hackaday Communicator** variant, a different board. Its pins (SCK 38, MOSI 21, HSPI) are **not** adopted here.

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
| UP, DOWN, BACK, SELECT (front) | The `mictlan_card` prototype (your earlier attempt, source on another computer) reacts correctly to presses: log shows `screen card` / `screen links` transitions on 2026-10-24. So its button GPIO config works, but the numbers are not printed | GPIOs `UNKNOWN`; a working config `VERIFIED` to exist in that source |
| BOOT (rear) | On every ESP32-S3 design the download-mode button drives the GPIO0 strapping pin | `HYPOTHESIS` (standard practice, still to verify on this board) |
| RST (rear) | CHIP_PU / EN | `HYPOTHESIS` |

### 2.5 Boot log of the current prototype (2026-10-24, MAC redacted)

```
rst:0x15 (USB_UART_CHIP_RESET),boot:0x8 (SPI_FAST_FLASH_BOOT)
mode:DIO, clock div:1
I (82) cpu_start: cpu freq: 160000000 Hz
I (82) app_init: Project name:     mictlan_card
I (82) app_init: App version:      c79819f-dirty
I (83) app_init: ESP-IDF:          v5.5.5
I (84) heap_init: At 3FC98F50 len 000507C0 (321 KiB): RAM
I (84) heap_init: At 3FCE9710 len 00005724 (21 KiB): RAM
I (84) heap_init: At 3FCF0000 len 00008000 (32 KiB): DRAM
I (797) st7789: ready 428x142 madctl 0x60 xoff 0 yoff 14 spi 40000000 Hz
I (817) mictlan: card running screen startup links 3
I (8107) mictlan: screen card
I (18367) mictlan: screen links
```

Reset quirk: software resets over USB (esptool `hard-reset`, RTS pulse) land in `boot:0x0 DOWNLOAD` on this Mac. Use the physical **RST** button to boot the app; use **BOOT held while plugging in** to enter download mode reliably.

### 2.6 Pin map (recovered from the stock firmware)

Source: Hazel's earlier project `github.com/hsaenzG/mictlan-js`, branch `cursor/lcd-bus-pins` (`docs/hardware.md`, `firmware/badge/main/board.h`). Two independent methods, both on the **stock** JSConf Meshtastic image (SHA-256 `0640a9ca…`), never another board:

- **Stock boot log** (RST capture 2026-10-23, 115200 8N1, DTR/RTS cleared, nothing sent).
- **Disassembly** of the stock `app0` with `xtensa-esp32s3-elf-objdump` (2026-10-24): the TFT `connect()` function's bus and panel constructors, with file offsets and instruction bytes recorded in that doc.

| Signal | GPIO | Source | Tag |
|---|---|---|---|
| BTN UP | 40 | Stock boot log `BadgeJsconButtons: UP=40 DOWN=43 SELECT=18 BACK=1` + button table at `0xE186C` | `VERIFIED` |
| BTN DOWN | 43 | same | `VERIFIED` |
| BTN SELECT | 18 | same | `VERIFIED` |
| BTN BACK | 1 | same | `VERIFIED` |
| Button mode | `INPUT_PULLUP` (Arduino mode 5) → active **low** | Disassembly at `0x1817F0` | `VERIFIED` |
| LCD SCK | 12 | Bus object byte 11, attached to `FSPICLK_OUT_IDX` | `VERIFIED` (disassembly) |
| LCD MOSI | 11 | Bus object byte 12, `FSPID_OUT_IDX` | `VERIFIED` (disassembly) |
| LCD MISO | not connected | Bus object byte 13 = `0xFF` | `VERIFIED` (disassembly) |
| LCD CS | 21 | Bus object byte 10, idle high | `VERIFIED` (disassembly) |
| LCD DC | 9 | Bus object byte 9, low = command | `VERIFIED` (disassembly) |
| LCD RST | 10 | Panel object byte 68; pulse high 100 ms / low 120 ms / high 120 ms | `VERIFIED` (disassembly) |
| LCD backlight | 2 (plain GPIO high = on; stock applies brightness 153) | `pinMode(2, OUTPUT)` + `digitalWrite` | `VERIFIED` (disassembly) |
| LCD bus | `SPI2_HOST`, mode 0, 40 MHz | Bus init literal `40000000` | `VERIFIED` (disassembly) |
| LCD MADCTL | `0x60` (rotation 1, MX\|MV → landscape) | Panel rotation routine | `VERIFIED` (disassembly) |
| LCD size | 142 × 428 (panel object halfwords `8e 00 ac 01`) | Matches the NV3007 init found here independently | `VERIFIED` (two sources) |
| LoRa SPI | SCK 37, MISO 36, MOSI 35, NSS 38 (separate bus from the LCD) | Stock boot log `SPI.begin(...)` | `VERIFIED` |
| LoRa control | LLCC68 driver; IRQ 48, RST 47, BUSY 39 | Stock boot log `SX126xInterface(...)` | `VERIFIED` |

Still open: battery sense, slide-switch GPIO.

### 2.7 First Hazel Badge OS boot on glass (2026-10-24, video `image/IMG_7774.MOV`)

| Check | Result | Tag |
|---|---|---|
| Boot | Log: `hazel-badge-os: 428x142 ready` | `VERIFIED` |
| Offsets (col 0 / row 14, MADCTL 0x60) | Full 428×142 area drawn, no garbage rows, nothing clipped | `VERIFIED` |
| Color order | `#F5E000` shows yellow, white shows white → RGB order and byte order correct | `VERIFIED` |
| Buttons | UP/DOWN/SELECT/BACK drive menu, links, QR, back navigation | `VERIFIED` |
| Accents in JetBrains Mono TTF | `Sáenz`, `escanéame`, `menú` render | `VERIFIED` |
| QR | LinkedIn QR renders with crisp black modules on white | `VERIFIED` |
| **Near-black levels** | `#000000` (QR modules) is black, but `#0D0D0D` (background) shows as **light mint**; `#4A4A4A` shows dark gray. The lowest non-zero gray levels render bright | `VERIFIED` (visual). Root cause `HYPOTHESIS`: NV3007 2.79" gamma table (same one the stock firmware uses) |

Mitigation in v0.1.1: background drawn as pure `#000000`. A gray-ramp test screen (About → SELECT) shows levels 0, 2, 4 … 255 to map which levels are affected before any gamma change.

v0.1.1 on glass (photos `image/IMG_7775.jpg`, `image/IMG_7776.jpg`): background reads black, white/gray/yellow text correct. Mitigation `VERIFIED`. Gray-ramp photo still pending, so the exact affected levels (and a possible gamma fix) remain open; until then avoid dark non-zero fills.

Why the prototype failed: it used these correct pins with an **ST7789 init** on an **NV3007** panel.

## 3. Unknowns that block Phase 1

1. ~~Display controller, resolution~~ → NV3007 142×428 (firmware evidence). Offsets, color order, inversion still open.
2. ~~Display pin mapping~~ → §2.6.
3. ~~Bus sharing~~ → separate buses (§2.6).
4. ~~Buttons~~ → §2.6.
7. NV3007 X/Y offsets and RGB/BGR: resolved by the first color-fill test on hardware.
5. ~~PSRAM~~ → almost certainly none.
6. ~~Integrity of the flash backup~~ → verified (§5).

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

## 5. Backups

- Current chip state: `~/esp32-dev/backups/badge-2026-10-24-mictlan_card.bin`, SHA-256 `45049573431b3fe60fbaf99386102c5db54e421343d39fdc486b286fa0748e73`. Read twice (hashes match), `verify-flash` passed.
- Stock JSConf Meshtastic image (SHA-256 `0640a9ca…`): kept by Hazel on another computer. Not on this Mac.

## 6. Change log
- 2026-10-24 — Initial report from photos, GitHub/web search, passive USB enumeration.
