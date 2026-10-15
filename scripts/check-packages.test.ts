import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, before, test } from "node:test"
import { fileURLToPath } from "node:url"

let root: string
before(async () => {
  root = await mkdtemp(join(tmpdir(), "fairy-package-boundaries-"))
  await mkdir(join(root, "scripts"))
  await cp(
    new URL("./check-packages.ts", import.meta.url),
    join(root, "scripts/check-packages.ts"),
  )
  await symlink(
    fileURLToPath(new URL("../node_modules", import.meta.url)),
    join(root, "node_modules"),
    "dir",
  )
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ type: "module" }),
  )
  for (const name of ["core", "data", "shared"]) {
    await mkdir(join(root, "packages", name, "src"), { recursive: true })
    await writeFile(
      join(root, "packages", name, "package.json"),
      JSON.stringify({
        name: `@randomplay/${name}`,
        version: "0.0.0",
        private: name === "shared",
      }),
    )
  }
})
after(async () => {
  if (root) await rm(root, { recursive: true, force: true })
})

const rejected = [
  'export const load = () => import("@randomplay/core")',
  'export const load = () => import(/* source */ "@randomplay/core")',
  'export const load = () => import(// source\n "@randomplay/core")',
  'export const load = () => import /* before */ (/* first */ /* second */ "@randomplay/core")',
  "export const load = () => import(`@randomplay/core`)",
  'export const load = () => import(("@randomplay/core"))',
  'export const load = () => import(("@randomplay/core" as string))',
  'export const load = () => import(<string>"@randomplay/core")',
  'export const load = () => import("@randomplay/core" satisfies string)',
  'export const load = () => import("@randomplay/core"!)',
  'export const load = () => import("@randomplay/\\u0063ore")',
  'export const load = () => import(/* source */ "../../core/src/index.ts")',
  'import /* source */ { value } from /* package */ "@randomplay/core"',
  'import "@randomplay/core"',
  'export * from "@randomplay/core"',
  'export { value } from /* package */ "@randomplay/core"',
  'type Value = import(/* package */ "@randomplay/core").Value',
]
for (const source of rejected) {
  test(`rejects cross-package source: ${source}`, async () => {
    await writeFile(join(root, "packages/data/src/probe.ts"), source)
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts/check-packages.ts")],
      { encoding: "utf8" },
    )
    assert.equal(result.status, 1)
    assert.match(
      result.stderr,
      /runtime source must not import (?:@randomplay\/core|\.\.\/\.\.\/core\/)/,
    )
  })
}

test("allows local/shared imports, comments and text that only resembles an import", async () => {
  await writeFile(
    join(root, "packages/data/src/probe.ts"),
    [
      'import { value } from "./local.ts"',
      'export { value } from "@randomplay/shared"',
      'const load = () => import(/* local */ "./lazy.ts")',
      '// import("@randomplay/core")',
      "const text = 'import(\"@randomplay/core\")'",
    ].join("\n"),
  )
  const result = spawnSync(
    process.execPath,
    [join(root, "scripts/check-packages.ts")],
    { encoding: "utf8" },
  )
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Package boundaries verified/)
})
