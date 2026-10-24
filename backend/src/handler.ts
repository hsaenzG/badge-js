/**
 * Lambda entry point behind API Gateway (REST, API key + usage plan).
 *
 *   POST /v1/message    → a Guardián line (hint, cheer, final)
 *   POST /v1/challenge  → a verified challenge WITHOUT its answer
 *   POST /v1/answer     → server-side check of the player's choice
 *
 * Logs are one JSON line per request: route, status, latency, source. Never the body,
 * never the API key, never model output.
 */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { z } from "zod";
import {
  AnswerRequest,
  ChallengeRequest,
  MAX_BODY_BYTES,
  MessageRequest,
  type AnswerResponse,
  type ChallengeResponse,
  type ErrorResponse,
  type MessageResponse,
} from "./contract";
import { generateChallenge, harnessInvoker, writeLine, type StructuredInvoke } from "./guardian";
import { DynamoChallengeStore, MAX_TRIES, TTL_SECONDS, newChallengeId, type ChallengeStore } from "./store";

export interface Deps {
  invoke: StructuredInvoke;
  store: ChallengeStore;
  now: () => number; // epoch ms
  log: (line: Record<string, unknown>) => void;
}

const json = (status: number, body: unknown): APIGatewayProxyResult => ({
  statusCode: status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  body: JSON.stringify(body),
});
const fail = (status: number, error: ErrorResponse["error"], message: string) =>
  json(status, { v: 1, error, message } satisfies ErrorResponse);

function parse<S extends z.ZodType>(event: APIGatewayProxyEvent, schema: S): { ok: true; data: z.infer<S> } | { ok: false; res: APIGatewayProxyResult } {
  const raw = event.body ?? "";
  const body = event.isBase64Encoded ? Buffer.from(raw, "base64").toString("utf8") : raw;
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) return { ok: false, res: fail(413, "too_large", "body too large") };
  let value: unknown;
  try {
    value = JSON.parse(body || "{}");
  } catch {
    return { ok: false, res: fail(400, "bad_request", "invalid JSON") };
  }
  const r = schema.safeParse(value);
  if (!r.success) {
    const first = r.error.issues[0];
    return { ok: false, res: fail(400, "bad_request", `${first?.path.join(".") || "body"}: ${first?.message ?? "invalid"}`) };
  }
  return { ok: true, data: r.data };
}

export function makeHandler(deps: Deps) {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const t0 = deps.now();
    const route = `${event.httpMethod} ${event.resource ?? event.path}`;
    const salt = Math.floor(t0 / 1000);
    const meta: Record<string, unknown> = {};
    let res: APIGatewayProxyResult;
    try {
      res = await route_(route, event, deps, salt, meta);
    } catch {
      res = fail(503, "unavailable", "try again later");
      meta.error = "unhandled";
    }
    deps.log({ route, status: res.statusCode, ms: deps.now() - t0, requestId: event.requestContext?.requestId, ...meta });
    return res;
  };
}

async function route_(route: string, event: APIGatewayProxyEvent, deps: Deps, salt: number, meta: Record<string, unknown>): Promise<APIGatewayProxyResult> {
  switch (route) {
    case "POST /v1/message": {
      const p = parse(event, MessageRequest);
      if (!p.ok) return p.res;
      const line = await writeLine(deps.invoke, p.data, salt);
      meta.kind = p.data.kind;
      meta.source = line.source;
      if (line.reason) meta.fallbackReason = line.reason;
      return json(200, { v: 1, text: line.text, source: line.source } satisfies MessageResponse);
    }
    case "POST /v1/challenge": {
      const p = parse(event, ChallengeRequest);
      if (!p.ok) return p.res;
      const { challenge: c, rejected } = await generateChallenge(deps.invoke, p.data, salt);
      const id = newChallengeId();
      await deps.store.put({ id, answer: c.answer, hint: c.hint, explain: c.explain, tries: 0, ttl: Math.floor(deps.now() / 1000) + TTL_SECONDS });
      meta.concept = c.concept;
      meta.source = c.source;
      if (rejected.length) meta.rejected = rejected;
      const out: ChallengeResponse = { v: 1, id, concept: c.concept, code: c.code, question: c.question, options: c.options, hint: c.hint, source: c.source };
      return json(200, out);
    }
    case "POST /v1/answer": {
      const p = parse(event, AnswerRequest);
      if (!p.ok) return p.res;
      const rec = await deps.store.get(p.data.id);
      if (!rec || rec.tries >= MAX_TRIES) return fail(404, "not_found", "challenge expired");
      const tries = await deps.store.addTry(rec.id);
      if (tries === undefined) return fail(404, "not_found", "challenge expired");
      const correct = p.data.choice === rec.answer;
      const remaining = correct ? 0 : Math.max(0, MAX_TRIES - tries);
      if (correct || remaining === 0) await deps.store.delete(rec.id);
      meta.correct = correct;
      const out: AnswerResponse = { v: 1, correct, text: correct ? rec.explain : rec.hint, remaining };
      return json(200, out);
    }
    default:
      return fail(404, "not_found", "unknown route");
  }
}

// ------------------------------------------------------------------ Lambda wiring

let cached: ReturnType<typeof makeHandler> | undefined;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  cached ??= makeHandler({
    invoke: harnessInvoker({
      modelId: required("MODEL_ID"),
      region: process.env.AWS_REGION ?? "us-east-1",
      maxTokens: Number(process.env.MAX_TOKENS ?? 300),
      timeoutMs: 10_000,
    }),
    store: new DynamoChallengeStore(required("TABLE_NAME")),
    now: () => Date.now(),
    log: (line) => console.log(JSON.stringify(line)),
  });
  return cached(event);
};

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}
