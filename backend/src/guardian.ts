/**
 * El Guardián del Código: a Strands Harness agent locked down for a public API.
 *
 * createHarness() ships a general-purpose agent (shell/file/web tools, file sessions,
 * long-term memory, skills, todos, environment context). None of that belongs behind an
 * API a conference badge calls, so every default is switched off: no tools, nothing written
 * to disk, nothing remembered between requests. What remains is the harness's model wiring
 * plus Strands structured output, validated by Zod.
 *
 * Prompts are built only from enum/number fields of validated requests: no free text from
 * the device reaches the model.
 */
import { createHarness } from "@strands-agents/harness";
import { BedrockModel } from "@strands-agents/sdk/models/bedrock";
import type { z } from "zod";
import { BADGE_TEXT, GeneratedChallenge, GuardianLine, fitsBadge, type ChallengeRequest, type MessageRequest } from "./contract";
import { verifyAnswer } from "./snippet";
import { CONCEPT_LABEL, QUESTIONS, type Concept, type Question } from "../../src/core/game/questions";

/** One structured-output call. Injected so tests run without Bedrock. */
export type StructuredInvoke = <S extends z.ZodType>(prompt: string, schema: S) => Promise<z.infer<S>>;

export const SYSTEM_PROMPT = `Eres El Guardián del Código, narrador y mentor del juego Mictlán.js.
Una ranita recorre el Mictlán para convertirse en agente de IA y aprende JavaScript.
Tu voz: cálida, juguetona, alentadora, curiosa, con sabor a cuento mexicano.
Honras el Día de Muertos con respeto: cempasúchil, ofrendas, velas, papel picado, memoria. Nada de terror.
Eres técnicamente exacto. Nunca revelas la respuesta de un reto: das pistas que hacen pensar.
Escribes en español neutro de LATAM, sin emojis, en textos muy cortos porque se leen en un badge pequeño.`;

export interface HarnessOptions {
  modelId: string;
  region: string;
  maxTokens?: number;
  /** Per Bedrock request (stream inactivity). */
  timeoutMs?: number;
  /** Whole structured-output call, all turns included. Two challenge attempts must fit in Lambda's 25 s. */
  callBudgetMs?: number;
}

/** Real invoker: a fresh, locked-down harness agent per call. */
export function harnessInvoker(opts: HarnessOptions): StructuredInvoke {
  const model = new BedrockModel({
    modelId: opts.modelId,
    region: opts.region,
    maxTokens: opts.maxTokens ?? 300, // ALWAYS explicit: unset reserves the model maximum
    temperature: 0.7,
    requestTimeout: opts.timeoutMs ?? 10_000,
    clientConfig: { maxAttempts: 2 },
  });
  return async (prompt, schema) => {
    const agent = await createHarness({
      model, // a Model instance: harness does not force reasoning or caching on it (Nova lacks both)
      systemPrompt: SYSTEM_PROMPT,
      caching: false,
      builtinTools: [], // no shell, file, web, subagent, programmatic tool caller
      builtinPlugins: [], // no todos, no environment (it would inject Lambda paths/AGENTS.md)
      session: false, // nothing persisted to ./.agent/sessions
      memory: false, // no long-term memory across players
      skills: false,
      backgroundTasks: false,
      contextManager: false, // single short turn
      printer: false,
    });
    // Strands re-asks the model when its structured output fails schema validation, with no
    // limit of its own. A strict schema + a small model can loop forever (seen live with Nova
    // Lite on challenges), so every call gets a turn cap, a token cap and a wall-clock cap.
    const result = await agent.invoke(prompt, {
      structuredOutputSchema: schema,
      limits: CALL_LIMITS,
      cancelSignal: AbortSignal.timeout(opts.callBudgetMs ?? 9_000),
    });
    if (result.structuredOutput === undefined) throw new Error(`no structured output (${result.stopReason})`);
    return result.structuredOutput as z.infer<typeof schema>;
  };
}

/** Per-call caps: 1 answer + up to 2 schema corrections; output tokens across all of them. */
export const CALL_LIMITS = { turns: 3, outputTokens: 1500 } as const;

// ------------------------------------------------------------------ messages

const FALLBACK: Readonly<Record<MessageRequest["kind"], readonly string[]>> = {
  hint: [
    "Lee el código línea por línea, como quien sigue las velas del camino.",
    "Fíjate qué valor llega a console.log. Ahí está tu respuesta.",
  ],
  cheer: [
    "¡Excelente! Has iluminado otra flor del camino.",
    "Cada flor encendida acerca a la ranita a la ofrenda.",
  ],
  final: [
    "El agente despierta. Las cuatro flores brillan en tu ofrenda de código.",
    "Has cruzado el Mictlán. Siguiente reto: crea una herramienta con Lambda.",
  ],
};

export function fallbackLine(kind: MessageRequest["kind"], salt: number): string {
  const lines = FALLBACK[kind];
  return lines[Math.abs(salt) % lines.length]!;
}

function bankQuestion(id: string | undefined): Question | undefined {
  if (!id) return undefined;
  for (const pair of Object.values(QUESTIONS)) for (const q of pair) if (q.id === id) return q;
  return undefined;
}

export function messagePrompt(req: MessageRequest): string {
  const concept = req.concept ? CONCEPT_LABEL[req.concept as Concept] : undefined;
  switch (req.kind) {
    case "hint": {
      const q = bankQuestion(req.questionId);
      const about = q
        ? `El reto es este código:\n${q.code.join("\n")}\nPregunta: ${q.question}\nOpciones: ${q.options.join(" | ")}`
        : `El reto trata sobre ${concept ?? "JavaScript"}.`;
      return `${about}\nLa jugadora lleva ${req.attempt ?? 0} intentos fallidos. Escribe UNA pista breve que la acerque sin decir cuál opción es correcta ni el valor impreso.`;
    }
    case "cheer":
      return `La ranita acaba de resolver un reto de ${concept ?? "JavaScript"} y lleva ${req.flowers ?? 1} de 4 flores. Celébralo en una frase.`;
    case "final":
      return `La ranita completó el Mictlán: 4 de 4 flores, ${req.petals ?? 0} pétalos, ${req.seconds ?? 0} segundos. Escribe una felicitación final y propón un mini reto real para seguir aprendiendo con AWS, por ejemplo con Lambda.`;
  }
}

/** Never reveal the answer: reject any hint that contains the correct option's text. */
export function leaksAnswer(text: string, q: { readonly options: readonly string[]; readonly answer: number } | undefined): boolean {
  if (!q) return false;
  const answer = q.options[q.answer]!.replace(/^"|"$/g, "").toLowerCase();
  return answer.length > 0 && new RegExp(`(^|[^a-z0-9])${answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(text.toLowerCase());
}

export async function writeLine(invoke: StructuredInvoke, req: MessageRequest, salt: number): Promise<{ text: string; source: "ai" | "fallback"; reason?: string }> {
  try {
    const out = await invoke(messagePrompt(req), GuardianLine);
    const text = out.text.trim();
    if (!BADGE_TEXT.test(text) || text.length === 0 || text.length > 140) throw new Error("invalid text");
    if (req.kind === "hint" && leaksAnswer(text, bankQuestion(req.questionId))) throw new Error("hint leaked the answer");
    return { text, source: "ai" };
  } catch (e) {
    // short, no stack: logged as metadata only
    return { text: fallbackLine(req.kind, salt), source: "fallback", reason: (e instanceof Error ? e.name + ": " + e.message : "error").slice(0, 120) };
  }
}

// ------------------------------------------------------------------ challenges

const DIFFICULTY = ["", "muy fácil, para alguien que empieza", "fácil", "intermedio, con un pequeño truco"] as const;

/** One worked example per concept: small models copy a shape far better than they follow rules. */
const EXAMPLE: Readonly<Record<Concept, string>> = {
  variables: `{"code":["let n = 2;","n = n * 3;","console.log(n);"],"question":"¿Qué se imprime?","options":["2","6","5"],"answer":1,"hint":"n cambia en la segunda línea.","explain":"n vale 2 y luego 2 * 3: imprime 6."}`,
  functions: `{"code":["const add = (a, b) => a + b;","console.log(add(2, 3));"],"question":"¿Qué se imprime?","options":["23","5","undefined"],"answer":1,"hint":"La flecha devuelve a + b con números.","explain":"2 + 3 es 5."}`,
  promises: `{"code":["Promise.resolve(4)","  .then(n => n + 1)","  .then(console.log);"],"question":"¿Qué se imprime?","options":["4","5","undefined"],"answer":1,"hint":"Cada then recibe lo que devolvió el anterior.","explain":"4 pasa a 5 y se imprime 5."}`,
  objects: `{"code":["const r = { ojos: 2 };","r.ojos = r.ojos + 1;","console.log(r.ojos);"],"question":"¿Qué se imprime?","options":["2","3","undefined"],"answer":1,"hint":"La segunda línea cambia la propiedad.","explain":"ojos pasa de 2 a 3."}`,
};

export function challengePrompt(req: ChallengeRequest): string {
  const concept = req.concept as Concept;
  return `Crea UN reto NUEVO de JavaScript solo sobre ${CONCEPT_LABEL[concept]}, nivel ${DIFFICULTY[req.difficulty]}.
Ejemplo del formato exacto (no lo copies, inventa otro):
${EXAMPLE[concept]}
Reglas:
- 1 a 3 líneas muy cortas, menos de 26 caracteres cada una. Usa nombres de una letra.
- Solo un concepto. Sin bucles, clases, new, async/await, this, corchetes con texto ni comillas invertidas.
- Strings con comillas dobles. Las opciones escriben los strings entre comillas dobles, como "hola"; números y undefined sin comillas.
- Tres opciones distintas de menos de 12 caracteres.
- "answer" es el índice de lo que imprime PRIMERO el código.
- La pista ayuda sin revelar la respuesta: no escribe el resultado ni hace la cuenta por la jugadora.`;
}

export interface FullChallenge {
  concept: ChallengeRequest["concept"];
  code: string[];
  question: string;
  options: [string, string, string];
  answer: 0 | 1 | 2;
  hint: string;
  explain: string;
  source: "ai" | "bank";
}

/**
 * Ask the model for a challenge and accept it only if running the code proves the
 * marked answer. Two attempts, then a question from the offline bank.
 */
export async function generateChallenge(invoke: StructuredInvoke, req: ChallengeRequest, salt: number): Promise<{ challenge: FullChallenge; rejected: string[] }> {
  const rejected: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const c = await invoke(challengePrompt(req), GeneratedChallenge);
      const tooBig = fitsBadge(c);
      if (tooBig) {
        rejected.push(tooBig);
        continue;
      }
      if (leaksAnswer(c.hint, c)) {
        rejected.push("hint leaked the answer");
        continue;
      }
      const check = verifyAnswer(c.code, c.options, c.answer);
      if (!check.ok) {
        rejected.push(check.reason);
        continue;
      }
      if (!check.verified) {
        rejected.push("answer mismatch");
        continue;
      }
      return {
        challenge: {
          concept: req.concept,
          code: c.code,
          question: c.question,
          options: c.options as [string, string, string],
          answer: c.answer as 0 | 1 | 2,
          hint: c.hint,
          explain: c.explain,
          source: "ai",
        },
        rejected,
      };
    } catch (e) {
      rejected.push(e instanceof Error ? e.message.slice(0, 60) : "error");
    }
  }
  const q = QUESTIONS[req.concept as Concept][Math.abs(salt) % 2]!;
  return {
    challenge: {
      concept: req.concept,
      code: [...q.code],
      question: q.question,
      options: [...q.options],
      answer: q.answer,
      hint: q.hint,
      explain: q.explain,
      source: "bank",
    },
    rejected,
  };
}
