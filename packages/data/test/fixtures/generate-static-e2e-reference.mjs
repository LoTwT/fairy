// Explicit, offline fixture maintenance only. Normal tests never run this file.
// Usage: node test/fixtures/generate-static-e2e-reference.mjs /path/to/ZZZ-HP /new/output.json
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import ts from "typescript"
import { builds, effects, scenarios } from "./static-e2e-cases.ts"

const [repository, output] = process.argv.slice(2)
assert(
  repository && output,
  "Provide the upstream Git repository and a NEW output file",
)
const commit = "fac62407f3d3995f8200a66be0038f292b1455fa"
const fairyBaseline = "56bc52ad906bf04c5f280fc387049cdb74b828ca"
const buffResource = "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json"
const digests = {
  [buffResource]:
    "57c4aacca5455aa20f75f21967e294d8506ec1970a06e9c808557bdb3a91e20f",
  "damageCalc.ts":
    "2ef2e81cd11af03a3f9a5df82622c238ae3b6f9596346eee97136b7a2b427a71",
  "affixPanelCalc.ts":
    "ba97ae9c7bf8020085829080dc749168c99102a9f215d8c22ce6d13cdaa3c0d2",
  "affixDriveDiscConfig.ts":
    "909f4dfb8b1169943832571d0d06f378932705ad0ea91e14074dc8cbf4fca764",
  "panelBuffCalc.ts":
    "43ec23eafa28b8d0748636ab9885e1497fab8cd11e458268acd746c9adc40c09",
  "buffEffect.ts":
    "88c850fc2dce5017905a624357b169b41b5586a1f5d76218e48a61baff7c9909",
  "skillTalentLevels.ts":
    "0391667fba8f39c868ab6bc8aa3609c2b72313e0ae00bd273ccb220de06faa6d",
  "calculatorUi.ts":
    "e61bf67fab73920889338997d77d12190b45d29cfd5cb49703802a0953fb1cfe",
  "enemyResistance.ts":
    "5b0e943c77cf991cd66e38b22349b869173b486a476a88f397b62075112ce43c",
  "multFactorPercent.ts":
    "eee1f52bfa9c128d0e278c5890717c6aa1e897695237a9c6573751489ad311cb",
  "calcNumberFormat.ts":
    "1e8b3a819df03de2911f210988501f3d8ae47d7abf05c2d9558a7e6c7478c03a",
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
  }
  const coreMap = {
    12101: ["atk", 1],
    11101: ["hp", 1],
    20101: ["critRate", 100],
    30501: ["energyRegen", 100],
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
  }[weaponDetails.randProperty.name2]
  assert(advancedKey, weaponDetails.randProperty.name2)
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
    wengineBaseAtk:
      (weapon.baseProperty.value *
        (10000 + weapon.level[60].rate + weapon.stars[5].starRate)) /
      10000,
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
  const sourceAgent = upstreamData.agents.find(
    (a) => a.id === build.upstreamAgentId,
  )
  const sourceWeapon = upstreamData.wengines.find(
    (w) => w.id === build.upstreamWEngineId,
  )
  const exportedBasePanelResult = upstream.computeExternalPanelFromAffixes({
    ...input,
    agentBase: sourceAgent.basePanel,
    wengineBaseAtk: sourceWeapon.baseAtk,
    wengineAdvanced: sourceWeapon.advancedStats,
  })
  const stats = Object.fromEntries(
    Object.entries(panelKeys).map(([stat, key]) => [
      stat,
      precise[key] / (ratioStats.has(stat) ? 100 : 1),
    ]),
  )
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
    affixCounts: counts,
  }
}
const buildResults = Object.fromEntries(
  Object.entries(builds).map(([id, build]) => [id, buildReference(build)]),
)

function actionReference(scenario, build) {
  const id = build.actor.agentEntityId
  assert(
    ["1031", "1121", "1371"].includes(id),
    "Audit the action source and extend this fixture generator before adding another agent",
  )
  const [group, section, parameter] =
    id === "1031"
      ? ["basic", 3, 0]
      : id === "1121"
        ? ["assist", 3, 0]
        : ["special", 6, 0]
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
  const skillId =
    id === "1031"
      ? "sk-nicole-nk-1031001-一段"
      : id === "1121"
        ? "sk-benbigger-nk-1121016-main"
        : "sk-yixuan-nk-1371022-蓄力期间总"
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
    element: id === "1031" ? "physical" : id === "1121" ? "fire" : "auric-ink",
    individual: id === "1031",
  }
}

function evaluateScenario(scenario, corrected, roundedPanel) {
  const build = builds[scenario.buildIds[0]]
  const reference = buildResults[scenario.buildIds[0]]
  const action = actionReference(scenario, build)
  const panel = roundedPanel ? reference.rounded : reference.precise
  const mods = upstream.createEmptyBuffStatModifiers()
  const contributions = []
  let conversionBase = null
  for (const selection of scenario.buffs) {
    const mapping = effects[selection.effect]
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
          for (const extra of upstreamData.agents[45].mindscapeBuffs[2]
            .effectBlocks[0].effects)
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
  const parts = upstream.computeGeneralAndAnomalyBase({
    panel: final,
    piercePower: sheerForce,
    baseDamageSource: sheer ? "pierce" : "atk",
    isMb: sheer,
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
  // Independently reproduce damageCalc.ts:713-723's regular direct branch, without
  // its final integer presentation rounding (lines 953-955). No Fairy functions.
  const baseChain =
    parts.generalMultiplier *
    parts.directVulnerableMultiplier *
    parts.specialMultiplier *
    parts.pierceDmgMultiplier
  const hits = action.multipliers.map((multiplier) => ({
    nonCritical: baseChain * multiplier,
    critical: baseChain * multiplier * (1 + parts.critDmgRatio),
    expected: baseChain * multiplier * parts.critMultiplier,
  }))
  const total = (key) => hits.reduce((sum, hit) => sum + hit[key], 0)
  return {
    action,
    conversionBase,
    contributions,
    finalStats: {
      attack: final.atk,
      health: final.hp,
      criticalRate: final.critRate / 100,
      criticalDamage: final.critDmg / 100,
      ...(sheer ? { sheerForce } : {}),
    },
    factors: {
      damageBonus: parts.dmgMultiplier,
      critical: 1 + parts.critDmgRatio,
      expectedCritical: parts.critMultiplier,
      defense: parts.defenseMultiplier,
      resistance: parts.resistanceMultiplier,
      stunDamage: parts.staggerMultiplier,
      damageTaken: parts.directVulnerableMultiplier,
      ...(sheer ? { sheerDamageBonus: parts.pierceDmgMultiplier } : {}),
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
    ...(scenario.id === "nicole-astra-m2"
      ? {
          upstreamAttackConversion: upstreamAligned.contributions.find(
            (c) => c.stat === "atk",
          ).sourceValue,
        }
      : {}),
  }
}
const fixture = {
  provenance: {
    repository: "LoTwT/ZZZ-HP",
    commit,
    fairyBaseline,
    gameVersion: "3.1",
    method:
      "Pinned upstream pure functions + independently reproduced direct-damage chain; precise Nanoka inputs, explicit Ben supplement and existing Astra M2 correction. Not the upstream application.",
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
        affixCounts: result.affixCounts,
        upstreamExportedPanel: Object.fromEntries(
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
console.log(
  `Wrote ${Object.keys(cases).length} independent reference cases to ${output}`,
)
