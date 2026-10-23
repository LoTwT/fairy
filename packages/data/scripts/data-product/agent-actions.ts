import { readdirSync } from "node:fs"
import { join } from "node:path"
import {
  expectArray,
  expectBoolean,
  expectField,
  expectInteger,
  expectIntegerArray,
  expectNumber,
  expectRecord,
  expectString,
  expectStringArray,
  nullableString,
  readJsonFile,
} from "./json.ts"
import { defaultDefinitionsDirectory } from "./manifests.ts"

export interface AgentActionSource {
  readonly path: string
  readonly pointer: string
}

export interface AgentActionCoefficient {
  readonly levelGroup: string
  readonly base: number
  readonly growth: number
}

export interface AgentSkillLevelBonus {
  readonly minimumMindscapeRank: number
  readonly bonus: number
  readonly groups: readonly string[]
  readonly source: AgentActionSource
}

export interface AgentActionConditionalIdentity {
  readonly potentialLevels: readonly number[]
  readonly requiresAdditionalAbilityActive: boolean
  readonly skillTargetIds: readonly string[]
  readonly skillTags: readonly string[]
}

export interface AgentActionInput {
  readonly inputId: string
  readonly name: string
  readonly minimum: number
  readonly maximum: number
}

/**
 * explain 使用的动作读取模型：只读取输出需要的字段，未知字段被忽略。
 * 生成期与消费期的完整 schema 校验仍由既有技能链路负责。
 */
export interface AgentActionDefinition {
  readonly actionId: string
  readonly branchId: string
  readonly name: string
  readonly rowName: string
  readonly levelGroup: string
  readonly skillCategory: string | null
  readonly skillTargetIds: readonly string[]
  readonly skillTags: readonly string[]
  readonly source: AgentActionSource
  readonly descriptionSources: readonly AgentActionSource[]
  readonly description: string
  readonly parameterIds: readonly string[]
  readonly sourceExpression: string
  readonly damageCoefficient: AgentActionCoefficient | null
  readonly dazeCoefficient: AgentActionCoefficient | null
  readonly calculation: Readonly<Record<string, unknown>>
  readonly inputs: readonly AgentActionInput[]
  readonly limitations: readonly string[]
  readonly potentialLevels?: readonly number[]
  readonly conditionalIdentity?: AgentActionConditionalIdentity
  readonly upstreamSkillId: string | null
}

export interface AgentActionDefinitionFile {
  readonly entityId: string
  readonly definitionPath: string
  readonly schemaVersion: number
  readonly skillLevelBonuses: readonly AgentSkillLevelBonus[]
  readonly actions: readonly AgentActionDefinition[]
}

export interface AgentActionIndex {
  readonly files: readonly AgentActionDefinitionFile[]
}

function parseSource(value: unknown, label: string): AgentActionSource {
  const source = expectRecord(value, label)
  return {
    path: expectString(expectField(source, "path", label), `${label}.path`),
    pointer: expectString(
      expectField(source, "pointer", label),
      `${label}.pointer`,
    ),
  }
}

function parseCoefficient(
  value: unknown,
  label: string,
): AgentActionCoefficient | null {
  if (value === null) return null
  const coefficient = expectRecord(value, label)
  return {
    levelGroup: expectString(
      expectField(coefficient, "levelGroup", label),
      `${label}.levelGroup`,
    ),
    base: expectNumber(
      expectField(coefficient, "base", label),
      `${label}.base`,
    ),
    growth: expectNumber(
      expectField(coefficient, "growth", label),
      `${label}.growth`,
    ),
  }
}

function parseSkillLevelBonus(
  value: unknown,
  label: string,
): AgentSkillLevelBonus {
  const bonus = expectRecord(value, label)
  return {
    minimumMindscapeRank: expectInteger(
      expectField(bonus, "minimumMindscapeRank", label),
      `${label}.minimumMindscapeRank`,
    ),
    bonus: expectInteger(expectField(bonus, "bonus", label), `${label}.bonus`),
    groups: expectStringArray(
      expectField(bonus, "groups", label),
      `${label}.groups`,
    ),
    source: parseSource(expectField(bonus, "source", label), `${label}.source`),
  }
}

function parseConditionalIdentity(
  value: unknown,
  label: string,
): AgentActionConditionalIdentity {
  const identity = expectRecord(value, label)
  return {
    potentialLevels: expectIntegerArray(
      expectField(identity, "potentialLevels", label),
      `${label}.potentialLevels`,
    ),
    requiresAdditionalAbilityActive: expectBoolean(
      expectField(identity, "requiresAdditionalAbilityActive", label),
      `${label}.requiresAdditionalAbilityActive`,
    ),
    skillTargetIds: expectStringArray(
      expectField(identity, "skillTargetIds", label),
      `${label}.skillTargetIds`,
    ),
    skillTags: expectStringArray(
      expectField(identity, "skillTags", label),
      `${label}.skillTags`,
    ),
  }
}

function parseInput(value: unknown, label: string): AgentActionInput {
  const input = expectRecord(value, label)
  return {
    inputId: expectString(
      expectField(input, "inputId", label),
      `${label}.inputId`,
    ),
    name: expectString(expectField(input, "name", label), `${label}.name`),
    minimum: expectNumber(
      expectField(input, "minimum", label),
      `${label}.minimum`,
    ),
    maximum: expectNumber(
      expectField(input, "maximum", label),
      `${label}.maximum`,
    ),
  }
}

function parseAction(value: unknown, label: string): AgentActionDefinition {
  const action = expectRecord(value, label)
  const skillCategory = nullableString(action, "skillCategory", label)
  const upstreamSkillId = nullableString(action, "upstreamSkillId", label)
  const potentialLevels = Object.hasOwn(action, "potentialLevels")
    ? expectIntegerArray(action.potentialLevels, `${label}.potentialLevels`)
    : undefined
  const conditionalIdentity = Object.hasOwn(action, "conditionalIdentity")
    ? parseConditionalIdentity(
        action.conditionalIdentity,
        `${label}.conditionalIdentity`,
      )
    : undefined
  return {
    actionId: expectString(
      expectField(action, "actionId", label),
      `${label}.actionId`,
    ),
    branchId: expectString(
      expectField(action, "branchId", label),
      `${label}.branchId`,
    ),
    name: expectString(expectField(action, "name", label), `${label}.name`),
    rowName: expectString(
      expectField(action, "rowName", label),
      `${label}.rowName`,
    ),
    levelGroup: expectString(
      expectField(action, "levelGroup", label),
      `${label}.levelGroup`,
    ),
    skillCategory,
    skillTargetIds: expectStringArray(
      expectField(action, "skillTargetIds", label),
      `${label}.skillTargetIds`,
    ),
    skillTags: expectStringArray(
      expectField(action, "skillTags", label),
      `${label}.skillTags`,
    ),
    source: parseSource(
      expectField(action, "source", label),
      `${label}.source`,
    ),
    descriptionSources: expectArray(
      expectField(action, "descriptionSources", label),
      `${label}.descriptionSources`,
    ).map((entry, index) =>
      parseSource(entry, `${label}.descriptionSources[${index}]`),
    ),
    description: expectString(
      expectField(action, "description", label),
      `${label}.description`,
    ),
    parameterIds: expectStringArray(
      expectField(action, "parameterIds", label),
      `${label}.parameterIds`,
    ),
    sourceExpression: expectString(
      expectField(action, "sourceExpression", label),
      `${label}.sourceExpression`,
    ),
    damageCoefficient: parseCoefficient(
      expectField(action, "damageCoefficient", label),
      `${label}.damageCoefficient`,
    ),
    dazeCoefficient: parseCoefficient(
      expectField(action, "dazeCoefficient", label),
      `${label}.dazeCoefficient`,
    ),
    calculation: expectRecord(
      expectField(action, "calculation", label),
      `${label}.calculation`,
    ),
    inputs: expectArray(
      expectField(action, "inputs", label),
      `${label}.inputs`,
    ).map((entry, index) => parseInput(entry, `${label}.inputs[${index}]`)),
    limitations: expectStringArray(
      expectField(action, "limitations", label),
      `${label}.limitations`,
    ),
    ...(potentialLevels === undefined ? {} : { potentialLevels }),
    ...(conditionalIdentity === undefined ? {} : { conditionalIdentity }),
    upstreamSkillId,
  }
}

function parseActionFile(
  value: unknown,
  label: string,
  definitionPath: string,
): AgentActionDefinitionFile {
  const file = expectRecord(value, label)
  const actions = expectArray(
    expectField(file, "actions", label),
    `${label}.actions`,
  ).map((entry, index) => parseAction(entry, `${label}.actions[${index}]`))
  const actionIds = new Set<string>()
  for (const action of actions) {
    if (actionIds.has(action.actionId))
      throw new Error(
        `${label}.actions: duplicate actionId "${action.actionId}"`,
      )
    actionIds.add(action.actionId)
  }
  return {
    entityId: expectString(
      expectField(file, "entityId", label),
      `${label}.entityId`,
    ),
    definitionPath,
    schemaVersion: expectInteger(
      expectField(file, "schemaVersion", label),
      `${label}.schemaVersion`,
    ),
    skillLevelBonuses: expectArray(
      expectField(file, "skillLevelBonuses", label),
      `${label}.skillLevelBonuses`,
    ).map((entry, index) =>
      parseSkillLevelBonus(entry, `${label}.skillLevelBonuses[${index}]`),
    ),
    actions,
  }
}

/** 读取 definitions/skills/agents/*.json；只读，不修改任何制品。 */
export function loadAgentActionIndex(
  definitionsDirectory = defaultDefinitionsDirectory,
): AgentActionIndex {
  const directory = join(definitionsDirectory, "skills/agents")
  let entries: readonly string[]
  try {
    entries = readdirSync(directory)
      .filter((entry) => entry.endsWith(".json"))
      .toSorted()
  } catch (error) {
    throw new Error(`skills/agents: cannot read ${directory}`, {
      cause: error,
    })
  }
  return {
    files: entries.map((entry) => {
      const definitionPath = `skills/agents/${entry}`
      const file = readJsonFile(join(directory, entry), definitionPath)
      return parseActionFile(file.value, definitionPath, definitionPath)
    }),
  }
}

/** 返回唯一匹配的动作定义；重复 actionId 视为数据完整性错误。 */
export function findAgentAction(
  index: AgentActionIndex,
  actionId: string,
):
  | {
      readonly file: AgentActionDefinitionFile
      readonly action: AgentActionDefinition
    }
  | undefined {
  const matches: {
    readonly file: AgentActionDefinitionFile
    readonly action: AgentActionDefinition
  }[] = []
  for (const file of index.files) {
    for (const action of file.actions) {
      if (action.actionId === actionId) matches.push({ file, action })
    }
  }
  if (matches.length > 1)
    throw new Error(`skills/agents: duplicate actionId "${actionId}"`)
  return matches[0]
}
