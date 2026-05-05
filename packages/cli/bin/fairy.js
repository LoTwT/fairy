#!/usr/bin/env node
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { tsImport } from "tsx/esm/api"

const binDir = dirname(fileURLToPath(import.meta.url))
const entry = resolve(binDir, "../src/index.ts")
const mod = await tsImport(entry, import.meta.url)
const code = await mod.runCli(process.argv.slice(2))
process.exitCode = code
