import type { CellValue, Worksheet } from "exceljs"

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

export type GenerateFieldName = string

export type GenerateTypeExpression = string

export type GenerateSourceJsonName = string

export type GenerateWorksheetName = string

export type GenerateJsonFileName = string

export type GenerateInterfaceName = string

export type GenerateTypeGroupName = string

export type GenerateWorksheetColumnHeader = string

export type GenerateDataRow = Record<GenerateFieldName, unknown>

export type DerivedSourceRowResolver = (
  sourceRows: GenerateDataRow[],
  matchValue: unknown,
) => GenerateDataRow | undefined

export interface ColumnDef {
  field: GenerateFieldName
  type: GenerateTypeExpression
}

export interface DerivedField {
  field: GenerateFieldName
  type: GenerateTypeExpression
  /** Which jsonFileName to look up the mapping from */
  sourceJson: GenerateSourceJsonName
  /** Field in the current dataset to match against */
  matchField: GenerateFieldName
  /** Field in the source dataset to match on */
  sourceMatchField: GenerateFieldName
  /** Field in the source dataset to take the value from */
  sourceValueField: GenerateFieldName
  /** Resolve duplicate source rows into a single deterministic match */
  resolveSourceRow?: DerivedSourceRowResolver
}

export interface WorksheetConfig {
  sheetName: GenerateWorksheetName
  jsonFileName: GenerateJsonFileName
  typeName: GenerateInterfaceName
  typeGroup: GenerateTypeGroupName
  columns: Record<GenerateWorksheetColumnHeader, ColumnDef>
  derivedFields?: DerivedField[]
}

// ---------------------------------------------------------------------------
// Worksheet configs
// ---------------------------------------------------------------------------

function preferRowWithNumberFieldLessThan(
  field: GenerateFieldName,
  upperBound: number,
): DerivedSourceRowResolver {
  return (sourceRows, matchValue) => {
    const preferredRows = sourceRows.filter((row) => {
      const value = row[field]
      return typeof value === "number" && value < upperBound
    })

    if (preferredRows.length === 1) {
      return preferredRows[0]
    }

    if (preferredRows.length === 0) {
      throw new Error(
        `No preferred source row found for "${String(matchValue)}" using ${field} < ${upperBound}.`,
      )
    }

    throw new Error(
      `Multiple preferred source rows found for "${String(matchValue)}" using ${field} < ${upperBound}.`,
    )
  }
}

export const worksheetConfigs: WorksheetConfig[] = [
  {
    sheetName: "代理人技能数据",
    jsonFileName: "agent-skill",
    typeName: "AgentSkill",
    typeGroup: "agent",
    derivedFields: [
      {
        field: "agentId",
        type: "number",
        sourceJson: "agent-stat",
        matchField: "agent",
        sourceMatchField: "agent",
        sourceValueField: "id",
        resolveSourceRow: preferRowWithNumberFieldLessThan("id", 2000),
      },
    ],
    columns: {
      代理人: { field: "agent", type: "string" },
      技能: { field: "skill", type: "string" },
      段: { field: "phase", type: "string" },
      伤害倍率: { field: "damageMultiplier", type: "number | null" },
      伤害倍率成长: { field: "damageMultiplierGrowth", type: "number | null" },
      失衡倍率: { field: "dazeMultiplier", type: "number | null" },
      失衡倍率成长: { field: "dazeMultiplierGrowth", type: "number | null" },
      能量回复: { field: "energyRegen", type: "number | null" },
      异常积蓄: { field: "anomalyBuildup", type: "number | null" },
      喧响值回复: { field: "techniquePointsRegen", type: "number | null" },
      闪能累积: { field: "adrenalineAccumulation", type: "number | null" },
      秽盾削减值: { field: "miasmicShieldReduction", type: "number | null" },
      能量额外消耗: { field: "extraEnergyConsumption", type: "number | null" },
      特殊能量: { field: "specialEnergy", type: "number | null" },
      距离衰减: { field: "distanceFalloff", type: "number | null" },
    },
  },
  {
    sheetName: "代理人属性",
    jsonFileName: "agent-stat",
    typeName: "AgentStat",
    typeGroup: "agent",
    columns: {
      "代理人": { field: "agent", type: "string" },
      "ID": { field: "id", type: "number" },
      "Name": { field: "name", type: "string" },
      "属性": { field: "attribute", type: "string" },
      "特性": { field: "specialty", type: "string" },
      "进攻类型": { field: "attackType", type: "string" },
      "阵营": { field: "faction", type: "string" },
      "支援类型": { field: "supportType", type: "string" },
      "生命值": { field: "hp", type: "number" },
      "生命值每级成长": { field: "hpGrowth", type: "number" },
      "攻击力": { field: "atk", type: "number" },
      "攻击力每级成长": { field: "atkGrowth", type: "number" },
      "防御力": { field: "def", type: "number" },
      "防御力每级成长": { field: "defGrowth", type: "number" },
      "暴击率": { field: "critRate", type: "number" },
      "暴击伤害": { field: "critDamage", type: "number" },
      "冲击力": { field: "impact", type: "number" },
      "异常掌控": { field: "anomalyMastery", type: "number" },
      "能量上限（闪能上限）": { field: "energyLimit", type: "number" },
      "能量自动回复（闪能自动累积）": {
        field: "energyGenerationRate",
        type: "number",
      },
      "异常精通": { field: "anomalyProficiency", type: "number" },
      "喧响伴随获得效率": { field: "techniquePointsGainRate", type: "number" },
      "晋升生命值加成": { field: "promotionHpBonus", type: "number" },
      "晋升攻击力加成": { field: "promotionAtkBonus", type: "number" },
      "晋升防御力加成": { field: "promotionDefBonus", type: "number" },
      "60级基础生命值": { field: "baseHpLv60", type: "number" },
      "60级基础攻击力": { field: "baseAtkLv60", type: "number" },
      "60级基础防御力": { field: "baseDefLv60", type: "number" },
      "核心技特殊属性1": {
        field: "coreSkillSpecialStat1",
        type: "string | null",
      },
      "数值1": { field: "coreSkillSpecialValue1", type: "number | null" },
      "核心技特殊属性2": {
        field: "coreSkillSpecialStat2",
        type: "string | null",
      },
      "数值2": { field: "coreSkillSpecialValue2", type: "number | null" },
    },
  },
  {
    sheetName: "代理人晋升属性",
    jsonFileName: "agent-promotion",
    typeName: "AgentPromotion",
    typeGroup: "agent",
    columns: {
      ID: { field: "id", type: "number" },
      代理人: { field: "agent", type: "string" },
      等阶: { field: "rank", type: "number" },
      生命值加成: { field: "hpBonus", type: "number" },
      攻击力加成: { field: "atkBonus", type: "number" },
      防御力加成: { field: "defBonus", type: "number" },
    },
  },
  {
    sheetName: "代理人影画描述",
    jsonFileName: "agent-cinema",
    typeName: "AgentCinema",
    typeGroup: "agent",
    derivedFields: [
      {
        field: "agentId",
        type: "number",
        sourceJson: "agent-stat",
        matchField: "agent",
        sourceMatchField: "agent",
        sourceValueField: "id",
        resolveSourceRow: preferRowWithNumberFieldLessThan("id", 2000),
      },
    ],
    columns: {
      代理人: { field: "agent", type: "string" },
      影画: { field: "cinema", type: "number" },
      标题: { field: "title", type: "string" },
      描述: { field: "description", type: "string" },
      描述2: { field: "description2", type: "string | null" },
    },
  },
  {
    sheetName: "代理人技能描述",
    jsonFileName: "agent-skill-desc",
    typeName: "AgentSkillDesc",
    typeGroup: "agent",
    derivedFields: [
      {
        field: "agentId",
        type: "number",
        sourceJson: "agent-stat",
        matchField: "agent",
        sourceMatchField: "agent",
        sourceValueField: "id",
        resolveSourceRow: preferRowWithNumberFieldLessThan("id", 2000),
      },
    ],
    columns: {
      代理人: { field: "agent", type: "string" },
      技能名称: { field: "skillName", type: "string" },
      技能描述: { field: "skillDescription", type: "string" },
    },
  },
  {
    sheetName: "代理人核心技描述",
    jsonFileName: "agent-core-skill",
    typeName: "AgentCoreSkill",
    typeGroup: "agent",
    columns: {
      "ID": { field: "id", type: "number" },
      "代理人": { field: "agent", type: "string" },
      "核心被动名称": { field: "corePassiveName", type: "string" },
      "1级描述": { field: "descriptionLv1", type: "string" },
      "2级描述": { field: "descriptionLv2", type: "string" },
      "3级描述": { field: "descriptionLv3", type: "string" },
      "4级描述": { field: "descriptionLv4", type: "string" },
      "5级描述": { field: "descriptionLv5", type: "string" },
      "6级描述": { field: "descriptionLv6", type: "string" },
      "7级描述": { field: "descriptionLv7", type: "string" },
      "额外能力名称": { field: "additionalAbilityName", type: "string | null" },
      "额外能力描述": { field: "additionalAbilityDesc", type: "string | null" },
    },
  },
  {
    sheetName: "代理人强化",
    jsonFileName: "agent-enhance",
    typeName: "AgentEnhance",
    typeGroup: "agent",
    columns: {
      代理人ID: { field: "agentId", type: "number" },
      强化ID: { field: "enhanceId", type: "number" },
      代理人名称: { field: "agentName", type: "string" },
      强化后技能名称: { field: "enhancedSkillName", type: "string" },
      强化后技能描述: { field: "enhancedSkillDesc", type: "string" },
      强化前技能名称: { field: "originalSkillName", type: "string" },
      强化前技能描述: { field: "originalSkillDesc", type: "string" },
      核心技等级: { field: "coreSkillLevel", type: "number" },
    },
  },
  {
    sheetName: "代理人觉醒",
    jsonFileName: "agent-awaken",
    typeName: "AgentAwaken",
    typeGroup: "agent",
    columns: {
      代理人ID: { field: "agentId", type: "number" },
      觉醒ID: { field: "awakenId", type: "number" },
      代理人名称: { field: "agentName", type: "string" },
      觉醒被动名称: { field: "awakenPassiveName", type: "string | null" },
      觉醒被动描述: { field: "awakenPassiveDesc", type: "string | null" },
      觉醒名称: { field: "awakenName", type: "string" },
    },
  },
  {
    sheetName: "敌人属性",
    jsonFileName: "enemy-stat",
    typeName: "EnemyStat",
    typeGroup: "enemy",
    columns: {
      "完整名称": { field: "fullNameCn", type: "string" },
      "IndexID": { field: "indexId", type: "number" },
      "CodeName": { field: "codeName", type: "string" },
      "FullName": { field: "fullName", type: "string" },
      "ID": { field: "id", type: "number" },
      "生命值": { field: "hp", type: "number" },
      "攻击力": { field: "atk", type: "number" },
      "防御力": { field: "def", type: "number" },
      "暴击伤害": { field: "critDamage", type: "number" },
      "失衡值上限": { field: "dazeMax", type: "number" },
      "能否失衡": { field: "canDaze", type: "boolean" },
      "失衡值自动回复": { field: "dazeAutoRegen", type: "number" },
      "失衡值自动回复时限": { field: "dazeAutoRegenLimit", type: "number" },
      "基础失衡恢复速度": { field: "baseDazeRegenRate", type: "number" },
      "默认失衡恢复时间": { field: "defaultDazeRegenTime", type: "number" },
      "失衡易伤倍率": { field: "stunDamageMultiplier", type: "number" },
      "可连携次数": { field: "chainAttackCount", type: "number" },
      "初始抗打断等级": { field: "defaultInterruptResistance", type: "number" },
      "冻结时间抵抗": { field: "freezeTimeResistance", type: "number" },
      "冰伤害抗性": { field: "iceResistance", type: "number" },
      "火伤害抗性": { field: "fireResistance", type: "number" },
      "电伤害抗性": { field: "electricResistance", type: "number" },
      "物理伤害抗性": { field: "physicalResistance", type: "number" },
      "以太伤害抗性": { field: "etherResistance", type: "number" },
      "冰异常抗性": { field: "iceAnomalyResistance", type: "number" },
      "火异常抗性": { field: "fireAnomalyResistance", type: "number" },
      "电异常抗性": { field: "electricAnomalyResistance", type: "number" },
      "物理异常抗性": { field: "physicalAnomalyResistance", type: "number" },
      "以太异常抗性": { field: "etherAnomalyResistance", type: "number" },
      "冰失衡抗性": { field: "iceDazeResistance", type: "number" },
      "火失衡抗性": { field: "fireDazeResistance", type: "number" },
      "电失衡抗性": { field: "electricDazeResistance", type: "number" },
      "物理失衡抗性": { field: "physicalDazeResistance", type: "number" },
      "以太失衡抗性": { field: "etherDazeResistance", type: "number" },
      "冰异常条": { field: "iceAnomalyBar", type: "number" },
      "火异常条": { field: "fireAnomalyBar", type: "number" },
      "电异常条": { field: "electricAnomalyBar", type: "number" },
      "物理异常条": { field: "physicalAnomalyBar", type: "number" },
      "以太异常条": { field: "etherAnomalyBar", type: "number" },
      "基础积蓄上限提升系数": { field: "baseBuildupCapCoeff", type: "number" },
      "能量球掉落": { field: "energyOrbDrop", type: "number | null" },
      "未知变量（1.7版本新增）": { field: "unknownVar", type: "number | null" },
      "标签列表": { field: "tags", type: "string | null" },
      "70级最大生命值": { field: "maxHpLv70", type: "number" },
      "70级最大攻击力": { field: "maxAtkLv70", type: "number" },
      "70级最大失衡值上限": { field: "maxDazeLv70", type: "number" },
      "60级及以上防御力": { field: "defLv60Plus", type: "number" },
    },
  },
  {
    sheetName: "敌人属性调整",
    jsonFileName: "enemy-stat-modifier",
    typeName: "EnemyStatModifier",
    typeGroup: "enemy",
    columns: {
      ID: { field: "id", type: "number" },
      生命值: { field: "hp", type: "number" },
      攻击力: { field: "atk", type: "number" },
      失衡值上限: { field: "dazeMax", type: "number" },
      防御力: { field: "def", type: "number" },
      异常积蓄值上限: { field: "anomalyBuildupMax", type: "number" },
      SubID: { field: "subId", type: "number" },
    },
  },
  {
    sheetName: "异常条",
    jsonFileName: "anomaly-buildup",
    typeName: "AnomalyBuildup",
    typeGroup: "anomaly",
    columns: {
      异常条ID: { field: "anomalyBarId", type: "number" },
      属性: { field: "attribute", type: "string" },
      对应异常ID: { field: "anomalyId", type: "number" },
      备注: { field: "remark", type: "string | null" },
      异常CD: { field: "anomalyCooldown", type: "number" },
      积蓄值需求1: { field: "buildupRequirement1", type: "number" },
      积蓄值需求2: { field: "buildupRequirement2", type: "number" },
      积蓄值需求3: { field: "buildupRequirement3", type: "number" },
      积蓄值需求4: { field: "buildupRequirement4", type: "number" },
      积蓄值需求5: { field: "buildupRequirement5", type: "number" },
      积蓄值需求6: { field: "buildupRequirement6", type: "number" },
      积蓄值需求7: { field: "buildupRequirement7", type: "number" },
      积蓄值需求8: { field: "buildupRequirement8", type: "number" },
      积蓄值需求9: { field: "buildupRequirement9", type: "number" },
      积蓄值需求10: { field: "buildupRequirement10", type: "number" },
    },
  },
  {
    sheetName: "音擎属性",
    jsonFileName: "w-engine-stat",
    typeName: "WEngineStat",
    typeGroup: "w-engine",
    columns: {
      "名称": { field: "name", type: "string" },
      "ID": { field: "id", type: "number" },
      "稀有度": { field: "rarity", type: "string" },
      "职业": { field: "profession", type: "string" },
      "0级基础攻击力": { field: "baseAtkLv0", type: "number" },
      "60级基础攻击力": { field: "baseAtkLv60", type: "number" },
      "高级属性": { field: "advancedStat", type: "string" },
      "0级高级属性值": { field: "advancedStatLv0", type: "number" },
      "60级高级属性值": { field: "advancedStatLv60", type: "number" },
    },
  },
  {
    sheetName: "音擎描述",
    jsonFileName: "w-engine-desc",
    typeName: "WEngineDesc",
    typeGroup: "w-engine",
    columns: {
      名称: { field: "name", type: "string" },
      ID: { field: "id", type: "number" },
      职业: { field: "profession", type: "string" },
      描述: { field: "description", type: "string" },
      简述: { field: "summary", type: "string" },
      技能名称: { field: "skillName", type: "string" },
      技能描述1: { field: "skillDescriptionLv1", type: "string" },
      技能描述2: { field: "skillDescriptionLv2", type: "string" },
      技能描述3: { field: "skillDescriptionLv3", type: "string" },
      技能描述4: { field: "skillDescriptionLv4", type: "string" },
      技能描述5: { field: "skillDescriptionLv5", type: "string" },
    },
  },
  {
    sheetName: "邦布属性",
    jsonFileName: "bangboo-stat",
    typeName: "BangbooStat",
    typeGroup: "bangboo",
    columns: {
      "中文名称": { field: "name", type: "string | null" },
      "ID": { field: "id", type: "number" },
      "生命值": { field: "hp", type: "number" },
      "生命值每级成长": { field: "hpGrowth", type: "number" },
      "攻击力": { field: "atk", type: "number" },
      "攻击力每级成长": { field: "atkGrowth", type: "number" },
      "冲击力": { field: "impact", type: "number" },
      "异常掌控": { field: "anomalyMastery", type: "number" },
      "防御力": { field: "def", type: "number" },
      "防御力每级成长": { field: "defGrowth", type: "number" },
      "暴击率": { field: "critRate", type: "number" },
      "暴击伤害": { field: "critDamage", type: "number" },
      "突破生命值加成": { field: "promotionHpBonus", type: "number" },
      "突破攻击力加成": { field: "promotionAtkBonus", type: "number" },
      "突破防御力加成": { field: "promotionDefBonus", type: "number" },
      "60级生命值": { field: "hpLv60", type: "number" },
      "60级攻击力": { field: "atkLv60", type: "number" },
      "60级防御力": { field: "defLv60", type: "number" },
      "60级暴击率": { field: "critRateLv60", type: "number" },
      "60级暴击伤害": { field: "critDamageLv60", type: "number" },
    },
  },
  {
    sheetName: "邦布技能",
    jsonFileName: "bangboo-skill",
    typeName: "BangbooSkill",
    typeGroup: "bangboo",
    columns: {
      名称: { field: "name", type: "string" },
      技能: { field: "skill", type: "string" },
      伤害倍率: { field: "damageMultiplier", type: "number | null" },
      伤害倍率成长: { field: "damageMultiplierGrowth", type: "number | null" },
      失衡倍率: { field: "dazeMultiplier", type: "number | null" },
      失衡倍率成长: { field: "dazeMultiplierGrowth", type: "number | null" },
      异常积蓄: { field: "anomalyBuildup", type: "number | null" },
    },
  },
  {
    sheetName: "驱动盘描述",
    jsonFileName: "drive-disc-desc",
    typeName: "DriveDiscDesc",
    typeGroup: "drive-disc",
    columns: {
      "ID": { field: "id", type: "number" },
      "名称": { field: "name", type: "string" },
      "2件套效果": { field: "set2Effect", type: "string" },
      "4件套效果": { field: "set4Effect", type: "string" },
      "故事": { field: "story", type: "string" },
      "筛选项": { field: "filter", type: "string | null" },
      "标签": { field: "tag", type: "string | null" },
    },
  },
]

// ---------------------------------------------------------------------------
// Cell value extraction
// ---------------------------------------------------------------------------

export type GenerateCellValue = CellValue

export type GenerateExtractedCellValue = string | number | boolean | null

export interface GenerateCellExtractionContext {
  worksheet?: Worksheet
  address?: string
  formulaStack?: Set<string>
}

type GenerateFormulaToken =
  | { type: "number"; value: number }
  | { type: "reference"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" | "^" | "(" | ")" }

function normalizeCellReference(reference: string): string {
  return reference.replaceAll("$", "")
}

function describeCellContext(context?: GenerateCellExtractionContext): string {
  const sheetName = context?.worksheet?.name ?? "<unknown-sheet>"
  const address = context?.address
    ? normalizeCellReference(context.address)
    : "<unknown-cell>"
  return `${sheetName}!${address}`
}

function tokenizeFormula(formula: string): GenerateFormulaToken[] {
  const input = formula.startsWith("=") ? formula.slice(1) : formula
  const tokens: GenerateFormulaToken[] = []
  let cursor = 0

  while (cursor < input.length) {
    const rest = input.slice(cursor)
    const char = rest[0]

    if (/\s/.test(char)) {
      cursor += 1
      continue
    }

    if (/[+\-*/^()]/.test(char)) {
      tokens.push({
        type: "operator",
        value: char as GenerateFormulaToken["value"],
      })
      cursor += 1
      continue
    }

    const referenceMatch = rest.match(/^\$?[A-Z]+\$?\d+/)
    if (referenceMatch) {
      tokens.push({
        type: "reference",
        value: normalizeCellReference(referenceMatch[0]),
      })
      cursor += referenceMatch[0].length
      continue
    }

    const numberMatch = rest.match(/^(?:\d+(?:\.\d+)?|\.\d+)/)
    if (numberMatch) {
      tokens.push({
        type: "number",
        value: Number(numberMatch[0]),
      })
      cursor += numberMatch[0].length
      continue
    }

    throw new Error(`Unsupported formula token "${rest}"`)
  }

  return tokens
}

function evaluateFormulaReference(
  reference: string,
  context: GenerateCellExtractionContext,
): number {
  const worksheet = context.worksheet
  if (!worksheet) {
    throw new Error(
      `Missing worksheet context for formula reference ${reference}`,
    )
  }

  const cell = worksheet.getCell(reference)
  const value = extractCellValue(cell.value, {
    worksheet,
    address: cell.address,
    formulaStack: context.formulaStack,
  })

  const numeric = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numeric)) {
    throw new TypeError(
      `Referenced cell ${worksheet.name}!${reference} is not numeric: ${String(value)}`,
    )
  }

  return numeric
}

function evaluateFormula(
  formula: string,
  context?: GenerateCellExtractionContext,
): number {
  if (!context?.worksheet || !context.address) {
    throw new Error(
      `Cannot evaluate formula "${formula}" without worksheet context`,
    )
  }

  const address = normalizeCellReference(context.address)
  const formulaStack = context.formulaStack ?? new Set<string>()
  if (formulaStack.has(address)) {
    throw new Error(`Circular formula reference detected at ${address}`)
  }

  const tokens = tokenizeFormula(formula)
  let cursor = 0

  const peek = () => tokens[cursor]
  const consume = () => {
    const token = tokens[cursor]
    cursor += 1
    return token
  }
  const consumeOperator = (operator: string): boolean => {
    const token = peek()
    if (token?.type === "operator" && token.value === operator) {
      cursor += 1
      return true
    }
    return false
  }

  function parsePrimary(): number {
    const token = consume()
    if (!token) {
      throw new Error(`Unexpected end of formula "${formula}"`)
    }

    if (token.type === "number") {
      return token.value
    }

    if (token.type === "reference") {
      return evaluateFormulaReference(token.value, {
        ...context,
        formulaStack,
      })
    }

    if (token.type === "operator" && token.value === "(") {
      const value = parseExpression()
      if (!consumeOperator(")")) {
        throw new Error(`Missing closing parenthesis in formula "${formula}"`)
      }
      return value
    }

    throw new Error(`Unexpected token "${token.value}" in formula "${formula}"`)
  }

  function parseUnary(): number {
    if (consumeOperator("+")) {
      return parseUnary()
    }
    if (consumeOperator("-")) {
      return -parseUnary()
    }
    return parsePrimary()
  }

  function parsePower(): number {
    let value = parseUnary()
    while (consumeOperator("^")) {
      value **= parseUnary()
    }
    return value
  }

  function parseTerm(): number {
    let value = parsePower()
    while (true) {
      if (consumeOperator("*")) {
        value *= parsePower()
        continue
      }
      if (consumeOperator("/")) {
        value /= parsePower()
        continue
      }
      return value
    }
  }

  function parseExpression(): number {
    let value = parseTerm()
    while (true) {
      if (consumeOperator("+")) {
        value += parseTerm()
        continue
      }
      if (consumeOperator("-")) {
        value -= parseTerm()
        continue
      }
      return value
    }
  }

  formulaStack.add(address)
  try {
    const value = parseExpression()
    if (cursor !== tokens.length) {
      throw new Error(`Unsupported trailing tokens in formula "${formula}"`)
    }
    if (!Number.isFinite(value)) {
      throw new TypeError(
        `Formula "${formula}" did not produce a finite number`,
      )
    }
    return value
  } finally {
    formulaStack.delete(address)
  }
}

export function extractCellValue(
  cell: GenerateCellValue,
  context?: GenerateCellExtractionContext,
): GenerateExtractedCellValue {
  if (cell === null || cell === undefined) return null

  // Formula cell
  if (typeof cell === "object" && "formula" in cell) {
    const fc = cell as { formula: string; result?: CellValue }
    try {
      return fc.result !== undefined
        ? extractCellValue(fc.result, context)
        : evaluateFormula(fc.formula, context)
    } catch (error) {
      throw new Error(
        `Failed to evaluate formula at ${describeCellContext(context)}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  // Rich text
  if (typeof cell === "object" && "richText" in cell) {
    const rt = cell as { richText: Array<{ text: string }> }
    return rt.richText.map((r) => r.text).join("")
  }

  // Hyperlink
  if (typeof cell === "object" && "hyperlink" in cell) {
    const hl = cell as { hyperlink: string; text?: CellValue }
    return hl.text !== undefined ? extractCellValue(hl.text, context) : null
  }

  // Error
  if (typeof cell === "object" && "error" in cell) return null

  // Date
  if (cell instanceof Date) return cell.toISOString()

  // Primitive
  if (typeof cell === "string") {
    // Replace non-breaking space (U+00A0) with regular space
    return cell.replaceAll("\u00A0", " ")
  }
  if (typeof cell === "number" || typeof cell === "boolean") {
    return cell
  }

  return null
}

export type GenerateWorksheetHeaderText = string

export type GenerateNormalizedWorksheetHeader = string

export function normalizeHeader(
  header: GenerateWorksheetHeaderText,
): GenerateNormalizedWorksheetHeader {
  return header.replace(/\n/g, "").replace(/\r/g, "").trim()
}
