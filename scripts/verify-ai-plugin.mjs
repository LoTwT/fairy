import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { isDeepStrictEqual } from "node:util"

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)))

const pluginRoot = path.join(repoRoot, ".claude-plugin/plugins/fairy")
const pluginJsonPath = path.join(pluginRoot, "plugin.json")
const skillNames = ["fairy-snapshot", "fairy-calc", "fairy-explain"]
const requiredDocsByKey = {
  architecture: "docs/ai-plugin/architecture.md",
  userJourneys: "docs/ai-plugin/user-journeys.md",
  promptTemplates: "docs/ai-plugin/prompt-templates.md",
  acceptance: "docs/ai-plugin/acceptance.md",
  decision: "docs/product/decisions/D-21-ai-plugin.md",
}
const requiredDocs = Object.values(requiredDocsByKey)
const exampleDirs = [
  "examples/ai-plugin/prompts",
  "examples/ai-plugin/snapshots",
  "examples/ai-plugin/expected",
]
const requiredExampleFiles = [
  "examples/ai-plugin/README.md",
  "examples/ai-plugin/entity-normalization.md",
  "examples/ai-plugin/prompts/build-yixuan-basic.md",
  "examples/ai-plugin/prompts/build-yixuan-full.md",
  "examples/ai-plugin/prompts/build-anby-ambiguous.md",
  "examples/ai-plugin/prompts/build-yixuan-unknown.md",
  "examples/ai-plugin/prompts/calc-yixuan.md",
  "examples/ai-plugin/prompts/explain-yixuan-trace.md",
  "examples/ai-plugin/snapshots/yixuan-basic.snapshot.json",
  "examples/ai-plugin/snapshots/yixuan-full.snapshot.json",
  "examples/ai-plugin/expected/yixuan-basic.calc.json",
  "examples/ai-plugin/expected/yixuan-basic.draft-metadata.json",
  "examples/ai-plugin/expected/yixuan-basic.explain.zh.md",
  "examples/ai-plugin/expected/yixuan-basic.explain.en.md",
]
const entitySectionDomains = [
  { heading: "Agents (characters)", domain: "agents", type: "character" },
  { heading: "W-Engines (weapons)", domain: "wEngines", type: "weapon" },
  { heading: "Drive Disc sets (equipment)", domain: "driveDiscs", type: "equipment" },
  { heading: "Bangboos", domain: "bangboos", type: "bangboo" },
  { heading: "Enemies (monsters)", domain: "enemies", type: "monster" },
]

const errors = []

function assert(condition, message) {
  if (!condition)
    errors.push(message)
}

function readText(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8")
}

function readJsonPath(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"))
  }
  catch (error) {
    errors.push(`${path.relative(repoRoot, filePath)} is not valid JSON: ${error.message}`)
    return {}
  }
}

function readJson(relativePath) {
  return readJsonPath(path.join(repoRoot, relativePath))
}

function listFilesRecursive(dir) {
  if (!existsSync(dir))
    return []

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory())
      return listFilesRecursive(fullPath)
    return [fullPath]
  })
}

function includesAll(text, relativePath, snippets) {
  for (const snippet of snippets)
    assert(text.includes(snippet), `${relativePath} missing required text: ${snippet}`)
}

function formatNumber(value) {
  return Math.round(value).toLocaleString("en-US")
}

function collectRegexMatches(text, regex) {
  return Array.from(text.matchAll(regex), match => match[0])
}

function assertNoForbiddenPatterns(files, patterns) {
  for (const file of files) {
    const relativePath = path.relative(repoRoot, file)
    const text = readFileSync(file, "utf8")
    for (const { pattern, reason } of patterns) {
      const matches = text.match(pattern)
      assert(!matches, `${relativePath}: ${reason}`)
    }
  }
}

assert(existsSync(pluginJsonPath), ".claude-plugin/plugins/fairy/plugin.json is missing")
const plugin = readJsonPath(pluginJsonPath)

assert(plugin.name === "fairy", "plugin.json name must be fairy")
assert(typeof plugin.version === "string" && plugin.version.length > 0, "plugin.json version is required")
assert(plugin.minFairyCliVersion === "0.1.2", "plugin.json minFairyCliVersion must be 0.1.2")
assert(plugin.displayName?.en && plugin.displayName?.zh, "plugin.json displayName.en and displayName.zh are required")
assert(Array.isArray(plugin.supportedTools), "plugin.json supportedTools must be an array")
assert(plugin.supportedTools?.includes("claude-code"), "plugin.json supportedTools must include claude-code")
assert(plugin.supportedTools?.includes("codex"), "plugin.json supportedTools must include codex")
assert(!plugin.supportedTools?.includes("cursor"), "plugin.json must not include cursor for V1.2.2")
assert(JSON.stringify(plugin.skills) === JSON.stringify(skillNames), "plugin.json skills must match canonical skill names")

for (const doc of requiredDocs)
  assert(existsSync(path.join(repoRoot, doc)), `required doc is missing: ${doc}`)

assert(plugin.docs && typeof plugin.docs === "object" && !Array.isArray(plugin.docs), "plugin.json docs object is required")
for (const [key, doc] of Object.entries(requiredDocsByKey))
  assert(plugin.docs?.[key] === doc, `plugin.json docs.${key} must be ${doc}`)

for (const [key, doc] of Object.entries(plugin.docs ?? {}))
  assert(existsSync(path.join(repoRoot, doc)), `plugin.json docs.${key} points to a missing file: ${doc}`)

for (const dir of exampleDirs)
  assert(existsSync(path.join(repoRoot, dir)), `example directory is missing: ${dir}`)

for (const file of requiredExampleFiles)
  assert(existsSync(path.join(repoRoot, file)), `required AI plugin example fixture is missing: ${file}`)

assert(existsSync(path.join(repoRoot, ".codex/README.md")), ".codex/README.md is missing")

const skillsRoot = path.join(pluginRoot, "skills")
assert(existsSync(skillsRoot), ".claude-plugin/plugins/fairy/skills is missing")
if (existsSync(skillsRoot)) {
  const actualSkillDirs = readdirSync(skillsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
  const expectedSkillDirs = [...skillNames].sort()
  assert(
    JSON.stringify(actualSkillDirs) === JSON.stringify(expectedSkillDirs),
    `skills directory set must be exactly ${expectedSkillDirs.join(", ")}; got ${actualSkillDirs.join(", ")}`,
  )
}

for (const skillName of skillNames) {
  const skillRelativePath = `.claude-plugin/plugins/fairy/skills/${skillName}/SKILL.md`
  const skillPath = path.join(repoRoot, skillRelativePath)
  assert(existsSync(skillPath), `${skillRelativePath} is missing`)
  if (!existsSync(skillPath))
    continue

  const text = readText(skillRelativePath)
  includesAll(text, skillRelativePath, [
    "---",
    `name: ${skillName}`,
    "description:",
    "displayName:",
    "## Purpose",
    "## Trigger Phrases",
    "## Inputs",
    "## Outputs",
    "## Workflow",
    "## Boundaries",
    "## Failure Policy",
    "## References",
  ])

  for (const doc of requiredDocs)
    assert(text.includes(doc), `${skillRelativePath} must link ${doc}`)
}

const snapshotSkill = readText(".claude-plugin/plugins/fairy/skills/fairy-snapshot/SKILL.md")
assert(!snapshotSkill.includes("fairy calc <snapshot>"), "fairy-snapshot must not call fairy calc directly")
assert(snapshotSkill.includes("review/confirm"), "fairy-snapshot must document review/confirm handoff")

const calcSkill = readText(".claude-plugin/plugins/fairy/skills/fairy-calc/SKILL.md")
assert(
  calcSkill.includes("fairy calc <snapshot> --view verbose --lang <zh|en>"),
  "fairy-calc must document the canonical CLI command",
)

const explainSkill = readText(".claude-plugin/plugins/fairy/skills/fairy-explain/SKILL.md")
assert(explainSkill.includes("Do not call `fairy calc`"), "fairy-explain must forbid calculation")
assert(explainSkill.includes("explain trace"), "fairy-explain must keep trace as an alias")

const pluginForbiddenPatterns = [
  { pattern: /--preflight/g, reason: "must not depend on nonexistent --preflight" },
  { pattern: /--dry-run/g, reason: "must not depend on nonexistent --dry-run" },
  { pattern: /fairy-compare/g, reason: "compare skill is deferred" },
  { pattern: /fairy compare/g, reason: "fairy compare command is deferred" },
  { pattern: /\.cursor/g, reason: "Cursor is deferred from V1.2.2" },
  { pattern: /packages\/data\/source/g, reason: "plugin must not read raw source" },
]

const exampleForbiddenPatterns = [
  ...pluginForbiddenPatterns,
  { pattern: /命破之刃|Doom Blade|钢铁躯壳|Steel Cushion \(alias\)|\b32004\b/g, reason: "example fixtures must use current runtime GameData ids/names" },
]

assertNoForbiddenPatterns(
  listFilesRecursive(pluginRoot).concat([path.join(repoRoot, ".codex/README.md")]),
  pluginForbiddenPatterns,
)
assertNoForbiddenPatterns(
  listFilesRecursive(path.join(repoRoot, "examples/ai-plugin"))
    .concat([path.join(repoRoot, "docs/ai-plugin/prompt-templates.md")]),
  exampleForbiddenPatterns,
)

try {
  execFileSync("node", ["scripts/ensure-core-build.mjs"], { cwd: repoRoot, encoding: "utf8" })
}
catch (error) {
  errors.push(`core dist freshness check failed before AI plugin fixture validation: ${error.message}`)
}

const coreDistPath = path.join(repoRoot, "packages/core/dist/index.mjs")
let core
try {
  core = await import(pathToFileURL(coreDistPath).href)
}
catch (error) {
  errors.push(`packages/core/dist/index.mjs could not be imported; run pnpm build first: ${error.message}`)
}

const gameData = readJson("packages/data/cleaned/runtime/game-data.json")?.data ?? {}

function assertRuntimeEntity(domain, id, context) {
  const entity = gameData?.[domain]?.[id]
  assert(entity, `${context}: ${domain}.${id} is missing from packages/data/cleaned/runtime/game-data.json`)
  return entity
}

function assertEntityLabelInVariants(entity, variants, context) {
  const zh = entity?.label?.zh
  const en = entity?.label?.en
  const variantTokens = variants.split("/").map(variant => variant.trim()).filter(Boolean)
  if (zh || en) {
    assert(
      (zh !== undefined && variantTokens.includes(zh)) || (en !== undefined && variantTokens.includes(en)),
      `${context}: variants must include current runtime label (${zh ?? "no zh"} / ${en ?? "no en"})`,
    )
  }
}

function verifyEntityNormalizationFixture() {
  const relativePath = "examples/ai-plugin/entity-normalization.md"
  const text = readText(relativePath)
  const lines = text.split("\n")
  let currentSection
  for (const line of lines) {
    const heading = line.match(/^## (.+)$/)?.[1]
    if (heading !== undefined) {
      currentSection = entitySectionDomains.find(section => heading.startsWith(section.heading))
      continue
    }

    if (currentSection === undefined)
      continue

    const row = line.match(/^\|\s*(.+?)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|$/)
    if (row === null)
      continue

    const [, variants, id, type] = row
    assert(type.includes(currentSection.type), `${relativePath}: ${id} must be typed as ${currentSection.type}`)
    const entity = assertRuntimeEntity(currentSection.domain, id, `${relativePath}: ${variants}`)
    assertEntityLabelInVariants(entity, variants, `${relativePath}: ${currentSection.domain}.${id}`)
  }
}

function verifySnapshotFixture(relativePath) {
  const snapshot = readJson(relativePath)
  if (core?.parseBattleSnapshot !== undefined) {
    try {
      core.parseBattleSnapshot(snapshot)
    }
    catch (error) {
      errors.push(`${relativePath} does not parse as BattleSnapshot: ${error.message}`)
      return snapshot
    }
  }

  const text = readText(relativePath)
  includesAll(text, relativePath, [
    "\"agentId\": \"1371\"",
    "\"id\": \"14137\"",
    "\"setId\": \"31000\"",
    "\"setId\": \"31400\"",
    "\"enemyId\": \"30004\"",
  ])
  assert(!text.includes("defaultedFields"), `${relativePath} must not embed draftMetadata.defaultedFields`)
  assert(!text.includes("unknownFields"), `${relativePath} must not embed draftMetadata.unknownFields`)
  assert(!text.includes("\"unknown\""), `${relativePath} must not write unknown as a strict snapshot value`)

  for (const agent of snapshot.team ?? []) {
    assertRuntimeEntity("agents", agent.agentId, `${relativePath}: team agent`)
    if (agent.wEngine?.id !== undefined)
      assertRuntimeEntity("wEngines", agent.wEngine.id, `${relativePath}: W-Engine`)
    for (const disc of agent.driveDiscs ?? []) {
      if (disc.setId !== undefined)
        assertRuntimeEntity("driveDiscs", disc.setId, `${relativePath}: Drive Disc set`)
    }
  }
  if (snapshot.bangboo?.bangbooId !== undefined)
    assertRuntimeEntity("bangboos", snapshot.bangboo.bangbooId, `${relativePath}: Bangboo`)
  if (snapshot.enemy?.enemyId !== undefined)
    assertRuntimeEntity("enemies", snapshot.enemy.enemyId, `${relativePath}: enemy`)

  return snapshot
}

function verifyDraftMetadata(snapshot) {
  const relativePath = "examples/ai-plugin/expected/yixuan-basic.draft-metadata.json"
  const metadata = readJson(relativePath)
  assert(Array.isArray(metadata.defaultedFields), `${relativePath} defaultedFields must be an array`)
  assert(Array.isArray(metadata.unknownFields), `${relativePath} unknownFields must be an array`)
  assert(Array.isArray(metadata.warnings), `${relativePath} warnings must be an array`)
  assert(Array.isArray(metadata.askUserTurns), `${relativePath} askUserTurns must be an array`)
  assert(Array.isArray(metadata.entityNormalization), `${relativePath} entityNormalization must be an array`)
  assert(metadata.sessionLang === "zh", `${relativePath} sessionLang must be zh for the baseline fixture`)

  const expectedEntityRows = [
    ["仪玄", "character.id=1371"],
    ["青溟笼舍", "weapon.id=14137"],
    ["啄木鸟电音", "equipment.setId=31000"],
    ["激素朋克", "equipment.setId=31400"],
    ["危局强袭战", "enemy.id=30004"],
  ]
  for (const [input, canonical] of expectedEntityRows) {
    assert(
      metadata.entityNormalization.some(row => row.input === input && row.canonical === canonical),
      `${relativePath} missing entityNormalization row ${input} -> ${canonical}`,
    )
  }

  assert(snapshot?.team?.[0]?.wEngine?.id === "14137", `${relativePath} expected snapshot weapon id 14137`)
  assert(snapshot?.enemy?.enemyId === "30004", `${relativePath} expected snapshot enemy id 30004`)
}

function runCliCalcFixture() {
  const output = execFileSync(
    "pnpm",
    [
      "--filter",
      "@randomplay/cli",
      "exec",
      "tsx",
      "src/index.ts",
      "calc",
      "../../examples/ai-plugin/snapshots/yixuan-basic.snapshot.json",
      "--view",
      "verbose",
      "--lang",
      "zh",
      "--pretty",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  )
  return JSON.parse(output)
}

function verifyCalcFixture(snapshot) {
  const relativePath = "examples/ai-plugin/expected/yixuan-basic.calc.json"
  const expected = readJson(relativePath)
  if (core?.parseCalcResult !== undefined) {
    try {
      core.parseCalcResult(expected)
    }
    catch (error) {
      errors.push(`${relativePath} does not parse as CalcResult: ${error.message}`)
    }
  }

  let actual
  try {
    actual = runCliCalcFixture()
  }
  catch (error) {
    errors.push(`fairy-calc fixture command failed: ${error.message}`)
    return expected
  }

  assert(isDeepStrictEqual(actual, expected), `${relativePath} must match freshly generated fairy CLI verbose output`)
  assert(expected.locale === "zh", `${relativePath} must preserve zh locale for baseline calc`)
  assert(expected.summary?.activeActorId === snapshot?.activeActor?.agentId, `${relativePath} activeActorId must match snapshot`)
  assert(expected.summary?.enemyId === snapshot?.enemy?.enemyId, `${relativePath} enemyId must match snapshot`)
  assert(Array.isArray(expected.trace) && expected.trace.length > 0, `${relativePath} must include verbose trace events`)
  assert(Array.isArray(expected.warnings), `${relativePath} warnings must be an array`)
  assert(Array.isArray(expected.errors), `${relativePath} errors must be an array`)
  return expected
}

function verifyPromptFixtures(calcResult) {
  const yixuanPrompt = readText("examples/ai-plugin/prompts/build-yixuan-basic.md")
  includesAll(yixuanPrompt, "examples/ai-plugin/prompts/build-yixuan-basic.md", [
    "青溟笼舍",
    "Qingming Birdcage",
    "激素朋克",
    "Hormone Punk",
    "格莱特",
    "Greta",
    "AI must not invoke `fairy calc` from fairy-snapshot",
  ])

  const calcPrompt = readText("examples/ai-plugin/prompts/calc-yixuan.md")
  includesAll(calcPrompt, "examples/ai-plugin/prompts/calc-yixuan.md", [
    "fairy calc <snapshots/yixuan-basic.snapshot.json> --view verbose --lang zh",
    "CLI not installed",
    "AI does **not** attempt to compute anything",
    "CLI failure",
    "does NOT fabricate result",
  ])
  assert(
    calcPrompt.includes(formatNumber(calcResult.summary.displayTotalDamage)),
    "examples/ai-plugin/prompts/calc-yixuan.md must include current displayTotalDamage",
  )
  assert(
    calcPrompt.includes(formatNumber(calcResult.summary.lanes.nonCrit.displayDamage)),
    "examples/ai-plugin/prompts/calc-yixuan.md must include current nonCrit displayDamage",
  )
  assert(
    calcPrompt.includes(formatNumber(calcResult.summary.lanes.crit.displayDamage)),
    "examples/ai-plugin/prompts/calc-yixuan.md must include current crit displayDamage",
  )

  const explainPrompt = readText("examples/ai-plugin/prompts/explain-yixuan-trace.md")
  includesAll(explainPrompt, "examples/ai-plugin/prompts/explain-yixuan-trace.md", [
    "AI does NOT invoke `fairy calc`",
    "malformed CalcResult",
    "Warnings preserved",
  ])
}

function verifyExplainFixture(calcResult) {
  const traceIds = new Set(calcResult.trace.map(trace => trace.id))
  for (const relativePath of [
    "examples/ai-plugin/expected/yixuan-basic.explain.zh.md",
    "examples/ai-plugin/expected/yixuan-basic.explain.en.md",
  ]) {
    const text = readText(relativePath)
    assert(
      text.includes(formatNumber(calcResult.summary.displayTotalDamage)),
      `${relativePath} must include displayTotalDamage from CalcResult`,
    )
    assert(text.includes("nanoka@2.8"), `${relativePath} must include data-source disclaimer`)
    assert(text.includes("fairy CLI"), `${relativePath} must state explain skill does not invoke fairy CLI`)

    for (const traceRef of collectRegexMatches(text, /\btrace-\d+\b/g)) {
      assert(traceIds.has(traceRef), `${relativePath} references absent trace id ${traceRef}`)
    }
  }
}

function verifyAiPluginExamples() {
  verifyEntityNormalizationFixture()
  const basicSnapshot = verifySnapshotFixture("examples/ai-plugin/snapshots/yixuan-basic.snapshot.json")
  verifySnapshotFixture("examples/ai-plugin/snapshots/yixuan-full.snapshot.json")
  verifyDraftMetadata(basicSnapshot)
  const calcResult = verifyCalcFixture(basicSnapshot)
  verifyPromptFixtures(calcResult)
  verifyExplainFixture(calcResult)
}

verifyAiPluginExamples()

if (errors.length > 0) {
  console.error("AI plugin verification failed:")
  for (const error of errors)
    console.error(`- ${error}`)
  process.exit(1)
}

console.log("AI plugin verification passed.")
