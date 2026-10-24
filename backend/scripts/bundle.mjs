#!/usr/bin/env node
/**
 * Bundle the Lambda into dist/lambda (ESM + code splitting).
 *
 * Splitting matters: Strands loads model providers lazily with import(). In a single-file
 * ESM bundle esbuild would hoist `import "openai"`, `"@anthropic-ai/sdk"`, `"@google/genai"`
 * and Cedar to the top level, and the function would crash at init because those optional
 * peers are not installed. With splitting they stay in chunks that only load if used.
 * The check below fails the build if one of them ever reaches the eager import graph.
 */
import { build } from "esbuild";
import { readFileSync, rmSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist", "lambda");
const OPTIONAL_PEERS = ["@anthropic-ai/sdk", "@aws-sdk/client-s3", "@cedar-policy/*", "@google/genai", "openai"];

rmSync(out, { recursive: true, force: true });
await build({
  entryPoints: [join(root, "src", "handler.ts")],
  bundle: true,
  splitting: true,
  platform: "node",
  target: "node24",
  format: "esm",
  outdir: out,
  entryNames: "index",
  chunkNames: "chunks/[name]-[hash]",
  outExtension: { ".js": ".mjs" },
  mainFields: ["module", "main"],
  banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
  external: OPTIONAL_PEERS,
  minify: true,
  sourcemap: false,
  legalComments: "none",
  logLevel: "warning",
});

// Guard: no optional peer may be statically reachable from the entry file.
const isPeer = (s) => OPTIONAL_PEERS.some((p) => (p.endsWith("/*") ? s.startsWith(p.slice(0, -1)) : s === p));
const IMPORT = /(?:^|[;}\s])import\s*(?:[\w*{}\s,$]*?from\s*)?["']([^"']+)["']|export\s*[\w*{}\s,$]*?from\s*["']([^"']+)["']/g;
const seen = new Set();
const stack = [join(out, "index.mjs")];
const bad = [];
while (stack.length) {
  const f = stack.pop();
  if (seen.has(f)) continue;
  seen.add(f);
  for (const m of readFileSync(f, "utf8").matchAll(IMPORT)) {
    const spec = m[1] ?? m[2];
    if (spec.startsWith("./") || spec.startsWith("../")) stack.push(normalize(join(dirname(f), spec)));
    else if (isPeer(spec)) bad.push(`${f.slice(out.length + 1)} → ${spec}`);
  }
}
if (bad.length) {
  console.error("optional peers on the eager import path (Lambda would crash at init):\n" + bad.join("\n"));
  process.exit(1);
}
console.log(`bundled → dist/lambda (${seen.size} eager files, optional peers stay lazy)`);
