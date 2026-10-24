#!/usr/bin/env node
/**
 * Tiny static server for the simulator (no dependencies).
 * Serves the repo root on 127.0.0.1 only. Resolves extensionless ES module
 * imports emitted by tsc ("./typewriter" → "./typewriter.js").
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const PORT = Number(process.env.PORT ?? 4173);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".ttf": "font/ttf",
  ".map": "application/json",
};

async function exists(p) {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let path = decodeURIComponent(url.pathname);
  if (path === "/") path = "/sim/index.html";
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  let target = file;
  if (!(await exists(target)) && (await exists(target + ".js"))) target += ".js";
  if (!(await exists(target))) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(target)] ?? "application/octet-stream", "cache-control": "no-store" });
  res.end(await readFile(target));
}).listen(PORT, "127.0.0.1", () => console.log(`Mictlán.js simulator → http://127.0.0.1:${PORT}/`));
