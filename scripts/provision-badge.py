#!/usr/bin/env python3
"""
Build the badge's NVS partition with the online Guardián credentials.

Nothing secret is ever printed, committed, or compiled into the firmware:
  - Wi-Fi SSID/password come from a file YOU create outside the repo:
        ~/esp32-dev/secrets/wifi.env      (chmod 600)
        WIFI_SSID=My network
        WIFI_PASSWORD=my password
  - The API key and URL are read from the deployed stack with the AWS CLI
    (profile free-tier-Strands, region us-east-2) straight into memory.
  - The CSV for nvs_partition_gen lives in a private temp dir and is deleted.
  - Output: ~/esp32-dev/secrets/badge-nvs.bin (chmod 600), 24 KB, for offset 0x9000.

The badge reads these with Preference.get("guardian", ...) (src/platform/net.ts).
Writing the image to the badge is a separate, explicitly approved esptool step.

Security note: the badge has no flash encryption, so anyone holding the badge can
read these values with esptool. Use a guest/hotspot network, and revoke the API key
(per-badge, in API Gateway) if the badge is lost.
"""
import csv
import os
import shutil
import stat
import subprocess
import sys
import tempfile
from pathlib import Path

HOME = Path.home()
SECRETS = HOME / "esp32-dev" / "secrets"
ENV_FILE = Path(os.environ.get("BADGE_WIFI_ENV", SECRETS / "wifi.env"))
OUT = Path(os.environ.get("BADGE_NVS_OUT", SECRETS / "badge-nvs.bin"))
NVS_SIZE = 0x6000  # Moddable partition table: nvs @ 0x9000, 24K
IDF = HOME / "esp" / "esp-idf-v6.1"
GEN = IDF / "components" / "nvs_flash" / "nvs_partition_generator" / "nvs_partition_gen.py"
IDF_PY = HOME / ".espressif" / "python_env" / "idf6.1_py3.14_env" / "bin" / "python"
AWS = ["aws", "--profile", os.environ.get("AWS_PROFILE", "free-tier-Strands"), "--region", "us-east-2"]
STACK = "MictlanGuardian"
KEY_NAME = os.environ.get("BADGE_KEY_NAME", "badge-hazel")


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def read_env(path: Path) -> dict:
    if not path.exists():
        die(f"create {path} with WIFI_SSID=... and WIFI_PASSWORD=... (see this script's header)")
    mode = path.stat().st_mode
    if mode & (stat.S_IRWXG | stat.S_IRWXO):
        die(f"{path} is readable by others; run: chmod 600 {path}")
    out = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)  # no shell evaluation: values are taken literally
        v = v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
            v = v[1:-1]
        out[k.strip()] = v
    return out


def aws_text(args: list) -> str:
    r = subprocess.run(AWS + args + ["--output", "text"], capture_output=True, text=True)
    if r.returncode != 0:
        die("aws cli failed (run `aws login`?): " + r.stderr.strip().splitlines()[-1][:200] if r.stderr else "aws cli failed")
    return r.stdout.strip()


def main() -> None:
    env = read_env(ENV_FILE)
    ssid, password = env.get("WIFI_SSID", ""), env.get("WIFI_PASSWORD", "")
    if not ssid:
        die("WIFI_SSID is empty")
    if len(ssid.encode()) > 32:
        die("WIFI_SSID is longer than 32 bytes")
    if password and not (8 <= len(password.encode()) <= 63):
        die("WIFI_PASSWORD must be 8–63 characters (or empty for an open network)")

    url = aws_text(["cloudformation", "describe-stacks", "--stack-name", STACK,
                    "--query", "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue | [0]"]).rstrip("/")
    if not url.startswith("https://"):
        die("could not read ApiUrl from the stack")
    api_key = aws_text(["apigateway", "get-api-keys", "--name-query", KEY_NAME, "--include-values",
                        "--query", "items[0].value"])
    if len(api_key) < 20 or api_key == "None":
        die(f"could not read API key {KEY_NAME}")

    if not GEN.exists() or not IDF_PY.exists():
        die("ESP-IDF v6.1 not found under ~/esp (needed for nvs_partition_gen.py)")

    OUT.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix="badge-nvs-"))  # 0700
    try:
        csv_path = tmp / "nvs.csv"
        fd = os.open(csv_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)  # quotes commas/quotes in passwords correctly
            w.writerow(["key", "type", "encoding", "value"])
            w.writerow(["guardian", "namespace", "", ""])
            w.writerow(["ssid", "data", "string", ssid])
            w.writerow(["password", "data", "string", password])
            w.writerow(["apikey", "data", "string", api_key])
            w.writerow(["url", "data", "string", url])
        bin_tmp = tmp / "nvs.bin"
        r = subprocess.run([str(IDF_PY), str(GEN), "generate", str(csv_path), str(bin_tmp), hex(NVS_SIZE)],
                           capture_output=True, text=True)
        if r.returncode != 0 or not bin_tmp.exists():
            die("nvs_partition_gen failed")  # its output may echo values: don't print it
        if OUT.exists():
            OUT.chmod(0o600)
        shutil.copyfile(bin_tmp, OUT)
        OUT.chmod(0o600)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print(f"wrote {OUT} ({OUT.stat().st_size} bytes, mode 600) for offset 0x9000")
    print(f"  ssid: {len(ssid)} chars · password: {'set' if password else 'open network'} · api key: {len(api_key)} chars")
    print(f"  url: {url.split('//', 1)[1].split('.', 1)[0]}…/{url.rsplit('/', 1)[-1]}")


if __name__ == "__main__":
    main()
