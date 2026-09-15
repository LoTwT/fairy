import { rm } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { preparePublication } from "./prepare-publication.ts"

const generated = fileURLToPath(new URL("../.generated", import.meta.url))
await rm(generated, { recursive: true, force: true })
await preparePublication(
  fileURLToPath(new URL("../integrated", import.meta.url)),
  generated,
)
