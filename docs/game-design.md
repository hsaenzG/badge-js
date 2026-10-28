# Mictlán.js: diseño del juego

**Español** · [English](en/game-design.md)

> *Every developer has a journey. Every agent needs a guide.*

Fase 2 de Hazel Badge OS. El brief completo está en `game.md`. Este documento describe el diseño jugable; los requerimientos están en `.kiro/specs/hazel-badge-os/requirements.md` (R3).

## 1. Restricciones que dan forma al juego

| Restricción | Consecuencia |
|---|---|
| Pantalla horizontal de 428×142 (NV3007) | Side-scroller con el horizonte bajo; el HUD ocupa una fila de 12 px |
| Solo UP, DOWN, SELECT y BACK | **Auto-runner**: el mundo avanza solo, la jugadora salta (UP) y se agacha (DOWN) |
| Sin PSRAM, ~380 KB de RAM, GC de XS | Grupos fijos de entidades, física con enteros, el nivel es un dato estático |
| La pantalla muestra claros los grises muy oscuros (pero no negros) | El badge usa una paleta segura para la pantalla (ver §6); nada de texto oscuro sobre fondos claros |
| Offline primero | Banco de preguntas, pistas y explicaciones locales |

## 2. Ciclo de juego

```
TÍTULO ──SELECT──► INTRO (Guardián, 3 líneas) ──► CARRERA
CARRERA ── llega a una flor ──► RETO ── correcta ──► RESPUESTA ──► CARRERA (se guarda el checkpoint)
                                   └─ incorrecta ──► RESPUESTA (pista) ──► RETO
CARRERA ── 0 corazones ──► REINTENTO ──SELECT──► CARRERA desde el último checkpoint (3 corazones)
CARRERA ── 4 flores + llega a la ofrenda ──► VICTORIA ──SELECT──► TÍTULO (otra partida)
CARRERA ──BACK──► PAUSA (continuar · reiniciar · salir)
```

Duración objetivo: 3 a 5 minutos, con unos 2 minutos de carrera (4 tramos de ~30 s) más los cuatro retos.

## 3. Controles

| Botón | CARRERA | RETO | Menús y pantallas |
|---|---|---|---|
| UP | saltar (solo en el piso) | opción anterior | elemento anterior |
| DOWN | agacharse mientras se mantiene | opción siguiente | elemento siguiente |
| SELECT | — | confirmar | confirmar / continuar |
| BACK | pausa | pausa | regresar |

## 4. El mundo

- **El camino del Mictlán**: cielo nocturno morado, la silueta de un templo a lo lejos, una tira de papel picado que se mueve despacio (parallax) y un camino de cempasúchil en el piso.
- **Obstáculos**
  - *Calaverita*: una calavera de azúcar decorada en el camino → **saltar**. Sonríe, nunca da miedo.
  - *Papel picado* colgado bajo → **agacharse**.
- **Para recoger**
  - *Pétalos* de cempasúchil: solo suman puntos.
  - *Flor mágica* ×4: Variables, Functions, Promises y Objects. Al tocar una se abre su reto.
- **Ofrenda**: altar con velas, cempasúchil y un portal que brilla. Aparece después de la cuarta flor.
- **Corazones**: 3. Cada golpe quita un corazón y da 1.2 s de invulnerabilidad parpadeando. El checkpoint es la última flor resuelta.

Tono cultural: festivo, cálido y respetuoso. Las calaveritas sonríen, la ofrenda honra la memoria y no hay nada sangriento.

## 5. Personajes

- **Rana (la jugadora)**: una rana original de 12×12 píxeles, dibujada a 2×. Ojos grandes y redondos, un `>_` amarillo en el pecho (un guiño a la terminal) y cachetes color cempasúchil. Cuadros: quieta, corriendo (2), saltando, agachada, golpeada y celebrando. Se ve distinta de la mascota de Strands Agents. No encontré lineamientos públicos de marca para esa mascota (strandsagents.com, 2026-10-24), así que no uso su arte.
- **El Guardián del Código**: el narrador y mentor. Aparece como una calaverita con corona de cempasúchil en los cuadros de diálogo. Cálido, juguetón y alentador; da pistas, nunca respuestas.

## 6. Paleta

| Nombre | Hex de diseño | Uso |
|---|---|---|
| Morado profundo | `#21152E` | cielo |
| Casi negro | `#0D0D0D` | fondo de la interfaz |
| Cempasúchil | `#FF8C00` | camino, flores |
| Amarillo cempasúchil | `#F5E000` | acentos, HUD, velas |
| Verde rana | `#65C84D` | jugadora |
| Magenta | `#D94F9B` | papel picado, calaveritas |
| Blanco hueso | `#F2E8D5` | texto, calaveras |

En el badge, los colores pasan por una tabla de paleta. Cualquier color de diseño que caiga en los tonos oscuros que la pantalla muestra claros se reemplaza (por ejemplo, casi negro → `#000000`). El simulador muestra los colores de diseño reales.

## 7. Retos

Cada flor abre un reto: 1 a 3 líneas de código, una pregunta, 3 opciones y una entrada de **pista**.

| Flor | Concepto | Código | Respuesta |
|---|---|---|---|
| 1 | Variables | `let x = 5; x += 2; console.log(x);` | `7` |
| 2 | Functions | `const double = n => n * 2; console.log(double(4));` | `8` |
| 3 | Promises | `Promise.resolve("listo").then(console.log);` | `"listo"` |
| 4 | Objects | `const frog = { name: "Kiro" }; console.log(frog.name);` | `"Kiro"` |

Cada concepto tiene una segunda pregunta para cuando vuelves a jugar. Las pruebas **ejecutan cada código en Node** (`node:vm`, con una consola falsa) y verifican que la respuesta marcada es lo que JavaScript imprime de verdad. El badge nunca ejecuta código.

Los textos de respuesta los dice el Guardián, por ejemplo:
- Al abrir una flor: *"Una promesa espera su destino. ¿Qué imprimirá este código?"*
- Pista: *"Observa qué valor entrega Promise.resolve()."*
- Correcta: *"¡Excelente! Has iluminado otra flor del camino."*

## 8. Arquitectura

```
src/core/gfx.ts          interfaz Gfx (fill, sprite, text), implementada dos veces
src/core/game/*.ts       TS puro: paleta, sprites, preguntas, nivel, mundo, juego, render
sim/                     simulador en el navegador: Gfx con Canvas + teclado, 428×142 ×3
src/apps/ (badge)        Gfx con Poco + botones, se abre desde el menú de la Fase 1
```

- `game.ts` es una máquina de estados determinista que avanza a 60 Hz fijos (`step(input)`), sin tiempo ni E/S adentro.
- `render.ts` dibuja el estado actual solo a través de `Gfx`, así que el mismo archivo dibuja en el navegador y en el badge.
- Los adaptadores de hardware solo traducen: teclado o botones → eventos de entrada, y llamadas a `Gfx` → Canvas o Poco.

## 9. Sonido

Todo el sonido es original y vive como datos en `src/core/game/sound.ts`: cada efecto es una lista de pasos `[Hz, ms]` en un solo canal, para que lo pueda tocar un piezo.

| Evento | Cuándo |
|---|---|
| `jump` · `petal` · `hit` | acciones en la carrera |
| `flower` · `correct` · `wrong` | retos |
| `gameover` · `victory` | finales |
| `move` · `select` | menús, pausa, opciones |

- **Música de la carrera**: una melodía en bucle en escala pentatónica de La menor, sobre un bajo que camina a 140 bpm. Dos voces en el simulador; un piezo tocaría solo la melodía.
- **Simulador**: WebAudio, con onda cuadrada para los efectos y triangular para el bajo. Se controla con las casillas **silencio** y **música**, y el audio empieza con la primera tecla (política del navegador).
- **Badge**: no encontré buzzer ni bocina (fotos y firmware original, ver `docs/hardware.md`). El juego igual genera los eventos, y `src/apps/main.ts` los consume justo donde iría un adaptador para piezo (PWM con LEDC en un GPIO libre verificado).

## 10. Conexión con la Fase 3

Con red, las frases del Guardián y retos adicionales pueden venir del backend en AWS (`game.md` §6). En ese modo el servidor guarda la respuesta y el badge solo manda el id de la opción. El modo offline siempre es el predeterminado.
