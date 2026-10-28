# Reporte de descubrimiento de hardware: badge de JSConf México 2026 (Electronic Cats)

**Español** · [English](en/hardware.md)

Estado: **Milestone 1 en curso. TODAVÍA NO está autorizado inicializar la pantalla específica ni flashear.**
Última actualización: 2026-10-24

Cada dato de abajo lleva una etiqueta de confianza:

| Etiqueta | Significado |
|---|---|
| `VERIFIED` | Confirmado por la salida de una herramienta o por evidencia física sin ambigüedad |
| `OBSERVED` | Se ve en las fotos, pero la marca es poco legible o la función se deduce por la ubicación |
| `HYPOTHESIS` | Suposición de ingeniería razonable. **No se usa en el código** hasta confirmarla |
| `UNKNOWN` | Todavía sin evidencia |

## 1. Fuentes consultadas

| Fuente | Resultado |
|---|---|
| `github.com/ElectronicCats/badge_JSCON_2026` (URL impresa en la serigrafía de la placa) | **HTTP 404** el 2026-10-24. No es público (privado, renombrado o aún sin publicar). |
| `gh search repos --owner ElectronicCats jsconf` / `JSCON` | Sin resultados. |
| Lista de repos de la organización ElectronicCats (los 100 más recientes) | No hay repo de JSConf. Existen otros badges (HackGDL, BugCON, REcon…), pero son **placas distintas** y no se deben usar como fuente de pines. |
| Búsqueda web "Electronic Cats JSConf México 2026 badge" | No encontré documentación, esquemático ni firmware. |
| Fotos en `image/` (frente apagado, frente encendido, reverso) | Identificación de componentes abajo. |
| IORegistry de macOS (pasivo, sin abrir el puerto) | Descriptor USB abajo. |

## 2. Datos verificados y observados

### 2.1 MCU y módulo

| Elemento | Valor | Etiqueta | Evidencia |
|---|---|---|---|
| Módulo | Espressif **ESP32-S3-WROOM-1** (antena en la placa) | `VERIFIED` | Marca en el blindaje del módulo, foto del reverso |
| Chip | ESP32-S3 (QFN56) rev v0.2, doble núcleo, 240 MHz, Wi-Fi + BLE | `VERIFIED` | `esptool chip-id` de la usuaria |
| Flash | 8 MB, Quad SPI, 3.3 V | `VERIFIED` | `esptool flash-id` de la usuaria |
| Bootloader | ESP-IDF v5.5.5, 8 MB, 80 MHz, DIO | `VERIFIED` | `image-info` de la usuaria |
| Variante del módulo (N8 / N8R2 / N8R8) | el código de pedido no se lee en la foto | `UNKNOWN` | Define la PSRAM (0 / 2 MB quad / 8 MB octal) |
| PSRAM | eFuse `PSRAM_CAP`/`PSRAM_VENDOR` = ninguna (sin PSRAM dentro del chip). La página del vendedor dice WROOM-1-**N8** (sin PSRAM). El arranque del prototipo solo muestra heap interno (~381 KiB) | `HYPOTHESIS` (fuerte): **sin PSRAM**. El diseño debe caber en ~380 KiB de RAM interna |
| eFuses de seguridad | `SECURE_BOOT_EN` = False, `SPI_BOOT_CRYPT_CNT` = Disable, `DIS_DOWNLOAD_MODE` = False | `VERIFIED` (`espefuse summary`, 2026-10-24) |
| Contenido actual de la flash | `app0` = `mictlan_card` c79819f-dirty, compilado el 2026-10-24 12:57, IDF 5.5.5 (no es el original). El respaldo original de Meshtastic (`0640a9ca…`) lo tiene Hazel en otra computadora | `VERIFIED` |
| USB | USB-Serial/JTAG nativo, VID `0x303A`, PID `0x1001`, producto "USB JTAG_serial debug unit" | `VERIFIED` | `ioreg` (pasivo) |
| Puerto serial | `/dev/cu.usbmodem101` (puede cambiar) | `VERIFIED` | `ls /dev/cu.usb*` |

El número de serie USB es igual a la MAC base del chip. A propósito no se copia en este repo.

### 2.2 Pantalla

| Elemento | Valor | Etiqueta |
|---|---|---|
| Tipo | LCD TFT a color, formato de barra alargada, montada horizontal al frente | `OBSERVED` |
| Proporción | ~2.9–3.4 : 1 medida en las fotos; 428/142 = 3.01 | `OBSERVED` |
| Interfaz | Cable flex FPC a un conector con serigrafía **1** y **10**; la página del vendedor dice FPC de 10 pines a 0.5 mm | `OBSERVED` |
| Tipo de bus | SPI de 4 hilos (el firmware original tiene rutas de SPI de Arduino / `spiLock`; los módulos NV3007 de 2.79" son SPI) | `HYPOTHESIS` (fuerte) |
| Backlight | Q2 + R3/R13/R14 junto al FPC; el firmware original registra `Power to TFT Backlight` | `HYPOTHESIS` (fuerte) |
| **Controlador** | **NV3007, 2.79", 142×428**. La secuencia exacta de bytes `nv3007_279_init_operations` de Arduino_GFX (`ff a5`, `9a 08`, `9b 08`, `9c b0`, `9d 16`, `9e c4`, pares de gamma `6c 29`/`7c 29`/`6d 31`…) está en el offset `0xdc1b5` de la flash, dentro de restos del código de la app **original** de JSConf (después del final de la imagen actual del prototipo, en `0x48e30`). No encontré init de ST7789 ni ILI9341 | `VERIFIED` (evidencia en el firmware); la confirmación final es la primera prueba de relleno de color |
| Resolución | 142×428 nativa (428×142 horizontal) | `VERIFIED` (evidencia en el firmware) |
| Offsets | El perfil de 2.79" de Arduino_GFX usa offset de columna 12 / 14 y de fila 0 (la RAM del panel es más ancha que el vidrio). Por confirmar en la pantalla | `HYPOTHESIS` |
| Orden de color / inversión | — | `UNKNOWN` (prueba de relleno de color) |
| Soporte en Moddable | No hay driver de NV3007 en `modules/drivers` de Moddable → se necesita un driver nativo en C (diseño D2) | `VERIFIED` |
| Comportamiento con el firmware original | La foto muestra una franja verde olivo oscura y una morada | `OBSERVED` |
| Comportamiento con el prototipo actual | La pantalla se pone blanca y luego nada. Log: `st7789: ready 428x142 madctl 0x60 xoff 0 yoff 14 spi 40000000 Hz`. Mandar un init de ST7789 a un panel NV3007 explica la pantalla blanca | `VERIFIED` (log de arranque + tu observación) |

Los números del prototipo (428×142, offset 14, ST7789) coinciden con la variante **Hackaday Communicator** de Meshtastic, que es otra placa. Sus pines (SCK 38, MOSI 21, HSPI) **no** se usan aquí.

No elijas un driver por parecido. Las pantallas de barra de distintos fabricantes usan ST7789, ST7735, GC9107, NV3007, variantes de ILI9341 y otros, cada uno con offsets diferentes.

### 2.3 Otros componentes (reverso)

| Referencia / marca | Función probable | Etiqueta |
|---|---|---|
| Módulo VOLLGO, "ISM: 915MHz LoRa", código de parte poco legible (`VG…S915N0S1`) | Módulo de radio LoRa | `OBSERVED` (número de parte por confirmar) |
| AE1, conector SMA | Antena del módulo LoRa | `OBSERVED` |
| Chip transceptor LoRa dentro del módulo | — | `UNKNOWN` |
| SOT-223 "JJ33 / 902623" + C6/C7 | Regulador lineal de 3.3 V | `OBSERVED` |
| F1, R1, R2 junto al USB-C | Fusible + resistencias CC del USB-C | `HYPOTHESIS` |
| C4, C5, R5 cerca de RST/BOOT | Red RC de reset en EN | `HYPOTHESIS` |
| Switch deslizable ON/OFF | Interruptor de encendido | `VERIFIED` (serigrafía) |
| Portapilas / conector de batería | no se ve en la foto del reverso | `UNKNOWN`: ¿cómo se alimenta el badge sin USB? |

**Dato nuevo que no estaba en el brief original:** la placa tiene un módulo LoRa de 915 MHz. Importa porque:
- Probablemente comparte el bus SPI con la pantalla, o usa un segundo host SPI. Cualquiera de los dos cambia el diseño del driver de pantalla.
- Su línea CS debe quedarse inactiva (normalmente en alto) mientras se le habla a la pantalla en un bus compartido; si no, el tráfico del bus se corrompe.
- El conector SMA no debe quedarse sin antena si algún día transmitimos. Las fases 1 a 3 no usan LoRa, así que el firmware mantiene el radio inactivo.

### 2.4 Botones

| Botón | Conexión | Etiqueta |
|---|---|---|
| UP, DOWN, BACK, SELECT (frente) | El prototipo `mictlan_card` (tu intento anterior, con el código en otra computadora) responde bien: el log muestra las transiciones `screen card` / `screen links` el 2026-10-24. Su configuración de GPIO de botones funciona, pero no imprime los números | GPIOs `UNKNOWN`; está `VERIFIED` que en ese código existe una configuración que funciona |
| BOOT (reverso) | En todos los diseños con ESP32-S3, el botón de modo de descarga maneja el pin de strapping GPIO0 | `HYPOTHESIS` (práctica estándar, falta verificarla en esta placa) |
| RST (reverso) | CHIP_PU / EN | `HYPOTHESIS` |

### 2.5 Log de arranque del prototipo actual (2026-10-24, MAC oculta)

```
rst:0x15 (USB_UART_CHIP_RESET),boot:0x8 (SPI_FAST_FLASH_BOOT)
mode:DIO, clock div:1
I (82) cpu_start: cpu freq: 160000000 Hz
I (82) app_init: Project name:     mictlan_card
I (82) app_init: App version:      c79819f-dirty
I (83) app_init: ESP-IDF:          v5.5.5
I (84) heap_init: At 3FC98F50 len 000507C0 (321 KiB): RAM
I (84) heap_init: At 3FCE9710 len 00005724 (21 KiB): RAM
I (84) heap_init: At 3FCF0000 len 00008000 (32 KiB): DRAM
I (797) st7789: ready 428x142 madctl 0x60 xoff 0 yoff 14 spi 40000000 Hz
I (817) mictlan: card running screen startup links 3
I (8107) mictlan: screen card
I (18367) mictlan: screen links
```

Detalle del reset: en esta Mac, los resets por software por USB (`hard-reset` de esptool, pulso de RTS) caen en `boot:0x0 DOWNLOAD`. Usa el botón físico **RST** para arrancar la app y **mantén BOOT al conectar el USB** para entrar al modo de descarga de forma confiable.

### 2.6 Mapa de pines (recuperado del firmware original)

Fuente: el proyecto anterior de Hazel, `github.com/hsaenzG/mictlan-js`, rama `cursor/lcd-bus-pins` (`docs/hardware.md`, `firmware/badge/main/board.h`). Son dos métodos independientes, ambos sobre la imagen **original** de JSConf con Meshtastic (SHA-256 `0640a9ca…`), nunca de otra placa:

- **Log de arranque original** (captura tras RST del 2026-10-23, 115200 8N1, DTR/RTS en bajo, sin enviar nada).
- **Desensamblado** del `app0` original con `xtensa-esp32s3-elf-objdump` (2026-10-24): los constructores del bus y del panel en la función `connect()` del TFT, con offsets del archivo y bytes de instrucción anotados en ese documento.

| Señal | GPIO | Fuente | Etiqueta |
|---|---|---|---|
| BTN UP | 40 | Log original `BadgeJsconButtons: UP=40 DOWN=43 SELECT=18 BACK=1` + tabla de botones en `0xE186C` | `VERIFIED` |
| BTN DOWN | 43 | igual | `VERIFIED` |
| BTN SELECT | 18 | igual | `VERIFIED` |
| BTN BACK | 1 | igual | `VERIFIED` |
| Modo de los botones | `INPUT_PULLUP` (modo 5 de Arduino) → activos en **bajo** | Desensamblado en `0x1817F0` | `VERIFIED` |
| LCD SCK | 12 | Byte 11 del objeto del bus, conectado a `FSPICLK_OUT_IDX` | `VERIFIED` (desensamblado) |
| LCD MOSI | 11 | Byte 12 del objeto del bus, `FSPID_OUT_IDX` | `VERIFIED` (desensamblado) |
| LCD MISO | sin conectar | Byte 13 del objeto del bus = `0xFF` | `VERIFIED` (desensamblado) |
| LCD CS | 21 | Byte 10 del objeto del bus, en alto cuando está inactivo | `VERIFIED` (desensamblado) |
| LCD DC | 9 | Byte 9 del objeto del bus, bajo = comando | `VERIFIED` (desensamblado) |
| LCD RST | 10 | Byte 68 del objeto del panel; pulso alto 100 ms / bajo 120 ms / alto 120 ms | `VERIFIED` (desensamblado) |
| LCD backlight | 2 (GPIO simple, alto = encendido; el original aplica brillo 153) | `pinMode(2, OUTPUT)` + `digitalWrite` | `VERIFIED` (desensamblado) |
| Bus del LCD | `SPI2_HOST`, modo 0, 40 MHz | Literal `40000000` en el init del bus | `VERIFIED` (desensamblado) |
| MADCTL del LCD | `0x60` (rotación 1, MX\|MV → horizontal) | Rutina de rotación del panel | `VERIFIED` (desensamblado) |
| Tamaño del LCD | 142 × 428 (halfwords `8e 00 ac 01` en el objeto del panel) | Coincide con el init de NV3007 que encontré por separado | `VERIFIED` (dos fuentes) |
| SPI de LoRa | SCK 37, MISO 36, MOSI 35, NSS 38 (bus separado del LCD) | Log original `SPI.begin(...)` | `VERIFIED` |
| Control de LoRa | driver LLCC68; IRQ 48, RST 47, BUSY 39 | Log original `SX126xInterface(...)` | `VERIFIED` |

Sigue pendiente: medición de batería y GPIO del switch deslizable.

### 2.7 Primer arranque de Hazel Badge OS en la pantalla (2026-10-24, video `image/IMG_7774.MOV`)

| Revisión | Resultado | Etiqueta |
|---|---|---|
| Arranque | Log: `hazel-badge-os: 428x142 ready` | `VERIFIED` |
| Offsets (columna 0 / fila 14, MADCTL 0x60) | Se dibuja todo el área de 428×142, sin filas de basura y sin cortes | `VERIFIED` |
| Orden de color | `#F5E000` se ve amarillo y el blanco se ve blanco → orden RGB y de bytes correctos | `VERIFIED` |
| Botones | UP/DOWN/SELECT/BACK manejan el menú, los links, el QR y el regreso | `VERIFIED` |
| Acentos con JetBrains Mono TTF | `Sáenz`, `escanéame` y `menú` se dibujan bien | `VERIFIED` |
| QR | El QR de LinkedIn sale con módulos negros nítidos sobre blanco | `VERIFIED` |
| **Niveles casi negros** | `#000000` (módulos del QR) se ve negro, pero `#0D0D0D` (fondo) se ve **verde menta claro**; `#4A4A4A` se ve gris oscuro. Los niveles de gris más bajos (distintos de cero) se ven claros | `VERIFIED` (visual). Causa `HYPOTHESIS`: la tabla de gamma del NV3007 de 2.79" (la misma que usa el firmware original) |

Mitigación en v0.1.1: el fondo se dibuja en `#000000` puro. Una pantalla de prueba con escala de grises (About → SELECT) muestra los niveles 0, 2, 4 … 255 para ver cuáles fallan antes de tocar la gamma.

Seguimiento (fotos `image/IMG_7777.jpg`–`IMG_7780.jpg`): el texto negro sobre la barra amarilla de selección se ve gris claro. Es la misma causa: los bordes suavizados oscuros caen en los niveles bajos que se ven claros. Regla de interfaz: **nada de texto oscuro sobre fondos claros**; negro puro sobre blanco puro sin suavizado (el QR) está bien. `▸`/`◂` sí existen en JetBrains Mono, pero son los triángulos *pequeños* y a 11 px parecen un punto; usa `→`/`←`.

v0.1.1 en la pantalla (fotos `image/IMG_7775.jpg`, `image/IMG_7776.jpg`): el fondo se ve negro y el texto blanco, gris y amarillo se ve bien. Mitigación `VERIFIED`. Falta la foto de la escala de grises, así que siguen abiertos los niveles exactos afectados (y una posible corrección de gamma); mientras tanto, evita rellenos oscuros distintos de cero.

Por qué falló el prototipo: usaba estos pines correctos con un **init de ST7789** en un panel **NV3007**.

## 3. Pendientes que bloquean la Fase 1

1. ~~Controlador y resolución de la pantalla~~ → NV3007 142×428 (evidencia en el firmware). Offsets, orden de color e inversión siguen abiertos.
2. ~~Mapa de pines de la pantalla~~ → §2.6.
3. ~~Bus compartido~~ → buses separados (§2.6).
4. ~~Botones~~ → §2.6.
7. Offsets X/Y y RGB/BGR del NV3007: se resuelven con la primera prueba de relleno de color en el hardware.
5. ~~PSRAM~~ → casi seguro no hay.
6. ~~Integridad del respaldo de la flash~~ → verificado (§5).

## 4. Plan de identificación de solo lectura propuesto

Ordenado de riesgo cero a riesgo bajo. Nada de esto escribe en la flash. Los pasos marcados con 🔌 tocan el dispositivo (lo reinician en el bootloader de la ROM, lo que interrumpe el firmware en ejecución pero no cambia nada) y necesitan tu visto bueno.

### Paso A: conseguir el repo (riesgo cero)
Pregúntale a Electronic Cats (o a los organizadores de JSConf) si van a publicar `badge_JSCON_2026` o si lo pueden compartir. Un esquemático o el código del firmware resuelve casi todas las incógnitas de una vez.

### Paso B: inspección física (riesgo cero)
Por favor manda:
1. Una foto macro de la **etiqueta del módulo WROOM-1** (la línea bajo el FCC ID dice `N8`, `N8R2` o `N8R8`).
2. Una foto macro de lo impreso en el **cable flex de la pantalla** (el código cerca de `…08HY` en el flex); muchas veces lleva directo a la hoja de datos del panel.
3. Una foto del **conector FPC de 10 pines** con el flex levantado, si te sientes cómoda (solo con la placa apagada; los seguros de los FPC son frágiles).
4. Una foto del **borde o reverso de la pantalla** si tiene alguna etiqueta.
5. La marca completa y legible del **módulo VOLLGO**.
6. Si hay un portapilas en algún lugar que yo no vea.

### Paso C: recrear y verificar el respaldo 🔌 (solo lectura)
Ver `docs/backup-and-recovery.md`. Es obligatorio antes de que cualquier otra cosa toque el dispositivo.

### Paso D: reporte de características del chip 🔌 (solo lectura)
```sh
python -m esptool --chip esp32s3 --port /dev/cu.usbmodem101 chip-id
python -m esptool --chip esp32s3 --port /dev/cu.usbmodem101 flash-id
```
Guarda la salida **completa**, sobre todo la línea `Features:` (por ejemplo "Embedded PSRAM 2MB" o "Embedded Flash"), que resuelve parte de la duda sobre la PSRAM. La PSRAM octal del N8R8 está fuera del chip y puede no aparecer; el Paso F cubre eso.

### Paso E: tabla de particiones y metadatos de la app (sin el dispositivo, sobre el respaldo)
```sh
# El offset por defecto de la tabla de particiones es 0x8000 (confírmalo con la config del bootloader o el log de arranque)
dd if=jsconf-original.bin of=pt.bin bs=1 skip=$((0x8000)) count=$((0xC00))
python gen_esp32part.py pt.bin            # de components/partition_table en ESP-IDF
python -m esptool --chip esp32s3 image-info app.bin   # después de recortar la partición de la app en su offset
```
El `esp_app_desc_t` de la partición de la app da el nombre del proyecto, la versión, la versión de IDF y la fecha de compilación.

### Paso F: análisis estático de cadenas de la imagen de la app (sin el dispositivo)
```sh
strings -n 6 app.bin | grep -iE 'st77|ili9|gc9|nv30|lcd|panel|lvgl|lv_|tft|lovyan|psram|spiram|sx12|lora|radiolib|gpio|width|height'
```
Busca: nombres de drivers (`esp_lcd_st7789`, `TFT_eSPI`, `LovyanGFX`, LVGL), mensajes de inicio de PSRAM, nombres de librerías de LoRa y etiquetas de log. Los números de pin se compilan como valores inmediatos, así que las cadenas casi nunca los muestran; los formatos de log a veces sí.

Regla de privacidad: si la partición NVS tiene credenciales de Wi-Fi o tokens, se quedan en esta Mac. Nada del dump se sube a ningún lado.

### Paso G: capturar el log de arranque 🔌 (solo lectura)
Abre la consola serial y presiona RST:
```sh
python -m serial.tools.miniterm /dev/cu.usbmodem101 115200
```
ESP-IDF imprime la detección de PSRAM, la selección de partición y cualquier línea `ESP_LOGI` que emita el firmware (etiquetas de drivers, a veces resoluciones o pines).

### Paso H: mapeo de continuidad (cero riesgo eléctrico, con la placa APAGADA y el USB desconectado)
Con un multímetro en modo continuidad, sigue cada pad de los botones del frente y cada uno de los 10 pads del FPC hasta los pines del borde del WROOM-1, y luego convierte pin del módulo → GPIO con el pinout de la hoja de datos del WROOM-1. Es la forma más confiable de obtener el mapa si no aparece un esquemático.

### Paso I: firmware de prueba solo en RAM 🔌 (necesita aprobación explícita; no escribe la flash)
`esptool load-ram` corre una imagen pequeña desde la SRAM sin tocar la flash; al reiniciar vuelve el firmware original. Dos pruebas:
1. **Lectura de entradas:** configura los GPIO candidatos como entradas con pull-up interno e imprime sus niveles mientras presionas cada botón. Excluye los pines de strapping (0, 3, 45, 46), los de flash (26–32), los de PSRAM (33–37 si es octal) y los de USB (19/20). Ningún pin se maneja como salida.
2. **Prueba de pantalla:** solo después de que B/E/F/H den un controlador y sus pines. Manda lecturas `RDDID (0x04)` / `RDID1-3` si existe MISO y luego una prueba de relleno de color.

La prueba 1 es de bajo riesgo. La prueba 2 maneja salidas y solo se permite cuando los pines ya están mapeados.

## 5. Respaldos

- Estado actual del chip: `~/esp32-dev/backups/badge-2026-10-24-mictlan_card.bin`, SHA-256 `45049573431b3fe60fbaf99386102c5db54e421343d39fdc486b286fa0748e73`. Leído dos veces (hashes iguales), `verify-flash` aprobado.
- Imagen original de JSConf con Meshtastic (SHA-256 `0640a9ca…`): la tiene Hazel en otra computadora. No está en esta Mac.

## 6. Historial de cambios
- 2026-10-24: reporte inicial a partir de fotos, búsqueda en GitHub y web, y enumeración USB pasiva.
