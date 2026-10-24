# Structure — Hazel Badge OS

Planned layout (directories are created when their milestone starts):

```
.kiro/specs/hazel-badge-os/   requirements.md · design.md · tasks.md
.kiro/steering/               product.md · tech.md · structure.md
docs/                         hardware.md · backup-and-recovery.md
image/                        reference photos of the badge
core/                         portable C: gfx, font, anim, input_fsm, ui_nav, game
apps/                         screens: intro, menu, card, links, qr, about, game
hal/                          display_if.h, input_if.h, clock_if.h, net_if.h
firmware/                     ESP-IDF project (main/, components/bsp, display_esp, input_esp, net_esp)
sim/                          SDL2 desktop simulator
tests/                        host unit + golden-frame tests
tools/                        fontgen.py, spritegen.py
assets/                       fonts (with license), sprites, source art
backend/                      Phase 3: CDK app + Lambda (Strands agent)
principal.md, game.md         original project briefs (game.md = Mictlán.js alternative for Phase 2)
```

Board-specific values (pins, SPI host, panel params) live only in `firmware/components/bsp/`.
