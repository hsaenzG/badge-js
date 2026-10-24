/**
 * Offline JavaScript challenge bank. One flower per concept, two variants each
 * (the second is used on replays). The badge only DISPLAYS code; the test suite
 * executes every snippet in Node to prove the marked answer is what JS prints.
 */

export type Concept = "variables" | "functions" | "promises" | "objects";

export interface Question {
  readonly id: string;
  readonly concept: Concept;
  /** Guardián line when the flower opens. */
  readonly intro: string;
  /** 1–3 lines, ≤ 30 chars each (fits the code panel). */
  readonly code: readonly string[];
  readonly question: string;
  /** Exactly 3 options, ≤ 12 chars each. */
  readonly options: readonly [string, string, string];
  readonly answer: 0 | 1 | 2;
  readonly hint: string;
  readonly explain: string;
}

export const CONCEPT_LABEL: Readonly<Record<Concept, string>> = {
  variables: "Variables",
  functions: "Functions",
  promises: "Promises",
  objects: "Objects",
};

export const FLOWER_ORDER: readonly Concept[] = ["variables", "functions", "promises", "objects"];

export const QUESTIONS: Readonly<Record<Concept, readonly [Question, Question]>> = {
  variables: [
    {
      id: "var-1",
      concept: "variables",
      intro: "Esta flor guarda un valor que cambia. ¿Lo sigues?",
      code: ["let x = 5;", "x += 2;", "console.log(x);"],
      question: "¿Qué se imprime?",
      options: ["5", "7", "undefined"],
      answer: 1,
      hint: "x += 2 es lo mismo que x = x + 2.",
      explain: "x empieza en 5 y suma 2: imprime 7.",
    },
    {
      id: "var-2",
      concept: "variables",
      intro: "Dos nombres, un mismo valor. Mira con calma.",
      code: ["let a = 1;", "let b = a;", "a = 3; console.log(b);"],
      question: "¿Qué se imprime?",
      options: ["1", "3", "undefined"],
      answer: 0,
      hint: "b copió el número cuando a valía 1.",
      explain: "Los números se copian por valor: b sigue en 1.",
    },
  ],
  functions: [
    {
      id: "fn-1",
      concept: "functions",
      intro: "Una función es un hechizo que transforma. ¿Qué devuelve?",
      code: ["const double = n => n * 2;", "console.log(double(4));"],
      question: "¿Qué se imprime?",
      options: ["4", "8", "16"],
      answer: 1,
      hint: "La flecha devuelve n * 2 sin escribir return.",
      explain: "double(4) devuelve 4 * 2: imprime 8.",
    },
    {
      id: "fn-2",
      concept: "functions",
      intro: "Esta función olvidó algo importante...",
      code: ["function f(n) { n + 1; }", "console.log(f(1));"],
      question: "¿Qué se imprime?",
      options: ["2", "1", "undefined"],
      answer: 2,
      hint: "Busca la palabra return. ¿Está ahí?",
      explain: "Sin return, una función devuelve undefined.",
    },
  ],
  promises: [
    {
      id: "pr-1",
      concept: "promises",
      intro: "Una promesa espera su destino. ¿Qué imprimirá este código?",
      code: ['Promise.resolve("listo")', "  .then(console.log);"],
      question: "¿Qué se imprime?",
      options: ['"listo"', "undefined", "Error"],
      answer: 0,
      hint: "Observa qué valor entrega Promise.resolve().",
      explain: 'then recibe el valor resuelto: imprime "listo".',
    },
    {
      id: "pr-2",
      concept: "promises",
      intro: "El tiempo en el Mictlán no corre igual. ¿Quién habla primero?",
      code: ['Promise.resolve().then(', '  () => console.log("b"));', 'console.log("a");'],
      question: "¿Qué se imprime primero?",
      options: ['"a"', '"b"', "nada"],
      answer: 0,
      hint: "then espera a que termine el código síncrono.",
      explain: 'El código síncrono va primero: "a" y luego "b".',
    },
  ],
  objects: [
    {
      id: "obj-1",
      concept: "objects",
      intro: "Un objeto guarda nombres y valores, como una ofrenda.",
      code: ['const frog = { name: "Kiro" };', "console.log(frog.name);"],
      question: "¿Qué se imprime?",
      options: ['"frog"', '"Kiro"', "undefined"],
      answer: 1,
      hint: "frog.name lee la propiedad name del objeto.",
      explain: 'La propiedad name vale "Kiro".',
    },
    {
      id: "obj-2",
      concept: "objects",
      intro: "No todo lo que buscas está en la ofrenda.",
      code: ["const flor = { color: 1 };", "console.log(flor.olor);"],
      question: "¿Qué se imprime?",
      options: ["1", "null", "undefined"],
      answer: 2,
      hint: "¿Existe la propiedad olor en el objeto?",
      explain: "Leer una propiedad que no existe da undefined.",
    },
  ],
};

export function questionFor(flower: number, playIndex: number): Question {
  const concept = FLOWER_ORDER[flower];
  if (!concept) throw new RangeError(`flower ${flower}`);
  return QUESTIONS[concept][playIndex % 2]!;
}
