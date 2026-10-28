# Diseño: Hazel Badge OS

**Español** · [English](en/design.md)

Estado: borrador de arquitectura, revisado el 2026-10-24 para que **JavaScript/TypeScript sea el lenguaje de la aplicación** (es un badge de JSConf). Las secciones específicas del panel siguen como marcadores hasta que `docs/hardware.md` marque la pantalla y los botones como `VERIFIED`.

## 1. Decisiones principales

| # | Decisión | Por qué | Alternativas consideradas |
|---|---|---|---|
| D0 | **Apps escritas en TypeScript, corriendo en el dispositivo sobre el motor XS del Moddable SDK** | JS moderno de verdad (ES2023+) en el ESP32-S3, TypeScript compilado por el build (`mcconfig`), una pila de gráficos madura (Commodetto + Piu), las APIs estándar de E/S de ECMA-419 y un simulador de escritorio (`mcsim`). Encaja con JSConf: las apps del badge son JS | Espruino (casi ES5, soporte débil para S3); QuickJS o JerryScript dentro de un programa en C (tendríamos que escribir nuestros propios bindings de gráficos y E/S); MicroPython (no es JS) |
| D1 | **ESP-IDF v6.1**, la versión que usa actualmente el Moddable SDK | Lo exige Moddable. Implica que también se reemplaza el bootloader, así que la restauración de la imagen completa en `docs/backup-and-recovery.md` es obligatoria | Quedarse en 5.5.5 (obligaría a usar una versión vieja de Moddable, sin soporte) |
| D2 | **C nativo solo donde JS no alcance.** Resultado para el NV3007: **no hizo falta C nuevo**. El driver SPI genérico `ili9341` de Moddable recibe el init completo del NV3007 de 2.79" como datos del manifest (`hosts/badge/manifest.json`, generado con `tools/nv3007-registers.mjs`), junto con los pines, los offsets y el backlight | Todo el código del producto queda en TS | Firmware todo en C (descartado por la dirección del producto) |
| D3 | **Piu/Commodetto para dibujar; sin LVGL** | Moddable trae su propia pila de interfaz con fuentes, bitmaps, actualización por regiones y drivers de pantalla SPI (ST7789, ILI9341, GC9A01, entre otros) | Bindings de LVGL (una capa extra, poco natural en Moddable) |
| D4 | **Antirrebote con una máquina de estados en TS puro**, alimentada por lecturas `Digital` de ECMA-419 con un timer de 5 ms | La misma lógica corre y se prueba en Node | Callbacks por interrupción (`onReadable`), se puede cambiar después |
| D5 | **JetBrains Mono (SIL OFL 1.1) convertida a BMFont** con las herramientas de fuentes de Moddable, subconjunto Latin-1 | El mismo estilo del README de GitHub, acentos en español, sin TTF en tiempo de ejecución | Fuentes incluidas en Moddable (sin el estilo de JetBrains) |
| D6 | **Módulos de lógica en TS puro probados con Vitest en Node**; revisión visual en `mcsim` | El tecleo, la navegación, la máquina de botones y la física del juego tienen una sola fuente de verdad | Pruebas separadas en C (el diseño anterior) |
| D7 | Backend en **TypeScript**: SDK de Strands Agents para TypeScript (`@strands-agents/sdk` de npm) en Lambda (Node.js), **AWS CDK en TypeScript** y el modelo **Amazon Nova** en Bedrock | Un solo lenguaje en el badge, las pruebas, el backend y la infraestructura | SDK de Strands para Python (más maduro; sigue siendo un plan B) |

Riesgo a verificar pronto: Moddable debe soportar el controlador real del panel. Si no, escribimos un módulo pequeño de driver nativo (D2). Esto se revisa en M1/M3, no se da por hecho.

## 2. Arquitectura por capas

```
┌──────────────────────────────────────────────────────────────┐
│ src/apps/      intro · menú · tarjeta · links · qr · juego   │  pantallas con Piu
├──────────────────────────────────────────────────────────────┤
│ src/core/      tecleo · navStack · inputFsm · acomodo ·      │  TS puro, sin imports
│                juego (física de paso fijo, AABB) · contenido │  de Moddable → Vitest en Node
├──────────────────────────────────────────────────────────────┤
│ src/platform/  pantalla · botones · reloj · red              │  adaptadores Moddable/ECMA-419
├───────────────────────────┬──────────────────────────────────┤
│ hosts/badge/ (manifest,   │ hosts/sim/ (manifest de mcsim:   │
│  pines del BSP, driver    │  teclado → botones, tamaño de    │
│  nativo si hace falta,    │  pantalla = el del panel         │
│  CS de LoRa en alto)      │  verificado)                     │
└───────────────────────────┴──────────────────────────────────┘
```

Reglas:
- `src/core/` no importa nada de Moddable (`piu/*`, `embedded:*`), para que Node lo pueda correr.
- Los números de pin, el host SPI y los parámetros del panel viven solo en `hosts/badge/`, y solo cuando son `VERIFIED`.

### 2.1 Contratos de la plataforma (borrador)

```ts
// src/platform/types.ts
export type Button = "up" | "down" | "back" | "select";
export type ButtonEvent = { button: Button; kind: "press" | "release" | "long" | "repeat" };
export interface RawButtons { read(): number }            // máscara de bits, 1 = presionado
export interface Clock { now(): number }                  // ms, monotónico
```

### 2.2 Máquina de estados de los botones (`src/core/inputFsm.ts`)
Por botón: `IDLE → DEBOUNCE_DOWN (25 ms) → PRESSED → (600 ms) LONG → REPEAT cada 120 ms`; al soltar se refleja con `DEBOUNCE_UP`. Solo UP/DOWN repiten. Se maneja con `(rawMask, nowMs)`, así que las pruebas le pasan líneas de tiempo sintéticas. Usa un anillo de eventos ya reservado (16 entradas), sin reservar memoria en cada paso.

### 2.3 Dibujo
- `Application` de Piu con dibujo por regiones a través del renderer `Poco` de Commodetto; Moddable manda franjas a la pantalla, así que no hace falta un framebuffer completo.
- El tecleo solo actualiza la línea activa y el cursor, para mantener bajo el tráfico SPI.
- Ritmo de cuadros: 30 Hz para la interfaz y hasta 60 Hz para el juego si el ancho de banda del panel lo permite. Se mide en el hardware.
- Disciplina con el GC: no se crean objetos en las rutas que corren cada cuadro; se reutilizan los arreglos y strings creados al entrar a la pantalla. El heap de XS se dimensiona en el manifest (sección `creation`) después de medir.

### 2.4 Animación de tecleo (`src/core/typewriter.ts`)
Es una función pura del tiempo sobre un guion de líneas (unos 45 ms por carácter, 600 ms de pausa por línea, cursor que parpadea cada 500 ms), inspirada en readme-typing-svg. Avanza por punto de código Unicode (`Array.from(line)`), así que `á` cuenta como un solo carácter.

### 2.5 Fuentes y texto
JetBrains Mono → BMFont en 1 o 2 tamaños, con el subconjunto ASCII + `á é í ó ú ñ Á É Í Ó Ú Ñ ü ¿ ¡ ·`. El tamaño se elige cuando se conozca el ancho del panel, para que `>_ LATAM Developer Advocate @ AWS` (34 caracteres) quepa o se parta bien. La licencia de la fuente va en `assets/fonts/`.

### 2.6 Pantallas y navegación (`src/core/navStack.ts`)
Pila de profundidad fija (máximo 6). Pantallas: `onEnter`, `onEvent`, `tick(now)`; Piu se encarga del dibujo.

```
Intro ──(termina/cualquier tecla)──► Menú ─┬─► Tarjeta
                                           ├─► GitHub (tarjeta del perfil hsaenzG)
                                           ├─► Links
                                           ├─► QR (solo si la resolución lo permite)
                                           ├─► Mictlán.js (Fase 2)
                                           └─► About
BACK regresa; BACK en el menú repite la intro.
```

### 2.7 QR
Moddable incluye un módulo de códigos QR (`qrcode`) y el contenido `QRCode` de Piu. `https://hazelsaenz.tech` cabe en la versión 2 (25×25 módulos) y necesita unos 58 px con el margen a 2 px por módulo → es posible si el panel mide ≥ ~64 px de alto. Se decide cuando se conozca la resolución.

## 3. Fase 2: Mictlán.js (resumen; el brief completo está en `game.md`)
- Auto-runner con paso de tiempo fijo (16.67 ms) y acumulador, y física con enteros para que sea determinista. TS puro en `src/core/game/`, probado en Node.
- Cuatro flores de cempasúchil (Variables, Functions, Promises, Objects), cada una abre un reto de JS; checkpoints en lugar de reinicios completos; final en la ofrenda.
- Grupos fijos de entidades (rana, ≤16 obstáculos, 4 flores, meta). Colisiones AABB.
- Sprites: hojas de color indexado convertidas con las herramientas de imágenes de Moddable. La rana es un diseño original, salvo que se confirme el permiso para usar la mascota de Strands.
- El banco de preguntas son datos locales; el badge nunca ejecuta el código de los retos, solo lo muestra.

## 4. Fase 3: backend de IA (resumen)

```
Badge ──HTTPS──► API Gateway (REST) ──► Lambda (Node.js, agente Strands en TS) ──► Bedrock (Amazon Nova)
                 · autenticación por dispositivo · tope de tokens de salida
                 · throttle del usage plan       · timeout de 10 s
                 · validación del esquema JSON   · concurrencia reservada (p. ej. 2)
                 · cuota diaria                  · logs estructurados sin tokens
```

- **Honestidad sobre la autenticación:** cualquier secreto guardado en un badge lo puede extraer quien lo tenga en la mano. El token es por dispositivo, revocable y con cuota; el diseño limita el costo y el alcance de un abuso.
- Retos en línea: el servidor guarda la respuesta correcta; el badge manda el id de la respuesta y recibe el veredicto. El modo offline usa el banco local.
- El badge valida cada respuesta (esquema, largo máximo, caracteres que puede dibujar) y, ante cualquier error, usa texto local.
- Las credenciales de Wi-Fi y el token se graban en tiempo de ejecución en las preferencias de la flash, nunca se compilan en el firmware.

## 5. Distribución de la flash
Bootloader de ESP-IDF v6.1 en `0x0` (DIO, 80 MHz, encabezado de 4 MB). Tabla de Moddable en `0x8000`: `nvs` 0x9000 (24K), `phy_init` 0xF000 (4K), `factory` 0x10000 (4032K). Los 4 MB de arriba del chip de 8 MB no se tocan. La comparación región por región y el comando de flash están en `docs/backup-and-recovery.md` §5b.

## 5b. Configuración de la pantalla (fuentes verificadas en `docs/hardware.md` §2.2 y §2.6)
428×142 horizontal, MADCTL `0x60` (se aplica al final de la lista de init), offset de columna 0, offset de fila 14 (la RAM del NV3007 mide 168 de ancho: 168 − 142 − 12 = 14), RGB565 (`COLMOD 0x05`), INVOFF, SPI2 modo 0 a 40 MHz, backlight en el GPIO 2 activo en alto y encendido por el driver después del primer cuadro. Por confirmar en la pantalla: los offsets (sin filas de basura arriba o abajo) y el orden RGB (el amarillo de acento no debe verse cian).

## 6. Estrategia de pruebas
- `src/core/`: pruebas unitarias con Vitest en Node, en cada cambio.
- `mcsim` para revisar visualmente las pantallas en la resolución verificada.
- Checklist en el dispositivo por milestone (tiempo de arranque, FPS, botones, margen de heap), después de un flash aprobado.

## 7. Preguntas abiertas
1. Controlador, resolución y pines de la pantalla (bloquea el dibujo y el QR).
2. ¿Hay PSRAM? (los eFuses no reportan PSRAM integrada; el módulo todavía podría ser N8R8 con PSRAM octal).
3. ¿La pantalla y LoRa comparten el bus SPI?
4. ¿Moddable ya soporta el controlador del panel?
5. Permiso para usar la mascota de Strands (por defecto, una rana original).
