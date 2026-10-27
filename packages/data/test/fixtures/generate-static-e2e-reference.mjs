// Explicit, offline fixture maintenance only. Normal tests never run this file.
// Usage: node test/fixtures/generate-static-e2e-reference.mjs /path/to/ZZZ-HP /new/output.json
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { builds, effects, scenarios } from "./static-e2e-cases.ts"

const [repository, output] = process.argv.slice(2)
assert(
  repository && output,
  "Provide the upstream Git repository and a NEW output file",
)
const commit = "991bb0ef2a00387f8a1fa18293bbda17256d7270"
const fairyBaseline = "bae8aaa278632e731440e29d22fe38067c8fb99b"
const buffResource = "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json"
const digests = {
  [buffResource]:
    "f1df0144ee962138cd09dbdd36511eab46fb3d6016ec638ddab7fc4a01737095",
  "damageCalc.ts":
    "763c7447cf6ab208c48f5412516de430b1e2ba1669e90bf37ecb83526bc0629d",
  "affixPanelCalc.ts":
    "633bbb59703252a5ccd26931b0d1c01fbbd75b83ee998f84dc401394a0ca233a",
  "affixDriveDiscConfig.ts":
    "909f4dfb8b1169943832571d0d06f378932705ad0ea91e14074dc8cbf4fca764",
  "panelBuffCalc.ts":
    "33bd26840c7e0646377efaf5127da05d4672cfdc8a2052648a602d4cabb0645d",
  "buffEffect.ts":
    "b344c82c6015ac31f72197e8ee968cfc9bf60be5e85403b455008f8dbfa763bf",
  "skillTalentLevels.ts":
    "f52244106f7a95cf621e375b5c654d71019d8a86eb80c55727561983ab4c71f4",
  "calculatorUi.ts":
    "b15afac0893cfc6edd3f7d153812e710619cdc74329cc11dc9d76981a418cf40",
  "enemyResistance.ts":
    "5b0e943c77cf991cd66e38b22349b869173b486a476a88f397b62075112ce43c",
  "multFactorPercent.ts":
    "eee1f52bfa9c128d0e278c5890717c6aa1e897695237a9c6573751489ad311cb",
  "calcNumberFormat.ts":
    "21ca4409aed25475f3d3f883f9ffd728dd702aaf763c846f14431a95f111962c",
  "remielUtils.ts":
    "1cb8084a981115924b0cdc64961a67f937c280fe82babe2710758c7b279d8773",
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex")
const resources = []
function upstreamFile(key) {
  const path = key.includes("/") ? key : `zzz-hp/src/utils/${key}`
  const bytes = execFileSync(
    "git",
    ["-C", repository, "show", `${commit}:${path}`],
    { maxBuffer: 40 * 1024 * 1024 },
  )
  assert.equal(hash(bytes), digests[key], path)
  resources.push({ path, sha256: hash(bytes) })
  return bytes.toString("utf8")
}
const upstreamData = JSON.parse(upstreamFile(buffResource))
// Only inspected, dependency-closed declarations are extracted. No imports, app startup,
// network, stores, or default buff selection are executed. Function bodies stay unchanged.
const declarations = {
  "calculatorUi.ts": [
    "BUFF_STAT_FIELDS",
    "BUFF_MULT_FACTOR_KEYS",
    "FACTOR_STAT_KEYS",
    "readNumber",
    "createEmptyBuffStatModifiers",
    "normalizeBuffStatModifiers",
    "normalizeTwoPieceMods",
    "mergeBuffStatModifiers",
    "createEmptyAgentBasePanel",
    "createEmptyWengineAdvancedStats",
  ],
  "affixDriveDiscConfig.ts": [
    "AFFIX_DRIVE_DISC_SLOT_1_HP",
    "AFFIX_DRIVE_DISC_SLOT_2_ATK",
    "AFFIX_DRIVE_DISC_SLOT_3_DEF",
    "DRIVE_DISC_SLOT_4_OPTIONS",
    "DRIVE_DISC_SLOT_5_OPTIONS",
    "DRIVE_DISC_SLOT_6_OPTIONS",
    "createEmptyAffixDriveDiscMainStatContribution",
    "findSlotOption",
    "collectAffixDriveDiscMainStatContribution",
  ],
  "affixPanelCalc.ts": [
    "AFFIX_VALUE_PER_COUNT",
    "affixStatTotal",
    "roundPanelValue",
    "readTwoPieceExternalPercents",
    "collectAffixTwoPieceMods",
    "sumExternalPercents",
    "buildAffixExternalFixedParts",
    "applyAffixCountsToFixedParts",
    "computeExternalPanelFromAffixes",
  ],
  "multFactorPercent.ts": [
    "DEFAULT_MULT_FACTOR_PERCENT",
    "normalizePanelMultFactorPercent",
    "normalizeBuffMultFactorDelta",
    "combineMultFactorPercent",
    "multFactorPercentToRatio",
  ],
  "remielUtils.ts": [
    "LUMINOUS_ELEMENT",
    "isLuminousElement",
    "resolveLuminousEquivalentElement",
    "clampRemielLevel",
    "computeMutationZone",
    "computeRadianceMultZone",
    "computeSpecialMultZone",
    "computeRemielSelfRadianceSpecialLevelZone",
    "computeRemielSelfRadianceStandardLevelZone",
    "computeRemielSelfAnomalyBase",
  ],
  "panelBuffCalc.ts": ["applyBuffModsToPanel", "computePiercePower"],
  "skillTalentLevels.ts": [
    "SKILL_CONVERT_FROM_TO_TALENT_KEY",
    "isSkillConvertFromKey",
  ],
  "calcNumberFormat.ts": ["CALC_NUMBER_PRECISION", "roundCalc"],
  "buffEffect.ts": ["resolveEffectBaseValue", "resolveConvertValue"],
  "enemyResistance.ts": [
    "ENEMY_RESISTANCE_ELEMENTS",
    "RESISTANCE_VALUE_MAP",
    "DEFAULT_ENEMY_STAGGER_MULTIPLIER",
    "createDefaultElementResistance",
    "normalizeDamageEnemyInput",
    "isEnemyResistanceElement",
    "resolveEnemyResistanceForElement",
  ],
  "damageCalc.ts": [
    "clamp",
    "computeLevelZone",
    "computeVulnerableZone",
    "resolveBaseDamageParts",
    "computeGeneralAndAnomalyBase",
    "computeDefenseZone",
  ],
}
let extracted = ""
const extraction = []
for (const [file, names] of Object.entries(declarations)) {
  const source = upstreamFile(file)
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  for (const name of names) {
    const declaration = tree.statements.find(
      (statement) =>
        (ts.isFunctionDeclaration(statement) &&
          statement.name?.text === name) ||
        (ts.isVariableStatement(statement) &&
          statement.declarationList.declarations.some(
            (d) => d.name.getText(tree) === name,
          )),
    )
    assert(declaration, `${file}:${name}`)
    const text = declaration.getText(tree)
    extraction.push({ file, name, sha256: hash(text) })
    extracted += `${text}\n`
  }
}
const exported = [
  "computeExternalPanelFromAffixes",
  "buildAffixExternalFixedParts",
  "applyAffixCountsToFixedParts",
  "AFFIX_VALUE_PER_COUNT",
  "createEmptyAgentBasePanel",
  "createEmptyWengineAdvancedStats",
  "createEmptyBuffStatModifiers",
  "resolveEffectBaseValue",
  "resolveConvertValue",
  "applyBuffModsToPanel",
  "computePiercePower",
  "computeGeneralAndAnomalyBase",
  "computeDefenseZone",
  "multFactorPercentToRatio",
  "LUMINOUS_ELEMENT",
  "isLuminousElement",
  "resolveLuminousEquivalentElement",
  "computeMutationZone",
  "computeRadianceMultZone",
  "computeSpecialMultZone",
  "computeRemielSelfRadianceSpecialLevelZone",
  "computeRemielSelfRadianceStandardLevelZone",
  "computeRemielSelfAnomalyBase",
]
const compiled = ts.transpileModule(
  `${extracted}\nexport { ${exported.join(",")} }`,
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText
const upstream = {}
new Function("exports", compiled)(upstream)

const nanokaSources = new Map()
function nanoka(path) {
  const bytes = readFileSync(
    new URL(`../../.generated/integrated/${path}`, import.meta.url),
  )
  // The read is from prepare:consumer's verified copy, and must still be the selected baseline.
  const recorded = execFileSync(
    "git",
    ["show", `${fairyBaseline}:packages/data/integrated/${path}`],
    { maxBuffer: 8 * 1024 * 1024 },
  )
  assert.equal(hash(bytes), hash(recorded), `Nanoka baseline changed: ${path}`)
  nanokaSources.set(path, { path, sha256: hash(bytes) })
  return JSON.parse(bytes)
}
const atPointer = (value, pointer) =>
  pointer
    .split("/")
    .slice(1)
    .reduce((v, key) => v[key], value)
const mainKeys = {
  attack: "externalAtkPercent",
  health: "externalHpPercent",
  defense: "externalDefPercent",
  criticalRate: "critRate",
  criticalDamage: "critDmg",
  damageBonus: "dmgBonus",
  anomalyProficiency: "mastery",
}
const subKeys = {
  "health:initial-fixed": "hpFlat",
  "health:initial-percentage": "hpPercent",
  "attack:initial-fixed": "atkFlat",
  "attack:initial-percentage": "atkPercent",
  "defense:initial-fixed": "defFlat",
  "defense:initial-percentage": "defPercent",
  "criticalRate:ratio-add": "critRate",
  "criticalDamage:ratio-add": "critDmg",
  "penetrationValue:initial-fixed": "pen",
}
const panelKeys = {
  health: "hp",
  attack: "atk",
  defense: "def",
  impact: "impact",
  anomalyProficiency: "mastery",
  anomalyMastery: "anomalyControl",
  energyRegen: "energyRegen",
  criticalRate: "critRate",
  criticalDamage: "critDmg",
  penetrationRatio: "penRate",
}
const ratioStats = new Set([
  "criticalRate",
  "criticalDamage",
  "penetrationRatio",
])

function buildReference(build) {
  const actor = build.actor
  const data = nanoka(`agents/${actor.agentEntityId}/data.json`)
  const s = data.stats
  const promotion = Object.values(data.level).find(
    (level) => level.levelMax === 60,
  )
  const base = {
    ...upstream.createEmptyAgentBasePanel(),
    hp: (s.hpMax * 10000 + 59 * s.hpGrowth + promotion.hpMax * 10000) / 10000,
    atk:
      (s.attack * 10000 + 59 * s.attackGrowth + promotion.attack * 10000) /
      10000,
    def:
      (s.defence * 10000 + 59 * s.defenceGrowth + promotion.defence * 10000) /
      10000,
    critRate: s.crit / 100,
    critDmg: s.critDamage / 100,
    penRate: s.penRate / 100,
    mastery: s.elementMystery,
    anomalyControl: s.elementAbnormalPower,
    energyRegen: s.spRecover / 100,
    sharpenCritDmgBonus: (s.sharpCriticalDamage ?? 0) / 100,
  }
  const coreMap = {
    12101: ["atk", 1],
    11101: ["hp", 1],
    20101: ["critRate", 100],
    30501: ["energyRegen", 100],
    31201: ["mastery", 1],
    31401: ["anomalyControl", 1],
  }
  if (actor.coreSkillLevel > 1)
    for (const entry of Object.values(
      data.extraLevel[actor.coreSkillLevel - 1].extra,
    )) {
      const conversion = coreMap[entry.prop]
      assert(conversion, `Unchecked core stat ${entry.prop}`)
      base[conversion[0]] += entry.value / conversion[1]
    }
  const weapon = nanoka(`w-engines/${actor.wEngine.entityId}/data.json`)
  const weaponDetails = nanoka(
    `w-engines/${actor.wEngine.entityId}/details.zh.json`,
  )
  const advancedKey = {
    防御力百分比: "externalDefPercent",
    攻击力百分比: "externalAtkPercent",
    生命值百分比: "externalHpPercent",
    能量自动回复: "energyRegen",
    穿透率: "penRate",
  }[weaponDetails.randProperty.name2]
  assert(advancedKey, weaponDetails.randProperty.name2)
  // 3.2 起锋御音擎基础属性为防御力；其余仍为基础攻击力（音擎数据 name 决定）。
  const defenseBaseWeapon = weaponDetails.baseProperty.name.includes("防御")
  const weaponBaseValue =
    (weapon.baseProperty.value *
      (10000 + weapon.level[60].rate + weapon.stars[5].starRate)) /
    10000
  const counts = Object.fromEntries(
    Object.keys(upstream.AFFIX_VALUE_PER_COUNT).map((key) => [key, 0]),
  )
  for (const disc of Object.values(actor.driveDiscs))
    for (const sub of disc.substats) {
      const key = subKeys[`${sub.attribute}:${sub.operation}`]
      assert(key, `Unchecked affix ${JSON.stringify(sub)}`)
      counts[key] += sub.rolls
    }
  const input = {
    agentBase: base,
    wengineBaseAtk: defenseBaseWeapon ? 0 : weaponBaseValue,
    ...(defenseBaseWeapon ? { wengineBaseDef: weaponBaseValue } : {}),
    wengineAdvanced: {
      ...upstream.createEmptyWengineAdvancedStats(),
      [advancedKey]:
        (weapon.randProperty.value * (10000 + weapon.stars[5].randRate)) /
        1000000,
    },
    affixCounts: counts,
    driveDiscSelection: {
      fourPieceDriveDiscId: build.upstreamSets[0],
      twoPieceDriveDiscId: build.upstreamSets[1],
    },
    driveDiscMainStats: Object.fromEntries(
      [4, 5, 6].map((slot) => [
        `slot${slot}MainStat`,
        mainKeys[actor.driveDiscs[slot].mainStat.attribute],
      ]),
    ),
    driveDiscs: upstreamData.driveDiscs,
  }
  const parts = upstream.buildAffixExternalFixedParts(input)
  const rounded = upstream.computeExternalPanelFromAffixes(input)
  const precise = { ...rounded }
  // Independently remove ONLY documented display rounding; coefficients remain upstream values.
  for (const [stat, baseKey, fixedKey, percentKey, flatKey, fixed] of [
    ["hp", "agentHp", "fixedHpPercent", "hpPercent", "hpFlat", 2200],
    ["atk", "atkBase", "fixedAtkPercent", "atkPercent", "atkFlat", 316],
    ["def", "agentDef", "fixedDefPercent", "defPercent", "defFlat", 184],
  ])
    precise[stat] =
      parts[baseKey] *
        (1 +
          (parts[fixedKey] +
            counts[percentKey] * upstream.AFFIX_VALUE_PER_COUNT[percentKey]) /
            100) +
      counts[flatKey] * upstream.AFFIX_VALUE_PER_COUNT[flatKey] +
      fixed
  precise.energyRegen = parts.energyRegen
  precise.impact = s.breakStun
  let permanentConversion = 0
  if (actor.agentEntityId === "1121") {
    const details = nanoka("agents/1121/details.zh.json")
    const rate =
      details.passive.level[`112150${actor.coreSkillLevel}`].extraProperty[131]
        .value / 10000
    permanentConversion = precise.def * rate
    precise.atk += permanentConversion
    // Upstream has no configurable Ben conversion; this is an explicit, sourced supplement.
    rounded.atk += rounded.def * rate
  }
  let initialCriticalRateConversion
  if (actor.agentEntityId === "1611") {
    // 独立读取冻结游戏文本；上游装备纯函数未结算这条常驻转换。
    const details = nanoka("agents/1611/details.zh.json")
    const rows = Object.values(details.passive.level)
    assert.equal(rows.length, 7)
    const rates = rows.map((row) => {
      const match = row.desc[0]
        .replace(/<[^>]*>/gu, "")
        .match(/克拉蕾每拥有1%的初始暴击伤害，初始暴击率提升([\d.]+)%/u)
      assert(match, "Missing Claret initial critical conversion evidence")
      return Number(match[1])
    })
    const rate = rates[0]
    assert(Number.isFinite(rate) && rates.every((value) => value === rate))
    initialCriticalRateConversion = (precise.critDmg * rate) / 100
    precise.critRate += precise.critDmg * rate
    rounded.critRate += rounded.critDmg * rate
  }
  const sourceAgent = upstreamData.agents.find(
    (a) => a.id === build.upstreamAgentId,
  )
  const sourceWeapon = upstreamData.wengines.find(
    (w) => w.id === build.upstreamWEngineId,
  )
  // The pinned effects source has no Roxy entity or Crimson Moon Casket entry.
  // Keep the explicitly sourced Nanoka build usable, and record the absent
  // upstream projection instead of fabricating one.
  const exportedBasePanelResult =
    sourceAgent === undefined || sourceWeapon === undefined
      ? null
      : upstream.computeExternalPanelFromAffixes({
          ...input,
          agentBase: sourceAgent.basePanel,
          wengineBaseAtk: sourceWeapon.baseAtk,
          ...(sourceWeapon.baseDef
            ? { wengineBaseDef: sourceWeapon.baseDef }
            : {}),
          wengineAdvanced: sourceWeapon.advancedStats,
        })
  const stats = Object.fromEntries(
    Object.entries(panelKeys).map(([stat, key]) => [
      stat,
      precise[key] / (ratioStats.has(stat) ? 100 : 1),
    ]),
  )
  stats.sharpCriticalDamage = (s.sharpCriticalDamage ?? 0) / 10000
  if (actor.agentEntityId === "1371")
    stats.sheerForce = 0.1 * precise.hp + 0.3 * precise.atk
  const damageBonuses = {}
  const elementalDisc = actor.driveDiscs[5].mainStat
  if (elementalDisc.attribute === "damageBonus")
    damageBonuses[elementalDisc.element] = precise.dmgBonus / 100
  if (actor.agentEntityId === "1371")
    damageBonuses["auric-ink"] = damageBonuses.ether
  return {
    panel: { stats, penetrationValue: precise.pen, damageBonuses },
    precise,
    rounded,
    exportedBasePanelResult,
    permanentConversion,
    initialCriticalRateConversion,
    affixCounts: counts,
  }
}
const buildResults = Object.fromEntries(
  Object.entries(builds).map(([id, build]) => [id, buildReference(build)]),
)

function actionReference(scenario, build) {
  const id = build.actor.agentEntityId
  assert(
    ["1031", "1121", "1371", "1611", "1581", "1621"].includes(id),
    "Audit the action source and extend this fixture generator before adding another agent",
  )
  if (id === "1581") {
    // 耀变动作：倍率来自固定上游耀变技能记录（damagePercentage/Growth 按
    // 万分之一），并与 Nanoka 的 AvatarSkillLevel 表达式逐字核对。
    assert.equal(scenario.actionId, "action:agent:1581:action:0007")
    const details = nanoka("agents/1581/details.zh.json")
    const row = details.skill.assist.description[7].param[2]
    const curve = /^\{CAL:(\d+)\+AvatarSkillLevel\(6\)\*(\d+),1,2\}%$/.exec(
      row.desc,
    )
    assert(curve, row.desc)
    const levelInput = scenario.levels.assist
    assert(levelInput.mode === "effective")
    const level = levelInput.value
    const sourceSkill = upstreamData.skills.find(
      (skill) => skill.id === "sk-remiel-radiance-mtsw2paj",
    )
    assert(sourceSkill, "sk-remiel-radiance-mtsw2paj")
    const multiplier =
      (sourceSkill.damagePercentage +
        sourceSkill.damagePercentageGrowth * (level - 1)) /
      10000
    assert.equal(
      multiplier,
      (Number(curve[1]) + Number(curve[2]) * level) / 100,
      "Nanoka luminize curve and upstream skill record disagree",
    )
    return {
      effectiveLevel: level,
      source: {
        path: "agents/1581/details.zh.json",
        pointer: "/skill/assist/description/7/param/2",
        expression: row.desc,
        parameters: {},
      },
      upstreamSkill: {
        id: sourceSkill.id,
        element: sourceSkill.element,
        multiplier,
      },
      multipliers: [multiplier],
      element: "lumiflux",
      individual: false,
      sharpen: false,
      luminize: true,
    }
  }
  if (id === "1621") {
    // 风眼动作没有固定 effects/skills 记录；倍率只从 Nanoka 原始参数行独立计算，
    // 并核对风眼描述中的一秒合计边界。计算约定来自项目已登记的固定主仓
    // 7a4f2776 normal-ATK/special/wind 映射，不冒充上游技能记录。
    assert.equal(scenario.actionId, "action:agent:1621:action:0024")
    const details = nanoka("agents/1621/details.zh.json")
    const windEyeDescription = details.skill.special.description[4].desc
    assert.match(windEyeDescription, /巨型风旋[^。]*持续1秒/u)
    const row = details.skill.special.description[9].param[3]
    assert.equal(row.name, "巨型风旋每秒伤害倍率")
    const parameterId = Object.keys(row.param)[0]
    assert.equal(parameterId, "1621020")
    const p = row.param[parameterId]
    assert.equal(p.damagePercentage, 20840)
    assert.equal(p.damagePercentageGrowth, 1900)
    const levelInput = scenario.levels.special
    assert(levelInput && levelInput.mode === "effective")
    const level = levelInput.value
    const multiplier =
      (p.damagePercentage + p.damagePercentageGrowth * (level - 1)) / 10000
    return {
      effectiveLevel: level,
      source: {
        path: "agents/1621/details.zh.json",
        pointer: "/skill/special/description/9/param/3",
        expression: row.desc,
        parameters: {
          [parameterId]: {
            damagePercentage: p.damagePercentage,
            damagePercentageGrowth: p.damagePercentageGrowth,
          },
        },
        descriptionPointer: "/skill/special/description/4/desc",
      },
      upstreamSkill: null,
      upstreamSkillNote:
        "Pinned 991bb0e has no Roxy skill record; the action contract follows the project's fixed 7a4f2776 normal-ATK/special/wind convention.",
      multipliers: [multiplier],
      element: "wind",
      individual: false,
      sharpen: false,
      luminize: false,
    }
  }
  let group
  let section
  let parameter
  let skillId
  if (id === "1031") {
    ;[group, section, parameter] = ["basic", 3, 0]
    skillId = "sk-nicole-nk-1031001-一段"
  } else if (id === "1121") {
    ;[group, section, parameter] = ["assist", 3, 0]
    skillId = "sk-benbigger-nk-1121016-main"
  } else if (id === "1611") {
    if (scenario.actionId === "action:agent:1611:action:0019") {
      ;[group, section, parameter] = ["chain", 3, 0]
      skillId = "sk-claret-nk-1611021-main"
    } else {
      assert.equal(
        scenario.actionId,
        "action:agent:1611:action:0027",
        "Audit the Claret action source before adding another action",
      )
      ;[group, section, parameter] = ["special", 6, 4]
      skillId = "sk-claret-nk-1611013-毁伤"
    }
  } else {
    ;[group, section, parameter] = ["special", 6, 0]
    skillId = "sk-yixuan-nk-1371022-蓄力期间总"
  }
  const details = nanoka(`agents/${id}/details.zh.json`)
  const row = details.skill[group].description[section].param[parameter]
  const levelInput = scenario.levels[group]
  const mindscape = build.actor.mindscapeRank
  const rankBonus = (mindscape >= 3 ? 2 : 0) + (mindscape >= 5 ? 2 : 0)
  const level =
    levelInput.mode === "trained"
      ? levelInput.value + rankBonus
      : levelInput.value
  const coefficient = (parameterId) => {
    const p = row.param[parameterId]
    return (p.damagePercentage + p.damagePercentageGrowth * (level - 1)) / 10000
  }
  const multipliers =
    id === "1031"
      ? [coefficient("1031001"), ...Array(3).fill(coefficient("1031003") / 3)]
      : [coefficient(Object.keys(row.param)[0])]
  const sourceSkill = upstreamData.skills.find((skill) => skill.id === skillId)
  assert(sourceSkill, skillId)
  const nativeCoefficient =
    (sourceSkill.damagePercentage +
      sourceSkill.damagePercentageGrowth * (level - 1)) /
    10000
  assert.equal(nativeCoefficient, multipliers[0])
  return {
    effectiveLevel: level,
    source: {
      path: `agents/${id}/details.zh.json`,
      pointer: `/skill/${group}/description/${section}/param/${parameter}`,
      expression: row.desc,
      parameters: Object.fromEntries(
        Object.entries(row.param).map(([key, p]) => [
          key,
          {
            damagePercentage: p.damagePercentage,
            damagePercentageGrowth: p.damagePercentageGrowth,
          },
        ]),
      ),
    },
    upstreamSkill: {
      id: skillId,
      element: sourceSkill.element,
      multiplier: nativeCoefficient,
    },
    multipliers,
    element:
      id === "1031"
        ? "physical"
        : id === "1121"
          ? "fire"
          : id === "1611"
            ? "electric"
            : "auric-ink",
    individual: id === "1031",
    sharpen: id === "1611",
  }
}

function assertMindscapeRank(build, minimum, label) {
  assert(
    build.actor.mindscapeRank >= minimum,
    `${label} requires mindscape ${minimum}`,
  )
}
function nanokaContribution({
  effectId,
  mapping,
  pointer,
  stat,
  sourceValue,
  divisor,
  unit,
}) {
  return {
    effectId,
    optionId: mapping.optionId,
    holderId: mapping.holderId,
    pointer,
    stat,
    sourceValue,
    divisor,
    unit,
  }
}
/**
 * Nanoka-only selections cannot be read from the pinned ZZZ-HP buff JSON.
 * Each resolver reads the frozen game text/param row, derives its own value,
 * and returns explicit panel/multiplier contributions. The Fairy catalog is
 * never consulted for numbers.
 */
const nanokaSelectionResolvers = {
  roxyInitialEnergy({ scenario, build, reference, mapping, selection }) {
    const declared = scenario.explicitInputs?.find(
      (entry) => entry.effect === selection.effect,
    )
    assert(declared, "Roxy initial energy requires an explicit caller input")
    assert.equal(declared.unit, "energy-per-second")
    // The explicit input is grounded in the independently computed equipment panel.
    assert.equal(reference.precise.energyRegen, declared.value)
    const details = nanoka("agents/1621/details.zh.json")
    const core = build.actor.coreSkillLevel
    assert(Number.isInteger(core) && core >= 1 && core <= 7, "core 1-7")
    const key = `162150${core}`
    const row = details.passive.level[key]
    assert(row, key)
    const text = row.desc[0]
    const match = text.match(
      /大于1\.2时，超过部分每超过0\.01，攻击力提升([\d.]+)点，最多提升<color=#2BAD00>([\d.]+)<\/color>点，冲击力提升([\d.]+)点，最多提升<color=#2BAD00>([\d.]+)<\/color>点/u,
    )
    assert(match, text)
    const [, attackRateRaw, attackCapRaw, impactRateRaw, impactCapRaw] = match
    // Text is "per 0.01 Energy Regen"; convert the stated points per 0.01 into
    // points per 1.0 energy-per-second (500 and 40 for the pinned rows).
    const attackRate = Number(attackRateRaw) / 0.01
    const attackCap = Number(attackCapRaw)
    const impactRate = Number(impactRateRaw) / 0.01
    const impactCap = Number(impactCapRaw)
    const excess = Math.max(0, declared.value - 1.2)
    const attack = Math.min(attackCap, excess * attackRate)
    const impact = Math.min(impactCap, excess * impactRate)
    const pointer = `/passive/level/${key}/desc/0`
    return {
      panel: [{ stat: "atk", value: attack }],
      derivedInputs: {
        initialEnergyRegen: declared.value,
        convertedAttack: attack,
        convertedImpact: impact,
        impactConsumedByDamagePath: false,
      },
      contributions: [
        nanokaContribution({
          effectId: "agent:1621:nanoka:initial-energy-regen-conversion:attack",
          mapping,
          pointer,
          stat: "atk",
          sourceValue: attack,
          divisor: 1,
          unit: "attack-points",
        }),
      ],
      formula: `ATK = min(${attackCap}, max(0, ${declared.value} - 1.2) × ${attackRate}) = ${attack}; Impact = min(${impactCap}, max(0, ${declared.value} - 1.2) × ${impactRate}) = ${impact} (impact is not read by the direct-damage path)`,
    }
  },
  roxyM1CriticalDamage({ build, mapping }) {
    assertMindscapeRank(build, 1, "Roxy M1 critical damage")
    const text = nanoka("agents/1621/details.zh.json").talent["1"].desc
    const match = text.match(/自身暴击伤害提升([\d.]+)%/u)
    assert(match, text)
    const value = Number(match[1])
    const pointer = "/talent/1/desc"
    return {
      panel: [{ stat: "critDmg", value }],
      contributions: [
        nanokaContribution({
          effectId: "agent:1621:nanoka:m1-critical-damage",
          mapping,
          pointer,
          stat: "critDmg",
          sourceValue: value,
          divisor: 100,
          unit: "ratio",
        }),
      ],
      formula: `CRIT DMG +${value} percentage points`,
    }
  },
  roxyM6WindIgnore({ build, mapping }) {
    assertMindscapeRank(build, 6, "Roxy M6 wind resistance ignore")
    const text = nanoka("agents/1621/details.zh.json").talent["6"].desc
    const match = text.match(
      /无视目标([\d.]+)%<color=#A6C5FD>风属性伤害抗性<\/color>/u,
    )
    assert(match, text)
    const value = Number(match[1])
    const pointer = "/talent/6/desc"
    return {
      panel: [{ stat: "resPen", value }],
      contributions: [
        nanokaContribution({
          effectId: "agent:1621:nanoka:m6-wind-resistance-ignore",
          mapping,
          pointer,
          stat: "resPen",
          sourceValue: value,
          divisor: 100,
          unit: "ratio",
        }),
      ],
      formula: `Attacker wind resistance ignore +${value} percentage points`,
    }
  },
  roxyM6GiantWindstorm({ build, mapping }) {
    assertMindscapeRank(build, 6, "Roxy M6 giant windstorm")
    const text = nanoka("agents/1621/details.zh.json").talent["6"].desc
    const match = text.match(/巨型风旋造成的伤害倍率提升至原本的([\d.]+)%/u)
    assert(match, text)
    const percent = Number(match[1])
    const scale = percent / 100
    const pointer = "/talent/6/desc"
    return {
      multiplierFactor: scale,
      contributions: [
        nanokaContribution({
          effectId: "agent:1621:nanoka:m6-giant-windstorm",
          mapping,
          pointer,
          stat: "damageMultiplier",
          sourceValue: scale,
          divisor: 1,
          unit: "multiplier",
        }),
      ],
      formula: `Giant Windstorm base item × ${percent}% = × ${scale}`,
    }
  },
  crimsonMoonCritical({ build, mapping }) {
    const details = nanoka("w-engines/14162/details.zh.json")
    const refinement = build.actor.wEngine.refinement
    assert(Number.isInteger(refinement) && refinement >= 1 && refinement <= 5)
    const text = details.talents[String(refinement)].desc
    const match = text.match(/暴击率提升<color=#2BAD00>([\d.]+)%/u)
    assert(match, text)
    const value = Number(match[1])
    const pointer = `/talents/${refinement}/desc`
    return {
      panel: [{ stat: "critRate", value }],
      contributions: [
        nanokaContribution({
          effectId: "w-engine:14162:nanoka:crit-rate",
          mapping,
          pointer,
          stat: "critRate",
          sourceValue: value,
          divisor: 100,
          unit: "ratio",
        }),
      ],
      formula: `Crimson Moon Casket R${refinement}: CRIT Rate +${value} percentage points`,
    }
  },
  crimsonMoonWindIgnore({ build, mapping }) {
    const details = nanoka("w-engines/14162/details.zh.json")
    const refinement = build.actor.wEngine.refinement
    assert(Number.isInteger(refinement) && refinement >= 1 && refinement <= 5)
    const text = details.talents[String(refinement)].desc
    const match = text.match(
      /造成的伤害无视目标<color=#2BAD00>([\d.]+)%<\/color><color=#A6C5FD>风属性伤害抗性/u,
    )
    assert(match, text)
    const value = Number(match[1])
    const pointer = `/talents/${refinement}/desc`
    return {
      panel: [{ stat: "resPen", value }],
      contributions: [
        nanokaContribution({
          effectId: "w-engine:14162:nanoka:wind-resistance-ignore",
          mapping,
          pointer,
          stat: "resPen",
          sourceValue: value,
          divisor: 100,
          unit: "ratio",
        }),
      ],
      formula: `Crimson Moon Casket R${refinement}: Wind RES ignore +${value} percentage points`,
    }
  },
  claretMindscape1({ build, mapping, corrected }) {
    assertMindscapeRank(build, 1, "Claret M1 Maim multiplier")
    const effect = atPointer(
      upstreamData,
      "/agents/6/mindscapeBuffs/1/effectBlocks/0/effects/0",
    )
    assert(effect && effect.id, "Claret M1 source effect")
    const text = nanoka("agents/1611/details.zh.json").talent["1"].desc
    const match = text.match(/\[毁伤\]造成的伤害倍率提升至原本的([\d.]+)%/u)
    assert(match, text)
    const percent = Number(match[1])
    // The pinned source encodes the same clause as skillDmgBonus +30. Revision 45
    // corrects that encoding to a base-multiplier increase. Verify both readings
    // agree before choosing the corrected multiplier semantics.
    assert.equal(effect.stat, "skillDmgBonus")
    assert.equal(effect.value, percent - 100)
    const increase = (percent - 100) / 100
    const pointer = "/agents/6/mindscapeBuffs/1/effectBlocks/0/effects/0"
    if (!corrected)
      return {
        panel: [{ stat: "skillDmgBonus", value: effect.value }],
        contributions: [
          {
            optionId: mapping.optionId,
            holderId: mapping.holderId,
            pointer,
            stat: "skillDmgBonus",
            sourceValue: effect.value,
          },
        ],
        formula: `Pinned-source encoding: DMG bonus +${effect.value} percentage points`,
      }
    return {
      multiplierFactor: 1 + increase,
      contributions: [
        nanokaContribution({
          effectId:
            "agent:1611:zzz-hp:eff-mtse9xm8-q641yp:blk-mtrkovf7-dqmjh3:mindscape:1",
          mapping,
          pointer,
          stat: "baseMultiplierIncrease",
          sourceValue: increase,
          divisor: 1,
          unit: "ratio",
        }),
      ],
      formula: `Corrected base multiplier × ${percent}% = × ${1 + increase}`,
    }
  },
}

function evaluateScenario(scenario, corrected, roundedPanel) {
  const build = builds[scenario.buildIds[0]]
  const reference = buildResults[scenario.buildIds[0]]
  const action = actionReference(scenario, build)
  if (scenario.luminize)
    return evaluateVoidflareScenario(scenario, build, reference, action)
  const panel = roundedPanel ? reference.rounded : reference.precise
  const mods = upstream.createEmptyBuffStatModifiers()
  const contributions = []
  const formulas = []
  const derivedInputs = {}
  let multiplierFactor = 1
  let conversionBase = null
  for (const selection of scenario.buffs) {
    const mapping = effects[selection.effect]
    const resolver = nanokaSelectionResolvers[selection.effect]
    if (resolver) {
      const resolved = resolver({
        scenario,
        build,
        reference,
        mapping,
        selection,
        corrected,
      })
      for (const delta of resolved.panel ?? []) mods[delta.stat] += delta.value
      multiplierFactor *= resolved.multiplierFactor ?? 1
      contributions.push(...resolved.contributions)
      Object.assign(derivedInputs, resolved.derivedInputs ?? {})
      if (resolved.formula) formulas.push(resolved.formula)
      continue
    }
    const effect = atPointer(upstreamData, mapping.pointer)
    assert(effect && effect.id, mapping.pointer)
    let value
    if (selection.effect === "astraAttack") {
      const astraBuild = scenario.buildIds.find(
        (id) => builds[id].actor.agentEntityId === "1311",
      )
      conversionBase = buildResults[astraBuild].precise.atk
      value = upstream.resolveConvertValue(effect, {}, conversionBase)
      if (builds[astraBuild].actor.mindscapeRank >= 2) {
        if (corrected) value = Math.min(1600, conversionBase * 0.54)
        else
          for (const extra of upstreamData.agents.find(
            (agent) => agent.id === "astrayao",
          ).mindscapeBuffs[2].effectBlocks[0].effects)
            value += upstream.resolveConvertValue(extra, {}, conversionBase)
      }
    } else value = upstream.resolveEffectBaseValue(effect, selection.layers)
    mods[effect.stat] += value
    contributions.push({
      optionId: mapping.optionId,
      holderId: mapping.holderId,
      pointer: mapping.pointer,
      stat: effect.stat,
      sourceValue: value,
    })
  }
  const final = upstream.applyBuffModsToPanel(panel, mods)
  const sheer = action.element === "auric-ink"
  const sheerForce = roundedPanel
    ? upstream.computePiercePower(final.hp, final.atk)
    : 0.1 * final.hp + 0.3 * final.atk
  const resistance =
    scenario.target.resistances[
      action.element === "auric-ink" ? "ether" : action.element
    ]
  const resistanceType = { "0": "normal", "0.2": "res20", "-0.2": "weak" }[
    String(resistance)
  ]
  assert(resistanceType)
  const sharpen = action.sharpen
  const sourceMainAgent = sharpen
    ? upstreamData.agents.find((a) => a.id === build.upstreamAgentId)
    : undefined
  if (sharpen)
    assert(sourceMainAgent, `sharpen source agent ${build.upstreamAgentId}`)
  const parts = upstream.computeGeneralAndAnomalyBase({
    panel: final,
    piercePower: sheerForce,
    baseDamageSource: sheer ? "pierce" : "atk",
    isMb: sheer,
    useSharpenFormula: sharpen,
    combatSharpenDmgBonus: mods.sharpenDmgBonus,
    enemyInput: {
      defense: scenario.target.baseDefense,
      resistanceType,
      vulnerableMultiplier: 1,
      staggerMultiplier: scenario.target.baseStunDamageMultiplier,
      specialMultiplier: 1,
      level: 60,
    },
    combatVulnerable: 0,
    combatDirectVulnerable: 0,
    combatAnomalyVulnerable: 0,
    combatDmgReduction: 0,
    combatDirectDmgReduction: 0,
    combatAnomalyDmgReduction: 0,
    combatGlobalStaggerVulnerable: 0,
    combatStaggerVulnerable: 0,
    combatStaggerVulnerableOnly: 0,
    combatSpecial: 0,
    combatPierceDmgBonus: mods.pierceDmgBonus,
    staggerPhase: scenario.target.isStunned ? "stagger" : "normal",
    agentLevel: 60,
  })
  // Independently reproduce damageCalc.ts's regular direct branch (713-723) and
  // the sharpen chain (700-710) without the final integer presentation rounding.
  // The sharp critical zones follow the documented formula:
  // r = clamp(critRate%/100, 0, 2), B = 锐暴伤害%/100；
  // forced first layer r ≤ 1: 1 + B，r > 1: (1 + B) × (1 + B × (r − 1))；
  // expectation = (1 − min(1, r)) + min(1, r) × forced.
  const sharpCriticalDamageBonus = sharpen
    ? (sourceMainAgent.basePanel.sharpenCritDmgBonus +
        mods.sharpenCritDmgBonus) /
      100
    : 0
  const sharpRate = Math.min(2, Math.max(0, final.critRate / 100))
  const sharpOverflow = Math.max(0, sharpRate - 1)
  const sharpWeight = Math.min(1, Math.max(0, sharpRate))
  const sharpCriticalForcedZone =
    (1 + sharpCriticalDamageBonus) *
    (1 + sharpCriticalDamageBonus * sharpOverflow)
  const sharpCriticalExpectedZone =
    1 - sharpWeight + sharpWeight * sharpCriticalForcedZone
  const baseChain =
    parts.generalMultiplier *
    parts.directVulnerableMultiplier *
    parts.specialMultiplier *
    (sharpen ? parts.sharpenDmgMultiplier : parts.pierceDmgMultiplier)
  const settledMultipliers = action.multipliers.map(
    (multiplier) => multiplier * multiplierFactor,
  )
  const hits = action.multipliers.map((multiplier, index) => {
    const settledMultiplier = settledMultipliers[index]
    return {
      nonCritical: baseChain * settledMultiplier,
      critical:
        baseChain *
        settledMultiplier *
        (sharpen ? sharpCriticalForcedZone : 1 + parts.critDmgRatio),
      expected:
        baseChain *
        settledMultiplier *
        (sharpen ? sharpCriticalExpectedZone : parts.critMultiplier),
    }
  })
  const total = (key) => hits.reduce((sum, hit) => sum + hit[key], 0)
  return {
    action:
      multiplierFactor === 1
        ? action
        : { ...action, settlementMultipliers: settledMultipliers },
    conversionBase,
    contributions,
    ...(Object.keys(derivedInputs).length === 0 ? {} : { derivedInputs }),
    ...(multiplierFactor === 1 && formulas.length === 0
      ? {}
      : {
          formula: {
            multiplierFactor,
            catalogMultipliers: action.multipliers,
            settlementMultipliers: settledMultipliers,
            baseChain,
            criticalFactor: sharpen
              ? sharpCriticalForcedZone
              : 1 + parts.critDmgRatio,
            expectedFactor: sharpen
              ? sharpCriticalExpectedZone
              : parts.critMultiplier,
            notes: formulas,
          },
        }),
    finalStats: {
      attack: final.atk,
      health: final.hp,
      ...(sharpen ? { defense: final.def } : {}),
      criticalRate: final.critRate / 100,
      criticalDamage: final.critDmg / 100,
      ...(sharpen ? { sharpCriticalDamage: sharpCriticalDamageBonus } : {}),
      ...(sheer ? { sheerForce } : {}),
    },
    factors: {
      damageBonus: parts.dmgMultiplier,
      ...(sharpen
        ? { sharpCritical: sharpCriticalForcedZone }
        : { critical: 1 + parts.critDmgRatio }),
      expectedCritical: sharpen
        ? sharpCriticalExpectedZone
        : parts.critMultiplier,
      defense: parts.defenseMultiplier,
      resistance: parts.resistanceMultiplier,
      stunDamage: parts.staggerMultiplier,
      damageTaken: parts.directVulnerableMultiplier,
      ...(sheer ? { sheerDamageBonus: parts.pierceDmgMultiplier } : {}),
      ...(sharpen ? { sharpenDamageBonus: parts.sharpenDmgMultiplier } : {}),
    },
    hits,
    totals: {
      nonCritical: total("nonCritical"),
      critical: total("critical"),
      expected: total("expected"),
      displayedNonCritical: action.individual
        ? hits.reduce((sum, h) => sum + Math.ceil(h.nonCritical), 0)
        : null,
      displayedCritical: action.individual
        ? hits.reduce((sum, h) => sum + Math.ceil(h.critical), 0)
        : null,
    },
    upstreamStyleIntegerExpected: Math.round(total("expected")),
  }
}
/**
 * 蕾米埃尔自身特殊虚曜的独立参考：
 * - 面板与全部增益值仍来自固定上游纯函数和原始记录；
 * - 异常基础、两个等级区、特殊倍率区、防御区使用固定 remielUtils/damageCalc
 *   的原函数（未修改的提取声明）；
 * - 耀变倍率同样由固定上游原函数建立：本次招式倍率百分点作为 radianceMult、
 *   默认基线 100 加精通换算记录百分点作为 radianceMultFactor，交给未修改的
 *   computeRadianceMultZone（max(0, radianceMult/100) × 倍率修正）；
 *   不再手写"招式倍率 + 精通 × 0.002"的加算式。
 */
function evaluateVoidflareScenario(scenario, build, reference, action) {
  const actor = build.actor
  assert.equal(actor.agentEntityId, "1581")
  assert.equal(action.luminize, true)
  const panel = reference.precise
  const contributions = []
  let conversionBase = null
  const byEffect = new Map()
  for (const selection of scenario.buffs) {
    const mapping = effects[selection.effect]
    const effect = atPointer(upstreamData, mapping.pointer)
    assert(effect && effect.id, mapping.pointer)
    byEffect.set(selection.effect, effect)
    contributions.push({
      optionId: mapping.optionId,
      holderId: mapping.holderId,
      pointer: mapping.pointer,
      stat: effect.stat,
      sourceValue: null,
    })
  }
  const convert = (effect, panelSourceValues) =>
    upstream.resolveConvertValue(effect, {}, undefined, panelSourceValues)
  const base = (effect) => upstream.resolveEffectBaseValue(effect, 1)
  // 受限攻击 = 局外攻击 + 自身角色来源攻击转模（外读初始攻击，上限 1600）。
  // 转模参数来自固定记录；与面板一样，只独立去除上游 resolveConvertValue 的
  // 4 位显示舍入，系数与上限保持原值。
  conversionBase = panel.atk
  const attackConvert = byEffect.get("remielAttackConvert")
  const attackConvertValue = Math.max(
    -Math.abs(attackConvert.convert.cap ?? Infinity),
    Math.min(
      Math.abs(attackConvert.convert.cap ?? Infinity),
      (Math.max(0, panel.atk) * attackConvert.convert.ratioPercent) / 100,
    ),
  )
  const restrictedAttack = Math.max(0, panel.atk + attackConvertValue)
  // 受限精通 = 局外精通 + 自身适配音擎精通 + 自身四件套精通（二件套已在局外面板）。
  const wEngineMastery = base(byEffect.get("odeMastery"))
  const fourPieceMastery = base(byEffect.get("featheredMastery"))
  const restrictedMastery = Math.max(
    0,
    panel.mastery + wEngineMastery + fourPieceMastery,
  )
  // 本组场景无队友精通效果，完整当前精通与受限精通一致。
  const fullMastery = restrictedMastery
  // 异化：万色滞行1 精通换算（终盘精通）+ 万色滞行2 固定 +10。
  const mutationConvert = convert(byEffect.get("remielMutationConvert"), {
    final: { mastery: fullMastery },
  })
  const mutationFixed = base(byEffect.get("remielMutationTeam"))
  const mutationZone = upstream.computeMutationZone({
    mutationCoeff: mutationConvert + mutationFixed,
    mutationCoeffFactor: 100,
  })
  const anomalyBase = upstream.computeRemielSelfAnomalyBase({
    inCombatAtk: restrictedAttack,
    inCombatMastery: restrictedMastery,
    mutationZone,
    agentLevel: 60,
  })
  // 耀变倍率：固定上游原函数 computeRadianceMultZone。
  // 本次招式倍率是 radianceMult（百分点）；精通换算记录
  // （/agents/51/mindscapeBuffs/0/effectBlocks/0/effects/1，stat radianceMultFactor、
  // mastery/final、ratioPercent 20）产出百分点后叠加默认基线 100，
  // 由 multFactorPercentToRatio 除以 100，即 1 + 精通 × 0.002。
  const luminizeConversion = convert(byEffect.get("remielLuminizeConvert"), {
    final: { mastery: fullMastery },
  })
  const luminizeMultiplier = upstream.computeRadianceMultZone({
    radianceMult: action.multipliers[0] * 100,
    radianceMultFactor: upstream.combineMultFactorPercent(
      100,
      luminizeConversion,
    ),
  })
  // 特殊倍率区：M4 +12pp，M6 strength=quarter 由 -75pp 的 25% 表达。
  const mindscapeFour = byEffect.has("remielMindscapeFour")
  const specialMultZone = upstream.computeSpecialMultZone({
    specialMult: 100 + (mindscapeFour ? 12 : 0),
    specialMultFactor:
      scenario.luminize.strength === "mindscape-6-quarter" ? 25 : 100,
  })
  // 耀变综合增伤 = 音擎异常增伤 + 四件套异常增伤。
  const anomalyDmgBonusZone =
    1 +
    (base(byEffect.get("odeAnomalyBonus")) +
      base(byEffect.get("featheredAnomalyBonus"))) /
      100
  // 防御区：受限穿透率为 0、无固定穿透；目标防御取场景值。
  const defenseZone = upstream.computeDefenseZone({
    defensePanel: { penRate: 0, pen: 0, ignoreDefense: 0, reduceDefense: 0 },
    isMb: false,
    enemyDefense: scenario.target.baseDefense,
  })
  // 抗性区：等效属性抗性由调用方按"循环下一位非流明队友"确定后显式提供；
  // 通用抗穿取完整面板（本组为 0），耀变专属抗穿取 M1 的 50%。
  const radianceResPen = byEffect.has("remielMindscapeOne")
    ? base(byEffect.get("remielMindscapeOne"))
    : 0
  const resistanceMultiplier =
    1 -
    scenario.luminize.equivalentElementResistance +
    Math.max(-2, Math.min(2, (0 + radianceResPen) / 100))
  for (const contribution of contributions) {
    const effect = byEffect.get(
      Object.keys(effects).find(
        (key) => effects[key].optionId === contribution.optionId,
      ),
    )
    contribution.sourceValue =
      effect.stat === "atk"
        ? attackConvertValue
        : effect.id === byEffect.get("remielMutationConvert").id
          ? mutationConvert
          : effect.id === byEffect.get("remielLuminizeConvert").id
            ? fullMastery * 0.002
            : base(effect)
  }
  const value =
    anomalyBase *
    defenseZone.defenseMultiplier *
    resistanceMultiplier *
    anomalyDmgBonusZone *
    luminizeMultiplier *
    specialMultZone
  return {
    action,
    conversionBase,
    contributions,
    finalStats: {
      restrictedAttack,
      restrictedMastery,
      fullMastery,
      attack: panel.atk,
      anomalyProficiency: panel.mastery,
    },
    factors: {
      baseDamage: restrictedAttack,
      damageBonus: upstream.computeRemielSelfRadianceSpecialLevelZone(60),
      anomalyProficiency: restrictedMastery / 100,
      refringe: mutationZone,
      luminizeMultiplier,
      anomalyDamageBonus: anomalyDmgBonusZone,
      defense: defenseZone.defenseMultiplier,
      resistance: resistanceMultiplier,
      damageTaken: 1,
      stunDamage: 1,
      anomalyDamageLevel:
        upstream.computeRemielSelfRadianceStandardLevelZone(60),
      specialMultiplier: specialMultZone,
    },
    hits: [{ nonCritical: value, critical: null, expected: value }],
    totals: {
      nonCritical: value,
      critical: null,
      expected: value,
      displayedNonCritical: null,
      displayedCritical: null,
    },
    upstreamStyleIntegerExpected: Math.round(value),
  }
}
const scenarioEvidence = {
  "roxy-m6-giant-windstorm": {
    upstreamEvidence: "pinned-project-convention-only",
    boundaries: [
      "只计算一次 aggregate 巨型风旋的一秒合计；不累计风能、风眼生成、余响每 3 秒/额外 2 次、逐击拆分或 M6 失衡提升。",
      "M6 倍率只作用于 action:agent:1621:action:0024:base；0022/0023 及其他 special 项保留原倍率，不能自动变成三次事件。",
      "初始回能 1.92 由装备面板独立推导并在调用方显式提供；选项不读取面板当前回能，缺少输入返回 MISSING_FACT。",
      "未选择 M6 风抗忽视时不自动附带；M1 暴伤、14162 暴击率与两项风抗忽视互相独立。",
    ],
  },
  "claret-m6-maim": {
    upstreamEvidence: "pinned-source-record-and-correction",
    boundaries: [
      "调用方显式选择 action:agent:1611:action:0027 表示一次独立追加毁伤；不实现连携/终结后的自动触发、残痕消耗或事件时序。",
      "M1 倍率乘区只作用于特殊技大类下的毁伤目标；0019 终结技不自动附加 0027，普通毁伤也不是 M6 专属动作。",
      "M4 只作用于锻星第三段、连携与终结，不作用于毁伤；切换 M4 不改变毁伤结果。",
      "M6 构建不等于自动触发毁伤；动作在 M0—M6 均可用，本场景不声称实现 M6 的自动追加。",
    ],
  },
}
const cases = {}
for (const scenario of scenarios) {
  const reference = evaluateScenario(scenario, true, false)
  const upstreamAligned = evaluateScenario(scenario, false, false)
  const upstreamRounded = evaluateScenario(scenario, false, true)
  cases[scenario.id] = {
    reference,
    upstreamAlignedTotals: upstreamAligned.totals,
    upstreamRoundedTotals: upstreamRounded.totals,
    upstreamStyleIntegerExpected: upstreamRounded.upstreamStyleIntegerExpected,
    ...scenarioEvidence[scenario.id],
  }
}
const fixture = {
  provenance: {
    repository: "LoTwT/ZZZ-HP",
    commit,
    fairyBaseline,
    gameVersion: "3.3",
    method:
      "Pinned upstream pure functions + independently reproduced direct-damage and sharpen chains; precise Nanoka inputs, explicit Ben and Claret permanent-conversion supplements, existing Astra M2 correction, and the Roxy M6 / Claret M1 multiplier corrections from frozen Nanoka text. Not the upstream application.",
    resources,
    extraction,
    nanokaSources: [...nanokaSources.values()],
  },
  builds: Object.fromEntries(
    Object.entries(buildResults).map(([id, result]) => [
      id,
      {
        panel: result.panel,
        permanentConversion: result.permanentConversion,
        ...(result.initialCriticalRateConversion === undefined
          ? {}
          : {
              initialCriticalRateConversion:
                result.initialCriticalRateConversion,
            }),
        affixCounts: result.affixCounts,
        upstreamExportedPanel:
          result.exportedBasePanelResult === null
            ? null
            : Object.fromEntries(
                [...Object.values(panelKeys), "dmgBonus", "pen"].map((key) => [
                  key,
                  result.exportedBasePanelResult[key],
                ]),
              ),
        upstreamRoundedAlignedPanel: Object.fromEntries(
          [...Object.values(panelKeys), "dmgBonus", "pen"].map((key) => [
            key,
            result.rounded[key],
          ]),
        ),
      },
    ]),
  ),
  cases,
}
writeFileSync(output, `${JSON.stringify(fixture, null, 2)}\n`, { flag: "wx" })
// 制品直接落在仓库内：与根级格式检查走同一 oxfmt 配置，保证再生字节一致。
const workspaceRoot = fileURLToPath(new URL("../../../..", import.meta.url))
const require = createRequire(new URL("../../../package.json", import.meta.url))
execFileSync(
  process.execPath,
  [
    join(dirname(require.resolve("oxfmt/package.json")), "bin/oxfmt"),
    "--write",
    output,
  ],
  { cwd: workspaceRoot, stdio: "inherit" },
)
console.log(
  `Wrote ${Object.keys(cases).length} independent reference cases to ${output}`,
)
