import { rm } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { preparePublication } from "./prepare-publication.ts"
import { prepareDefinitions } from "./prepare-definitions.ts"
import { join } from "node:path"

const generated = fileURLToPath(new URL("../.generated", import.meta.url))
await rm(generated, { recursive: true, force: true })
const index = await preparePublication(
  fileURLToPath(new URL("../integrated", import.meta.url)),
  generated,
)
await prepareDefinitions(
  fileURLToPath(new URL("../definitions", import.meta.url)),
  join(generated, "definitions"),
  index,
)
