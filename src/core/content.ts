/**
 * Everything Hazel's card shows. Offline, baked in at build time.
 */

import type { TypeLine } from "./typewriter";

const TYPE_MS = 45;

/** readme-typing-svg style: type, hold, delete, next. */
export const INTRO_LINES: readonly TypeLine[] = [
  { text: ">_ LATAM Developer Advocate @ AWS", typeMs: TYPE_MS, holdMs: 1200, deleteMs: 18, pauseMs: 250 },
  { text: ">_ Serverless + GenAI + Comunidad", typeMs: TYPE_MS, holdMs: 1200, deleteMs: 18, pauseMs: 250 },
  { text: ">_ Empoderando builders en LATAM", typeMs: TYPE_MS, holdMs: 1200, deleteMs: 18, pauseMs: 400 },
];

/** The whoami prompt stays on screen. */
export const WHOAMI_LINES: readonly TypeLine[] = [
  { text: ">_ whoami", typeMs: 90, holdMs: 250, deleteMs: 0, pauseMs: 0 },
];

export const IDENTITY = {
  name: "Hazel Sáenz",
  role: "Developer Advocate @ AWS",
  tags: "SERVERLESS · GENAI · LATAM",
} as const;

export const CARD = {
  name: "Hazel Sáenz",
  role: "LATAM Developer Advocate @ AWS",
  specialties: ["Serverless", "Generative AI", "Amazon Bedrock", "Developer Communities"],
} as const;

export interface Link {
  readonly label: string;
  readonly display: string;
  readonly url: string;
}

export const LINKS: readonly Link[] = [
  { label: "web", display: "hazelsaenz.tech", url: "https://hazelsaenz.tech" },
  { label: "github", display: "github.com/hsaenzG", url: "https://github.com/hsaenzG" },
  { label: "linkedin", display: "linkedin.com/in/hazelsaenz", url: "https://www.linkedin.com/in/hazelsaenz/" },
];

/** GitHub profile README, recreated offline. */
export const GITHUB = {
  handle: "@hsaenzG",
  url: "github.com/hsaenzG",
  typing: INTRO_LINES,
  stack: "AWS · Lambda · Bedrock · Strands · TS",
} as const;

export const ABOUT = {
  title: "Hazel Badge OS",
  lines: ["TypeScript on Moddable XS", "JSConf México 2026 · Electronic Cats", "offline-first · v0.1.0"],
} as const;
