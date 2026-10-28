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

echo "# artifacts:"
find "$OUT/bin" -maxdepth 5 -name '*.bin' -exec ls -la {} +

# Guard: the XS machine is allocated at boot from internal RAM (no PSRAM on this badge).
# If its initial chunk + slot heap does not fit in free DIRAM with room for Wi-Fi/TLS,
# the badge boot-loops silently (seen 2026-10-25). Fail the build instead.
MAP="$(find "$OUT/tmp" -name xs_esp32.map | head -1)"
IDF_PY="${IDF_PYTHON_ENV_PATH:-$HOME/.espressif/python_env/idf6.1_py3.14_env}/bin/python"
FREE="$("$IDF_PY" -m esp_idf_size --format json2 "$MAP" 2>/dev/null | python3 -c 'import json,sys; print(next(m["free"] for m in json.load(sys.stdin)["layout"] if m["name"] == "DIRAM"))' 2>/dev/null || true)"
XS="$(node -e 'const c=require(process.argv[1]).creation; console.log(c.chunk.initial + c.heap.initial*16 + (c.static||0))' "$REPO/hosts/badge/manifest.json")"
MARGIN=$((60 * 1024)) # FreeRTOS tasks, Wi-Fi driver, lwIP, display buffers
if [ -n "$FREE" ]; then
  echo "# memory: DIRAM free ${FREE} B, XS initial ${XS} B, required margin ${MARGIN} B"
  if [ $((XS + MARGIN)) -gt "$FREE" ]; then
    echo "### Error: XS creation (${XS} B) + margin does not fit in free DIRAM (${FREE} B): the badge would boot-loop." >&2
    exit 1
  fi
else
  echo "# memory: could not measure DIRAM (esp_idf_size); check manually" >&2
fi
