import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

function moduleSpecifiers(source: string, path: string): string[] {
  const specifiers: string[] = []
  const record = (expression: ts.Node | undefined) => {
    while (
      expression &&
      (ts.isParenthesizedExpression(expression) ||
        ts.isAsExpression(expression) ||
        ts.isTypeAssertionExpression(expression) ||
        ts.isSatisfiesExpression(expression) ||
        ts.isNonNullExpression(expression))
    )
      expression = expression.expression
    if (expression && ts.isStringLiteralLike(expression))
      specifiers.push(expression.text)
  }
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      record(node.moduleSpecifier)
    else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    )
      record(node.arguments[0])
    else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
      record(node.argument.literal)
    else if (ts.isExternalModuleReference(node)) record(node.expression)
    ts.forEachChild(node, visit)
  }
  visit(
    ts.createSourceFile(
      path,
      source,
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.TS,
    ),
  )
  return specifiers
}

const root = fileURLToPath(new URL("../", import.meta.url))
const manifests = await Promise.all(
  ["core", "data", "shared"].map(async (name) =>
    JSON.parse(
      await readFile(join(root, "packages", name, "package.json"), "utf8"),
    ),
  ),
)
const [core, data, shared] = manifests
if (core.version !== data.version)
  throw new Error("core and data must use the same release version")
if (shared.private !== true)
  throw new Error("shared is private and must never be published")
for (const manifest of manifests) {
  for (const field of [
    "dependencies",
    "peerDependencies",
    "optionalDependencies",
  ])
    for (const name of Object.keys(manifest[field] ?? {}))
      if (
        ["@randomplay/core", "@randomplay/data", "@randomplay/shared"].includes(
          name,
        )
      )
        throw new Error(
          `${manifest.name}: forbidden runtime package dependency ${name}`,
        )
}
for (const name of ["core", "data", "shared"]) {
  const directory = join(root, "packages", name, "src")
  for (const entry of await readdir(directory, {
    withFileTypes: true,
    recursive: true,
  })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue
    const path = join(entry.parentPath, entry.name)
    const source = await readFile(path, "utf8")
    for (const target of moduleSpecifiers(source, path)) {
      for (const other of ["core", "data"])
        if (
          other !== name &&
          (target.startsWith(`@randomplay/${other}`) ||
            new RegExp(`(?:^|/)${other}/`).test(target))
        )
          throw new Error(`${path}: runtime source must not import ${target}`)
    }
  }
}
console.log(
  `Package boundaries verified; core and data release version: ${core.version}`,
)
