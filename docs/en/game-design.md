# Mictlán.js — Game Design

[Español](../game-design.md) · **English**

> *Every developer has a journey. Every agent needs a guide.*

Phase 2 of Hazel Badge OS. Full brief: `game.md`. This document is the playable design; requirements live in `.kiro/specs/hazel-badge-os/requirements.md` (R3).

## 1. Constraints that shape the game

| Constraint | Consequence |
|---|---|
| Screen 428×142 landscape (NV3007) | Side-scroller with a low horizon; HUD on one 12 px row |
| Only UP, DOWN, SELECT, BACK | **Auto-runner**: the world scrolls, the player jumps (UP) and crouches (DOWN) |
| No PSRAM, ~380 KB RAM, XS GC | Fixed entity pools, integer physics, level is static data |
| Panel renders very dark non-zero grays bright | Badge uses a panel-safe palette mapping (see §6); no dark text on bright fills |
| Offline first | Local question bank, local hints and explanations |

## 2. Loop

```
TITLE ──SELECT──► INTRO (Guardián, 3 lines) ──► RUN
RUN ── reach flower ──► CHALLENGE ── correct ──► FEEDBACK ──► RUN (checkpoint saved)
                                   └─ wrong ───► FEEDBACK (hint) ──► CHALLENGE
RUN ── 0 hearts ──► RETRY ──SELECT──► RUN from last checkpoint (3 hearts)
RUN ── 4 flowers + reach ofrenda ──► VICTORY ──SELECT──► TITLE (replay)
RUN ──BACK──► PAUSE (continuar · reiniciar · salir)
```

Target playtime 3–5 min: about 2 min of running (4 stretches of ~30 s) plus four challenges.

## 3. Controls

| Button | RUN | CHALLENGE | Menus / screens |
|---|---|---|---|
| UP | jump (only on the ground) | previous option | previous item |
| DOWN | crouch while held | next option | next item |
| SELECT | — | confirm | confirm / continue |
| BACK | pause | pause | back |

## 4. World

- **Path of the Mictlán**: purple night sky, distant temple silhouette, a strip of papel picado scrolling slowly (parallax), marigold path on the ground.
- **Obstacles**
  - *Calaverita*: a small decorated sugar skull on the path → **jump**. Smiling, never scary.
  - *Papel picado* hanging low → **crouch**.
- **Pickups**
  - *Pétalos* of cempasúchil: score only.
  - *Flor mágica* ×4: Variables, Functions, Promises, Objects. Touching one opens its challenge.
- **Ofrenda**: altar with candles, marigolds, and a glowing portal. Appears after the 4th flower.
- **Hearts**: 3. A hit costs one heart plus 1.2 s of blinking invulnerability. Checkpoints = the last solved flower.

Cultural tone: celebratory, warm, respectful. Calaveritas smile, the ofrenda honors memory, nothing gory.

## 5. Characters

- **Rana (player)**: an original 12×12 pixel frog, drawn at 2×. Big round eyes, a yellow `>_` badge on its chest (a nod to the terminal), marigold-orange cheeks. Frames: idle, run (2), jump, crouch, hurt, celebrate. Visually distinct from the Strands Agents mascot. No public brand guidelines for that mascot were found (strandsagents.com, 2026-10-24), so its artwork is not used.
- **El Guardián del Código**: the narrator and mentor. Shown as a small calavera with a marigold crown in dialog boxes. Warm, playful, encouraging; gives hints, never answers.

## 6. Palette

| Name | Design hex | Use |
|---|---|---|
| Deep purple | `#21152E` | sky |
| Near-black | `#0D0D0D` | UI background |
| Cempasúchil | `#FF8C00` | path, flowers |
| Marigold | `#F5E000` | accents, HUD, candles |
| Frog green | `#65C84D` | player |
| Magenta | `#D94F9B` | papel picado, calaveritas |
| Bone white | `#F2E8D5` | text, skulls |

On the badge, colors are drawn through a palette table. Any design color that lands in the panel's bright low range gets remapped (e.g. near-black → `#000000`). The simulator shows the true design colors.

## 7. Challenges

Each flower opens a challenge: 1–3 lines of code, a question, 3 options, plus a **pista** entry.

| Flor | Concept | Snippet | Answer |
|---|---|---|---|
| 1 | Variables | `let x = 5; x += 2; console.log(x);` | `7` |
| 2 | Functions | `const double = n => n * 2; console.log(double(4));` | `8` |
| 3 | Promises | `Promise.resolve("listo").then(console.log);` | `"listo"` |
| 4 | Objects | `const frog = { name: "Kiro" }; console.log(frog.name);` | `"Kiro"` |

Each concept has a second question for replays. The test suite **runs every snippet in Node** (`node:vm`, fake console) and checks that the marked answer is what JavaScript actually prints. The badge itself never executes code.

Feedback texts come from the Guardián, for example:
- Intro to a flower: *"Una promesa espera su destino. ¿Qué imprimirá este código?"*
- Hint: *"Observa qué valor entrega Promise.resolve()."*
- Correct: *"¡Excelente! Has iluminado otra flor del camino."*

## 8. Architecture

```
src/core/gfx.ts          Gfx interface (fill, sprite, text) — implemented twice
src/core/game/*.ts       pure TS: palette, sprites, questions, level, world, game, render
sim/                     browser simulator: Canvas Gfx + keyboard, 428×142 ×3
src/apps/ (badge)        Poco Gfx + buttons, launched from the Phase 1 menu
```

- `game.ts` is a deterministic state machine stepped at a fixed 60 Hz (`step(input)`), with no time or IO inside.
- `render.ts` draws the current state through `Gfx` only, so the same file renders in the browser and on the badge.
- Hardware adapters only translate: keyboard or buttons → input events, and `Gfx` calls → Canvas or Poco.

## 9. Sound

All sound is original and lives as data in `src/core/game/sound.ts`: each effect is a list of `[Hz, ms]` steps, one channel, so a piezo can play it.

| Event | When |
|---|---|
| `jump` · `petal` · `hit` | run actions |
| `flower` · `correct` · `wrong` | challenge |
| `gameover` · `victory` | end states |
| `move` · `select` | menus, pause, options |

- **Run music**: a looping A-minor pentatonic lead over a walking bass at 140 bpm. Two voices in the simulator; a piezo would play the lead only.
- **Simulator**: WebAudio, square waves for effects and a triangle wave for the bass. The **silencio** and **música** checkboxes control it, and audio starts on the first key press (browser policy).
- **Badge**: no buzzer or speaker found (photos and stock firmware, see `docs/hardware.md`). The game still emits the events, and `src/apps/main.ts` drains them at the spot where a piezo adapter (LEDC PWM on a verified free GPIO) would go.

## 10. Phase 3 hook (later)

When online, the Guardián's lines and extra challenges can come from the AWS backend (`game.md` §6). In that mode the server keeps the answer and the badge submits an option id. Offline is always the default.
