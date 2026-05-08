#!/usr/bin/env node
import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const binDir = dirname(fileURLToPath(import.meta.url))
const distEntry = resolve(binDir, "../dist/index.mjs")
const sourceEntry = resolve(binDir, "../src/index.ts")
const mod = existsSync(distEntry)
  ? await import(distEntry)
  : await import("tsx/esm/api").then(({ tsImport }) => tsImport(sourceEntry, import.meta.url))

const code = await mod.runCli(process.argv.slice(2))
process.exitCode = code
