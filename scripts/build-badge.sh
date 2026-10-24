#!/usr/bin/env bash
# Build the badge firmware. BUILD ONLY: this script never flashes the device.
# Flashing is a separate, explicitly approved step (docs/backup-and-recovery.md).
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
export MODDABLE="${MODDABLE:-$HOME/Projects/moddable}"
IDF_DIR="${IDF_DIR:-$HOME/esp/esp-idf-v6.1}"
OUT="${OUT:-$REPO/build}"
mkdir -p "$OUT"

# Moddable looks for targets inside the SDK; link ours in (idempotent).
ln -sfn "$REPO/hosts/badge" "$MODDABLE/build/devices/esp32/targets/jsconf_badge"

# shellcheck disable=SC1091
source "$IDF_DIR/export.sh" >/dev/null
export PATH="$REPO/node_modules/.bin:$MODDABLE/build/bin/mac/release:$PATH"

cd "$REPO"
mcconfig -m -t build -p esp32/jsconf_badge -o "$OUT" "$@" ./manifest.json

BIN="$OUT/bin/esp32/release/jsconf_badge/badge-js"
echo "# artifacts:"
ls -la "$BIN"/*.bin "$BIN"/partitions.csv 2>/dev/null || find "$OUT/bin" -maxdepth 5 -name '*.bin'
