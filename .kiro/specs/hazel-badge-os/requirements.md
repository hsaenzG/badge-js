# Requerimientos: Hazel Badge OS

**Español** · [English](en/requirements.md)

Objetivo: badge de JSConf México 2026 de Electronic Cats (ESP32-S3-WROOM-1, 8 MB de flash). Datos e incógnitas del hardware: `docs/hardware.md`.

Formato: historia de usuaria + criterios de aceptación en estilo EARS (CUANDO / SI / EL SISTEMA DEBE).

---

## R0. Seguridad y descubrimiento del hardware (requisito previo para todo lo demás)

**Historia:** Como dueña del badge, quiero mi firmware original protegido y el hardware verificado, para que ningún experimento pueda dejar el badge inservible ni perder el firmware de JSConf.

1. EL proyecto NO DEBE correr `erase-flash`, `write-flash`, `idf.py flash` ni nada equivalente sin la aprobación explícita de la dueña para ese comando.
2. EL proyecto DEBE guardar los dumps de la flash fuera del repositorio de Git y DEBE ignorar los dumps `*.bin` en `.gitignore`.
3. EL proyecto NO DEBE subir dumps de la flash, contenido del NVS ni identificadores del dispositivo a servicios externos.
4. ANTES del primer flash, EL proyecto DEBE tener un respaldo completo leído dos veces con el mismo SHA-256, un `verify-flash` aprobado, la tabla de particiones documentada, un resumen de eFuses que muestre Secure Boot y cifrado de flash apagados, y un procedimiento de recuperación ensayado.
5. EL firmware NO DEBE contener números de pin, configuración del controlador de pantalla ni conexiones de botones, salvo que `docs/hardware.md` los marque como `VERIFIED`.
6. EL reporte de descubrimiento DEBE etiquetar cada dato de hardware como VERIFIED, OBSERVED, HYPOTHESIS o UNKNOWN.

## R1. Soporte de la placa y drivers

1. EL sistema DEBE concentrar en un solo lugar todos los números de GPIO, los hosts de bus y los parámetros del panel: el manifest del host del badge (`hosts/badge/`).
2. CUANDO la placa arranca, EL sistema DEBE mantener inactivo el CS del módulo LoRa (si comparte bus con la pantalla) y dejar el radio sin actividad.
3. EL driver de pantalla DEBE exponer una interfaz independiente del hardware (`width`, `height`, `flush(rect, pixels)`), para que el código de la interfaz nunca llame al panel directamente.
4. EL sistema DEBE controlar el backlight a través del BSP una vez verificado el pin del backlight.

## R2. Fase 1: tarjeta de presentación animada

**Historia:** Como Hazel, quiero que mi badge arranque con una intro de tecleo estilo terminal y luego muestre mi tarjeta, para que en los eventos la gente vea de inmediato quién soy y dónde encontrarme.

### Arranque e intro
1. CUANDO se enciende, EL sistema DEBE mostrar el primer cuadro visible rápido (objetivo ≤ 1.5 s desde el reset, por medir en el hardware).
2. EL sistema NO DEBE inicializar Wi-Fi, BLE ni LoRa durante el arranque de la Fase 1.
3. LA intro DEBE teclear, carácter por carácter y con cursor parpadeante:
   - `>_ LATAM Developer Advocate @ AWS`
   - `>_ Serverless + GenAI + Comunidad`
   - `>_ Empoderando builders en LATAM`
4. DESPUÉS, EL sistema DEBE mostrar:
   - `>_ whoami`
   - `Hazel Sáenz`
   - `Developer Advocate @ AWS`
   - `SERVERLESS · GENAI · LATAM`
5. CUANDO se presiona cualquier botón durante la intro, EL sistema DEBE saltar al final de la intro.
6. SI una línea es más ancha que la pantalla, EL sistema DEBE partirla, desplazarla o abreviarla sin cortar caracteres a la mitad. Se decide por pantalla una vez conocida la resolución.

### Lenguaje visual
7. LA interfaz DEBE usar fondo `#0D0D0D`, acento `#F5E000` y texto secundario blanco y gris.
8. LA interfaz DEBE usar una fuente monoespaciada (JetBrains Mono rasterizada, o una fuente bitmap monoespaciada equivalente con licencia compatible).
9. LA fuente DEBE incluir los caracteres que necesita el contenido: como mínimo `á é í ó ú ñ Á É Í Ó Ú Ñ ü ¿ ¡ ·`.
10. Las animaciones DEBEN correr a un ritmo estable, sin cortes visibles más allá de lo que permite físicamente el panel (objetivo ≥ 30 FPS para el tecleo con actualización parcial, medido en el hardware).

### Contenido de la tarjeta y navegación
11. EL menú principal DEBE ofrecer al menos: **Tarjeta**, **Links**, **QR** (si es posible), **Frog Quest** (Fase 2) y **About**.
12. LA tarjeta DEBE mostrar el nombre `Hazel Sáenz`, el rol `LATAM Developer Advocate @ AWS` y las especialidades (Serverless, Generative AI, Amazon Bedrock, Developer Communities).
13. LA pantalla de Links DEBE mostrar `hazelsaenz.tech`, `github.com/hsaenzG` y `linkedin.com/in/hazelsaenz`.
14. SI la pantalla tiene al menos ~64 px de alto útil para módulos de ≥ 2 px, EL sistema DEBE dibujar un código QR (versión ≤ 3) de `https://hazelsaenz.tech`. SI NO, la pantalla de QR DEBE omitirse. La decisión se anota en `design.md` cuando se conozca la resolución.
15. Botones: UP = elemento anterior, DOWN = elemento siguiente, SELECT = abrir/confirmar, BACK = regresar. BACK en el menú raíz NO DEBE hacer nada dañino (se queda o repite la intro).
16. LA capa de entrada DEBE aplicar antirrebote a cada botón (objetivo 20–30 ms) y DEBE emitir los eventos `PRESS`, `RELEASE`, `LONG_PRESS` (~600 ms) y `REPEAT` (cada ~120 ms después de la pulsación larga).
17. CUANDO se mantiene UP/DOWN, EL menú DEBE repetir automáticamente. CUANDO se mantiene SELECT/BACK, EL sistema NO DEBE repetir la acción.
18. EL elemento seleccionado DEBE distinguirse a la vista (color de acento y/o barra), nunca solo por el color.

### Restricciones de ingeniería
19. LOS ciclos de animación y dibujo NO DEBEN crear objetos, arreglos ni strings en cada cuadro. Todo lo que necesitan se construye al entrar a la pantalla y se reutiliza.
20. LA lógica de animación, navegación y acomodo de texto DEBE ser TypeScript puro y DEBE pasar pruebas unitarias en Node (Vitest) sin el badge.
21. TODA la Fase 1 DEBE funcionar sin red.

### Pantalla de GitHub
22. EL menú DEBE incluir una pantalla **GitHub** que recree offline el estilo del README del perfil hsaenzG: el usuario `@hsaenzG`, las líneas de tecleo y la fila de especialidades, con la misma paleta. Los datos del perfil se incluyen al compilar; nada se descarga mientras corre.

### Lenguaje
23. EL código de la aplicación (pantallas, animación, navegación, lógica de entrada, juego) DEBE estar escrito en TypeScript y correr en el motor de JavaScript del badge. Solo se permite C nativo para drivers o código con tiempos críticos que JS no pueda manejar, y cada caso DEBE documentarse en `design.md`.

**Aceptación de la Fase 1:** el badge arranca con la intro, muestra la tarjeta y los cuatro botones se comportan como se especifica, en el hardware real.

## R3. Fase 2: Mictlán.js

> Decidido el 2026-10-24: la Fase 2 es **Mictlán.js** tal como se describe en `game.md` (auto-runner de Día de Muertos, cuatro flores de cempasúchil = Variables, Functions, Promises y Objects, cada una con un reto de JS, y un final en la ofrenda). Los requerimientos detallados del juego tendrán su propia sección cuando empiece la Fase 2.

1. EL juego DEBE abrirse desde el menú principal y DEBE poder jugarse solo con UP, DOWN, SELECT y BACK.
2. Como no hay IZQUIERDA/DERECHA, EL juego DEBE ser un auto-runner: UP = saltar, DOWN = agacharse, SELECT = empezar/confirmar, BACK = pausa.
3. EL juego DEBE tener un nivel corto, cuatro coleccionables, una meta y pantallas de victoria y de reintento.
4. LA lógica del juego (máquina de estados, física, colisiones) DEBE ser determinista con un paso de tiempo fijo y DEBE poder probarse en la computadora.
5. EL juego NO DEBE requerir Wi-Fi.
6. LA rana DEBE ser un personaje original en pixel art, salvo que se confirme por escrito el permiso de uso de la marca Strands (no encontré lineamientos oficiales al 2026-10-24).

## R4. Fase 3: integración con IA (opcional)

1. EL badge DEBE seguir funcionando completo cuando el backend o el Wi-Fi no estén disponibles, usando mensajes locales.
2. EL badge NO DEBE contener credenciales de AWS.
3. EL badge DEBE llamar al backend solo por HTTPS, validando el certificado del servidor.
4. EL backend DEBE usar API Gateway → Lambda (Node.js, TypeScript) → SDK de Strands Agents para TypeScript → Amazon Bedrock, desplegado con AWS CDK en TypeScript.
5. EL backend DEBE aplicar autenticación por dispositivo, validación del esquema de las peticiones, throttling y cuota diaria, un tamaño máximo de salida, timeouts y concurrencia reservada en Lambda, y una alarma de AWS Budgets.
6. EL backend DEBE devolver JSON compacto (objetivo ≤ 512 bytes) que el firmware valida antes de dibujarlo (límites de largo y caracteres permitidos).
7. EL backend NO DEBE registrar en logs secretos, tokens de dispositivo ni datos personales.
8. LAS credenciales de Wi-Fi y el token del dispositivo DEBEN grabarse en tiempo de ejecución (guardados en el NVS), nunca compilarse en la imagen del firmware ni subirse al repo.

## R5. Documentación y forma de trabajo

1. EL repo DEBE contener esta spec (`requirements.md`, `design.md`, `tasks.md`), los archivos de steering, `README.md`, `docs/hardware.md` y `docs/backup-and-recovery.md`.
2. EL trabajo DEBE avanzar por milestones; cada milestone termina con un paso de verificación y un commit.
3. LA documentación DEBE estar en español como versión principal, con una versión en inglés al lado (`README.en.md`, `docs/en/`, `backend/README.en.md`, `.kiro/specs/hazel-badge-os/en/`).
