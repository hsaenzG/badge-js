# Architecture

**Deployed** 2026-10-25: stack `MictlanGuardian`, account profile `free-tier-Strands`, region **us-east-2**.
Base URL `https://rxds32bmjh.execute-api.us-east-2.amazonaws.com/prod/v1/` (stage `prod`). The API key value is never stored in the repo:
`aws apigateway get-api-key --region us-east-2 --api-key 1nzk2at3ob --include-value --query value --output text`

```
┌──────────────── badge (ESP32-S3, Moddable XS) ────────────────┐
│ TypeScript apps: card · menu · Mictlán.js                      │
│ src/core (pure TS, shared with the simulator and the backend)  │
└───────────────┬────────────────────────────────────────────────┘
                │ HTTPS · x-api-key (per badge) · JSON ≤ 1 KB
                ▼
API Gateway REST  ── usage plan 1 rps / burst 2 / 200 per day · stage throttle 5 rps
                │   request validator · access logs (key id only, never values)
                ▼
Lambda (Node 24, ARM64, 512 MB, 28 s)
  backend/src/handler.ts ── Zod validation · routing · JSON logs (metadata only)
  backend/src/guardian.ts ─ Strands Harness agent, locked down (see below)
  backend/src/snippet.ts ── runs AI-written code to verify its answer
                │                                    │
                ▼                                    ▼
Amazon Bedrock (Amazon Nova, maxTokens 300)    DynamoDB (pending challenges, TTL 30 min)
```

## API (v1)

| Route | Request | Response |
|---|---|---|
| `POST /v1/message` | `{kind: "hint"\|"cheer"\|"final", concept?, questionId?, attempt?, flowers?, petals?, seconds?}` | `{v:1, text ≤140, source: "ai"\|"fallback"}` |
| `POST /v1/challenge` | `{concept, difficulty?: 1–3}` | `{v:1, id, concept, code[≤3×30], question, options[3], hint, source: "ai"\|"bank"}`, **no answer** |
| `POST /v1/answer` | `{id, choice: 0–2}` | `{v:1, correct, text, remaining}` |

Errors: `{v:1, error, message}` with 400 / 404 / 413 / 503. Every request is `.strict()`: unknown fields are rejected.

## El Guardián on Strands Harness

`createHarness()` gives a full general-purpose agent. Behind a public API, every capability that could act or remember is switched off:

| Harness default | Guardián | Why |
|---|---|---|
| shell, file, web, subagent tools | `builtinTools: []` | prompt injection must not reach a shell in the Lambda |
| sessions in `./.agent/sessions` | `session: false` | no player data persisted; Lambda FS is read-only |
| long-term memory in `./.agent/memory` | `memory: false` | nothing shared between players |
| skills, todos, environment context | `skills: false`, `builtinPlugins: []` | no Lambda paths or AGENTS.md in prompts |
| reasoning + prompt caching | pre-built `BedrockModel`, `caching: false` | Nova does not support adaptive thinking; tiny prompts |
| background tasks, context manager | off | one short turn per request |

A new agent is built per request (≈4 ms), so conversations never mix. Output is constrained with Strands structured output (Zod) and then checked again: badge-renderable characters, length limits, hints must not contain the answer.

Prompts are composed only from validated enum and number fields. No free text from the device reaches the model.

## Verifying AI-written challenges

The model proposes `code`, `options` and `answer`. The server **runs the code** (`node:vm`, fresh context, 50 ms timeout covering promise jobs, denylisted tokens such as `process`, `constructor`, `require`, loops, `new`) and accepts the challenge only when the first printed line equals the marked option. Two attempts, then a question from the offline bank (the same `src/core/game/questions.ts` the game ships). The answer is stored server-side and never sent to the badge.

This is defence in depth, not a security boundary: the code comes from our own prompt, not from users.

## Cost controls

- Per-badge API key with usage plan: 1 rps, burst 2, 200 requests per day.
- Stage throttle: 5 rps, burst 10 for the whole API.
- Account Lambda concurrency limit (10 on this free-tier account; reserved concurrency is optional via context `reservedConcurrency`, impossible at 10).
- Each structured-output call: max 3 turns, 1500 output tokens, 9 s; challenges retry once, then the offline bank.
- `maxTokens: 300` on every call, 10 s Bedrock timeout, 2 SDK attempts.
- AWS Budgets alert at 80% and 100% of a monthly amount (context `budgetEmail`, `monthlyBudgetUsd`).
- CloudWatch alarm on Lambda errors.

## Offline first

The badge plays fully offline. Online features only add to it. Any network, auth, throttle or model failure ends in a local line or a bank question, and progress is never lost.
