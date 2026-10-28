# Backup and Recovery

[Español](../backup-and-recovery.md) · **English**

Status: **Verified backup of the current chip state exists** (`~/esp32-dev/backups/badge-2026-10-24-mictlan_card.bin`, SHA-256 `45049573…8e73`, two reads matched, `verify-flash` passed 2026-10-24). The stock JSConf Meshtastic image (`0640a9ca…`) is on Hazel's other computer.

Note for download mode on this Mac: hold **BOOT while plugging in USB**. Software auto-reset is unreliable here.

## Rules

- Backups live outside the repo, in `~/esp32-dev/backups/`. `.gitignore` also blocks `*.bin` as a second line of defense.
- Dumps are never uploaded anywhere (no cloud storage, no AI services, no issue trackers). They may contain NVS data such as Wi-Fi credentials.
- `erase-flash`, `write-flash`, `idf.py flash`, and `idf.py erase-flash` are never run without your explicit approval for that specific command.

## 1. Environment (local only, does not touch the device)

```sh
mkdir -p ~/esp32-dev/backups
cd ~/esp32-dev
python3 -m venv .venv
source .venv/bin/activate
pip install "esptool==5.6.0"
```

## 2. Create a verified full-flash backup (read-only on the device)

Read the full 8 MB twice and compare. Two matching reads rule out random USB transfer errors.

```sh
source ~/esp32-dev/.venv/bin/activate
PORT=/dev/cu.usbmodem101   # re-check with: ls /dev/cu.usbmodem*
cd ~/esp32-dev/backups

python -m esptool --chip esp32s3 --port "$PORT" read-flash 0 0x800000 jsconf-original.bin
python -m esptool --chip esp32s3 --port "$PORT" read-flash 0 0x800000 jsconf-original-2.bin

shasum -a 256 jsconf-original.bin jsconf-original-2.bin   # hashes MUST match
shasum -a 256 jsconf-original.bin > jsconf-original.bin.sha256
chmod 444 jsconf-original.bin jsconf-original.bin.sha256
```

Also store a copy somewhere offline (external drive). One copy is not a backup.

Then verify against the device itself (also read-only; it compares, it does not write):

```sh
python -m esptool --chip esp32s3 --port "$PORT" verify-flash 0 jsconf-original.bin
```

## 3. Structural checks (offline)

```sh
python -m esptool --chip esp32s3 image-info jsconf-original.bin   # bootloader header at 0x0
```

Then parse the partition table (see `docs/hardware.md`, Step E) and record it below. Run `image-info` on each app partition slice to confirm checksums and hashes. These checks prove the images are well-formed. The two-read hash match plus `verify-flash` is what proves the dump matches the chip.

## 4. Original partition table

| Name | Type | SubType | Offset | Size | Flags |
|---|---|---|---|---|---|
| nvs | data | nvs | 0x9000 | 20K | |
| otadata | data | ota | 0xe000 | 8K | |
| app0 | app | ota_0 | 0x10000 | 3264K | |
| app1 | app | ota_1 | 0x340000 | 3264K | |
| spiffs | data | spiffs (LittleFS content) | 0x670000 | 1536K | |
| coredump | data | coredump | 0x7f0000 | 64K | |

Same table in the stock image and the current one. `otadata` selects `app0`; `app1` is erased. eFuses: Secure Boot off, flash encryption off, download mode enabled.

## 5. Recovery procedure

Use this only if a future flash leaves the badge unusable. It needs your approval at the time you run it.

1. Slide the switch to ON, connect USB-C.
2. Enter ROM download mode: hold **BOOT**, tap **RST**, release BOOT. Native USB re-enumerates as `/dev/cu.usbmodem*`.
3. Confirm the chip answers: `python -m esptool --chip esp32s3 --port "$PORT" chip-id`
4. Check the backup hash matches the stored `.sha256`.
5. Restore the full image:
   ```sh
   python -m esptool --chip esp32s3 --port "$PORT" write-flash \
     --flash-mode dio --flash-freq 80m --flash-size 8MB 0 jsconf-original.bin
   ```
6. `verify-flash 0 jsconf-original.bin`, then press RST. The JSConf splash should appear.

Why this is reliable: the ESP32-S3 ROM bootloader is in mask ROM and cannot be overwritten, so download mode via BOOT+RST is always available unless eFuses (Secure Boot / flash encryption) were burned. The step below checks that.

## 5b. First Hazel Badge OS flash: what changes

Build: `./scripts/build-badge.sh` (ESP-IDF v6.1, Moddable, target `esp32/jsconf_badge`). Artifacts in `build/bin/esp32/jsconf_badge/release/badge-js/`.

| Region | Before | After |
|---|---|---|
| `0x0000`–`0x3770` | IDF 5.5.5 bootloader | IDF 6.1 bootloader (`bootloader.bin`, 14,192 B, DIO 80 MHz, header 4 MB) |
| `0x8000`–`0x8C00` | Arduino 8 MB table (nvs, otadata, app0, app1, spiffs, coredump) | Moddable table: `nvs` 0x9000 24K, `phy_init` 0xF000 4K, `factory` 0x10000 4032K |
| `0x10000`–`0xF4530` | `mictlan_card` + stock leftovers | Hazel Badge OS (`xs_esp32.bin`, 935,216 B) |
| everything else | unchanged | unchanged (old `spiffs`/`coredump` data stays, now unreferenced) |

Side effect: the new `nvs` range (0x9000–0xF000) overlaps the old `nvs` + old `otadata`. If NVS init sees foreign data, ESP-IDF may reformat that 24K range on first boot. It holds nothing Phase 1 needs, and the full backup covers it.

Flash command (requires explicit approval, download mode via BOOT held while plugging in):

```sh
cd build/bin/esp32/jsconf_badge/release/badge-js
~/esp32-dev/.venv/bin/python -m esptool --chip esp32s3 --port /dev/cu.usbmodem101 \
  --before no-reset --after no-reset write-flash \
  --flash-mode keep --flash-freq keep --flash-size keep \
  0x0 bootloader.bin 0x8000 partition-table.bin 0x10000 xs_esp32.bin
```

Then press the physical **RST** button to boot (software reset lands in download mode on this Mac).

Undo: §5 with `~/esp32-dev/backups/badge-2026-10-24-mictlan_card.bin` (current state) or the stock image from the other computer.

## 6. Pre-flash checklist (all required)

- [x] Backup read twice, hashes match, `verify-flash` passes
- [x] Offline second copy exists (stock image on Hazel's other computer)
- [x] Original partition table documented (§4)
- [x] eFuse summary captured: Secure Boot and flash encryption **disabled**
- [x] New firmware partition table, flash mode/freq/size, and offsets written down (§5b)
- [x] Expected changes listed (§5b)
- [x] Recovery procedure §5 rehearsed up to step 4: download mode via BOOT, chip answers, two full reads hash-match (2026-10-24)
- [ ] Explicit written approval from Hazel for the exact command
