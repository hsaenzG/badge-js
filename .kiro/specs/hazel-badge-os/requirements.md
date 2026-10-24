# Requirements — Hazel Badge OS

Target: Electronic Cats JSConf México 2026 badge (ESP32-S3-WROOM-1, 8 MB flash). Hardware facts and unknowns: `docs/hardware.md`.

Format: user story + acceptance criteria in EARS style (WHEN / IF / THE SYSTEM SHALL).

---

## R0. Safety and hardware discovery (gate for everything else)

**Story:** As the badge owner, I want my original firmware protected and the hardware verified, so experiments can never brick the badge or lose the JSConf firmware.

1. THE project SHALL NOT run `erase-flash`, `write-flash`, `idf.py flash` or any equivalent without explicit owner approval for that command.
2. THE project SHALL keep flash dumps outside the Git repository and SHALL ignore `*.bin` dumps in `.gitignore`.
3. THE project SHALL NOT upload flash dumps, NVS contents, or device identifiers to external services.
4. BEFORE the first flash, THE project SHALL have a full backup read twice with matching SHA-256, a passing `verify-flash`, a documented partition table, an eFuse summary showing Secure Boot and flash encryption disabled, and a rehearsed recovery procedure.
5. THE firmware SHALL NOT contain pin numbers, display controller settings, or button wiring unless `docs/hardware.md` tags them `VERIFIED`.
6. THE discovery report SHALL tag every hardware fact as VERIFIED, OBSERVED, HYPOTHESIS or UNKNOWN.

## R1. Board support and drivers

1. THE system SHALL isolate all GPIO numbers, bus hosts, and panel parameters in one board-support component.
2. WHEN the board boots, THE system SHALL hold the LoRa module's CS inactive (if it shares a bus with the display) and keep the radio idle.
3. THE display driver SHALL expose a hardware-independent interface (`width`, `height`, `flush(rect, pixels)`), so UI code never calls the panel directly.
4. THE system SHALL control the backlight through the BSP once the backlight pin is verified.

## R2. Phase 1 — Animated digital business card

**Story:** As Hazel, I want my badge to boot into a terminal-style typing intro and then show my card, so people at events instantly see who I am and where to find me.

### Boot and intro
1. WHEN powered on, THE system SHALL show the first visible frame quickly (target ≤ 1.5 s from reset, to be measured on hardware).
2. THE system SHALL NOT initialize Wi-Fi, BLE, or LoRa during Phase 1 boot.
3. THE intro SHALL type, character by character with a blinking cursor:
   - `>_ LATAM Developer Advocate @ AWS`
   - `>_ Serverless + GenAI + Comunidad`
   - `>_ Empoderando builders en LATAM`
4. THEN THE system SHALL show:
   - `>_ whoami`
   - `Hazel Sáenz`
   - `Developer Advocate @ AWS`
   - `SERVERLESS · GENAI · LATAM`
5. WHEN any button is pressed during the intro, THE system SHALL skip to the end of the intro.
6. IF a line is wider than the display, THE system SHALL wrap, scroll, or abbreviate it without clipping glyphs mid-character. The choice is made per screen once the resolution is known.

### Visual language
7. THE UI SHALL use background `#0D0D0D`, accent `#F5E000`, white and gray secondary text.
8. THE UI SHALL use a monospaced font (JetBrains Mono rasterized, or an equivalent bitmap mono font with a compatible license).
9. THE font SHALL include the glyphs needed for the content: `á é í ó ú ñ Á É Í Ó Ú Ñ ü ¿ ¡ ·` at minimum.
10. Animations SHALL run at a steady frame pace without visible tearing artifacts beyond what the panel physically allows (target ≥ 30 FPS for partial-update typing, measured on hardware).

### Card content and navigation
11. THE main menu SHALL offer at least: **Card**, **Links**, **QR** (if feasible), **Frog Quest** (Phase 2), **About**.
12. THE card SHALL show name `Hazel Sáenz`, role `LATAM Developer Advocate @ AWS`, specialties (Serverless, Generative AI, Amazon Bedrock, Developer Communities).
13. THE Links screen SHALL show `hazelsaenz.tech`, `github.com/hsaenzG`, `linkedin.com/in/hazelsaenz`.
14. IF the display has at least ~64 px of usable height for a module size ≥ 2 px, THE system SHALL render a QR code (version ≤ 3) for `https://hazelsaenz.tech`. OTHERWISE the QR screen SHALL be omitted. Decision recorded in `design.md` after resolution is known.
15. Buttons: UP = previous item, DOWN = next item, SELECT = open/confirm, BACK = return. BACK on the root menu SHALL do nothing harmful (stays or replays the intro).
16. THE input layer SHALL debounce each button (target 20–30 ms) and SHALL emit `PRESS`, `RELEASE`, `LONG_PRESS` (~600 ms) and `REPEAT` (~120 ms interval after long press) events.
17. WHEN UP/DOWN is held, THE menu SHALL auto-repeat. WHEN SELECT/BACK is held, THE system SHALL NOT repeat the action.
18. THE focused item SHALL be visually distinct (accent color and/or inverse bar), never by color alone.

### Engineering constraints
19. THE animation and render loops SHALL NOT allocate heap memory. All buffers are allocated once at init.
20. Animation, navigation and text layout logic SHALL compile and pass unit tests on the host (macOS) without the badge.
21. THE whole Phase 1 SHALL work with no network.

**Phase 1 acceptance:** the badge boots into the intro, shows the card, and all four buttons behave as specified on real hardware.

## R3. Phase 2 — Frog game

> Open decision: `principal.md` describes **Frog Quest: Build Your Agent** (collect Model, Tools, Memory, Guardrails). `game.md` describes **Mictlán.js** (Día de Muertos auto-runner with four JS challenges). Requirements below cover the shared core; the theme is chosen before Phase 2 design.

1. THE game SHALL launch from the main menu and SHALL be playable with only UP, DOWN, SELECT, BACK.
2. Since there is no LEFT/RIGHT, THE game SHALL be an auto-runner: UP = jump, DOWN = crouch, SELECT = start/confirm, BACK = pause.
3. THE game SHALL have one short level, four collectibles, a goal, win and retry screens.
4. THE game logic (state machine, physics, collisions) SHALL be deterministic with a fixed timestep and SHALL be unit-testable on the host.
5. THE game SHALL NOT require Wi-Fi.
6. THE frog SHALL be an original pixel-art character unless Strands branding permission is confirmed in writing (official guidelines not found as of 2026-10-24).

## R4. Phase 3 — AI integration (optional)

1. THE badge SHALL remain fully functional when the backend or Wi-Fi is unavailable, falling back to local messages.
2. THE badge SHALL NOT contain AWS credentials.
3. THE badge SHALL call the backend only over HTTPS with server certificate validation.
4. THE backend SHALL use API Gateway → Lambda → Strands Agents → Amazon Bedrock, deployed with AWS CDK.
5. THE backend SHALL enforce per-device authentication, request schema validation, throttling and a daily quota, a hard max output size, Lambda timeouts and reserved concurrency, and an AWS Budgets alarm.
6. THE backend SHALL return compact JSON (target ≤ 512 bytes) that the firmware validates before rendering (length limits, allowed characters).
7. THE backend SHALL NOT log secrets, device tokens, or personal data.
8. THE Wi-Fi credentials and device token SHALL be provisioned at runtime (stored in NVS), never compiled into the firmware image or committed.

## R5. Documentation and workflow

1. THE repo SHALL contain this spec (`requirements.md`, `design.md`, `tasks.md`), steering files, `README.md`, `docs/hardware.md`, `docs/backup-and-recovery.md`.
2. Work SHALL proceed in milestones; each milestone ends with a verification step and a commit.
