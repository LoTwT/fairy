import { execFileSync, spawnSync } from "node:child_process"
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import ts from "typescript"
import { afterEach, describe, expect, it } from "vitest"
import { verifyNanokaAgentArtifact } from "../scripts/nanoka-integration/verify.ts"
import {
  preparePublication,
  publicationFiles,
} from "../scripts/prepare-publication.ts"
import {
  installPackedConsumer,
  listFiles,
  packageDirectory,
  workspaceDirectory,
} from "./fixtures/packed-consumer.ts"

const temporaryDirectories: string[] = []
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { force: true, recursive: true })
})

function runNode(directory: string, code: string) {
  writeFileSync(join(directory, "smoke.mjs"), code)
  return execFileSync(process.execPath, ["smoke.mjs"], {
    cwd: directory,
    encoding: "utf8",
    stdio: "pipe",
  })
}

describe("packed package", () => {
  it("builds from a fresh static checkout, preserves exact bytes, installs offline and consumes by package name", async () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "randomplay data 中文 #-"),
    )
    temporaryDirectories.push(temporaryDirectory)
    // Copy only Git-visible source (including local implementation), never raw, state or old generated output.
    const checkout = join(temporaryDirectory, "checkout")
    const files = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { cwd: workspaceDirectory, encoding: "utf8" },
    )
      .split("\0")
      .filter(Boolean)
    for (const file of files) {
      if (file.startsWith("packages/data/integrated/")) continue
      mkdirSync(dirname(join(checkout, file)), { recursive: true })
      cpSync(join(workspaceDirectory, file), join(checkout, file))
    }
    const cleanPackage = join(checkout, "packages/data")
    // Capture a managed source under its lease before constructing the static checkout.
    const capturedSource = join(temporaryDirectory, "captured-source")
    await preparePublication(
      join(packageDirectory, "integrated"),
      capturedSource,
    )
    cpSync(
      join(capturedSource, "integrated"),
      join(cleanPackage, "integrated"),
      { recursive: true },
    )
    const dependencyMetadata = [
      ".modules.yaml",
      ".package-map.json",
      ".pnpm/lock.yaml",
    ].map((path) => join(workspaceDirectory, "node_modules", path))
    const metadataBefore = dependencyMetadata.map((path) =>
      existsSync(path) ? readFileSync(path) : undefined,
    )
    // A direct/IDE runner need not inherit pnpm's script environment. Its child
    // installs must own their dependencies, including under CI's noninteractive mode.
    const checkoutEnvironment: NodeJS.ProcessEnv = {
      ...process.env,
      CI: "true",
    }
    delete checkoutEnvironment.pnpm_config_verify_deps_before_run
    execFileSync(
      "corepack",
      ["pnpm", "install", "--offline", "--frozen-lockfile", "--ignore-scripts"],
      {
        cwd: checkout,
        stdio: "pipe",
        env: checkoutEnvironment,
      },
    )
    expect(lstatSync(join(checkout, "node_modules")).isSymbolicLink()).toBe(
      false,
    )
    expect(lstatSync(join(cleanPackage, "node_modules")).isSymbolicLink()).toBe(
      false,
    )
    for (const path of ["raw", ".integrated.fairy-state", ".generated", "dist"])
      expect(existsSync(join(cleanPackage, path)), path).toBe(false)
    execFileSync("corepack", ["pnpm", "typecheck"], {
      cwd: cleanPackage,
      stdio: "pipe",
      env: checkoutEnvironment,
    })
    // A pre-existing typecheck catalog must never become the build's publication input.
    writeFileSync(
      join(cleanPackage, ".generated/catalog.ts"),
      'throw new Error("stale consumer catalog")',
    )
    const { tarballPath, packedRoot, consumerDirectory } =
      installPackedConsumer(temporaryDirectory, cleanPackage)
    const publishedEntry = readFileSync(join(cleanPackage, "dist/index.mjs"))
    const watch = spawnSync(
      process.execPath,
      [join(cleanPackage, "node_modules/tsdown/dist/run.mjs"), "--watch"],
      {
        cwd: cleanPackage,
        encoding: "utf8",
        timeout: 10_000,
      },
    )
    expect(watch.error).toBeUndefined()
    expect(watch.status).not.toBe(0)
    expect(watch.stdout + watch.stderr).toContain(
      "Watch builds are not supported",
    )
    expect(readFileSync(join(cleanPackage, "dist/index.mjs"))).toEqual(
      publishedEntry,
    )
    const snapshot = join(packedRoot, "dist/integrated")
    const index = await verifyNanokaAgentArtifact({
      artifactDirectory: snapshot,
    })
    const jsonFiles = publicationFiles(index)
    expect(jsonFiles).toHaveLength(175)
    const sharedTypes = listFiles(packedRoot).filter((path) =>
      /^dist\/index(?:\.browser)?-[\w-]+\.d\.mts$/u.test(path),
    )
    expect(sharedTypes).toHaveLength(1)
    expect(listFiles(packedRoot)).toEqual(
      [
        "LICENSE",
        "README.md",
        "dist/index.d.mts",
        "dist/index.mjs",
        "dist/index.browser.mjs",
        "dist/index.browser.d.mts",
        ...sharedTypes,
        "package.json",
        ...jsonFiles.map((path) => `dist/integrated/${path}`),
      ].toSorted(),
    )
    for (const path of jsonFiles)
      expect(readFileSync(join(snapshot, path)), path).toEqual(
        readFileSync(join(cleanPackage, "integrated", path)),
      )
    expect(
      JSON.parse(readFileSync(join(packedRoot, "package.json"), "utf8"))
        .dependencies ?? {},
    ).toEqual({})
    const expectedNames = index.scope.agentIds.map(
      (id) =>
        JSON.parse(
          readFileSync(join(snapshot, `agents/${id}/details.en.json`), "utf8"),
        ).name,
    )
    expect(
      JSON.parse(
        runNode(
          consumerDirectory,
          `
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as api from "@randomplay/data"
assert.deepEqual(Object.keys(api).sort(), ["agentNames", "loadAgentData", "loadAgentDetails", "loadAllAgents", "loadIndex"].sort())
const index = await api.loadIndex()
assert.deepEqual(index, JSON.parse(readFileSync(new URL(import.meta.resolve("@randomplay/data/integrated/index.json")), "utf8")))
assert(Object.isFrozen(api.agentNames))
const all = await api.loadAllAgents("zh")
for (const name of api.agentNames) {
  const data = await api.loadAgentData(name)
  const zh = await api.loadAgentDetails(name, "zh")
  const en = await api.loadAgentDetails(name, "en")
  assert.equal(en.name, name)
  assert.equal(zh.locale, "zh")
  assert.equal(en.locale, "en")
  assert.deepEqual(all[name], { data, details: zh })
  for (const [file, value] of [["data.json", data], ["details.zh.json", zh], ["details.en.json", en]]) {
    const direct = await import("@randomplay/data/integrated/agents/" + data.id + "/" + file, { with: { type: "json" } })
    assert.deepEqual(value, direct.default)
  }
  data.stats.tags.push("modified")
  assert.notDeepEqual(await api.loadAgentData(name), data)
  zh.name = "modified"
  assert.notDeepEqual(await api.loadAgentDetails(name, "zh"), zh)
}
assert.equal((await api.loadAgentData("Astra Yao")).id, 1311)
assert.equal((await api.loadAgentData("Soldier 0 - Anby")).id, 1381)
assert.equal(await api.loadAgentData("1311"), undefined)
assert.equal(await api.loadAgentDetails("unknown", "en"), undefined)
await assert.rejects(api.loadAgentData(1311), TypeError)
await assert.rejects(api.loadAgentDetails("unknown"), TypeError)
await assert.rejects(api.loadAllAgents("zh-CN"), TypeError)
console.log(JSON.stringify(api.agentNames))
`,
        ),
      ),
    ).toEqual(expectedNames)
    const typeSource = `import rawData from "@randomplay/data/integrated/agents/1311/data.json" with { type: "json" }
import { agentNames, loadIndex, loadAgentData, loadAgentDetails, loadAllAgents } from "@randomplay/data"
import type { AgentName, AgentData, AgentDetails, IntegratedIndex, LocalizedAgent, DetailLocale } from "@randomplay/data"
const numericSourceId: number = rawData.id
const name: AgentName = "Astra Yao"
const punctuated: AgentName = "Soldier 0 - Anby"
const names: readonly AgentName[] = agentNames
const index: Promise<IntegratedIndex> = loadIndex()
const data: Promise<AgentData | undefined> = loadAgentData(name)
const detail: Promise<AgentDetails | undefined> = loadAgentDetails(punctuated, "zh")
const all: Promise<Record<AgentName, LocalizedAgent>> = loadAllAgents("en")
function acceptsName(value: AgentName, locale: DetailLocale) { return loadAgentDetails(value, locale) }
// @ts-expect-error exact literal union, no arbitrary string
const wrong: AgentName = "AstraYao"
// @ts-expect-error arbitrary strings must be narrowed by the caller
loadAgentData("unknown" as string)
// @ts-expect-error misspelling
loadAgentDetails("astra yao", "en")
// @ts-expect-error numeric IDs are not names
loadAgentData(1311)
// @ts-expect-error locale required
loadAgentDetails(name)
// @ts-expect-error locale has no aliases
loadAllAgents("zh-CN")
// @ts-expect-error frozen readonly list
agentNames.push(name)
// @ts-expect-error readonly element
agentNames[0] = name
void [numericSourceId, names, index, data, detail, all, acceptsName, wrong]
`
    const typeFile = join(consumerDirectory, "smoke.ts")
    writeFileSync(typeFile, typeSource)
    for (const resolution of ["Bundler", "NodeNext"]) {
      execFileSync(
        process.execPath,
        [
          join(packageDirectory, "node_modules/typescript/bin/tsc"),
          "--noEmit",
          "--strict",
          "--resolveJsonModule",
          "--skipLibCheck",
          "--target",
          "ES2022",
          "--module",
          resolution === "Bundler" ? "ESNext" : "NodeNext",
          "--moduleResolution",
          resolution,
          "smoke.ts",
        ],
        { cwd: consumerDirectory, stdio: "pipe" },
      )
    }
    // Exercise the actual TypeScript language service, including completion after a space.
    const completionSource = typeSource + '\nloadAgentData("Soldier ")\n'
    writeFileSync(typeFile, completionSource)
    const compilerOptions: ts.CompilerOptions = {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2022,
    }
    const service = ts.createLanguageService({
      getCompilationSettings: () => compilerOptions,
      getScriptFileNames: () => [typeFile],
      getScriptVersion: () => "1",
      getScriptSnapshot: (path) =>
        ts.sys.fileExists(path)
          ? ts.ScriptSnapshot.fromString(ts.sys.readFile(path)!)
          : undefined,
      getCurrentDirectory: () => consumerDirectory,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
      readDirectory: ts.sys.readDirectory,
    })
    const completions = service.getCompletionsAtPosition(
      typeFile,
      completionSource.lastIndexOf("Soldier ") + "Soldier ".length,
      {},
    )
    expect(completions?.entries.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(expectedNames),
    )
    service.dispose()
    // Fresh private copies: never mutate the offline install's content-addressed files.
    const brokenConsumer = join(temporaryDirectory, "broken")
    const brokenPackage = join(brokenConsumer, "node_modules/@randomplay/data")
    mkdirSync(dirname(brokenPackage), { recursive: true })
    cpSync(packedRoot, brokenPackage, { recursive: true })
    writeFileSync(join(brokenConsumer, "package.json"), '{"type":"module"}')
    for (const [path, call] of [
      ["index.json", "api.loadIndex()"],
      ["agents/1311/data.json", 'api.loadAgentData("Astra Yao")'],
      [
        "agents/1311/details.en.json",
        'api.loadAgentDetails("Astra Yao", "en")',
      ],
    ]) {
      const fullPath = join(brokenPackage, "dist/integrated", path)
      const bytes = readFileSync(fullPath)
      for (const corruption of ["missing", "parse"]) {
        if (corruption === "missing") rmSync(fullPath)
        else writeFileSync(fullPath, "{")
        runNode(
          brokenConsumer,
          `import assert from "node:assert/strict"; import * as api from "@randomplay/data"; assert.equal(api.agentNames.length, 58); await assert.rejects(${call}); ${path === "index.json" ? 'assert.equal((await api.loadAgentData("Astra Yao")).id, 1311)' : 'await assert.rejects(api.loadAllAgents("en"))'}`,
        )
        writeFileSync(fullPath, bytes)
      }
    }
    // Root import must still succeed when every JSON file is absent.
    rmSync(join(brokenPackage, "dist/integrated"), { recursive: true })
    runNode(
      brokenConsumer,
      'import assert from "node:assert/strict"; import { agentNames } from "@randomplay/data"; assert.equal(agentNames.length, 58)',
    )
    expect(
      dependencyMetadata.map((path) =>
        existsSync(path) ? readFileSync(path) : undefined,
      ),
    ).toEqual(metadataBefore)
    console.log(
      JSON.stringify({
        npmBytes: statSync(tarballPath).size,
        unpackedBytes: listFiles(packedRoot).reduce(
          (sum, path) => sum + statSync(join(packedRoot, path)).size,
          0,
        ),
        jsonFiles: jsonFiles.length,
      }),
    )
  }, 120_000)
})
