import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import manifest from "./source-manifest.json" with { type: "json" }

export const SOURCE_REPOSITORY = "LoTwT/ZZZ-HP"
export const SOURCE_COMMIT = "fac62407f3d3995f8200a66be0038f292b1455fa"
export const BUFF_RESOURCE =
  "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json"
export interface SourceEffect {
  id: string
  origin?: string
  scope: string
  applyTarget: "self" | "team"
  applySituation?: string
  applyProfession?: string | null
  teamProfession?: string | null
  teamProfessionValues?: (number | null)[] | null
  teamProfessionMinCount?: number | null
  skillCategory?: string
  skillSubcategoryId?: string | null
  skillTargets?: { category: string; subcategoryId?: string | null }[]
  elementFilter?: "all" | string[]
  kind: "fixed" | "stacked" | "convert"
  stat: string
  value: number
  stackable?: boolean
  maxStacks?: number
  valuePerStack?: number
  defaultStacks?: number
  convert?: {
    from: string
    panelSource?: string
    ratioPercent: number
    cap?: number | null
    defaultBase?: number | null
    initialBase?: number
  }
  appliesToAnomaly?: boolean
  enabledDefault?: boolean
  note?: string
}
export interface SourceBlock {
  id: string
  name: string
  note?: string
  effects: SourceEffect[]
}
export interface SourcePack {
  effectBlocks?: SourceBlock[]
  effects?: SourceEffect[]
  selfMods?: Record<string, number>
  teamMods?: Record<string, number>
}
export interface SourceEntity {
  id: string
  name: string
  profession?: string
  element?: string
  mindscapeBuffs?: SourcePack[]
  refinementBuffs?: SourcePack[]
  fixedBuffs?: SourcePack
  twoPieceEffectBlocks?: SourceBlock[]
  twoPieceEffects?: SourceEffect[]
  twoPieceMods?: Record<string, number>
  twoPieceNote?: string
  fourPieceBuffs?: SourcePack
}
export interface SourceData {
  agents: SourceEntity[]
  wengines: SourceEntity[]
  driveDiscs: SourceEntity[]
  skillSubcategories: {
    id: string
    agentId: string
    categoryId: string
    name: string
    countsAsFollowUp?: boolean
  }[]
  followUpSkillRules: {
    id: string
    agentId: string
    categoryId: string
    subcategoryId: string | null
  }[]
}
export interface SourceFunctions {
  normalizeAgent(entity: SourceEntity): SourceEntity
  normalizeWengine(entity: SourceEntity): SourceEntity
  normalizeDriveDisc(entity: SourceEntity): SourceEntity
  collectEffectsFromPack(pack: SourcePack): SourceEffect[]
  applyAnomalyFlagsToPack(
    pack: SourcePack,
    effects: SourceEffect[][],
    blocks: SourceBlock[][],
  ): SourcePack
  resolveEffectBaseValue(effect: SourceEffect, stacks: number): number
  resolveConvertValue(
    effect: SourceEffect,
    attrs: Record<string, number>,
    override?: number,
    panels?: {
      external?: Record<string, number>
      final?: Record<string, number>
    },
    skillLevels?: Record<string, number>,
  ): number
  effectMatchesContext(
    effect: SourceEffect,
    context: Record<string, unknown>,
  ): boolean
}
export type SourceNormalization = Pick<
  SourceFunctions,
  | "normalizeAgent"
  | "normalizeWengine"
  | "normalizeDriveDisc"
  | "collectEffectsFromPack"
  | "applyAnomalyFlagsToPack"
>

/** 只执行摘要已核对的纯函数；store 仅提取命名函数，不导入 Vue/Pinia/API 或启动应用。 */
export async function loadSource(root: string): Promise<{
  data: SourceData
  functions: SourceFunctions
  files: { path: string; sha256: string }[]
}> {
  const sources = new Map<string, string>()
  for (const [path, digest] of Object.entries(manifest)) {
    const bytes = await readFile(join(root, path))
    if (createHash("sha256").update(bytes).digest("hex") !== digest)
      throw new Error(
        `Source checksum mismatch: ${path}; expected ${SOURCE_COMMIT}`,
      )
    sources.set(path, bytes.toString("utf8"))
  }
  const modules: Record<string, Record<string, unknown>> = {}
  const evaluate = (
    path: string,
    selection?: readonly string[],
    environment: Record<string, unknown> = {},
  ) => {
    let source = sources.get(path)!
    if (selection) {
      const tree = ts.createSourceFile(
        path,
        source,
        ts.ScriptTarget.Latest,
        true,
      )
      const functions = tree.statements.filter(
        (s) =>
          ts.isFunctionDeclaration(s) &&
          s.name &&
          selection.includes(s.name.text),
      )
      if (functions.length !== selection.length)
        throw new Error(`Pure function extraction failed: ${path}`)
      source =
        functions.map((s) => s.getText(tree)).join("\n") +
        `\nexport { ${selection.join(", ")} };`
    }
    const exports: Record<string, unknown> = {}
    const code = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText
    runInNewContext(
      code,
      {
        exports,
        ...environment,
        require: (id: string) => {
          if (!(id in modules))
            throw new Error(`Unreviewed source dependency: ${id}`)
          return modules[id]
        },
      },
      { filename: path, timeout: 5000 },
    )
    return exports
  }
  for (const path of [
    "types/calculator",
    "utils/skillTalentLevels",
    "utils/calcNumberFormat",
    "utils/multFactorPercent",
    "utils/remielUtils",
    "utils/buffEffect",
    "utils/calculatorUi",
  ])
    modules[`@/${path}`] = evaluate(`zzz-hp/src/${path}.ts`)
  const buff = modules["@/utils/buffEffect"],
    ui = modules["@/utils/calculatorUi"]
  const defaults = evaluate("zzz-hp/src/data/calculatorBuffDefaults.ts")
  const store = evaluate(
    "zzz-hp/src/stores/calculatorBuffs.ts",
    [
      "mergeMissingDefaultAgents",
      "normalizeSupportNeeds",
      "normalizeAvatarImage",
      "normalizeMindscapeBuffs",
      "normalizeAgent",
      "normalizeWengine",
      "migrateWengineRefinementEnergyRegen",
      "normalizeDriveDisc",
    ],
    { ...buff, ...ui, ...defaults },
  )
  const panel = evaluate("zzz-hp/src/utils/panelBuffCalc.ts", [
    "withRefinementAnomalyFlags",
    "applyAnomalyFlagsToPack",
  ])
  const data = JSON.parse(sources.get(BUFF_RESOURCE)!) as SourceData
  const merged = (
    store["mergeMissingDefaultAgents"] as (
      entries: SourceEntity[],
    ) => SourceEntity[]
  )(
    data.agents.map((entity) =>
      (store["normalizeAgent"] as (entity: SourceEntity) => SourceEntity)(
        entity,
      ),
    ),
  )
  if (
    merged.length !== data.agents.length ||
    merged.some((entity) => !data.agents.some((raw) => raw.id === entity.id))
  )
    throw new Error(
      "Default-agent loading changes the fixed coverage; explicit source accounting is required",
    )
  return {
    data,
    functions: { ...buff, ...store, ...panel } as unknown as SourceFunctions,
    files: Object.entries(manifest).map(([path, sha256]) => ({ path, sha256 })),
  }
}
