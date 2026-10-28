# Arquitectura

**Español** · [English](en/architecture.md)

**Desplegado** el 2026-10-25: stack `MictlanGuardian`, perfil de cuenta `free-tier-Strands`, región **us-east-2**.
URL base `https://rxds32bmjh.execute-api.us-east-2.amazonaws.com/prod/v1/` (stage `prod`). El valor de la API key nunca se guarda en el repo:
`aws apigateway get-api-key --region us-east-2 --api-key 1nzk2at3ob --include-value --query value --output text`

```
┌──────────────── badge (ESP32-S3, Moddable XS) ────────────────┐
│ Apps en TypeScript: tarjeta · menú · Mictlán.js                │
│ src/core (TS puro, compartido con el simulador y el backend)   │
└───────────────┬────────────────────────────────────────────────┘
                │ HTTPS · x-api-key (una por badge) · JSON ≤ 1 KB
                ▼
API Gateway REST  ── usage plan 1 req/s / ráfaga 2 / 200 al día · throttle del stage 5 req/s
                │   validador de peticiones · access logs (solo el id de la key, nunca su valor)
                ▼
Lambda (Node 24, ARM64, 512 MB, 28 s)
  backend/src/handler.ts ── validación con Zod · rutas · logs JSON (solo metadatos)
  backend/src/guardian.ts ─ agente de Strands Harness, bloqueado (ver abajo)
  backend/src/snippet.ts ── ejecuta el código que escribe la IA para verificar su respuesta
                │                                    │
                ▼                                    ▼
Amazon Bedrock (Amazon Nova, maxTokens 300)    DynamoDB (retos pendientes, TTL 30 min)
```

## API (v1)

| Ruta | Petición | Respuesta |
|---|---|---|
| `POST /v1/message` | `{kind: "hint"\|"cheer"\|"final", concept?, questionId?, attempt?, flowers?, petals?, seconds?}` | `{v:1, text ≤140, source: "ai"\|"fallback"}` |
| `POST /v1/challenge` | `{concept, difficulty?: 1–3}` | `{v:1, id, concept, code[≤3×30], question, options[3], hint, source: "ai"\|"bank"}`, **sin la respuesta** |
| `POST /v1/answer` | `{id, choice: 0–2}` | `{v:1, correct, text, remaining}` |

Errores: `{v:1, error, message}` con 400 / 404 / 413 / 503. Todas las peticiones son `.strict()`: los campos desconocidos se rechazan.

## El Guardián sobre Strands Harness

`createHarness()` arma un agente completo de propósito general. Detrás de una API pública, se apaga todo lo que podría actuar o recordar:

| Default del harness | Guardián | Por qué |
|---|---|---|
| herramientas de shell, archivos, web y subagentes | `builtinTools: []` | una inyección de prompt no debe llegar a una shell dentro de la Lambda |
| sesiones en `./.agent/sessions` | `session: false` | no se guarda nada de las jugadoras; el sistema de archivos de Lambda es de solo lectura |
| memoria de largo plazo en `./.agent/memory` | `memory: false` | nada se comparte entre jugadoras |
| skills, todos, contexto del entorno | `skills: false`, `builtinPlugins: []` | ni rutas de la Lambda ni AGENTS.md en los prompts |
| razonamiento + caché de prompts | `BedrockModel` ya construido, `caching: false` | Nova no soporta razonamiento adaptativo; los prompts son muy cortos |
| tareas en segundo plano, manejador de contexto | apagados | un solo turno corto por petición |

Se crea un agente nuevo en cada petición (≈4 ms), así que las conversaciones nunca se mezclan. La salida se restringe con la salida estructurada de Strands (Zod) y luego se revisa otra vez: caracteres que el badge puede dibujar, límites de largo y que las pistas no contengan la respuesta.

Los prompts se arman solo con campos de enums y números ya validados. Ningún texto libre del dispositivo llega al modelo.

## Cómo se verifican los retos que escribe la IA

El modelo propone `code`, `options` y `answer`. El servidor **ejecuta el código** (`node:vm`, contexto nuevo, timeout de 50 ms que también cubre las promesas, y una lista de tokens prohibidos como `process`, `constructor`, `require`, bucles y `new`). El reto solo se acepta cuando la primera línea impresa es igual a la opción marcada. Hay dos intentos y después se usa una pregunta del banco offline, el mismo `src/core/game/questions.ts` que trae el juego. La respuesta se guarda en el servidor y nunca se manda al badge.

Esto es defensa en profundidad, no una frontera de seguridad: el código viene de nuestro propio prompt, no de las usuarias.

## Control de costos

- API key por badge con usage plan: 1 req/s, ráfaga de 2 y 200 peticiones al día.
- Throttle del stage: 5 req/s y ráfaga de 10 para toda la API.
- Límite de concurrencia de Lambda de la cuenta: 10 en esta cuenta free tier. La concurrencia reservada es opcional con el contexto `reservedConcurrency`, pero no se puede usar con un límite de 10.
- Cada llamada con salida estructurada: máximo 3 turnos, 1500 tokens de salida y 9 s. Los retos reintentan una vez y después usan el banco offline.
- `maxTokens: 300` en cada llamada, timeout de 10 s para Bedrock y 2 intentos del SDK.
- Alerta de AWS Budgets al 80% y al 100% de un monto mensual (contextos `budgetEmail` y `monthlyBudgetUsd`).
- Alarma de CloudWatch por errores de la Lambda.

## Offline primero

El badge se puede jugar completo sin red. Las funciones en línea solo suman. Cualquier falla de red, autenticación, throttle o del modelo termina en una frase local o en una pregunta del banco, y nunca se pierde el avance.
