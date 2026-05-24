import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { isDeepStrictEqual } from "node:util"

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)))

const pluginRoot = path.join(repoRoot, ".claude-plugin/plugins/fairy")
const pluginJsonPath = path.join(pluginRoot, "plugin.json")
const skillNames = ["fairy-vision", "fairy-snapshot", "fairy-calc", "fairy-explain"]
const requiredDocsByKey = {
  architecture: "docs/ai-plugin/architecture.md",
  userJourneys: "docs/ai-plugin/user-journeys.md",
  promptTemplates: "docs/ai-plugin/prompt-templates.md",
  acceptance: "docs/ai-plugin/acceptance.md",
  decision: "docs/product/decisions/D-21-ai-plugin.md",
  visionDecision: "docs/product/decisions/D-22-ai-plugin-v1.2.3-vision.md",
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
const visionExampleDirs = [
  "examples/ai-plugin/vision/prompts",
  "examples/ai-plugin/vision/snapshots",
  "examples/ai-plugin/vision/expected",
]
const visionFixtures = [
  {
    name: "yixuan-workshop",
    mode: "calc",
    fixtureName: "vision-workshop-yixuan",
    sourceId: "zzz-workshop",
    sourceLabel: "绝区零工坊",
    prompt: "examples/ai-plugin/vision/prompts/vision-workshop-yixuan.md",
    snapshot: "examples/ai-plugin/vision/snapshots/yixuan-workshop.snapshot.json",
    metadata: "examples/ai-plugin/vision/expected/yixuan-workshop.draft-metadata.json",
    calc: "examples/ai-plugin/vision/expected/yixuan-workshop.calc.json",
    expected: {
      agentId: "1371",
      wEngineId: "14137",
      activeActorId: "1371",
      enemyId: "30004",
      enemyRank: "special",
      resistance: { ether: 0 },
      driveDiscSetCounts: { "33100": 4, "32700": 2 },
      piiKinds: ["uid"],
      sourceConfidenceMin: 0.9,
    },
    parityGroup: "yixuan-build",
    userCopyIncludes: ["截图来源: 绝区零工坊", "UID 已识别并隐藏"],
  },
  {
    name: "yixuan-miyoushe",
    mode: "calc",
    fixtureName: "vision-miyoushe-yixuan",
    sourceId: "miyoushe-record",
    sourceLabel: "米游社",
    prompt: "examples/ai-plugin/vision/prompts/vision-miyoushe-yixuan.md",
    snapshot: "examples/ai-plugin/vision/snapshots/yixuan-miyoushe.snapshot.json",
    metadata: "examples/ai-plugin/vision/expected/yixuan-miyoushe.draft-metadata.json",
    calc: "examples/ai-plugin/vision/expected/yixuan-miyoushe.calc.json",
    expected: {
      agentId: "1371",
      wEngineId: "14137",
      activeActorId: "1371",
      enemyId: "30004",
      enemyRank: "special",
      resistance: { ether: 0 },
      driveDiscSetCounts: { "33100": 4, "32700": 2 },
      piiKinds: ["uid", "username"],
      sourceConfidenceMin: 0.9,
    },
    parityGroup: "yixuan-build",
    userCopyIncludes: ["截图来源: 米游社", "UID + 用户名 已识别并隐藏"],
  },
  {
    name: "miyabi-miyoushe",
    mode: "calc",
    fixtureName: "vision-miyoushe-miyabi",
    sourceId: "miyoushe-record",
    sourceLabel: "米游社",
    prompt: "examples/ai-plugin/vision/prompts/vision-miyoushe-miyabi.md",
    snapshot: "examples/ai-plugin/vision/snapshots/miyabi-miyoushe.snapshot.json",
    metadata: "examples/ai-plugin/vision/expected/miyabi-miyoushe.draft-metadata.json",
    calc: "examples/ai-plugin/vision/expected/miyabi-miyoushe.calc.json",
    expected: {
      agentId: "1091",
      wEngineId: "14109",
      activeActorId: "1091",
      enemyId: "30004",
      enemyRank: "special",
      resistance: { ice: 0 },
      driveDiscSetCounts: { "32700": 4, "32800": 2 },
      piiKinds: ["uid", "username"],
      sourceConfidenceMin: 0.9,
    },
    userCopyIncludes: ["截图来源: 米游社", "UID + 用户名 已识别并隐藏"],
  },
  {
    name: "astra-miyoushe",
    mode: "calc",
    fixtureName: "vision-miyoushe-astra",
    sourceId: "miyoushe-record",
    sourceLabel: "米游社",
    prompt: "examples/ai-plugin/vision/prompts/vision-miyoushe-astra.md",
    snapshot: "examples/ai-plugin/vision/snapshots/astra-miyoushe.snapshot.json",
    metadata: "examples/ai-plugin/vision/expected/astra-miyoushe.draft-metadata.json",
    calc: "examples/ai-plugin/vision/expected/astra-miyoushe.calc.json",
    expected: {
      agentId: "1311",
      wEngineId: "13115",
      activeActorId: "1311",
      enemyId: "30004",
      enemyRank: "special",
      resistance: { ether: 0 },
      driveDiscSetCounts: { "33400": 4, "32800": 2 },
      piiKinds: ["uid", "username"],
      sourceConfidenceMin: 0.9,
    },
    userCopyIncludes: ["截图来源: 米游社", "UID + 用户名 已识别并隐藏"],
  },
  {
    name: "dialyn-miyoushe",
    mode: "calc",
    fixtureName: "vision-miyoushe-dialyn",
    sourceId: "miyoushe-record",
    sourceLabel: "米游社",
    prompt: "examples/ai-plugin/vision/prompts/vision-miyoushe-dialyn.md",
    snapshot: "examples/ai-plugin/vision/snapshots/dialyn-miyoushe.snapshot.json",
    metadata: "examples/ai-plugin/vision/expected/dialyn-miyoushe.draft-metadata.json",
    calc: "examples/ai-plugin/vision/expected/dialyn-miyoushe.calc.json",
    expected: {
      agentId: "1481",
      wEngineId: "14148",
      activeActorId: "1481",
      enemyId: "30004",
      enemyRank: "special",
      resistance: { physical: 0 },
      driveDiscSetCounts: { "33200": 4, "33400": 2 },
      piiKinds: ["uid", "username"],
      sourceConfidenceMin: 0.9,
    },
    userCopyIncludes: ["截图来源: 米游社", "UID + 用户名 已识别并隐藏"],
  },
  {
    name: "dialyn-workshop",
    mode: "calc",
    fixtureName: "vision-workshop-dialyn",
    sourceId: "zzz-workshop",
    sourceLabel: "绝区零工坊",
    prompt: "examples/ai-plugin/vision/prompts/vision-workshop-dialyn.md",
    snapshot: "examples/ai-plugin/vision/snapshots/dialyn-workshop.snapshot.json",
    metadata: "examples/ai-plugin/vision/expected/dialyn-workshop.draft-metadata.json",
    calc: "examples/ai-plugin/vision/expected/dialyn-workshop.calc.json",
    expected: {
      agentId: "1481",
      wEngineId: "14148",
      activeActorId: "1481",
      enemyId: "30004",
      enemyRank: "special",
      resistance: { physical: 0 },
      driveDiscSetCounts: { "33200": 4, "33400": 2 },
      piiKinds: ["uid"],
      sourceConfidenceMin: 0.9,
    },
    userCopyIncludes: ["截图来源: 绝区零工坊", "UID 已识别并隐藏"],
  },
  {
    name: "miyabi-workshop",
    mode: "calc",
    fixtureName: "vision-workshop-miyabi",
    sourceId: "zzz-workshop",
    sourceLabel: "绝区零工坊",
    prompt: "examples/ai-plugin/vision/prompts/vision-workshop-miyabi.md",
    snapshot: "examples/ai-plugin/vision/snapshots/miyabi-workshop.snapshot.json",
    metadata: "examples/ai-plugin/vision/expected/miyabi-workshop.draft-metadata.json",
    calc: "examples/ai-plugin/vision/expected/miyabi-workshop.calc.json",
    expected: {
      agentId: "1091",
      wEngineId: "14109",
      activeActorId: "1091",
      enemyId: "30004",
      enemyRank: "special",
      resistance: { ice: 0 },
      driveDiscSetCounts: { "32700": 4, "31100": 2 },
      piiKinds: ["uid"],
      sourceConfidenceMin: 0.9,
    },
    userCopyIncludes: ["截图来源: 绝区零工坊", "UID 已识别并隐藏"],
  },
  {
    name: "astra-workshop",
    mode: "calc",
    fixtureName: "vision-workshop-astra",
    sourceId: "zzz-workshop",
    sourceLabel: "绝区零工坊",
    prompt: "examples/ai-plugin/vision/prompts/vision-workshop-astra.md",
    snapshot: "examples/ai-plugin/vision/snapshots/astra-workshop.snapshot.json",
    metadata: "examples/ai-plugin/vision/expected/astra-workshop.draft-metadata.json",
    calc: "examples/ai-plugin/vision/expected/astra-workshop.calc.json",
    expected: {
      agentId: "1311",
      wEngineId: "13115",
      activeActorId: "1311",
      enemyId: "30004",
      enemyRank: "special",
      resistance: { ether: 0 },
      driveDiscSetCounts: { "33400": 4, "32800": 2 },
      piiKinds: ["uid"],
      sourceConfidenceMin: 0.9,
    },
    userCopyIncludes: ["截图来源: 绝区零工坊", "UID 已识别并隐藏"],
  },
  {
    name: "boundary-unknown-source",
    mode: "boundary",
    fixtureName: "vision-boundary-unknown-source",
    sourceId: "unknown",
    sourceLabel: "未知来源",
    prompt: "examples/ai-plugin/vision/prompts/vision-boundary-unknown-source.md",
    metadata: "examples/ai-plugin/vision/expected/vision-boundary-unknown-source.draft-metadata.json",
    expected: {
      fallbackTrigger: "unsupported-source",
      sourceConfidenceMax: 0.4,
      piiKinds: [],
      nextStepIncludes: ["手动录入", "清晰的角色面板截图"],
    },
    userCopyIncludes: ["暂时无法识别这张图来自支持的面板来源", "我不会根据这张图直接计算"],
  },
  {
    name: "boundary-low-confidence",
    mode: "boundary",
    fixtureName: "vision-boundary-low-confidence",
    sourceId: "zzz-workshop",
    sourceLabel: "绝区零工坊",
    prompt: "examples/ai-plugin/vision/prompts/vision-boundary-low-confidence.md",
    metadata: "examples/ai-plugin/vision/expected/vision-boundary-low-confidence.draft-metadata.json",
    expected: {
      fallbackTrigger: "low-confidence",
      sourceConfidenceMin: 0.8,
      piiKinds: ["uid"],
      lowConfidenceFields: ["panel.attack", "panel.critRate", "driveDiscs[5].mainStat"],
      nextStepIncludes: ["攻击力", "暴击率", "6 号位主词条"],
    },
    userCopyIncludes: ["截图来源看起来是绝区零工坊", "攻击力、暴击率和 6 号位主词条读数不够可靠"],
  },
  {
    name: "boundary-missing-critical",
    mode: "boundary",
    fixtureName: "vision-boundary-missing-critical",
    sourceId: "miyoushe-record",
    sourceLabel: "米游社",
    prompt: "examples/ai-plugin/vision/prompts/vision-boundary-missing-critical.md",
    metadata: "examples/ai-plugin/vision/expected/vision-boundary-missing-critical.draft-metadata.json",
    expected: {
      fallbackTrigger: "missing-critical",
      sourceConfidenceMin: 0.8,
      piiKinds: ["uid", "username"],
      missingCriticalFields: ["wEngine.id", "driveDiscs[4].mainStat", "driveDiscs[5].mainStat"],
      nextStepIncludes: ["音擎名称", "5 号位主词条", "6 号位主词条"],
    },
    userCopyIncludes: ["音擎名称、5 号位主词条和 6 号位主词条被裁掉", "请补充这些字段"],
  },
  {
    name: "boundary-ambiguous-field",
    mode: "boundary",
    fixtureName: "vision-boundary-ambiguous-field",
    sourceId: "miyoushe-record",
    sourceLabel: "米游社",
    prompt: "examples/ai-plugin/vision/prompts/vision-boundary-ambiguous-field.md",
    metadata: "examples/ai-plugin/vision/expected/vision-boundary-ambiguous-field.draft-metadata.json",
    expected: {
      fallbackTrigger: "ambiguous-field",
      sourceConfidenceMin: 0.8,
      piiKinds: ["uid", "username"],
      ambiguityCandidates: {
        "skillLevels.corePassive": ["07", "01"],
        "actor.id": ["1091", "1311"],
      },
      nextStepIncludes: ["核心技等级是 07 还是 01", "角色是雅还是耀嘉音"],
    },
    userCopyIncludes: ["我看到两处不确定信息", "请先确认后我再继续"],
  },
  {
    name: "boundary-pii-overlap",
    mode: "boundary",
    fixtureName: "vision-boundary-pii-overlap",
    sourceId: "zzz-workshop",
    sourceLabel: "绝区零工坊",
    prompt: "examples/ai-plugin/vision/prompts/vision-boundary-pii-overlap.md",
    metadata: "examples/ai-plugin/vision/expected/vision-boundary-pii-overlap.draft-metadata.json",
    expected: {
      fallbackTrigger: "pii-overlap",
      sourceConfidenceMin: 0.8,
      piiKinds: ["uid", "username"],
      missingCriticalFields: ["driveDiscs[3].substats", "driveDiscs[4].mainStat"],
      nextStepIncludes: ["个人信息区域已隐藏", "4 号位副词条", "5 号位主词条"],
    },
    userCopyIncludes: ["个人信息区域已隐藏", "挡住了 4 号位副词条和 5 号位主词条"],
  },
]
const requiredVisionExampleFiles = [
  "examples/ai-plugin/vision/README.md",
  ...visionFixtures.flatMap(fixture => [
    fixture.prompt,
    fixture.metadata,
    ...(fixture.mode === "calc" ? [fixture.snapshot, fixture.calc] : []),
  ]),
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
assert(plugin.version === "1.2.3", "plugin.json version must be 1.2.3")
assert(plugin.minFairyCliVersion === "0.1.2", "plugin.json minFairyCliVersion must be 0.1.2")
assert(plugin.displayName?.en && plugin.displayName?.zh, "plugin.json displayName.en and displayName.zh are required")
assert(Array.isArray(plugin.supportedTools), "plugin.json supportedTools must be an array")
assert(plugin.supportedTools?.includes("claude-code"), "plugin.json supportedTools must include claude-code")
assert(plugin.supportedTools?.includes("codex"), "plugin.json supportedTools must include codex")
assert(!plugin.supportedTools?.includes("cursor"), "plugin.json must not include cursor for V1.2.3")
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

for (const dir of visionExampleDirs)
  assert(existsSync(path.join(repoRoot, dir)), `vision example directory is missing: ${dir}`)

for (const file of requiredExampleFiles)
  assert(existsSync(path.join(repoRoot, file)), `required AI plugin example fixture is missing: ${file}`)

for (const file of requiredVisionExampleFiles)
  assert(existsSync(path.join(repoRoot, file)), `required AI plugin vision fixture is missing: ${file}`)

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

const visionSkill = readText(".claude-plugin/plugins/fairy/skills/fairy-vision/SKILL.md")
includesAll(visionSkill, ".claude-plugin/plugins/fairy/skills/fairy-vision/SKILL.md", [
  "hostRequirement:",
  "multimodal: required",
  "zzz-workshop",
  "miyoushe-record",
  "draftMetadata.evidence",
  "draftMetadata.piiDetection",
  "perFieldConfidence",
  "fairy-snapshot",
  "docs/product/decisions/D-22-ai-plugin-v1.2.3-vision.md",
])
assert(visionSkill.includes("Do not call `fairy calc`"), "fairy-vision must forbid direct CLI calculation")
assert(visionSkill.includes("Do not compute damage"), "fairy-vision must forbid model-side calculation")
assert(visionSkill.includes("Do not produce a confirmed `BattleSnapshot`"), "fairy-vision must only produce reviewable drafts")
assert(visionSkill.includes("Do not persist raw PII"), "fairy-vision must forbid raw PII persistence")

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
  { pattern: /fairy compare/g, reason: "AI plugin compare workflow is deferred" },
  { pattern: /\.cursor/g, reason: "Cursor is deferred from V1.2.3" },
  { pattern: /packages\/data\/source/g, reason: "plugin must not read raw source" },
]

const exampleForbiddenPatterns = [
  ...pluginForbiddenPatterns,
  { pattern: /命破之刃|Doom Blade|钢铁躯壳|Steel Cushion \(alias\)|\b31002\b|\b32004\b/g, reason: "example fixtures must use current runtime GameData ids/names" },
]

const staleRuntimeEntityPatterns = [
  { pattern: /命破之刃|钢铁躯壳|\b31002\b|\b32004\b/g, reason: "AI plugin docs must not use stale runtime entity names or ids" },
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
assertNoForbiddenPatterns(
  listFilesRecursive(path.join(repoRoot, "examples/ai-plugin"))
    .concat([
      path.join(repoRoot, "docs/ai-plugin/user-journeys.md"),
      path.join(repoRoot, "docs/ai-plugin/prompt-templates.md"),
      path.join(repoRoot, "docs/ai-plugin/v1.2.3-vision/prompt-templates.md"),
    ]),
  staleRuntimeEntityPatterns,
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

function verifyNoVisionImageInputsCommitted() {
  const imageFiles = listFilesRecursive(path.join(repoRoot, "examples/ai-plugin/vision"))
    .filter(file => /\.(?:png|jpe?g|webp|gif|heic)$/i.test(file))
    .map(file => path.relative(repoRoot, file))
  assert(imageFiles.length === 0, `vision fixtures must not commit raw image files: ${imageFiles.join(", ")}`)
}

function jsonPathJoin(parentPath, key) {
  return `${parentPath}.${String(key)}`
}

function walkJson(value, visitor, currentPath = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkJson(item, visitor, `${currentPath}[${index}]`))
    return
  }

  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const childPath = jsonPathJoin(currentPath, key)
      visitor(key, child, childPath)
      walkJson(child, visitor, childPath)
    }
  }
}

function assertNoPiiKeys(value, relativePath) {
  const forbiddenKeys = new Set(["uid", "userId", "username", "nickname", "accountId", "sourceImage"])
  walkJson(value, (key, child, childPath) => {
    assert(!forbiddenKeys.has(key), `${relativePath}: PII/evidence-only key is not allowed at ${childPath}`)
    if (typeof child === "string") {
      assert(!/11553939/.test(child), `${relativePath}: raw sample UID must not be persisted at ${childPath}`)
      assert(child !== "Lo", `${relativePath}: raw sample username must not be persisted at ${childPath}`)
    }
  })
}

function assertNoEvidenceOnlySnapshotKeys(snapshot, relativePath) {
  const forbiddenKeys = new Set([
    "uid",
    "userId",
    "username",
    "nickname",
    "accountId",
    "sourceImage",
    "baseAttack",
    "bonusAttack",
    "baseHp",
    "bonusHp",
    "baseDefense",
    "bonusDefense",
    "rollCount",
    "confidence",
    "sourceDetection",
    "piiDetection",
    "draftMetadata",
    "rawValues",
  ])
  walkJson(snapshot, (key, child, childPath) => {
    assert(!forbiddenKeys.has(key), `${relativePath}: evidence-only key is not allowed in BattleSnapshot at ${childPath}`)
    if (typeof child === "string")
      assert(child !== "unknown", `${relativePath}: strict BattleSnapshot must not use unknown as a value at ${childPath}`)
  })
}

function assertExactStringArray(actual, expected, context) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${context}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  )
}

function extractReviewEditCopy(relativePath) {
  const text = readText(relativePath)
  const match = text.match(/## Review\/edit gate copy[^\n]*\n\n```(?:[a-z]+)?\n([\s\S]*?)\n```/)
  assert(match !== null, `${relativePath}: missing Review/edit gate fenced copy block`)
  return match?.[1] ?? ""
}

function assertNoUserFacingChainLeak(copy, relativePath) {
  const forbidden = [
    /fairy-vision/g,
    /fairy-snapshot/g,
    /fairy-calc/g,
    /fairy-explain/g,
    /\binvok(?:e|ing)\b/gi,
    /\btransferr?ing to\b/gi,
    /\bhand(?:ing)? off\b/gi,
    /调用/g,
    /移交/g,
    /转交/g,
    /链路/g,
    /编排/g,
  ]
  for (const pattern of forbidden) {
    const matches = copy.match(pattern)
    assert(!matches, `${relativePath}: user-facing review/edit copy leaks chain implementation phrase ${pattern}`)
  }
}

function runVisionCliCalc(relativeSnapshotPath) {
  const output = execFileSync(
    "pnpm",
    [
      "--silent",
      "--filter",
      "@randomplay/cli",
      "exec",
      "tsx",
      "src/index.ts",
      "calc",
      `../../${relativeSnapshotPath}`,
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

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1
    return counts
  }, {})
}

function assertJsonObjectIncludes(actual, expected, context) {
  for (const [key, value] of Object.entries(expected ?? {}))
    assert(actual?.[key] === value, `${context}: expected ${key}=${value}, got ${actual?.[key]}`)
}

function verifyVisionSnapshot(fixture) {
  const snapshot = readJson(fixture.snapshot)
  if (core?.parseBattleSnapshot !== undefined) {
    try {
      core.parseBattleSnapshot(snapshot)
    }
    catch (error) {
      errors.push(`${fixture.snapshot} does not parse as BattleSnapshot: ${error.message}`)
      return snapshot
    }
  }

  assertNoPiiKeys(snapshot, fixture.snapshot)
  assertNoEvidenceOnlySnapshotKeys(snapshot, fixture.snapshot)

  const actor = snapshot.team?.[0]
  const expected = fixture.expected ?? {}
  assert(actor?.agentId === expected.agentId, `${fixture.snapshot}: expected agentId ${expected.agentId}`)
  assert(actor?.wEngine?.id === expected.wEngineId, `${fixture.snapshot}: expected W-Engine id ${expected.wEngineId}`)
  assert(snapshot.activeActor?.agentId === expected.activeActorId, `${fixture.snapshot}: activeActor mismatch`)
  assert(snapshot.enemy?.enemyId === expected.enemyId, `${fixture.snapshot}: expected enemy id ${expected.enemyId}`)
  assert(snapshot.enemy?.rank === expected.enemyRank, `${fixture.snapshot}: expected enemy rank ${expected.enemyRank}`)
  assertJsonObjectIncludes(snapshot.enemy?.resistance, expected.resistance, `${fixture.snapshot}: enemy.resistance`)

  assertRuntimeEntity("agents", actor?.agentId, `${fixture.snapshot}: team agent`)
  assertRuntimeEntity("wEngines", actor?.wEngine?.id, `${fixture.snapshot}: W-Engine`)
  assertRuntimeEntity("enemies", snapshot.enemy?.enemyId, `${fixture.snapshot}: enemy`)

  const setIds = (actor?.driveDiscs ?? []).map(disc => disc.setId).filter(Boolean)
  assert(setIds.length === 6, `${fixture.snapshot}: expected six Drive Disc slots`)
  assert(
    isDeepStrictEqual(countBy(setIds), expected.driveDiscSetCounts),
    `${fixture.snapshot}: expected Drive Disc set counts ${JSON.stringify(expected.driveDiscSetCounts)}, got ${JSON.stringify(countBy(setIds))}`,
  )
  for (const id of setIds)
    assertRuntimeEntity("driveDiscs", id, `${fixture.snapshot}: Drive Disc set`)

  return snapshot
}

function verifyVisionDraftMetadata(fixture) {
  const metadata = readJson(fixture.metadata)
  assertNoPiiKeys(metadata, fixture.metadata)
  assert(metadata.schemaVersion === "v1.2.3-vision-draft-metadata-v1", `${fixture.metadata}: unexpected schemaVersion`)
  assert(metadata.fixtureName === fixture.fixtureName, `${fixture.metadata}: fixtureName must match fixture`)
  assert(metadata.sourceDetection?.sourceId === fixture.sourceId, `${fixture.metadata}: sourceDetection.sourceId mismatch`)
  assert(metadata.sourceDetection?.sourceLabel === fixture.sourceLabel, `${fixture.metadata}: sourceDetection.sourceLabel mismatch`)
  assert(metadata.sourceDetection?.confidence >= fixture.expected.sourceConfidenceMin, `${fixture.metadata}: sourceDetection confidence must be high`)
  assert(Array.isArray(metadata.sourceDetection?.cues) && metadata.sourceDetection.cues.length >= 3, `${fixture.metadata}: sourceDetection.cues must include source evidence`)

  assertExactStringArray(metadata.piiDetection?.kinds, fixture.expected.piiKinds, `${fixture.metadata}: piiDetection.kinds`)
  assert(metadata.piiDetection?.redactionStatus === "redacted", `${fixture.metadata}: piiDetection.redactionStatus must be redacted`)
  assert(metadata.piiDetection?.rawValuesDiscarded === true, `${fixture.metadata}: raw PII values must be discarded`)

  const confidenceValues = Object.values(metadata.perFieldConfidence ?? {})
  assert(confidenceValues.length > 0, `${fixture.metadata}: perFieldConfidence is required`)
  for (const value of confidenceValues)
    assert(["high", "medium", "low"].includes(value), `${fixture.metadata}: invalid confidence value ${value}`)

  const statSplits = metadata.evidence?.statSplits ?? []
  assert(Array.isArray(statSplits) && statSplits.length >= 3, `${fixture.metadata}: evidence.statSplits must include HP/ATK/DEF audit evidence`)
  for (const split of statSplits) {
    assert(typeof split.stat === "string", `${fixture.metadata}: stat split requires stat`)
    assert(typeof split.base === "number", `${fixture.metadata}: stat split ${split.stat} requires numeric base`)
    assert(typeof split.bonus === "number", `${fixture.metadata}: stat split ${split.stat} requires numeric bonus`)
    assert(split.base + split.bonus === split.total, `${fixture.metadata}: stat split ${split.stat} total must equal base + bonus`)
  }

  const substatRolls = metadata.evidence?.substatRollsSample ?? []
  assert(Array.isArray(substatRolls) && substatRolls.length > 0, `${fixture.metadata}: evidence.substatRollsSample is required`)
  assert(
    substatRolls.some(slot => (slot.substats ?? []).some(substat => typeof substat.rollCount === "number")),
    `${fixture.metadata}: substat roll-count evidence is required`,
  )
  return metadata
}

function verifyVisionPrompt(fixture) {
  const text = readText(fixture.prompt)
  includesAll(text, fixture.prompt, [
    `**Skill**: fairy-vision`,
    `**Source**: ${fixture.sourceId}`,
  ])
  if (fixture.mode === "calc") {
    includesAll(text, fixture.prompt, [
      `sourceDetection.sourceId === "${fixture.sourceId}"`,
      "parseBattleSnapshot",
      "fairy calc <snapshot> --view verbose --lang zh",
      "substatRollsSample",
    ])
  }
  else if (fixture.mode === "boundary") {
    includesAll(text, fixture.prompt, [
      "shouldNotCalc === true",
      `fallbackTrigger === "${fixture.expected.fallbackTrigger}"`,
      "No confirmed BattleSnapshot",
      "No CalcResult",
    ])
  }
  else {
    assert(false, `${fixture.name}: unknown vision fixture mode ${fixture.mode}`)
  }
  for (const snippet of fixture.userCopyIncludes)
    assert(text.includes(snippet), `${fixture.prompt}: missing review/edit copy snippet ${snippet}`)

  const copy = extractReviewEditCopy(fixture.prompt)
  assertNoUserFacingChainLeak(copy, fixture.prompt)
  assert(!copy.includes("5★ midpoint default"), `${fixture.prompt}: source-tool review copy must not use midpoint default language`)
}

function verifyVisionBoundaryMetadata(fixture) {
  const metadata = readJson(fixture.metadata)
  assertNoPiiKeys(metadata, fixture.metadata)
  assert(metadata.schemaVersion === "v1.2.3-vision-draft-metadata-v1", `${fixture.metadata}: unexpected schemaVersion`)
  assert(metadata.fixtureName === fixture.fixtureName, `${fixture.metadata}: fixtureName must match fixture`)
  assert(metadata.shouldNotCalc === true, `${fixture.metadata}: shouldNotCalc must be true`)
  assert(metadata.snapshotStatus === "blocked", `${fixture.metadata}: snapshotStatus must be blocked`)
  assert(metadata.calcStatus === "not-run", `${fixture.metadata}: calcStatus must be not-run`)
  assert(metadata.fallbackTrigger === fixture.expected.fallbackTrigger, `${fixture.metadata}: fallbackTrigger mismatch`)
  assert(metadata.sourceDetection?.sourceId === fixture.sourceId, `${fixture.metadata}: sourceDetection.sourceId mismatch`)
  assert(metadata.sourceDetection?.sourceLabel === fixture.sourceLabel, `${fixture.metadata}: sourceDetection.sourceLabel mismatch`)

  if (fixture.expected.sourceConfidenceMin !== undefined)
    assert(metadata.sourceDetection?.confidence >= fixture.expected.sourceConfidenceMin, `${fixture.metadata}: sourceDetection confidence must meet supported-source floor`)
  if (fixture.expected.sourceConfidenceMax !== undefined)
    assert(metadata.sourceDetection?.confidence <= fixture.expected.sourceConfidenceMax, `${fixture.metadata}: sourceDetection confidence must stay below unsupported-source ceiling`)

  assertExactStringArray(metadata.piiDetection?.kinds, fixture.expected.piiKinds, `${fixture.metadata}: piiDetection.kinds`)
  if ((fixture.expected.piiKinds ?? []).length > 0) {
    assert(metadata.piiDetection?.redactionStatus === "redacted", `${fixture.metadata}: piiDetection.redactionStatus must be redacted`)
    assert(metadata.piiDetection?.rawValuesDiscarded === true, `${fixture.metadata}: raw PII values must be discarded`)
  }
  else {
    assert(metadata.piiDetection?.redactionStatus === "not-present", `${fixture.metadata}: piiDetection.redactionStatus must be not-present`)
    assert(metadata.piiDetection?.rawValuesDiscarded === true, `${fixture.metadata}: raw PII discard flag must remain true`)
  }

  const confidenceValues = Object.values(metadata.perFieldConfidence ?? {})
  assert(confidenceValues.length > 0, `${fixture.metadata}: perFieldConfidence is required`)
  for (const value of confidenceValues)
    assert(["high", "medium", "low"].includes(value), `${fixture.metadata}: invalid confidence value ${value}`)

  for (const field of fixture.expected.lowConfidenceFields ?? [])
    assert(metadata.perFieldConfidence?.[field] === "low", `${fixture.metadata}: ${field} must be low confidence`)

  if (fixture.expected.missingCriticalFields !== undefined)
    assertExactStringArray(metadata.missingCriticalFields, fixture.expected.missingCriticalFields, `${fixture.metadata}: missingCriticalFields`)

  if (fixture.expected.ambiguityCandidates !== undefined) {
    for (const [field, candidates] of Object.entries(fixture.expected.ambiguityCandidates)) {
      const actual = metadata.ambiguityCandidates?.[field]
      assertExactStringArray(actual, candidates, `${fixture.metadata}: ambiguityCandidates.${field}`)
    }
  }

  assert(typeof metadata.nextStep === "string" && metadata.nextStep.length > 0, `${fixture.metadata}: nextStep is required`)
  for (const snippet of fixture.expected.nextStepIncludes ?? [])
    assert(metadata.nextStep.includes(snippet), `${fixture.metadata}: nextStep must mention ${snippet}`)

  const blockingReasons = metadata.evidence?.blockingReasons ?? []
  assert(Array.isArray(blockingReasons) && blockingReasons.length > 0, `${fixture.metadata}: evidence.blockingReasons is required`)

  const serialized = JSON.stringify(metadata)
  assert(!/displayTotalDamage|CalcResult|confirmedSnapshot|battleSnapshotDraft|trace-\d+/i.test(serialized), `${fixture.metadata}: boundary fixture must not embed calc or confirmed snapshot output`)
  return metadata
}

function verifyVisionCalcFixture(fixture, snapshot) {
  const expected = readJson(fixture.calc)
  if (core?.parseCalcResult !== undefined) {
    try {
      core.parseCalcResult(expected)
    }
    catch (error) {
      errors.push(`${fixture.calc} does not parse as CalcResult: ${error.message}`)
    }
  }

  let actual
  try {
    actual = runVisionCliCalc(fixture.snapshot)
  }
  catch (error) {
    errors.push(`${fixture.calc}: fairy calc baseline command failed: ${error.message}`)
    return expected
  }

  assert(isDeepStrictEqual(actual, expected), `${fixture.calc} must match freshly generated fairy CLI verbose output`)
  assert(expected.locale === "zh", `${fixture.calc}: baseline locale must be zh`)
  assert(expected.summary?.activeActorId === snapshot.activeActor?.agentId, `${fixture.calc}: activeActorId must match snapshot`)
  assert(expected.summary?.enemyId === snapshot.enemy?.enemyId, `${fixture.calc}: enemyId must match snapshot`)
  assert(Array.isArray(expected.trace) && expected.trace.length > 0, `${fixture.calc}: verbose baseline must include trace`)
  assert(Array.isArray(expected.warnings) && expected.warnings.length === 0, `${fixture.calc}: vision happy-path baseline must have no warnings`)
  assert(Array.isArray(expected.errors) && expected.errors.length === 0, `${fixture.calc}: vision happy-path baseline must have no errors`)
  const serialized = JSON.stringify(expected)
  assert(!/fairy-(?:vision|snapshot|calc|explain)|invok|transferr?ing|hand(?:ing)? off/i.test(serialized), `${fixture.calc}: CalcResult baseline must not leak AI chain implementation`)
  return expected
}

function verifyVisionFixtures() {
  verifyNoVisionImageInputsCommitted()
  const visionReadme = readText("examples/ai-plugin/vision/README.md")
  includesAll(visionReadme, "examples/ai-plugin/vision/README.md", [
    "yixuan-workshop.calc.json",
    "yixuan-miyoushe.calc.json",
    "miyabi-miyoushe.calc.json",
    "astra-workshop.calc.json",
    "dialyn-workshop.calc.json",
    "Cross-source identity contract",
    "panel.etherDamageBonus: 0.3",
    "Actual digits never reach committed fixture JSON",
  ])

  const calcResultsByName = new Map()
  for (const fixture of visionFixtures) {
    verifyVisionPrompt(fixture)
    if (fixture.mode === "calc") {
      const snapshot = verifyVisionSnapshot(fixture)
      verifyVisionDraftMetadata(fixture)
      calcResultsByName.set(fixture.name, verifyVisionCalcFixture(fixture, snapshot))
    }
    else if (fixture.mode === "boundary") {
      verifyVisionBoundaryMetadata(fixture)
    }
  }

  const parityGroups = new Map()
  for (const fixture of visionFixtures.filter(f => f.parityGroup !== undefined)) {
    const group = parityGroups.get(fixture.parityGroup) ?? []
    group.push(fixture)
    parityGroups.set(fixture.parityGroup, group)
  }
  for (const [group, fixtures] of parityGroups) {
    const baselines = fixtures.map(fixture => calcResultsByName.get(fixture.name)).filter(Boolean)
    const [first] = baselines
    for (const baseline of baselines.slice(1)) {
      assert(
        first.summary?.lanes?.nonCrit?.displayDamage === baseline.summary?.lanes?.nonCrit?.displayDamage,
        `vision parity group ${group} must match nonCrit displayDamage for the selected segment`,
      )
      assert(
        first.summary?.lanes?.crit?.displayDamage === baseline.summary?.lanes?.crit?.displayDamage,
        `vision parity group ${group} must match crit displayDamage for the selected segment`,
      )
    }
  }
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
  verifyVisionFixtures()
}

verifyAiPluginExamples()

if (errors.length > 0) {
  console.error("AI plugin verification failed:")
  for (const error of errors)
    console.error(`- ${error}`)
  process.exit(1)
}

console.log("AI plugin verification passed.")
