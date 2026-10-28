# Respaldo y recuperación

**Español** · [English](en/backup-and-recovery.md)

Estado: **existe un respaldo verificado del estado actual del chip** (`~/esp32-dev/backups/badge-2026-10-24-mictlan_card.bin`, SHA-256 `45049573…8e73`, dos lecturas idénticas, `verify-flash` aprobado el 2026-10-24). La imagen original de JSConf con Meshtastic (`0640a9ca…`) está en la otra computadora de Hazel.

Nota sobre el modo de descarga en esta Mac: mantén **BOOT presionado mientras conectas el USB**. El reset automático por software no es confiable aquí.

## Reglas

- Los respaldos viven fuera del repo, en `~/esp32-dev/backups/`. Además, `.gitignore` bloquea `*.bin` como segunda línea de defensa.
- Los dumps nunca se suben a ningún lado (ni nube, ni servicios de IA, ni issues). Pueden contener datos del NVS, como credenciales de Wi-Fi.
- `erase-flash`, `write-flash`, `idf.py flash` e `idf.py erase-flash` nunca se corren sin tu aprobación explícita para ese comando exacto.

## 1. Entorno (solo local, no toca el dispositivo)

```sh
mkdir -p ~/esp32-dev/backups
cd ~/esp32-dev
python3 -m venv .venv
source .venv/bin/activate
pip install "esptool==5.6.0"
```

## 2. Crear un respaldo completo y verificado de la flash (solo lectura en el dispositivo)

Lee los 8 MB completos dos veces y compáralos. Dos lecturas idénticas descartan errores aleatorios de transferencia por USB.

```sh
source ~/esp32-dev/.venv/bin/activate
PORT=/dev/cu.usbmodem101   # vuelve a revisar con: ls /dev/cu.usbmodem*
cd ~/esp32-dev/backups

python -m esptool --chip esp32s3 --port "$PORT" read-flash 0 0x800000 jsconf-original.bin
python -m esptool --chip esp32s3 --port "$PORT" read-flash 0 0x800000 jsconf-original-2.bin

shasum -a 256 jsconf-original.bin jsconf-original-2.bin   # los hashes DEBEN coincidir
shasum -a 256 jsconf-original.bin > jsconf-original.bin.sha256
chmod 444 jsconf-original.bin jsconf-original.bin.sha256
```

Guarda también una copia fuera de la computadora (un disco externo). Una sola copia no es un respaldo.

Después compara contra el propio dispositivo (también es de solo lectura: compara, no escribe):

```sh
python -m esptool --chip esp32s3 --port "$PORT" verify-flash 0 jsconf-original.bin
```

## 3. Revisiones de estructura (sin el dispositivo)

```sh
python -m esptool --chip esp32s3 image-info jsconf-original.bin   # encabezado del bootloader en 0x0
```

Después lee la tabla de particiones (ver `docs/hardware.md`, Paso E) y anótala abajo. Corre `image-info` sobre cada partición de app para confirmar checksums y hashes. Estas revisiones prueban que las imágenes están bien formadas. Lo que prueba que el dump es igual al chip son las dos lecturas con el mismo hash más `verify-flash`.

## 4. Tabla de particiones original

| Nombre | Tipo | Subtipo | Offset | Tamaño | Flags |
|---|---|---|---|---|---|
| nvs | data | nvs | 0x9000 | 20K | |
| otadata | data | ota | 0xe000 | 8K | |
| app0 | app | ota_0 | 0x10000 | 3264K | |
| app1 | app | ota_1 | 0x340000 | 3264K | |
| spiffs | data | spiffs (contenido LittleFS) | 0x670000 | 1536K | |
| coredump | data | coredump | 0x7f0000 | 64K | |

La tabla es la misma en la imagen original y en la actual. `otadata` selecciona `app0`; `app1` está borrada. eFuses: Secure Boot apagado, cifrado de flash apagado y modo de descarga habilitado.

## 5. Procedimiento de recuperación

Úsalo solo si un flash futuro deja el badge inservible. Requiere tu aprobación en el momento de correrlo.

1. Pon el switch en ON y conecta el USB-C.
2. Entra al modo de descarga de la ROM: mantén **BOOT**, presiona **RST** y suelta BOOT. El USB nativo vuelve a aparecer como `/dev/cu.usbmodem*`.
3. Confirma que el chip responde: `python -m esptool --chip esp32s3 --port "$PORT" chip-id`
4. Revisa que el hash del respaldo coincida con el `.sha256` guardado.
5. Restaura la imagen completa:
   ```sh
   python -m esptool --chip esp32s3 --port "$PORT" write-flash \
     --flash-mode dio --flash-freq 80m --flash-size 8MB 0 jsconf-original.bin
   ```
6. Corre `verify-flash 0 jsconf-original.bin` y luego presiona RST. Debería aparecer la pantalla de JSConf.

Por qué esto es confiable: el bootloader de la ROM del ESP32-S3 está en ROM de máscara y no se puede sobrescribir, así que el modo de descarga con BOOT+RST siempre está disponible, salvo que se hayan quemado eFuses (Secure Boot o cifrado de flash). El checklist de abajo lo revisa.

## 5b. Primer flash de Hazel Badge OS: qué cambia

Build: `./scripts/build-badge.sh` (ESP-IDF v6.1, Moddable, target `esp32/jsconf_badge`). Los archivos quedan en `build/bin/esp32/jsconf_badge/release/badge-js/`.

| Región | Antes | Después |
|---|---|---|
| `0x0000`–`0x3770` | bootloader de IDF 5.5.5 | bootloader de IDF 6.1 (`bootloader.bin`, 14,192 B, DIO 80 MHz, encabezado de 4 MB) |
| `0x8000`–`0x8C00` | tabla de Arduino de 8 MB (nvs, otadata, app0, app1, spiffs, coredump) | tabla de Moddable: `nvs` 0x9000 24K, `phy_init` 0xF000 4K, `factory` 0x10000 4032K |
| `0x10000`–`0xF4530` | `mictlan_card` + restos del original | Hazel Badge OS (`xs_esp32.bin`, 935,216 B) |
| todo lo demás | sin cambios | sin cambios (los datos viejos de `spiffs`/`coredump` se quedan, ya sin referencia) |

Efecto secundario: el nuevo rango de `nvs` (0x9000–0xF000) se encima con el `nvs` y el `otadata` viejos. Si al iniciar el NVS encuentra datos ajenos, ESP-IDF puede reformatear esos 24K en el primer arranque. No guardan nada que necesite la Fase 1, y el respaldo completo los cubre.

Comando de flash (requiere aprobación explícita; modo de descarga manteniendo BOOT al conectar):

```sh
cd build/bin/esp32/jsconf_badge/release/badge-js
~/esp32-dev/.venv/bin/python -m esptool --chip esp32s3 --port /dev/cu.usbmodem101 \
  --before no-reset --after no-reset write-flash \
  --flash-mode keep --flash-freq keep --flash-size keep \
  0x0 bootloader.bin 0x8000 partition-table.bin 0x10000 xs_esp32.bin
```

Después presiona el botón físico **RST** para arrancar (en esta Mac, el reset por software cae en modo de descarga).

Para deshacerlo: §5 con `~/esp32-dev/backups/badge-2026-10-24-mictlan_card.bin` (estado actual) o con la imagen original de la otra computadora.

## 6. Checklist antes de flashear (todo es obligatorio)

- [x] Respaldo leído dos veces, hashes iguales, `verify-flash` aprobado
- [x] Existe una segunda copia fuera de esta computadora (imagen original en la otra computadora de Hazel)
- [x] Tabla de particiones original documentada (§4)
- [x] Resumen de eFuses guardado: Secure Boot y cifrado de flash **apagados**
- [x] Tabla de particiones nueva, modo/frecuencia/tamaño de flash y offsets anotados (§5b)
- [x] Cambios esperados listados (§5b)
- [x] Procedimiento de recuperación §5 ensayado hasta el paso 4: modo de descarga con BOOT, el chip responde, dos lecturas completas con el mismo hash (2026-10-24)
- [ ] Aprobación escrita y explícita de Hazel para el comando exacto
