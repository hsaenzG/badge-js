/**
 * Badge ⇄ Guardián API contract (v1). Every request and response is validated here.
 * Limits match what the badge can show on its 428×142 screen (see src/core/game/render.ts).
 */
import { z } from "zod";

export const CONCEPTS = ["variables", "functions", "promises", "objects"] as const;
export const Concept = z.enum(CONCEPTS);

/** Characters the badge font renders: printable ASCII, Spanish Latin-1, a few symbols. */
export const BADGE_TEXT = /^[\x20-\x7E¡¿áéíóúÁÉÍÓÚñÑüÜ·→←▲▼]*$/;

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

/** Structured output for /v1/challenge. The server verifies `answer` by running `code`. */
export const GeneratedChallenge = z
  .object({
    code: z
      .array(z.string().min(1).max(30).regex(BADGE_TEXT))
      .min(1)
      .max(3)
      .describe("1 a 3 líneas de JavaScript, máximo 30 caracteres cada una. Debe imprimir con console.log."),
    question: text(34).describe("La pregunta, máximo 34 caracteres. Normalmente: ¿Qué se imprime?"),
    options: z
      .array(z.string().min(1).max(12).regex(BADGE_TEXT))
      .length(3)
      .describe('Tres opciones distintas, máximo 12 caracteres. Strings entre comillas dobles, como "hola".'),
    answer: z.number().int().min(0).max(2).describe("Índice de la opción correcta (0, 1 o 2)"),
    hint: text(68).describe("Una pista que ayuda sin revelar la respuesta. Máximo 68 caracteres."),
    explain: text(100).describe("Explicación breve de la respuesta correcta. Máximo 100 caracteres."),
  })
  .describe("Un reto corto de JavaScript para el juego Mictlán.js");
export type GeneratedChallenge = z.infer<typeof GeneratedChallenge>;

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
