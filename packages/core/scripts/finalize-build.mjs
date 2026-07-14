import assert from "node:assert/strict"
import { existsSync, readFileSync, writeFileSync } from "node:fs"

const declarationPath = new URL("../dist/index.d.mts", import.meta.url)
const declarationMapPath = new URL("../dist/index.d.mts.map", import.meta.url)
const declarationMapReference = "\n//# sourceMappingURL=index.d.mts.map"

const declaration = readFileSync(declarationPath, "utf8")
const finalizedDeclaration = declaration.replace(declarationMapReference, "\n")

assert.doesNotMatch(finalizedDeclaration, /sourceMappingURL/)
assert.equal(existsSync(declarationMapPath), false)

if (finalizedDeclaration !== declaration) {
  writeFileSync(declarationPath, finalizedDeclaration)
}
