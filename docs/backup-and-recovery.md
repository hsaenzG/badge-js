# Backup and Recovery

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

## 6. Pre-flash checklist (all required)

- [x] Backup read twice, hashes match, `verify-flash` passes
- [x] Offline second copy exists (stock image on Hazel's other computer)
- [x] Original partition table documented (§4)
- [x] eFuse summary captured: Secure Boot and flash encryption **disabled**
- [ ] New firmware partition table, flash mode/freq/size, and offsets written into `design.md`
- [ ] Expected changes listed (which regions get overwritten)
- [ ] Recovery procedure §5 rehearsed: at least steps 2–4 executed successfully
- [ ] Explicit written approval from Hazel for the exact command
