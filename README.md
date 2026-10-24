# Hazel Badge OS

Apps written in **TypeScript**, running on the badge's JavaScript engine (Moddable SDK / XS). Custom firmware for the Electronic Cats **JSConf México 2026** badge (ESP32-S3-WROOM-1, 8 MB flash, bar-type color TFT, 4 front buttons, 915 MHz LoRa module).

```
>_ whoami
Hazel Sáenz
Developer Advocate @ AWS
SERVERLESS · GENAI · LATAM
```

## Status

**Milestone 1: hardware discovery.** Nothing has been flashed. The original JSConf firmware is untouched.

| Phase | What | State |
|---|---|---|
| 1 | Animated digital business card | Spec written, blocked on display/button verification |
| 2 | Mictlán.js frog auto-runner (`game.md`) | Spec outline |
| 3 | Wi-Fi AI message (Strands Agents + Bedrock) | Spec outline |

## Docs
- Spec: [`requirements`](.kiro/specs/hazel-badge-os/requirements.md) · [`design`](.kiro/specs/hazel-badge-os/design.md) · [`tasks`](.kiro/specs/hazel-badge-os/tasks.md)
- [Hardware discovery report](docs/hardware.md)
- [Backup and recovery](docs/backup-and-recovery.md)

## Safety
This repo never stores flash dumps, credentials or device identifiers. Flashing only happens after the pre-flash checklist in `docs/backup-and-recovery.md` is complete and the owner approves the exact command.
