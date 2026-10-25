/**
 * Badge ⇄ Guardián API contract (v1). Every request and response is validated here.
 * Limits match what the badge can show on its 428×142 screen (see src/core/game/render.ts).
 */
import { z } from "zod";
import { BADGE_TEXT } from "../../src/core/badgeText";

export { BADGE_TEXT };

export const CONCEPTS = ["variables", "functions", "promises", "objects"] as const;
export const Concept = z.enum(CONCEPTS);

const text = (max: number) => z.string().min(1).max(max).regex(BADGE_TEXT, "unsupported characters");

// ---------------------------------------------------------------- requests

export const MessageRequest = z
  .object({
    kind: z.enum(["hint", "cheer", "final"]),
    concept: Concept.optional(),
    /** A question from the offline bank (e.g. "pr-1"): hints are written about it. */
    questionId: z.string().regex(/^[a-z]{2,3}-[0-9]$/).optional(),
    attempt: z.number().int().min(0).max(9).optional(),
    flowers: z.number().int().min(0).max(4).optional(),
    petals: z.number().int().min(0).max(999).optional(),
    seconds: z.number().int().min(0).max(3600).optional(),
  })
  .strict();
export type MessageRequest = z.infer<typeof MessageRequest>;

export const ChallengeRequest = z
  .object({
    concept: Concept,
    difficulty: z.number().int().min(1).max(3).default(1),
  })
  .strict();
export type ChallengeRequest = z.infer<typeof ChallengeRequest>;

export const AnswerRequest = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
    choice: z.number().int().min(0).max(2),
  })
  .strict();
export type AnswerRequest = z.infer<typeof AnswerRequest>;

// ---------------------------------------------------------------- what the model must produce

/** Structured output for /v1/message. */
export const GuardianLine = z
  .object({
    text: text(140).describe("Una o dos frases en español, cálidas y breves. Máximo 140 caracteres. Sin emojis."),
  })
  .describe("Lo que dice El Guardián del Código en la pantalla del badge");

/**
 * Structured output for /v1/challenge, as the MODEL sees it: deliberately looser than the
 * badge limits. A schema the model keeps failing makes Strands re-ask it turn after turn
 * (seen live with Nova Lite and 30-char lines). The exact badge limits are enforced
 * afterwards by `fitsBadge()`, which rejects with a clear reason instead of looping.
 */
export const GeneratedChallenge = z
  .object({
    code: z
      .array(z.string().min(1).max(60))
      .min(1)
      .max(4)
      .describe("1 a 3 líneas MUY cortas de JavaScript (ideal: menos de 26 caracteres cada una). Debe imprimir con console.log."),
    question: z.string().min(1).max(60).describe("La pregunta, corta. Normalmente: ¿Qué se imprime?"),
    options: z
      .array(z.string().min(1).max(30))
      .length(3)
      .describe('Exactamente tres opciones distintas y cortas. Strings entre comillas dobles, como "hola".'),
    answer: z.number().int().min(0).max(2).describe("Índice de la opción correcta (0, 1 o 2)"),
    hint: z.string().min(1).max(120).describe("Una pista breve que ayuda sin revelar la respuesta."),
    explain: z.string().min(1).max(160).describe("Explicación breve de la respuesta correcta."),
  })
  .describe("Un reto corto de JavaScript para el juego Mictlán.js");
export type GeneratedChallenge = z.infer<typeof GeneratedChallenge>;

/** Exact limits of the badge challenge screen (see src/core/game/render.ts). */
export const BADGE_LIMITS = { codeLines: 3, codeChars: 30, question: 34, option: 12, hint: 68, explain: 100 } as const;

/** null when the challenge fits the badge, otherwise the first reason it does not. */
export function fitsBadge(c: GeneratedChallenge): string | null {
  const L = BADGE_LIMITS;
  const len = (s: string) => Array.from(s).length;
  if (c.code.length > L.codeLines) return "too many code lines";
  for (const line of c.code) if (len(line) > L.codeChars) return "code line too long";
  if (len(c.question) > L.question) return "question too long";
  for (const o of c.options) if (len(o) > L.option) return "option too long";
  if (len(c.hint) > L.hint) return "hint too long";
  if (len(c.explain) > L.explain) return "explain too long";
  for (const s of [...c.code, c.question, ...c.options, c.hint, c.explain]) if (!BADGE_TEXT.test(s)) return "unsupported characters";
  return null;
}

// ---------------------------------------------------------------- responses

export interface MessageResponse {
  v: 1;
  text: string;
  /** "ai" when the model wrote it, "fallback" when the server used a canned line. */
  source: "ai" | "fallback";
}

/** A challenge as the badge sees it: no answer, no explanation. */
export interface ChallengeResponse {
  v: 1;
  id: string;
  concept: z.infer<typeof Concept>;
  code: string[];
  question: string;
  options: [string, string, string];
  hint: string;
  source: "ai" | "bank";
}

export interface AnswerResponse {
  v: 1;
  correct: boolean;
  /** Explanation after a correct answer; a hint after a wrong one. */
  text: string;
  /** Tries left on this challenge (0 means it was closed). */
  remaining: number;
}

export interface ErrorResponse {
  v: 1;
  error: "bad_request" | "not_found" | "too_large" | "unavailable";
  message: string;
}

/** Max request body the API accepts (bytes). */
export const MAX_BODY_BYTES = 1024;
