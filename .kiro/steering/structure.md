# Structure — Hazel Badge OS

Planned layout (directories are created when their milestone starts):

```
.kiro/specs/hazel-badge-os/   requirements.md · design.md · tasks.md
.kiro/steering/               product.md · tech.md · structure.md
docs/                         hardware.md · backup-and-recovery.md
image/                        reference photos of the badge
src/core/                     pure TypeScript logic: typewriter, navStack, inputFsm, layout, content, game/
src/apps/                     Piu screens (TS): intro, menu, card, github, links, qr, about, mictlan
src/platform/                 Moddable / ECMA-419 adapters: display, buttons, clock, net
hosts/badge/                  Moddable manifest for this badge: verified pins, panel config, native driver if needed
src/core/game/                Mictlán.js: game state machine, level, questions, sprites, palette, renderer (pure TS)
sim/                          browser simulator (Canvas Gfx + keyboard, 428×142 ×3); `npm run sim`
tests/                        Vitest tests for src/core
assets/                       fonts (with license), sprites, source art
backend/                      Phase 3: CDK app (TS) + Lambda (Node.js, Strands TS agent)
principal.md, game.md         original project briefs (game.md = Mictlán.js, chosen for Phase 2)
```

Board-specific values (pins, SPI host, panel params) live only in `hosts/badge/`.
