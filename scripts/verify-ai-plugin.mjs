import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)))

const pluginRoot = path.join(repoRoot, ".claude-plugin/plugins/fairy")
const pluginJsonPath = path.join(pluginRoot, "plugin.json")
const skillNames = ["fairy-snapshot", "fairy-calc", "fairy-explain"]
const requiredDocs = [
  "docs/ai-plugin/architecture.md",
  "docs/ai-plugin/user-journeys.md",
  "docs/ai-plugin/prompt-templates.md",
  "docs/ai-plugin/acceptance.md",
  "docs/product/decisions/D-21-ai-plugin.md",
]
const exampleDirs = [
  "examples/ai-plugin/prompts",
  "examples/ai-plugin/snapshots",
  "examples/ai-plugin/expected",
]

const errors = []

function assert(condition, message) {
  if (!condition)
    errors.push(message)
}

function readText(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8")
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"))
  }
  catch (error) {
    errors.push(`${path.relative(repoRoot, filePath)} is not valid JSON: ${error.message}`)
    return {}
  }
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

assert(existsSync(pluginJsonPath), ".claude-plugin/plugins/fairy/plugin.json is missing")
const plugin = readJson(pluginJsonPath)

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

for (const [key, doc] of Object.entries(plugin.docs ?? {}))
  assert(existsSync(path.join(repoRoot, doc)), `plugin.json docs.${key} points to a missing file: ${doc}`)

for (const dir of exampleDirs)
  assert(existsSync(path.join(repoRoot, dir)), `example directory is missing: ${dir}`)

assert(existsSync(path.join(repoRoot, ".codex/README.md")), ".codex/README.md is missing")

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

const forbiddenPatterns = [
  { pattern: /--preflight/g, reason: "must not depend on nonexistent --preflight" },
  { pattern: /--dry-run/g, reason: "must not depend on nonexistent --dry-run" },
  { pattern: /fairy-compare/g, reason: "compare skill is deferred" },
  { pattern: /fairy compare/g, reason: "fairy compare command is deferred" },
  { pattern: /\.cursor/g, reason: "Cursor is deferred from V1.2.2" },
  { pattern: /packages\/data\/source/g, reason: "plugin must not read raw source" },
]

for (const file of listFilesRecursive(pluginRoot).concat([path.join(repoRoot, ".codex/README.md")])) {
  const relativePath = path.relative(repoRoot, file)
  const text = readFileSync(file, "utf8")
  for (const { pattern, reason } of forbiddenPatterns) {
    const matches = text.match(pattern)
    assert(!matches, `${relativePath}: ${reason}`)
  }
}

if (errors.length > 0) {
  console.error("AI plugin verification failed:")
  for (const error of errors)
    console.error(`- ${error}`)
  process.exit(1)
}

console.log("AI plugin verification passed.")
