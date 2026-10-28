# Tareas — Hazel Badge OS

**Español** · [English](en/tasks.md)

Leyenda: 🔌 toca el dispositivo (solo lectura salvo que se indique) y necesita tu visto bueno · ⚡ escribe en la flash, necesita aprobación explícita del comando exacto.

## M1. Descubrimiento y verificación del hardware — listo
- [x] 1.1 Revisar `ElectronicCats/badge_JSCON_2026` y repos relacionados (resultado: 404, no es público) — R0.6
- [x] 1.2 Identificar componentes desde las fotos; escribir `docs/hardware.md` con etiquetas de confianza — R0.6
- [x] 1.3 Enumeración USB pasiva (VID/PID, puerto) — R0.6
- [x] 1.4 Recrear `~/esp32-dev/.venv` (esptool 5.6.0) — R0.4
- [x] 1.5 🔌 Respaldo completo leído dos veces, SHA-256 coincide, `verify-flash` aprobado — R0.4
- [x] 1.6 🔌 `flash-id` y `espefuse summary` capturados (Secure Boot y cifrado de flash desactivados) — R0.4
- [x] 1.7 Tabla de particiones y descriptor de la app analizados (sin conexión) — R0.4
- [x] 1.7b Conciliado: `mictlan_card` = intento anterior de Hazel (`hsaenzG/mictlan-js`, rama `cursor/lcd-bus-pins`); el respaldo de fábrica está en otra computadora
- [x] 1.7c Respaldo renombrado a `badge-2026-10-24-mictlan_card.bin`
- [x] 1.8 Análisis estático: init del NV3007 2.79" encontrado en restos del firmware de fábrica en `0xdc1b5`
- [x] 1.9 🔌 Log de arranque capturado (prototipo); el log de fábrica y el desensamblado de `mictlan-js` dan los pines de botones, LCD y LoRa
- [x] 1.10 Fotos en `image/` (no hicieron falta macros de etiquetas tras la evidencia del firmware)
- [-] 1.11 Mapeo de continuidad — no hace falta, pines verificados desde el firmware de fábrica y en pantalla
- [x] 1.12 Moddable: no tiene driver NV3007, pero el driver genérico ili9341 + lista de registros funciona (sin C)
- [x] 1.13 `docs/hardware.md` actualizado; pines y panel VERIFIED
- **Criterio de salida:** controlador, resolución, pines de pantalla, pin de retroiluminación, 4 GPIO de botones + nivel activo, PSRAM y bus compartido con LoRa, todo VERIFIED; respaldo verificado.

## M2. Toolchain (sin acceso al dispositivo) — listo
- [x] 2.1 ESP-IDF v6.1 instalado en `~/esp` (fuera del repo) — D1
- [x] 2.2 Moddable SDK instalado en `~/Projects/moddable` (fuera del repo) — D0
- [x] 2.3 `package.json`, `tsconfig` (`strict`), Vitest — D6

## M2b. Núcleo TS + simulador (sin hardware) — listo
- [x] 2b.1 `src/core/typewriter.ts` + tests (avance por code point, saltar con una tecla) — R2.3–5
- [x] 2b.2 `src/core/inputFsm.ts` + tests (debounce, pulsación larga, repetición) — R2.16–17
- [x] 2b.3 `src/core/nav.ts` + módulo de contenido + tests — R2.11–15
- [x] 2b.4 JetBrains Mono con glifos en español (TTF vía cfeFT en lugar de BMFont) — R2.8–9
- [x] 2b.5 Pantallas: intro, menú, tarjeta, GitHub, enlaces, about — R2.11–22
- [x] 2b.6 Simulador en el navegador a la resolución verificada (`sim/`, `npm run sim`) en lugar de `hosts/sim` — D6

## M3. Primer despliegue al badge ⚡ (entregable de la Fase 1) — listo 2026-10-24
- [x] 3.1 Checklist previo al flasheo de `docs/backup-and-recovery.md` §6 completo
- [x] 3.2 Tabla de particiones y versión del bootloader documentadas (`design.md` §5, documento de respaldo §5b)
- [x] 3.3 ⚡ Flasheados v0.1.0 (completo) y v0.1.1 (solo app) con aprobación; orientación, offsets y orden RGB verificados en pantalla
- [x] 3.4 Los 4 botones verificados (video `image/IMG_7774.MOV`)
- [x] 3.5 Animación de intro, whoami, tarjeta, GitHub, enlaces y QR en el badge — **aceptación de la Fase 1 cumplida**
- [ ] 3.5b Medir el tiempo de arranque hasta el primer frame y los FPS (aún sin medir)
- [ ] 3.5c Foto de la rampa de grises → decidir si ajustar la gamma del NV3007 (About → SELECT)
- [ ] 3.6 Ensayar una restauración completa desde un respaldo (necesita aprobación; sobrescribe Hazel Badge OS)

## M4. Mictlán.js — prototipo de escritorio (`game.md` Milestone 2) — listo 2026-10-24
- [x] 4.1 Documento de diseño del juego (`docs/game-design.md`): auto-runner, 4 flores, checkpoints, ofrenda, Guardián
- [x] 4.2 Pixel art original: rana, calaverita, flor, Guardián, vela, corazón (`src/core/game/sprites.ts`)
- [x] 4.3 Banco de preguntas sin conexión, 2 variantes por concepto; los tests **ejecutan cada snippet en Node** para probar la respuesta
- [x] 4.4 Núcleo del juego determinista a 60 Hz (física, colisiones, corazones, checkpoints, pausa, reintento, victoria, volver a jugar)
- [x] 4.5 Renderer compartido contra una interfaz `Gfx` (`src/core/game/render.ts`)
- [x] 4.6 Simulador en el navegador a 428×142 ×3 con teclado + interruptor de colores seguros para el panel (`npm run sim`)
- [x] 4.7 Tests: partida completa con bot (~2 min), determinismo, checkpoints, cada pantalla cabe en 428 px
- [ ] 4.8 Probar el juego con Hazel; ajustar dificultad, tiempos y textos

## M5. Mictlán.js en el badge (`game.md` Milestones 3–4)
- [x] 5.1 Adaptador `Gfx` sobre Poco (paleta con `PANEL_SAFE`, sprites como bitmaps, JetBrains Mono TTF)
- [x] 5.2 Se abre desde el menú de la Fase 1; `salir` regresa a él
- [x] 5.3 FPS medidos en el hardware: 22–24 fps con redibujado completo (suficiente, sin regiones sucias por ahora)
- [x] 5.4 ⚡ Flasheado con aprobación; nivel completo jugable en el badge

## M6. Backend en AWS: El Guardián sobre Strands Harness — listo 2026-10-24
- [x] 6.1 Contrato de API v1 con esquemas Zod estrictos (`backend/src/contract.ts`)
- [x] 6.2 Guardián sobre `createHarness()`, cerrado: sin tools, sin sesión, sin memoria, sin skills ni plugins, sin caché; un agente por solicitud (`backend/src/guardian.ts`)
- [x] 6.3 Retos generados por IA verificados ejecutando el snippet en un sandbox `node:vm` filtrado; respaldo con el banco local (`backend/src/snippet.ts`)
- [x] 6.4 Respuestas guardadas en el servidor en DynamoDB con TTL y límite de intentos (`backend/src/store.ts`)
- [x] 6.5 Handler: validación, 413/400/404, respuestas de respaldo, logs JSON solo con metadatos (`backend/src/handler.ts`)
- [x] 6.6 Bundle con code splitting + protección contra peers opcionales cargados de forma ansiosa; bundle probado de punta a punta en local contra un endpoint cerrado
- [x] 6.7 Stack de CDK: REST API + llave por badge + usage plan, Lambda (Node 24 ARM, sin concurrencia reservada: el límite de la cuenta es 10), IAM de Bedrock acotado, DynamoDB con TTL, logs, alarma de errores, presupuesto opcional; `cdk synth --strict` limpio con cdk-nag v3
- [x] 6.8 Tests del backend (modelo falso): respaldos, chequeo de filtraciones, prompts a prueba de inyección, código peligroso, límites de intentos, logs
- [x] 6.9 ⚡☁ Desplegado con aprobación: perfil free-tier-Strands, us-east-2, presupuesto USD 5 → hazel.saenz@gmail.com
- [x] 6.10 Smoke test contra la API en vivo: 403 sin llave, líneas de IA en 1–2.8 s, 400 con entrada inválida, reto de IA sin respuesta, respuesta en el servidor, cierre tras resolverlo, logs solo con metadatos (0 coincidencias de la llave)
- [x] 6.11 Chequeo de filtraciones aplicado también a las pistas de los retos de IA
- [ ] 6.11b Throttling por ráfaga del usage plan no observado en una ráfaga de 6 solicitudes (la cuota diaria sigue limitando el costo)

## M7. Modo en línea del badge
- [x] 7.1 Wi-Fi + cliente HTTPS en Moddable; credenciales y llave de API grabadas en el NVS (`Preference`, dominio `guardian`) con `scripts/provision-badge.py` — funcionando por el hotspot del teléfono
- [x] 7.2 Líneas del Guardián en línea dentro de Mictlán.js (pista/ánimo/final) con respaldo local
- [ ] 7.3 Retos en línea vía /v1/challenge + /v1/answer
- [x] 7.4 ⚡ Flasheado con aprobación (app en línea + NVS)
- [x] 7.5 Diagnóstico de Wi-Fi: escaneo primero, línea de estado en título/pausa, reintentos cada 30 s (`src/core/netStatus.ts`) — compilado, **sin flashear**
- [ ] 7.6 Corregir `XS abort: JavaScript stack overflow` después de conectarse (sospecha: TLS en JS con `creation.stack: 512`; sin verificar)
- [ ] 7.7 ⚡ Flashear diagnóstico + corrección con aprobación
