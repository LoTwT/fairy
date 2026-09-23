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
import { basename, dirname, join } from "node:path"
import { pathToFileURL } from "node:url"
import ts from "typescript"
import { afterEach, describe, expect, it } from "vitest"
import { verifyIntegratedSnapshot } from "../scripts/nanoka-integration/snapshot-verify.ts"
import {
  attributeArtifactPaths,
  verifyPanelAttributes,
} from "../scripts/panel-attributes/manifest.ts"
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

/**
 * 全量字节比较使用原生 Buffer.equals；失败时给出可定位的文件路径与首个差异偏移。
 * 通用深比较会逐元素展开约 10 MB 的发布快照，这里保持全部文件与全部字节的比较语义。
 */
function expectSameBytes(actual: Buffer, expected: Buffer, label: string) {
  if (actual.equals(expected)) return
  const length = Math.min(actual.length, expected.length)
  let offset = 0
  while (offset < length && actual[offset] === expected[offset]) offset += 1
  throw new Error(
    `${label}: 字节不一致（实际 ${actual.length} 字节，预期 ${expected.length} 字节，首个差异偏移 ${offset}）`,
  )
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
      // 工作区可能已有尚未提交的删除；checkout 只取工作区实际存在的 Git 可见文件，
      // 干净签出时集合与索引一致。
      if (!existsSync(join(workspaceDirectory, file))) continue
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
      stdio: "inherit",
      env: checkoutEnvironment,
    })
    // A pre-existing typecheck catalog must never become the build's publication input.
    writeFileSync(
      join(cleanPackage, ".generated/catalog.ts"),
      'throw new Error("stale consumer catalog")',
    )
    const { tarballPath, packedRoot, consumerDirectory } =
      installPackedConsumer(temporaryDirectory, cleanPackage)
    // Reuse the isolated checkout: engine packaging must not race workspace builds.
    const enginePackages = join(temporaryDirectory, "engine-packages")
    mkdirSync(enginePackages)
    const engineTarballs: Record<string, string> = {}
    for (const name of ["core", "effects"]) {
      const source = join(checkout, "packages", name)
      execFileSync(
        "corepack",
        ["pnpm", "pack", "--pack-destination", enginePackages],
        {
          cwd: source,
          stdio: "pipe",
          env: checkoutEnvironment,
        },
      )
      const manifest = JSON.parse(
        readFileSync(join(source, "package.json"), "utf8"),
      )
      engineTarballs[name] = join(
        enginePackages,
        `randomplay-${name}-${manifest.version}.tgz`,
      )
    }
    const consumerManifestPath = join(consumerDirectory, "package.json")
    const consumerManifest = JSON.parse(
      readFileSync(consumerManifestPath, "utf8"),
    )
    consumerManifest.dependencies["@randomplay/effects"] =
      `file:${engineTarballs.effects}`
    writeFileSync(consumerManifestPath, JSON.stringify(consumerManifest))
    writeFileSync(
      join(consumerDirectory, "pnpm-workspace.yaml"),
      `overrides:\n  "@randomplay/core": ${JSON.stringify(`file:${engineTarballs.core}`)}\n`,
    )
    execFileSync(
      "corepack",
      ["pnpm", "install", "--offline", "--no-frozen-lockfile"],
      {
        cwd: consumerDirectory,
        stdio: "pipe",
      },
    )
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
    const index = await verifyIntegratedSnapshot({
      artifactDirectory: snapshot,
    })
    const jsonFiles = publicationFiles(index)
    const attributeFiles = [...attributeArtifactPaths(index), "manifest.json"]
    await verifyPanelAttributes(
      join(packedRoot, "dist/definitions/attributes"),
      index,
    )
    // 文件清单覆盖全部已登记类别与成员：由验证后的索引逐类别推导，不使用固定文件总数。
    expect(Object.keys(index.entities).toSorted()).toEqual([
      "agents",
      "bangboos",
      "boss",
      "drive-discs",
      "monsters",
      "shiyu",
      "simul",
      "w-engines",
    ])
    const expectedJsonCount =
      1 +
      Object.values(index.entities).reduce(
        (total, entity) =>
          total + entity.memberIds.length * (1 + entity.detailLocales.length),
        0,
      )
    expect(jsonFiles).toHaveLength(expectedJsonCount)
    expect(new Set(jsonFiles).size).toBe(expectedJsonCount)
    // 两个入口共用恰好一份带哈希的声明分块，且都引用它；分块名由打包器决定，不在此钉住来源模块名。
    const sharedTypes = listFiles(packedRoot).filter(
      (path) =>
        path.endsWith(".d.mts") &&
        path !== "dist/index.d.mts" &&
        path !== "dist/index.browser.d.mts",
    )
    expect(sharedTypes).toHaveLength(1)
    // 入口声明按打包器生成的名字引用同一份共享分块（可能与声明文件后缀不同）。
    const sharedStem = basename(sharedTypes[0]).replace(/\.d\.mts$/u, "")
    for (const entry of ["dist/index.d.mts", "dist/index.browser.d.mts"])
      expect(readFileSync(join(packedRoot, entry), "utf8")).toContain(
        sharedStem,
      )
    expect(listFiles(packedRoot)).toEqual(
      [
        "LICENSE",
        "README.md",
        "dist/definitions/effects/starter.json",
        "dist/definitions/effects/automatic.json",
        "dist/definitions/effects/static.json",
        "dist/definitions/effects/static-catalog.json",
        "dist/definitions/effects/static-coverage.json",
        "dist/index.d.mts",
        "dist/index.mjs",
        "dist/index.browser.mjs",
        "dist/index.browser.d.mts",
        ...sharedTypes,
        "package.json",
        ...jsonFiles.map((path) => `dist/integrated/${path}`),
        ...attributeFiles.map((path) => `dist/definitions/attributes/${path}`),
      ].toSorted(),
    )
    for (const name of [
      "starter",
      "automatic",
      "static",
      "static-catalog",
      "static-coverage",
    ]) {
      const path = `definitions/effects/${name}.json`
      expectSameBytes(
        readFileSync(join(packedRoot, "dist", path)),
        readFileSync(join(cleanPackage, path)),
        path,
      )
    }
    for (const path of jsonFiles)
      expectSameBytes(
        readFileSync(join(snapshot, path)),
        readFileSync(join(cleanPackage, "integrated", path)),
        path,
      )
    for (const path of attributeFiles)
      expectSameBytes(
        readFileSync(join(packedRoot, "dist/definitions/attributes", path)),
        readFileSync(join(cleanPackage, "definitions/attributes", path)),
        path,
      )
    expect(
      JSON.parse(readFileSync(join(packedRoot, "package.json"), "utf8"))
        .dependencies ?? {},
    ).toEqual({})
    const expectedNames = index.entities.agents.memberIds.map(
      (id) =>
        JSON.parse(
          readFileSync(join(snapshot, `agents/${id}/details.en.json`), "utf8"),
        ).name,
    )
    const expectedDriveDiscNames = index.entities["drive-discs"].memberIds.map(
      (id) =>
        JSON.parse(
          readFileSync(
            join(snapshot, `drive-discs/${id}/details.en.json`),
            "utf8",
          ),
        ).name,
    )
    const expectedWEngineNames = index.entities["w-engines"].memberIds.map(
      (id) =>
        JSON.parse(
          readFileSync(
            join(snapshot, `w-engines/${id}/details.en.json`),
            "utf8",
          ),
        ).name,
    )
    const expectedBangbooNames = index.entities["bangboos"].memberIds.map(
      (id) =>
        JSON.parse(
          readFileSync(
            join(snapshot, `bangboos/${id}/details.en.json`),
            "utf8",
          ),
        ).name,
    )
    const expectedMonsterIds = index.entities["monsters"].memberIds
    const expectedShiyuIds = index.entities["shiyu"].memberIds
    const expectedBossIds = index.entities["boss"].memberIds
    const expectedSimulIds = index.entities["simul"].memberIds
    expect(
      JSON.parse(
        runNode(
          consumerDirectory,
          `
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as api from "@randomplay/data"
assert.deepEqual(Object.keys(api).sort(), ["agentNames", "bangbooNames", "bossIds", "simulIds", "driveDiscNames", "monsterIds", "shiyuIds", "wEngineNames", "loadAgentData", "loadAgentDetails", "loadAllAgents", "loadAllBangboos", "loadAllBosses", "loadAllSimul", "loadAllDriveDiscs", "loadAllMonsters", "loadAllShiyu", "loadAllWEngines", "loadBangbooData", "loadBangbooDetails", "loadBossData", "loadBossDetails", "loadSimulData", "loadSimulDetails", "loadDriveDiscData", "loadDriveDiscDetails", "loadIndex", "loadMonsterData", "loadMonsterDetails", "loadShiyuData", "loadShiyuDetails", "loadWEngineData", "loadWEngineDetails", "loadAgentLevel60Attributes", "loadWEngineLevel60Attributes", "loadSDriveDiscMaxLevelAffixes"].sort())
for (const [names, load, category] of [[api.agentNames, api.loadAgentLevel60Attributes, "agents"], [api.wEngineNames, api.loadWEngineLevel60Attributes, "w-engines"]]) {
  for (const name of names) {
    const attributes = await load(name)
    const direct = (await import("@randomplay/data/definitions/attributes/" + category + "/" + attributes.entityId + ".json", { with: { type: "json" } })).default
    assert.deepEqual(attributes, direct)
    assert.notEqual(await load(name), attributes)
  }
}
assert.equal((await api.loadAgentLevel60Attributes("Astra Yao")).baseAttributes.attack.value, 640.7699)
const discAffixes = await api.loadSDriveDiscMaxLevelAffixes()
assert.deepEqual(discAffixes, (await import("@randomplay/data/definitions/attributes/drive-disc-affixes.json", { with: { type: "json" } })).default)
const attributeManifest = (await import("@randomplay/data/definitions/attributes/manifest.json", { with: { type: "json" } })).default
assert.equal(attributeManifest.members.agents.length, api.agentNames.length)
const starterDefinitions = await import("@randomplay/data/definitions/effects/starter.json", { with: { type: "json" } })
assert.equal(starterDefinitions.default.schemaVersion, 1)
assert.equal(starterDefinitions.default.ruleSetId, "starter-effects")
assert.equal(starterDefinitions.default.effects.length, 3)
const automaticDefinitions = await import("@randomplay/data/definitions/effects/automatic.json", { with: { type: "json" } })
const { parseEffectRuleSet, prepareEffects, supplyEffectState, advanceEffects, calculateStaticDamageFromCatalog } = await import("@randomplay/effects")
function value(result) { assert.equal(result.ok, true, JSON.stringify(result)); return result.value }
const staticDefinitions = (await import("@randomplay/data/definitions/effects/static.json", { with: { type: "json" } })).default
const staticCatalog = (await import("@randomplay/data/definitions/effects/static-catalog.json", { with: { type: "json" } })).default
const staticCoverage = (await import("@randomplay/data/definitions/effects/static-coverage.json", { with: { type: "json" } })).default
assert.equal(staticCoverage.summary.rawEffects, 1290)
const staticResult = value(calculateStaticDamageFromCatalog({ ...${readFileSync(new URL("./fixtures/static-catalog-consumer.json", import.meta.url), "utf8")}, definitions: staticDefinitions, catalog: staticCatalog }))
assert.ok(Math.abs(staticResult.criticalRate - 0.13) < 1e-12)
assert.ok(staticResult.expected > staticResult.nonCritical)
const rules = value(parseEffectRuleSet(automaticDefinitions.default))
assert.equal(rules.ruleSetId, "automatic-effects")
assert.equal(rules.revision, "1")
assert.deepEqual(rules.effects.map(effect => effect.effectId), ["w-engine:14131:energy-on-entry"])
const prepared = value(prepareEffects(rules, [{ kind: "w-engine", bindingId: "binding:weapon", holderId: "entity:holder", sourceEntityId: "14131", eligible: true, configuration: { refinement: 5 } }]))
const state = value(supplyEffectState(prepared, { sessionId: "session:packed", atSeconds: 0, instances: [], snapshots: [], cooldowns: [], eventHistory: { processedIds: [], last: null } }))
const world = { entities: ["holder", "teammate"].map(name => ({ kind: "actor", entityId: "entity:" + name, teamId: "team:one", generalStats: {}, directStats: {} })), states: [], distances: [] }
const input = { event: { kind: "entry", eventId: "event:packed", atSeconds: 0, sequence: 0, actorId: "entity:teammate", entryAction: "quick-assist" }, before: world, after: world, observedSnapshots: [] }
const advanced = value(advanceEffects(prepared, state, input))
assert.equal(advanced.requests.length, 1)
assert.deepEqual(advanced.requests[0], { requestId: advanced.requests[0].requestId, eventId: "event:packed", effectId: "w-engine:14131:energy-on-entry", bindingId: "binding:weapon", beneficiaryId: "entity:holder", kind: "resource-generation", resource: "energy", baseAmount: { unit: "energy-points", value: 7 } })
assert.match(advanced.requests[0].requestId, /^request:/)
assert.deepEqual(value(advanceEffects(prepared, state, input)).requests, advanced.requests)
const index = await api.loadIndex()
assert.deepEqual(index, JSON.parse(readFileSync(new URL(import.meta.resolve("@randomplay/data/integrated/index.json")), "utf8")))
assert(Object.isFrozen(api.agentNames))
assert(Object.isFrozen(api.driveDiscNames))
assert(Object.isFrozen(api.wEngineNames))
assert(Object.isFrozen(api.bangbooNames))
assert(Object.isFrozen(api.monsterIds))
assert(Object.isFrozen(api.shiyuIds))
assert(Object.isFrozen(api.bossIds))
assert(Object.isFrozen(api.simulIds))
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
assert.equal((await api.loadAgentData("1311")), undefined)
assert.equal(await api.loadAgentDetails("unknown", "en"), undefined)
await assert.rejects(api.loadAgentData(1311), TypeError)
await assert.rejects(api.loadAgentDetails("unknown"), TypeError)
await assert.rejects(api.loadAllAgents("zh-CN"), TypeError)
// 驱动盘读取 API：逐成员与包内 data/zh/en JSON 比对，子路径直读与 API 值一致。
const driveDiscIds = index.entities["drive-discs"].memberIds
assert(api.driveDiscNames.length === driveDiscIds.length)
const allDiscs = await api.loadAllDriveDiscs("zh")
for (const name of api.driveDiscNames) {
  const data = await api.loadDriveDiscData(name)
  const zh = await api.loadDriveDiscDetails(name, "zh")
  const en = await api.loadDriveDiscDetails(name, "en")
  assert.equal(en.name, name)
  assert.equal(zh.locale, "zh")
  assert.equal(en.locale, "en")
  assert.deepEqual(allDiscs[name], { data, details: zh })
  assert.deepEqual(Object.keys(allDiscs[name]), ["data", "details"])
  for (const [file, value] of [["data.json", data], ["details.zh.json", zh], ["details.en.json", en]]) {
    const direct = await import("@randomplay/data/integrated/drive-discs/" + data.id + "/" + file, { with: { type: "json" } })
    assert.deepEqual(value, direct.default)
  }
  data.icon2 = "modified"
  assert.notDeepEqual(await api.loadDriveDiscData(name), data)
  zh.story = "modified"
  assert.notDeepEqual(await api.loadDriveDiscDetails(name, "zh"), zh)
}
assert(api.driveDiscNames.includes("Woodpecker Electro"))
assert.equal((await api.loadDriveDiscData("Woodpecker Electro")).id, 31000)
assert.equal(await api.loadDriveDiscData("31000"), undefined)
assert.equal(await api.loadDriveDiscDetails("unknown disc", "en"), undefined)
await assert.rejects(api.loadDriveDiscData(31000), TypeError)
await assert.rejects(api.loadDriveDiscDetails("Woodpecker Electro"), TypeError)
await assert.rejects(api.loadAllDriveDiscs("zh-CN"), TypeError)
// WEngine 读取 API：逐成员与包内 data/zh/en JSON 比对，子路径直读与 API 值一致。
const wEngineIds = index.entities["w-engines"].memberIds
assert(api.wEngineNames.length === wEngineIds.length)
const allWEngines = await api.loadAllWEngines("zh")
for (const name of api.wEngineNames) {
  const data = await api.loadWEngineData(name)
  const zh = await api.loadWEngineDetails(name, "zh")
  const en = await api.loadWEngineDetails(name, "en")
  assert.equal(en.name, name)
  assert.equal(zh.locale, "zh")
  assert.equal(en.locale, "en")
  assert.deepEqual(allWEngines[name], { data, details: zh })
  assert.deepEqual(Object.keys(allWEngines[name]), ["data", "details"])
  for (const [file, value] of [["data.json", data], ["details.zh.json", zh], ["details.en.json", en]]) {
    const direct = await import("@randomplay/data/integrated/w-engines/" + data.id + "/" + file, { with: { type: "json" } })
    assert.deepEqual(value, direct.default)
  }
  data.materials = "modified"
  assert.notDeepEqual(await api.loadWEngineData(name), data)
  zh.desc3 = "modified"
  assert.notDeepEqual(await api.loadWEngineDetails(name, "zh"), zh)
}
assert(api.wEngineNames.includes("[Lunar] Pleniluna"))
assert.equal((await api.loadWEngineData("[Lunar] Pleniluna")).id, 12001)
assert.equal(await api.loadWEngineData("12001"), undefined)
assert.equal(await api.loadWEngineDetails("unknown engine", "en"), undefined)
await assert.rejects(api.loadWEngineData(12001), TypeError)
await assert.rejects(api.loadWEngineDetails("[Lunar] Pleniluna"), TypeError)
await assert.rejects(api.loadAllWEngines("zh-CN"), TypeError)
// Bangboo 读取 API：逐成员与包内 data/zh/en JSON 比对，子路径直读与 API 值一致。
const bangbooIds = index.entities["bangboos"].memberIds
assert(api.bangbooNames.length === bangbooIds.length)
const allBangboos = await api.loadAllBangboos("zh")
for (const name of api.bangbooNames) {
  const data = await api.loadBangbooData(name)
  const zh = await api.loadBangbooDetails(name, "zh")
  const en = await api.loadBangbooDetails(name, "en")
  assert.equal(en.name, name)
  assert.equal(zh.locale, "zh")
  assert.equal(en.locale, "en")
  assert.deepEqual(allBangboos[name], { data, details: zh })
  assert.deepEqual(Object.keys(allBangboos[name]), ["data", "details"])
  for (const [file, value] of [["data.json", data], ["details.zh.json", zh], ["details.en.json", en]]) {
    const direct = await import("@randomplay/data/integrated/bangboos/" + data.id + "/" + file, { with: { type: "json" } })
    assert.deepEqual(value, direct.default)
  }
  data.stats.hpMax = -1
  assert.notDeepEqual(await api.loadBangbooData(name), data)
  zh.desc = "modified"
  assert.notDeepEqual(await api.loadBangbooDetails(name, "zh"), zh)
}
assert(api.bangbooNames.includes("Penguinboo"))
assert.equal((await api.loadBangbooData("Penguinboo")).id, 53001)
assert.equal(await api.loadBangbooData("53001"), undefined)
assert.equal(await api.loadBangbooDetails("unknown bangboo", "en"), undefined)
await assert.rejects(api.loadBangbooData(53001), TypeError)
await assert.rejects(api.loadBangbooDetails("Penguinboo"), TypeError)
await assert.rejects(api.loadAllBangboos("zh-CN"), TypeError)
// Monster 读取 API：以来源 ID 为身份，逐成员与包内 data/zh/en JSON 比对，子路径直读与 API 值一致。
const monsterIds = index.entities["monsters"].memberIds
assert(api.monsterIds.length === monsterIds.length)
assert.deepEqual([...api.monsterIds], monsterIds)
const allMonsters = await api.loadAllMonsters("zh")
for (const id of api.monsterIds) {
  const data = await api.loadMonsterData(id)
  const zh = await api.loadMonsterDetails(id, "zh")
  const en = await api.loadMonsterDetails(id, "en")
  assert.equal(String(data.id), id)
  assert.equal(String(zh.id), id)
  assert.equal(zh.locale, "zh")
  assert.equal(en.locale, "en")
  assert.deepEqual(allMonsters[id], { data, details: zh })
  assert.deepEqual(Object.keys(allMonsters[id]), ["data", "details"])
  for (const [file, value] of [["data.json", data], ["details.zh.json", zh], ["details.en.json", en]]) {
    const direct = await import("@randomplay/data/integrated/monsters/" + data.id + "/" + file, { with: { type: "json" } })
    assert.deepEqual(value, direct.default)
  }
  data.monsterId = -1
  assert.notDeepEqual(await api.loadMonsterData(id), data)
  zh.desc = "modified"
  assert.notDeepEqual(await api.loadMonsterDetails(id, "zh"), zh)
}
assert(api.monsterIds.includes("10000"))
assert.equal(String((await api.loadMonsterData("10000")).id), "10000")
assert.equal(await api.loadMonsterData("010000"), undefined)
assert.equal(await api.loadMonsterData("1e4"), undefined)
assert.equal(await api.loadMonsterDetails("unknown monster", "en"), undefined)
await assert.rejects(api.loadMonsterData(10000), TypeError)
await assert.rejects(api.loadMonsterDetails("10000"), TypeError)
await assert.rejects(api.loadAllMonsters("zh-CN"), TypeError)
// Shiyu 读取 API：以来源 ID 为身份，逐成员与包内 data/zh/en JSON 比对，子路径直读与 API 值一致。
const shiyuIds = index.entities["shiyu"].memberIds
assert(api.shiyuIds.length === shiyuIds.length)
assert.deepEqual([...api.shiyuIds], shiyuIds)
const allShiyu = await api.loadAllShiyu("zh")
for (const id of api.shiyuIds) {
  const data = await api.loadShiyuData(id)
  const zh = await api.loadShiyuDetails(id, "zh")
  const en = await api.loadShiyuDetails(id, "en")
  assert.equal(String(data.id), id)
  assert.equal(String(zh.id), id)
  assert.equal(zh.locale, "zh")
  assert.equal(en.locale, "en")
  assert.deepEqual(allShiyu[id], { data, details: zh })
  assert.deepEqual(Object.keys(allShiyu[id]), ["data", "details"])
  for (const [file, value] of [["data.json", data], ["details.zh.json", zh], ["details.en.json", en]]) {
    const direct = await import("@randomplay/data/integrated/shiyu/" + data.id + "/" + file, { with: { type: "json" } })
    assert.deepEqual(value, direct.default)
  }
  data.priority = -1
  assert.notDeepEqual(await api.loadShiyuData(id), data)
  zh.name = "modified"
  assert.notDeepEqual(await api.loadShiyuDetails(id, "zh"), zh)
}
assert(api.shiyuIds.includes("61001"))
assert.equal(String((await api.loadShiyuData("61001")).id), "61001")
assert.equal(await api.loadShiyuData("061001"), undefined)
assert.equal(await api.loadShiyuDetails("unknown shiyu", "en"), undefined)
await assert.rejects(api.loadShiyuData(61001), TypeError)
await assert.rejects(api.loadShiyuDetails("61001"), TypeError)
await assert.rejects(api.loadAllShiyu("zh-CN"), TypeError)
// Boss 读取 API：以来源 ID 为身份，逐成员与包内 data/zh/en JSON 比对，子路径直读与 API 值一致。
const bossIds = index.entities["boss"].memberIds
assert(api.bossIds.length === bossIds.length)
assert.deepEqual([...api.bossIds], bossIds)
const allBosses = await api.loadAllBosses("zh")
for (const id of api.bossIds) {
  const data = await api.loadBossData(id)
  const zh = await api.loadBossDetails(id, "zh")
  const en = await api.loadBossDetails(id, "en")
  assert.equal(String(data.id), id)
  assert.equal(String(zh.id), id)
  assert.equal(zh.locale, "zh")
  assert.equal(en.locale, "en")
  assert.deepEqual(allBosses[id], { data, details: zh })
  assert.deepEqual(Object.keys(allBosses[id]), ["data", "details"])
  for (const [file, value] of [["data.json", data], ["details.zh.json", zh], ["details.en.json", en]]) {
    const direct = await import("@randomplay/data/integrated/boss/" + data.id + "/" + file, { with: { type: "json" } })
    assert.deepEqual(value, direct.default)
  }
  data.priority = -1
  assert.notDeepEqual(await api.loadBossData(id), data)
  zh.name = "modified"
  assert.notDeepEqual(await api.loadBossDetails(id, "zh"), zh)
}
assert(api.bossIds.includes("69001"))
assert.equal(String((await api.loadBossData("69001")).id), "69001")
assert.equal(await api.loadBossData("069001"), undefined)
assert.equal(await api.loadBossDetails("unknown boss", "en"), undefined)
await assert.rejects(api.loadBossData(69001), TypeError)
await assert.rejects(api.loadBossDetails("69001"), TypeError)
await assert.rejects(api.loadAllBosses("zh-CN"), TypeError)
// Simul 读取 API：以来源 ID 为身份，逐成员与包内 data/zh/en JSON 比对，子路径直读与 API 值一致。
const simulIds = index.entities["simul"].memberIds
assert(api.simulIds.length === simulIds.length)
assert.deepEqual([...api.simulIds], simulIds)
const allSimul = await api.loadAllSimul("zh")
for (const id of api.simulIds) {
  const data = await api.loadSimulData(id)
  const zh = await api.loadSimulDetails(id, "zh")
  const en = await api.loadSimulDetails(id, "en")
  assert.equal(String(data.id), id)
  assert.equal(String(zh.id), id)
  assert.equal(zh.locale, "zh")
  assert.equal(en.locale, "en")
  assert.deepEqual(allSimul[id], { data, details: zh })
  assert.deepEqual(Object.keys(allSimul[id]), ["data", "details"])
  for (const [file, value] of [["data.json", data], ["details.zh.json", zh], ["details.en.json", en]]) {
    const direct = await import("@randomplay/data/integrated/simul/" + data.id + "/" + file, { with: { type: "json" } })
    assert.deepEqual(value, direct.default)
  }
  data.endTime = "modified"
  assert.notDeepEqual(await api.loadSimulData(id), data)
  zh.record = { modified: true }
  assert.notDeepEqual(await api.loadSimulDetails(id, "zh"), zh)
}
assert(api.simulIds.includes("101"))
assert.equal(String((await api.loadSimulData("101")).id), "101")
assert.equal(await api.loadSimulData("0101"), undefined)
assert.equal(await api.loadSimulDetails("unknown simul", "en"), undefined)
await assert.rejects(api.loadSimulData(101), TypeError)
await assert.rejects(api.loadSimulDetails("101"), TypeError)
await assert.rejects(api.loadAllSimul("zh-CN"), TypeError)
console.log(JSON.stringify({ agents: api.agentNames, bangboos: api.bangbooNames, boss: [...api.bossIds], driveDiscs: api.driveDiscNames, monsters: [...api.monsterIds], shiyu: [...api.shiyuIds], simul: [...api.simulIds], wEngines: api.wEngineNames }))
`,
        ),
      ),
    ).toEqual({
      agents: expectedNames,
      bangboos: expectedBangbooNames,
      boss: expectedBossIds,
      simul: expectedSimulIds,
      driveDiscs: expectedDriveDiscNames,
      monsters: expectedMonsterIds,
      shiyu: expectedShiyuIds,
      wEngines: expectedWEngineNames,
    })
    const typeSource = `import { loadAgentLevel60Attributes, loadWEngineLevel60Attributes, loadSDriveDiscMaxLevelAffixes } from "@randomplay/data"
import type { AgentLevel60Attributes, WEngineLevel60Attributes, SDriveDiscMaxLevelAffixes, PanelAttributeBonus } from "@randomplay/data"
const agentAttributes: Promise<AgentLevel60Attributes | undefined> = loadAgentLevel60Attributes("Astra Yao")
const engineAttributes: Promise<WEngineLevel60Attributes | undefined> = loadWEngineLevel60Attributes("Elegant Vanity")
const discAffixes: Promise<SDriveDiscMaxLevelAffixes> = loadSDriveDiscMaxLevelAffixes()
const impactBonus: PanelAttributeBonus = { attribute: "impact", operation: "initial-percentage", unit: "ratio", value: 0.18 }
// @ts-expect-error percentage bonuses require ratio units
const wrongUnit: PanelAttributeBonus = { attribute: "impact", operation: "initial-percentage", unit: "impact-points", value: 18 }
// @ts-expect-error exact name required
loadAgentLevel60Attributes("unknown")
import rawData from "@randomplay/data/integrated/agents/1311/data.json" with { type: "json" }
import rawDriveDiscData from "@randomplay/data/integrated/drive-discs/31000/data.json" with { type: "json" }
import rawWEngineData from "@randomplay/data/integrated/w-engines/12001/data.json" with { type: "json" }
import rawBangbooData from "@randomplay/data/integrated/bangboos/53001/data.json" with { type: "json" }
import rawMonsterData from "@randomplay/data/integrated/monsters/10000/data.json" with { type: "json" }
import rawShiyuData from "@randomplay/data/integrated/shiyu/61001/data.json" with { type: "json" }
import rawBossData from "@randomplay/data/integrated/boss/69001/data.json" with { type: "json" }
import rawSimulData from "@randomplay/data/integrated/simul/101/data.json" with { type: "json" }
import { agentNames, bangbooNames, bossIds, simulIds, driveDiscNames, monsterIds, shiyuIds, wEngineNames, loadIndex, loadAgentData, loadAgentDetails, loadAllAgents, loadBangbooData, loadBangbooDetails, loadAllBangboos, loadBossData, loadBossDetails, loadAllBosses, loadSimulData, loadSimulDetails, loadAllSimul, loadDriveDiscData, loadDriveDiscDetails, loadAllDriveDiscs, loadMonsterData, loadMonsterDetails, loadAllMonsters, loadShiyuData, loadShiyuDetails, loadAllShiyu, loadWEngineData, loadWEngineDetails, loadAllWEngines } from "@randomplay/data"
import type { AgentName, AgentData, AgentDetails, IntegratedSnapshotIndex, LocalizedAgent, DetailLocale, BangbooName, BangbooData, BangbooDetails, LocalizedBangboo, BossId, BossData, BossDetails, LocalizedBoss, SimulId, SimulData, SimulDetails, LocalizedSimul, DriveDiscName, DriveDiscData, DriveDiscDetails, LocalizedDriveDisc, MonsterId, MonsterData, MonsterDetails, LocalizedMonster, ShiyuId, ShiyuData, ShiyuDetails, LocalizedShiyu, WEngineName, WEngineData, WEngineDetails, LocalizedWEngine } from "@randomplay/data"
const numericSourceId: number = rawData.id
const numericDriveDiscId: number = rawDriveDiscData.id
const numericWEngineId: number = rawWEngineData.id
const numericBangbooId: number = rawBangbooData.id
const numericMonsterId: number = rawMonsterData.id
const numericShiyuId: number = rawShiyuData.id
const numericBossId: number = rawBossData.id
const numericSimulId: number = rawSimulData.id
const name: AgentName = "Astra Yao"
const punctuated: AgentName = "Soldier 0 - Anby"
const driveDiscName: DriveDiscName = "Woodpecker Electro"
const spacedDiscName: DriveDiscName = "Puffer Electro"
const wEngineName: WEngineName = "[Lunar] Pleniluna"
const punctuatedEngineName: WEngineName = "[Reverb] Mark I"
const bangbooName: BangbooName = "Penguinboo"
const spacedBangbooName: BangbooName = "Bild N. Boolok"
const monsterId: MonsterId = "10000"
const adjacentMonsterId: MonsterId = "10001"
const monsterIdentityList: readonly MonsterId[] = monsterIds
const shiyuId: ShiyuId = "61001"
const rotatingShiyuId: ShiyuId = "62001"
const shiyuIdentityList: readonly ShiyuId[] = shiyuIds
const bossId: BossId = "69001"
const adjacentBossId: BossId = "69002"
const bossIdentityList: readonly BossId[] = bossIds
const simulId: SimulId = "101"
const adjacentSimulId: SimulId = "102"
const simulIdentityList: readonly SimulId[] = simulIds
const names: readonly AgentName[] = agentNames
const discNames: readonly DriveDiscName[] = driveDiscNames
const engineNames: readonly WEngineName[] = wEngineNames
const booNames: readonly BangbooName[] = bangbooNames
const monsterData: Promise<MonsterData | undefined> = loadMonsterData(monsterId)
const monsterDetail: Promise<MonsterDetails | undefined> = loadMonsterDetails(adjacentMonsterId, "zh")
const allMonsters: Promise<Record<MonsterId, LocalizedMonster>> = loadAllMonsters("en")
const shiyuData: Promise<ShiyuData | undefined> = loadShiyuData(shiyuId)
const shiyuDetail: Promise<ShiyuDetails | undefined> = loadShiyuDetails(rotatingShiyuId, "zh")
const allShiyu: Promise<Record<ShiyuId, LocalizedShiyu>> = loadAllShiyu("en")
const bossData: Promise<BossData | undefined> = loadBossData(bossId)
const bossDetail: Promise<BossDetails | undefined> = loadBossDetails(adjacentBossId, "zh")
const allBosses: Promise<Record<BossId, LocalizedBoss>> = loadAllBosses("en")
const simulData: Promise<SimulData | undefined> = loadSimulData(simulId)
const simulDetail: Promise<SimulDetails | undefined> = loadSimulDetails(adjacentSimulId, "zh")
const allSimul: Promise<Record<SimulId, LocalizedSimul>> = loadAllSimul("en")
const index: Promise<IntegratedSnapshotIndex> = loadIndex()
const data: Promise<AgentData | undefined> = loadAgentData(name)
const detail: Promise<AgentDetails | undefined> = loadAgentDetails(punctuated, "zh")
const all: Promise<Record<AgentName, LocalizedAgent>> = loadAllAgents("en")
const discData: Promise<DriveDiscData | undefined> = loadDriveDiscData(driveDiscName)
const discDetail: Promise<DriveDiscDetails | undefined> = loadDriveDiscDetails(spacedDiscName, "zh")
const allDiscs: Promise<Record<DriveDiscName, LocalizedDriveDisc>> = loadAllDriveDiscs("en")
const engineData: Promise<WEngineData | undefined> = loadWEngineData(wEngineName)
const engineDetail: Promise<WEngineDetails | undefined> = loadWEngineDetails(punctuatedEngineName, "zh")
const allEngines: Promise<Record<WEngineName, LocalizedWEngine>> = loadAllWEngines("en")
const bangbooData: Promise<BangbooData | undefined> = loadBangbooData(bangbooName)
const bangbooDetail: Promise<BangbooDetails | undefined> = loadBangbooDetails(spacedBangbooName, "zh")
const allBangboos: Promise<Record<BangbooName, LocalizedBangboo>> = loadAllBangboos("en")
function acceptsName(value: AgentName, locale: DetailLocale) { return loadAgentDetails(value, locale) }
function acceptsDriveDiscName(value: DriveDiscName, locale: DetailLocale) { return loadDriveDiscDetails(value, locale) }
function acceptsWEngineName(value: WEngineName, locale: DetailLocale) { return loadWEngineDetails(value, locale) }
function acceptsBangbooName(value: BangbooName, locale: DetailLocale) { return loadBangbooDetails(value, locale) }
function acceptsMonsterId(value: MonsterId, locale: DetailLocale) { return loadMonsterDetails(value, locale) }
function acceptsShiyuId(value: ShiyuId, locale: DetailLocale) { return loadShiyuDetails(value, locale) }
function acceptsBossId(value: BossId, locale: DetailLocale) { return loadBossDetails(value, locale) }
function acceptsSimulId(value: SimulId, locale: DetailLocale) { return loadSimulDetails(value, locale) }
// @ts-expect-error exact literal union, no arbitrary string
const wrong: AgentName = "AstraYao"
// @ts-expect-error exact drive disc literal union
const wrongDisc: DriveDiscName = "WoodpeckerElectro"
// @ts-expect-error exact WEngine literal union
const wrongEngine: WEngineName = "Lunar Pleniluna"
// @ts-expect-error exact bangboo literal union
const wrongBangboo: BangbooName = "Penguin"
// @ts-expect-error exact monster ID literal union; zero padding is not a canonical ID
const wrongMonsterId: MonsterId = "010000"
// @ts-expect-error exact shiyu ID literal union; zero padding is not a canonical ID
const wrongShiyuId: ShiyuId = "061001"
// @ts-expect-error exact boss ID literal union; zero padding is not a canonical ID
const wrongBossId: BossId = "069001"
// @ts-expect-error exact simul ID literal union; zero padding is not a canonical ID
const wrongSimulId: SimulId = "0101"
// @ts-expect-error arbitrary strings must be narrowed by the caller
loadAgentData("unknown" as string)
// @ts-expect-error arbitrary strings must be narrowed by the caller for drive discs
loadDriveDiscData("unknown" as string)
// @ts-expect-error arbitrary strings must be narrowed by the caller for WEngines
loadWEngineData("unknown" as string)
// @ts-expect-error arbitrary strings must be narrowed by the caller for bangboos
loadBangbooData("unknown" as string)
// @ts-expect-error arbitrary strings must be narrowed by the caller for monsters
loadMonsterData("unknown" as string)
// @ts-expect-error arbitrary strings must be narrowed by the caller for shiyu
loadShiyuData("unknown" as string)
// @ts-expect-error arbitrary strings must be narrowed by the caller for boss
loadBossData("unknown" as string)
// @ts-expect-error arbitrary strings must be narrowed by the caller for simul
loadSimulData("unknown" as string)
// @ts-expect-error misspelling
loadAgentDetails("astra yao", "en")
// @ts-expect-error drive disc misspelling without space
loadDriveDiscDetails("woodpecker electro", "en")
// @ts-expect-error WEngine misspelling with a different bracket
loadWEngineDetails("[Lunar]Pleniluna", "en")
// @ts-expect-error bangboo misspelling without the family suffix
loadBangbooDetails("Penguin", "en")
// @ts-expect-error scientific notation is not a canonical monster ID
loadMonsterDetails("1e4", "en")
// @ts-expect-error misspelled shiyu ID with zero padding
loadShiyuDetails("061001", "en")
// @ts-expect-error misspelled boss ID with zero padding
loadBossDetails("069001", "en")
// @ts-expect-error misspelled simul ID with zero padding
loadSimulDetails("0101", "en")
// @ts-expect-error numeric IDs are not names
loadAgentData(1311)
// @ts-expect-error numeric drive disc IDs are not names
loadDriveDiscData(31000)
// @ts-expect-error numeric WEngine IDs are not names
loadWEngineData(12001)
// @ts-expect-error numeric bangboo IDs are not names
loadBangbooData(53001)
// @ts-expect-error numeric monster IDs are not accepted without canonical string form
loadMonsterData(10000)
// @ts-expect-error numeric shiyu IDs are not accepted without canonical string form
loadShiyuData(61001)
// @ts-expect-error numeric boss IDs are not accepted without canonical string form
loadBossData(69001)
// @ts-expect-error numeric simul IDs are not accepted without canonical string form
loadSimulData(101)
// @ts-expect-error locale required
loadAgentDetails(name)
// @ts-expect-error drive disc locale required
loadDriveDiscDetails(driveDiscName)
// @ts-expect-error WEngine locale required
loadWEngineDetails(wEngineName)
// @ts-expect-error bangboo locale required
loadBangbooDetails(bangbooName)
// @ts-expect-error monster locale required
loadMonsterDetails(monsterId)
// @ts-expect-error shiyu locale required
loadShiyuDetails(shiyuId)
// @ts-expect-error boss locale required
loadBossDetails(bossId)
// @ts-expect-error simul locale required
loadSimulDetails(simulId)
// @ts-expect-error locale has no aliases
loadAllAgents("zh-CN")
// @ts-expect-error drive disc locale has no aliases
loadAllDriveDiscs("zh-CN")
// @ts-expect-error WEngine locale has no aliases
loadAllWEngines("zh-CN")
// @ts-expect-error bangboo locale has no aliases
loadAllBangboos("zh-CN")
// @ts-expect-error monster locale has no aliases
loadAllMonsters("zh-CN")
// @ts-expect-error shiyu locale has no aliases
loadAllShiyu("zh-CN")
// @ts-expect-error boss locale has no aliases
loadAllBosses("zh-CN")
// @ts-expect-error simul locale has no aliases
loadAllSimul("zh-CN")
// @ts-expect-error frozen readonly list
agentNames.push(name)
// @ts-expect-error readonly element
agentNames[0] = name
// @ts-expect-error frozen readonly drive disc list
driveDiscNames.push(driveDiscName)
// @ts-expect-error readonly drive disc element
driveDiscNames[0] = driveDiscName
// @ts-expect-error frozen readonly WEngine list
wEngineNames.push(wEngineName)
// @ts-expect-error readonly WEngine element
wEngineNames[0] = wEngineName
// @ts-expect-error frozen readonly bangboo list
bangbooNames.push(bangbooName)
// @ts-expect-error readonly bangboo element
bangbooNames[0] = bangbooName
// @ts-expect-error frozen readonly monster ID list
monsterIds.push(monsterId)
// @ts-expect-error readonly monster ID element
monsterIds[0] = monsterId
// @ts-expect-error frozen readonly shiyu ID list
shiyuIds.push(shiyuId)
// @ts-expect-error readonly shiyu ID element
shiyuIds[0] = shiyuId
// @ts-expect-error frozen readonly boss ID list
bossIds.push(bossId)
// @ts-expect-error readonly boss ID element
bossIds[0] = bossId
// @ts-expect-error frozen readonly simul ID list
simulIds.push(simulId)
// @ts-expect-error readonly simul ID element
simulIds[0] = simulId
void [numericSourceId, numericDriveDiscId, numericWEngineId, numericBangbooId, numericMonsterId, numericShiyuId, numericBossId, numericSimulId, names, discNames, engineNames, booNames, monsterIdentityList, shiyuIdentityList, bossIdentityList, simulIdentityList, index, data, detail, all, discData, discDetail, allDiscs, engineData, engineDetail, allEngines, bangbooData, bangbooDetail, allBangboos, monsterData, monsterDetail, allMonsters, shiyuData, shiyuDetail, allShiyu, bossData, bossDetail, allBosses, simulData, simulDetail, allSimul, acceptsName, acceptsDriveDiscName, acceptsWEngineName, acceptsBangbooName, acceptsMonsterId, acceptsShiyuId, acceptsBossId, acceptsSimulId, wrong, wrongDisc, wrongEngine, wrongBangboo, wrongMonsterId, wrongShiyuId, wrongBossId, wrongSimulId]
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
    const completionSource =
      typeSource +
      '\nloadAgentData("Soldier ")\nloadDriveDiscData("Woodpecker ")\nloadWEngineData("[Lunar")\nloadBangbooData("Penguin")\nloadMonsterData("1000")\n'
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
    expect(
      service
        .getCompletionsAtPosition(
          typeFile,
          completionSource.lastIndexOf("Soldier ") + "Soldier ".length,
          {},
        )
        ?.entries.map((entry) => entry.name),
    ).toEqual(expect.arrayContaining(expectedNames))
    // 名称补全包含带空格的驱动盘名称。
    expect(
      service
        .getCompletionsAtPosition(
          typeFile,
          completionSource.lastIndexOf("Woodpecker ") + "Woodpecker ".length,
          {},
        )
        ?.entries.map((entry) => entry.name),
    ).toEqual(expect.arrayContaining(expectedDriveDiscNames))
    // ID 补全包含规范十进制形式的怪物来源 ID。
    expect(
      service
        .getCompletionsAtPosition(
          typeFile,
          completionSource.lastIndexOf("1000") + "1000".length,
          {},
        )
        ?.entries.map((entry) => entry.name),
    ).toEqual(
      expect.arrayContaining(
        expectedMonsterIds.filter((id) => id.startsWith("1000")),
      ),
    )
    // 名称补全包含带空格与方括号的 WEngine 名称。
    expect(
      service
        .getCompletionsAtPosition(
          typeFile,
          completionSource.lastIndexOf("[Lunar") + "[Lunar".length,
          {},
        )
        ?.entries.map((entry) => entry.name),
    ).toEqual(expect.arrayContaining(expectedWEngineNames))
    // 名称补全包含带空格与标点的邦布名称。
    expect(
      service
        .getCompletionsAtPosition(
          typeFile,
          completionSource.lastIndexOf("Penguin") + "Penguin".length,
          {},
        )
        ?.entries.map((entry) => entry.name),
    ).toEqual(expect.arrayContaining(expectedBangbooNames))
    service.dispose()
    // Fresh private copies: never mutate the offline install's content-addressed files.
    const brokenConsumer = join(temporaryDirectory, "broken")
    const brokenPackage = join(brokenConsumer, "node_modules/@randomplay/data")
    mkdirSync(dirname(brokenPackage), { recursive: true })
    cpSync(packedRoot, brokenPackage, { recursive: true })
    writeFileSync(join(brokenConsumer, "package.json"), '{"type":"module"}')
    const agentCount = index.entities.agents.memberIds.length
    const driveDiscCount = index.entities["drive-discs"].memberIds.length
    const wEngineCount = index.entities["w-engines"].memberIds.length
    const bangbooCount = index.entities["bangboos"].memberIds.length
    const monsterCount = index.entities["monsters"].memberIds.length
    const shiyuCount = index.entities["shiyu"].memberIds.length
    const bossCount = index.entities["boss"].memberIds.length
    const simulCount = index.entities["simul"].memberIds.length
    // 各行：损坏文件、必须拒绝的调用、以及跨类别隔离断言（其余类别的单体与全量读取仍成功）。
    for (const [path, call, isolation] of [
      [
        "index.json",
        "api.loadIndex()",
        'assert.equal((await api.loadAgentData("Astra Yao")).id, 1311); assert.equal((await api.loadDriveDiscData("Woodpecker Electro")).id, 31000); assert.equal((await api.loadWEngineData("[Lunar] Pleniluna")).id, 12001); assert.equal((await api.loadBangbooData("Penguinboo")).id, 53001); await api.loadAllAgents("zh"); await api.loadAllDriveDiscs("zh"); await api.loadAllWEngines("zh"); await api.loadAllBangboos("zh")',
      ],
      [
        "agents/1311/data.json",
        'api.loadAgentData("Astra Yao")',
        'await assert.rejects(api.loadAllAgents("en")); await assert.rejects(api.loadAllAgents("zh")); assert.equal((await api.loadDriveDiscData("Woodpecker Electro")).id, 31000); await api.loadAllDriveDiscs("en"); await api.loadAllWEngines("en")',
      ],
      [
        "agents/1311/details.en.json",
        'api.loadAgentDetails("Astra Yao", "en")',
        'await assert.rejects(api.loadAllAgents("en")); await api.loadAllAgents("zh"); assert.equal((await api.loadDriveDiscDetails("Woodpecker Electro", "en")).name, "Woodpecker Electro"); await api.loadAllDriveDiscs("en"); await api.loadAllWEngines("en")',
      ],
      [
        "drive-discs/31000/data.json",
        'api.loadDriveDiscData("Woodpecker Electro")',
        'await assert.rejects(api.loadAllDriveDiscs("en")); await assert.rejects(api.loadAllDriveDiscs("zh")); assert.equal((await api.loadAgentData("Astra Yao")).id, 1311); await api.loadAllAgents("en"); await api.loadAllWEngines("en")',
      ],
      [
        "drive-discs/31000/details.zh.json",
        'api.loadDriveDiscDetails("Woodpecker Electro", "zh")',
        'await assert.rejects(api.loadAllDriveDiscs("zh")); await api.loadAllDriveDiscs("en"); assert.equal((await api.loadAgentDetails("Astra Yao", "zh")).locale, "zh"); await api.loadAllAgents("zh"); await api.loadAllWEngines("zh")',
      ],
      [
        "w-engines/12001/data.json",
        'api.loadWEngineData("[Lunar] Pleniluna")',
        'await assert.rejects(api.loadAllWEngines("en")); await assert.rejects(api.loadAllWEngines("zh")); assert.equal((await api.loadAgentData("Astra Yao")).id, 1311); await api.loadAllAgents("en"); await api.loadAllDriveDiscs("en")',
      ],
      [
        "w-engines/12001/details.zh.json",
        'api.loadWEngineDetails("[Lunar] Pleniluna", "zh")',
        'await assert.rejects(api.loadAllWEngines("zh")); await api.loadAllWEngines("en"); assert.equal((await api.loadAgentDetails("Astra Yao", "zh")).locale, "zh"); await api.loadAllAgents("zh"); await api.loadAllDriveDiscs("zh")',
      ],
      [
        "bangboos/53001/data.json",
        'api.loadBangbooData("Penguinboo")',
        'await assert.rejects(api.loadAllBangboos("en")); await assert.rejects(api.loadAllBangboos("zh")); assert.equal((await api.loadAgentData("Astra Yao")).id, 1311); await api.loadAllAgents("en"); await api.loadAllDriveDiscs("en"); await api.loadAllWEngines("en")',
      ],
      [
        "bangboos/53001/details.zh.json",
        'api.loadBangbooDetails("Penguinboo", "zh")',
        'await assert.rejects(api.loadAllBangboos("zh")); await api.loadAllBangboos("en"); assert.equal((await api.loadAgentDetails("Astra Yao", "zh")).locale, "zh"); await api.loadAllAgents("zh"); await api.loadAllDriveDiscs("zh"); await api.loadAllWEngines("zh")',
      ],
      [
        "monsters/10000/data.json",
        'api.loadMonsterData("10000")',
        'await assert.rejects(api.loadAllMonsters("en")); await assert.rejects(api.loadAllMonsters("zh")); assert.equal((await api.loadAgentData("Astra Yao")).id, 1311); await api.loadAllAgents("en"); await api.loadAllDriveDiscs("en"); await api.loadAllWEngines("en"); await api.loadAllBangboos("en")',
      ],
      [
        "monsters/10000/details.zh.json",
        'api.loadMonsterDetails("10000", "zh")',
        'await assert.rejects(api.loadAllMonsters("zh")); await api.loadAllMonsters("en"); assert.equal((await api.loadAgentDetails("Astra Yao", "zh")).locale, "zh"); await api.loadAllAgents("zh"); await api.loadAllDriveDiscs("zh"); await api.loadAllWEngines("zh"); await api.loadAllBangboos("zh")',
      ],
      [
        "shiyu/61001/data.json",
        'api.loadShiyuData("61001")',
        'await assert.rejects(api.loadAllShiyu("en")); await assert.rejects(api.loadAllShiyu("zh")); assert.equal((await api.loadAgentData("Astra Yao")).id, 1311); await api.loadAllAgents("en"); await api.loadAllDriveDiscs("en"); await api.loadAllWEngines("en"); await api.loadAllBangboos("en"); await api.loadAllMonsters("en")',
      ],
      [
        "shiyu/61001/details.zh.json",
        'api.loadShiyuDetails("61001", "zh")',
        'await assert.rejects(api.loadAllShiyu("zh")); await api.loadAllShiyu("en"); assert.equal((await api.loadAgentDetails("Astra Yao", "zh")).locale, "zh"); await api.loadAllAgents("zh"); await api.loadAllDriveDiscs("zh"); await api.loadAllWEngines("zh"); await api.loadAllBangboos("zh"); await api.loadAllMonsters("zh")',
      ],
      [
        "boss/69001/data.json",
        'api.loadBossData("69001")',
        'await assert.rejects(api.loadAllBosses("en")); await assert.rejects(api.loadAllBosses("zh")); assert.equal((await api.loadAgentData("Astra Yao")).id, 1311); await api.loadAllAgents("en"); await api.loadAllDriveDiscs("en"); await api.loadAllWEngines("en"); await api.loadAllBangboos("en"); await api.loadAllMonsters("en"); await api.loadAllShiyu("en")',
      ],
      [
        "boss/69001/details.zh.json",
        'api.loadBossDetails("69001", "zh")',
        'await assert.rejects(api.loadAllBosses("zh")); await api.loadAllBosses("en"); assert.equal((await api.loadAgentDetails("Astra Yao", "zh")).locale, "zh"); await api.loadAllAgents("zh"); await api.loadAllDriveDiscs("zh"); await api.loadAllWEngines("zh"); await api.loadAllBangboos("zh"); await api.loadAllMonsters("zh"); await api.loadAllShiyu("zh")',
      ],
      [
        "simul/101/data.json",
        'api.loadSimulData("101")',
        'await assert.rejects(api.loadAllSimul("en")); await assert.rejects(api.loadAllSimul("zh")); assert.equal((await api.loadAgentData("Astra Yao")).id, 1311); await api.loadAllAgents("en"); await api.loadAllDriveDiscs("en"); await api.loadAllWEngines("en"); await api.loadAllBangboos("en"); await api.loadAllMonsters("en"); await api.loadAllShiyu("en"); await api.loadAllBosses("en")',
      ],
      [
        "simul/101/details.zh.json",
        'api.loadSimulDetails("101", "zh")',
        'await assert.rejects(api.loadAllSimul("zh")); await api.loadAllSimul("en"); assert.equal((await api.loadAgentDetails("Astra Yao", "zh")).locale, "zh"); await api.loadAllAgents("zh"); await api.loadAllDriveDiscs("zh"); await api.loadAllWEngines("zh"); await api.loadAllBangboos("zh"); await api.loadAllMonsters("zh"); await api.loadAllShiyu("zh"); await api.loadAllBosses("zh")',
      ],
    ]) {
      const fullPath = join(brokenPackage, "dist/integrated", path)
      const bytes = readFileSync(fullPath)
      for (const corruption of ["missing", "parse"]) {
        if (corruption === "missing") rmSync(fullPath)
        else writeFileSync(fullPath, "{")
        runNode(
          brokenConsumer,
          `import assert from "node:assert/strict"; import * as api from "@randomplay/data"; assert.equal(api.agentNames.length, ${agentCount}); assert.equal(api.driveDiscNames.length, ${driveDiscCount}); assert.equal(api.wEngineNames.length, ${wEngineCount}); assert.equal(api.bangbooNames.length, ${bangbooCount}); assert.equal(api.monsterIds.length, ${monsterCount}); assert.equal(api.shiyuIds.length, ${shiyuCount}); assert.equal(api.bossIds.length, ${bossCount}); assert.equal(api.simulIds.length, ${simulCount}); await assert.rejects(${call}); ${isolation}`,
        )
        writeFileSync(fullPath, bytes)
      }
    }
    // Root import must still succeed when every JSON file is absent, for all name catalogs.
    for (const [path, call] of [
      ["agents/1311.json", 'api.loadAgentLevel60Attributes("Astra Yao")'],
      [
        "w-engines/14131.json",
        'api.loadWEngineLevel60Attributes("Elegant Vanity")',
      ],
      ["drive-disc-affixes.json", "api.loadSDriveDiscMaxLevelAffixes()"],
    ]) {
      const file = join(brokenPackage, "dist/definitions/attributes", path)
      const original = readFileSync(file)
      for (const corruption of ["missing", "parse"]) {
        if (corruption === "missing") rmSync(file)
        else writeFileSync(file, "{")
        runNode(
          brokenConsumer,
          `import assert from "node:assert/strict"; import * as api from "@randomplay/data"; await assert.rejects(${call}); assert.equal((await api.loadAgentData("Astra Yao")).id, 1311)`,
        )
        writeFileSync(file, original)
      }
    }
    rmSync(join(brokenPackage, "dist/integrated"), { recursive: true })
    rmSync(join(brokenPackage, "dist/definitions"), { recursive: true })
    runNode(
      brokenConsumer,
      'import assert from "node:assert/strict"; import { agentNames, bangbooNames, bossIds, simulIds, driveDiscNames, monsterIds, shiyuIds, wEngineNames, loadAgentData, loadBangbooData, loadBossData, loadSimulData, loadDriveDiscData, loadMonsterData, loadShiyuData, loadWEngineData } from "@randomplay/data"; assert.equal(agentNames.length, ' +
        agentCount +
        "); assert.equal(driveDiscNames.length, " +
        driveDiscCount +
        "); assert.equal(wEngineNames.length, " +
        wEngineCount +
        "); assert.equal(bangbooNames.length, " +
        bangbooCount +
        "); assert.equal(monsterIds.length, " +
        monsterCount +
        "); assert.equal(shiyuIds.length, " +
        shiyuCount +
        "); assert.equal(bossIds.length, " +
        bossCount +
        "); assert.equal(simulIds.length, " +
        simulCount +
        '); await assert.rejects(loadAgentData("Astra Yao")); await assert.rejects(loadDriveDiscData("Woodpecker Electro")); await assert.rejects(loadWEngineData("[Lunar] Pleniluna")); await assert.rejects(loadBangbooData("Penguinboo")); await assert.rejects(loadMonsterData("10000")); await assert.rejects(loadShiyuData("61001")); await assert.rejects(loadBossData("69001")); await assert.rejects(loadSimulData("101"))',
    )
    // Exercise both build boundaries with the real tsdown process in this private checkout.
    for (const intervention of ["source-change", "dist-corruption"]) {
      const trace = join(temporaryDirectory, `${intervention}.trace`)
      const build = spawnSync(
        process.execPath,
        [
          "--import",
          pathToFileURL(
            join(cleanPackage, "test/fixtures/publication-build-preload.ts"),
          ).href,
          join(cleanPackage, "node_modules/tsdown/dist/run.mjs"),
        ],
        {
          cwd: cleanPackage,
          encoding: "utf8",
          timeout: 30_000,
          env: {
            ...checkoutEnvironment,
            FAIRY_PUBLICATION_TEST_PACKAGE: cleanPackage,
            FAIRY_PUBLICATION_TEST_INTERVENTION: intervention,
            FAIRY_PUBLICATION_TEST_TRACE: trace,
          },
        },
      )
      expect(build.error).toBeUndefined()
      expect(build.signal).toBeNull()
      expect(existsSync(trace), build.stdout + build.stderr).toBe(true)
      expect(readFileSync(trace, "utf8")).toBe(intervention)
      if (intervention === "source-change") {
        expect(build.status, build.stdout + build.stderr).toBe(0)
        await verifyIntegratedSnapshot({
          artifactDirectory: join(cleanPackage, "integrated"),
        })
        expect(
          JSON.parse(
            readFileSync(
              join(cleanPackage, "integrated/agents/1311/details.en.json"),
              "utf8",
            ),
          ).name,
        ).toBe("Astra Yao [next snapshot]")
        for (const path of jsonFiles)
          expectSameBytes(
            readFileSync(join(cleanPackage, "dist/integrated", path)),
            readFileSync(join(snapshot, path)),
            path,
          )
        for (const path of attributeFiles)
          expectSameBytes(
            readFileSync(
              join(cleanPackage, "dist/definitions/attributes", path),
            ),
            readFileSync(join(packedRoot, "dist/definitions/attributes", path)),
            path,
          )
        expect(
          JSON.parse(
            readFileSync(
              join(cleanPackage, "definitions/attributes/agents/1311.json"),
              "utf8",
            ),
          ).baseAttributes.attack.value,
        ).toBe(641.7699)
        // Published declarations and the runtime name table come from the same captured snapshot.
        const declarations = listFiles(join(cleanPackage, "dist"))
          .filter((path) => path.endsWith(".d.mts"))
          .map((path) => readFileSync(join(cleanPackage, "dist", path), "utf8"))
          .join("\n")
        const changedName = JSON.stringify("Astra Yao [next snapshot]")
        expect(declarations).toContain(JSON.stringify("Astra Yao"))
        expect(declarations).toContain(JSON.stringify("Woodpecker Electro"))
        expect(declarations).toContain(JSON.stringify("[Lunar] Pleniluna"))
        expect(declarations).toContain(JSON.stringify("Penguinboo"))
        expect(declarations).not.toContain(changedName)
        expect(
          JSON.parse(
            runNode(
              cleanPackage,
              'import { agentNames, loadAgentDetails } from "./dist/index.mjs"; console.log(JSON.stringify(await Promise.all(agentNames.map(async name => (await loadAgentDetails(name, "en")).name))))',
            ),
          ),
        ).toEqual(expectedNames)
        expect(
          JSON.parse(
            runNode(
              cleanPackage,
              'import { driveDiscNames, loadDriveDiscDetails } from "./dist/index.mjs"; console.log(JSON.stringify(await Promise.all(driveDiscNames.map(async name => (await loadDriveDiscDetails(name, "en")).name))))',
            ),
          ),
        ).toEqual(expectedDriveDiscNames)
        expect(
          JSON.parse(
            runNode(
              cleanPackage,
              'import { wEngineNames, loadWEngineDetails } from "./dist/index.mjs"; console.log(JSON.stringify(await Promise.all(wEngineNames.map(async name => (await loadWEngineDetails(name, "en")).name))))',
            ),
          ),
        ).toEqual(expectedWEngineNames)
        expect(
          JSON.parse(
            runNode(
              cleanPackage,
              'import { bangbooNames, loadBangbooDetails } from "./dist/index.mjs"; console.log(JSON.stringify(await Promise.all(bangbooNames.map(async name => (await loadBangbooDetails(name, "en")).name))))',
            ),
          ),
        ).toEqual(expectedBangbooNames)
        expect(
          JSON.parse(
            runNode(
              cleanPackage,
              'import { monsterIds, loadMonsterDetails } from "./dist/index.mjs"; console.log(JSON.stringify(await Promise.all(monsterIds.map(async id => String((await loadMonsterDetails(id, "en")).id)))))',
            ),
          ),
        ).toEqual(expectedMonsterIds)
        expect(
          JSON.parse(
            runNode(
              cleanPackage,
              'import { shiyuIds, loadShiyuDetails } from "./dist/index.mjs"; console.log(JSON.stringify(await Promise.all(shiyuIds.map(async id => String((await loadShiyuDetails(id, "en")).id)))))',
            ),
          ),
        ).toEqual(expectedShiyuIds)
        expect(
          JSON.parse(
            runNode(
              cleanPackage,
              'import { bossIds, loadBossDetails } from "./dist/index.mjs"; console.log(JSON.stringify(await Promise.all(bossIds.map(async id => String((await loadBossDetails(id, "en")).id)))))',
            ),
          ),
        ).toEqual(expectedBossIds)
        expect(
          JSON.parse(
            runNode(
              cleanPackage,
              'import { simulIds, loadSimulDetails } from "./dist/index.mjs"; console.log(JSON.stringify(await Promise.all(simulIds.map(async id => String((await loadSimulDetails(id, "en")).id)))))',
            ),
          ),
        ).toEqual(expectedSimulIds)
      } else {
        expect(build.status).toBe(1)
        expect(build.stdout + build.stderr).toContain("摘要不一致")
      }
    }
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
