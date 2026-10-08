// 固定面板队伍差分批次的独立参考生成器（离线维护脚本，不进入 build/test/check）。
//
// 用法：
//   node packages/data/test/fixtures/generate-static-team-differential-reference.mjs \
//     /path/to/ZZZ-HP /absolute/new-reference.json
//
// 参考分层（互不替代）：
//   1. 固定上游原始记录（效果/技能 JSON @ 固定提交）提供数值、适用范围与招式身份；
//      只有显式声明的局外最终面板与手填转化来源进入计算，不用目录预设替代。
//   2. 从固定上游纯函数提取并原样执行的交叉核对，验证本脚本对原始记录的读法
//      （效果取值、贯穿力换算、防御区、等级区、紊乱倍率表、耀变等级区）。
//   3. 伤害链用独立十进制有理数算式重建：+ − × ÷ 精确，除法在输出时按 40 位
//      有效数字 ROUND_HALF_EVEN 记录。不导入 @randomplay/core 的任何实现，
//      也不用 Fairy 实际输出、既有对比结果或上游取整整数回填期望。
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import {
  actorEntityId,
  teamDifferentialAgentByKey,
  teamDifferentialBuffGroups,
  teamDifferentialSlots,
  teamDifferentialTarget,
} from "./static-team-differential-cases.ts"

const [repository, output] = process.argv.slice(2)
assert(
  repository && output,
  "Provide the upstream Git repository and a NEW output file",
)

// ── 固定来源 ──────────────────────────────────────────────────────────────
const effectSourceCommit = "fac62407f3d3995f8200a66be0038f292b1455fa"
const skillSourceCommit = "0df40c5bc38f8da7ed0f9eed6be87fb8155b8357"
// 本轮再生时的 Fairy 基线：#201 合并后的 main；数值与来源事实与首版一致。
const fairyBaseline = "c77e549a6c503e257f554126203380295814fc40"
const snapshotId =
  "sha256:e946d6b30b9747a3daeaac034fc14a4dc127c7e550ab63f0c54b1e1d4bf693c4"
const buffResource = "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json"
const digests = {
  [`${buffResource}@${effectSourceCommit}`]:
    "57c4aacca5455aa20f75f21967e294d8506ec1970a06e9c808557bdb3a91e20f",
  [`${buffResource}@${skillSourceCommit}`]:
    "34b8dbeef2f710fd27379502d248f850da5a8c19dc6a0a7568ef51fb4c4fe19c",
  "zzz-hp/src/utils/panelBuffCalc.ts":
    "43ec23eafa28b8d0748636ab9885e1497fab8cd11e458268acd746c9adc40c09",
  "zzz-hp/src/utils/buffEffect.ts":
    "88c850fc2dce5017905a624357b169b41b5586a1f5d76218e48a61baff7c9909",
  "zzz-hp/src/utils/damageCalc.ts":
    "2ef2e81cd11af03a3f9a5df82622c238ae3b6f9596346eee97136b7a2b427a71",
  "zzz-hp/src/utils/calculatorUi.ts":
    "e61bf67fab73920889338997d77d12190b45d29cfd5cb49703802a0953fb1cfe",
  "zzz-hp/src/utils/skillTalentLevels.ts":
    "0391667fba8f39c868ab6bc8aa3609c2b72313e0ae00bd273ccb220de06faa6d",
  "zzz-hp/src/utils/calcNumberFormat.ts":
    "1e8b3a819df03de2911f210988501f3d8ae47d7abf05c2d9558a7e6c7478c03a",
  "zzz-hp/src/utils/remielUtils.ts":
    "1cb8084a981115924b0cdc64961a67f937c280fe82babe2710758c7b279d8773",
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex")
const resources = []
function upstreamFile(key, commit = effectSourceCommit) {
  const path = key.includes("/") ? key.split("@")[0] : `zzz-hp/src/utils/${key}`
  const digest = digests[key.includes("@") ? key : path]
  const bytes = execFileSync(
    "git",
    ["-C", repository, "show", `${commit}:${path}`],
    { maxBuffer: 40 * 1024 * 1024 },
  )
  assert.equal(hash(bytes), digest, `${path}@${commit}`)
  resources.push({ path, commit, sha256: hash(bytes) })
  return bytes.toString("utf8")
}
const effectData = JSON.parse(
  upstreamFile(`${buffResource}@${effectSourceCommit}`, effectSourceCommit),
)
const skillData = JSON.parse(
  upstreamFile(`${buffResource}@${skillSourceCommit}`, skillSourceCommit),
)

// 只做交叉核对的固定纯函数：依赖闭包内的声明原样提取，不执行应用、store 或导入。
const declarations = {
  "calcNumberFormat.ts": ["CALC_NUMBER_PRECISION", "roundCalc"],
  "skillTalentLevels.ts": [
    "SKILL_CONVERT_FROM_TO_TALENT_KEY",
    "isSkillConvertFromKey",
  ],
  "buffEffect.ts": ["resolveEffectBaseValue", "resolveConvertValue"],
  "panelBuffCalc.ts": ["computePiercePower"],
  "damageCalc.ts": [
    "clamp",
    "computeLevelZone",
    "computeDefenseZone",
    "computeSharpenCritExpectedZone",
    "computeSharpenCritFullCritZone",
  ],
  "calculatorUi.ts": [
    "isMiyabiAgent",
    "defaultDisorderCompMultByElement",
    "defaultDisorderStats",
    "effectiveAnomalyDuration",
    "ANOMALY_MULT_BY_ELEMENT",
    "defaultAnomalyMultByElement",
  ],
  "remielUtils.ts": [
    "clampRemielLevel",
    "computeRemielSelfRadianceSpecialLevelZone",
    "computeRemielSelfRadianceStandardLevelZone",
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
  "computePiercePower",
  "clamp",
  "computeLevelZone",
  "computeDefenseZone",
  "computeSharpenCritExpectedZone",
  "computeSharpenCritFullCritZone",
  "defaultDisorderStats",
  "effectiveAnomalyDuration",
  "defaultAnomalyMultByElement",
  "computeRemielSelfRadianceSpecialLevelZone",
  "computeRemielSelfRadianceStandardLevelZone",
  "resolveEffectBaseValue",
  "resolveConvertValue",
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

const atPointer = (value, pointer) =>
  pointer
    .split("/")
    .slice(1)
    .reduce((current, key) => current[key], value)

const upstreamReturns = JSON.parse(
  readFileSync(
    new URL(
      "./static-team-differential-upstream-returns.json",
      import.meta.url,
    ),
  ),
)
// 上游整数返回只覆盖父会话校正适配器真实执行过的批次；新增边界没有上游执行
// 结果，不得用 Fairy 输出或本脚本的期望补造整数。
const upstreamSlotIds = new Set(
  teamDifferentialSlots
    .filter((slot) => slot.upstreamEvidence === "reviewed-adapter-run")
    .map((slot) => slot.slotId),
)
const pinnedOnlySlotIds = new Set(
  teamDifferentialSlots
    .filter((slot) => slot.upstreamEvidence === "pinned-records-only")
    .map((slot) => slot.slotId),
)
assert.equal(upstreamReturns.returns.length, upstreamSlotIds.size)
assert.equal(
  new Set(upstreamReturns.returns.map((entry) => entry.slotId)).size,
  upstreamReturns.returns.length,
  "duplicate upstream integer return",
)
assert.deepEqual(
  new Set(upstreamReturns.returns.map((entry) => entry.slotId)),
  upstreamSlotIds,
)
for (const slotId of pinnedOnlySlotIds)
  assert(
    !upstreamReturns.returns.some((entry) => entry.slotId === slotId),
    `${slotId} must not carry an upstream integer return`,
  )

// ── 十进制有理数 ──────────────────────────────────────────────────────────
const abs = (value) => (value < 0n ? -value : value)
function gcd(left, right) {
  left = abs(left)
  right = abs(right)
  while (right) {
    const next = left % right
    left = right
    right = next
  }
  return left
}
function rational(numerator, denominator = 1n) {
  assert(denominator !== 0n, "zero denominator")
  if (denominator < 0n) {
    numerator = -numerator
    denominator = -denominator
  }
  const divisor = gcd(numerator, denominator) || 1n
  return { n: numerator / divisor, d: denominator / divisor }
}
function fromDecimal(text) {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/u.exec(`${text}`.trim())
  assert(match, `Unsupported decimal literal: ${text}`)
  const sign = match[1] === "-" ? -1n : 1n
  const fraction = match[3] ?? ""
  return rational(
    BigInt(`${match[2]}${fraction}`) * sign,
    10n ** BigInt(fraction.length),
  )
}
const R = (value) => {
  if (typeof value === "object" && value !== null) {
    // 只接受本脚本构造的精确有理数；把面板对象之类的输入交给 compare 会得到
    // NaN 并被当成相等，这里直接拒绝。
    assert(
      typeof value.n === "bigint" && typeof value.d === "bigint",
      "Expected an exact rational value",
    )
    return value
  }
  return fromDecimal(String(value))
}
const ZERO = rational(0n)
const ONE = rational(1n)
const add = (left, right) => {
  left = R(left)
  right = R(right)
  return rational(left.n * right.d + right.n * left.d, left.d * right.d)
}
const neg = (value) => {
  value = R(value)
  return { n: -value.n, d: value.d }
}
const sub = (left, right) => add(left, neg(right))
const mul = (left, right) => {
  left = R(left)
  right = R(right)
  return rational(left.n * right.n, left.d * right.d)
}
const div = (left, right) => {
  left = R(left)
  right = R(right)
  return rational(left.n * right.d, left.d * right.n)
}
const compare = (left, right) => {
  left = R(left)
  right = R(right)
  const l = left.n * right.d
  const r = right.n * left.d
  return l < r ? -1 : l > r ? 1 : 0
}
const minimum = (left, right) =>
  compare(left, right) <= 0 ? R(left) : R(right)
const maximum = (left, right) =>
  compare(left, right) >= 0 ? R(left) : R(right)
const clampRational = (value, low, high) => minimum(maximum(value, low), high)
function floorRational(value) {
  value = R(value)
  const quotient = value.n / value.d
  return value.n % value.d !== 0n && value.n < 0n ? quotient - 1n : quotient
}
const sumRationals = (values) =>
  values.reduce((total, value) => add(total, value), ZERO)
const toNumber = (value) => {
  value = R(value)
  return Number(value.n) / Number(value.d)
}
function closeEnough(left, right) {
  const expected = toNumber(right)
  return (
    Math.abs(toNumber(left) - expected) <=
    Math.max(1e-9, Math.abs(expected) * 1e-12)
  )
}
function compareWithPowerOfTen(numerator, denominator, exponent) {
  return exponent >= 0
    ? numerator - denominator * 10n ** BigInt(exponent)
    : numerator * 10n ** BigInt(-exponent) - denominator
}
/** 精确有理数 → 十进制字符串；`significant` 位有效数字，ROUND_HALF_EVEN。 */
function decimalString(value, significant = 40) {
  const item = R(value)
  if (item.n === 0n) return "0"
  const negative = item.n < 0n
  const numerator = abs(item.n)
  const denominator = item.d
  let exponent = String(numerator).length - String(denominator).length
  while (compareWithPowerOfTen(numerator, denominator, exponent) < 0n)
    exponent -= 1
  while (compareWithPowerOfTen(numerator, denominator, exponent + 1) >= 0n)
    exponent += 1
  const places = significant - 1 - exponent
  const scale = places > 0 ? 10n ** BigInt(places) : 1n
  const scaled = numerator * scale
  let quotient = scaled / denominator
  const remainder = scaled % denominator
  const twice = remainder * 2n
  if (twice > denominator || (twice === denominator && quotient % 2n !== 0n))
    quotient += 1n
  let text = quotient.toString()
  if (places > 0) {
    if (text.length < places + 1) text = text.padStart(places + 1, "0")
    const integerPart = text.slice(0, text.length - places)
    const fractionPart = text.slice(text.length - places).replace(/0+$/u, "")
    text = fractionPart.length ? `${integerPart}.${fractionPart}` : integerPart
  } else if (places < 0) text += "0".repeat(-places)
  return negative ? `-${text}` : text
}

// ── 原始记录读法（数值、单位、适用范围） ───────────────────────────────────
const CHINESE_ELEMENTS = {
  物理: "physical",
  火: "fire",
  冰: "ice",
  电: "electric",
  以太: "ether",
  风: "wind",
  流明: "lumiflux",
  玄墨: "auric-ink",
  霜: "frost",
}
/** 面板元素继承：继承元素的命中沿用基础元素的效果过滤与抗性。 */
const ELEMENT_INHERITANCE = { "frost": "ice", "auric-ink": "ether" }
const elementMatches = (filter, element) => {
  if (filter === undefined || filter === "all") return true
  const filters = Array.isArray(filter) ? filter : [filter]
  const names = filters.map((name) => CHINESE_ELEMENTS[name] ?? name)
  return names.includes(element) || names.includes(ELEMENT_INHERITANCE[element])
}
/**
 * 上游 stat 键 → 命中通道、单位换算与直伤属性。
 * 通道名与公开乘区名一致，便于按身份逐条对照贡献。
 */
const STAT_MODEL = {
  reduceDefense: {
    channel: "target-defense-adjustment",
    scale: "percent",
    negate: true,
  },
  dmgBonus: { channel: "damage-bonus", scale: "percent" },
  skillDmgBonus: { channel: "damage-bonus", scale: "percent" },
  critRate: {
    channel: "critical-rate",
    scale: "percent",
    panelStat: "criticalRate",
  },
  critDmg: {
    channel: "critical-damage",
    scale: "percent",
    panelStat: "criticalDamage",
  },
  penRate: {
    channel: "penetration-ratio",
    scale: "percent",
    panelStat: "penetrationRatio",
  },
  sharpenCritDmgBonus: {
    channel: "sharp-critical-damage",
    scale: "percent",
    panelStat: "sharpCriticalDamage",
  },
  atk: { channel: "attack", scale: "points", panelStat: "attack" },
  anomalyCritRate: { channel: "anomaly-critical-rate", scale: "percent" },
  anomalyCritDmg: { channel: "anomaly-critical-damage", scale: "percent" },
  anomalyDmgBonus: { channel: "anomaly-damage-bonus", scale: "percent" },
  anomalyDuration: { channel: "anomaly-duration-addition", scale: "points" },
  mutationCoeff: { channel: "refringe-coefficient-increase", scale: "percent" },
  // 耀变换算：上游记录给出精通点数（作为耀变精通输入通道），倍率由固定映射
  // 的比例（修订 12 的乘算口径）在伤害链里乘入。
  radianceMultFactor: {
    channel: "luminize-proficiency-input",
    scale: "points",
  },
  radianceResPen: { channel: "attacker-resistance-ignore", scale: "percent" },
  specialMult: { channel: "luminize-special-addition", scale: "percent" },
}
/**
 * 转模来源属性 → 面板字段与单位换算：上游记录按来源属性的原生单位取值
 * （穿透率为百分点、攻击与精通为点数），本脚本的面板用工程单位（比率为小数）。
 */
const CONVERT_SOURCE_KEYS = {
  atk: { panelStat: "attack", scale: 1 },
  mastery: { panelStat: "anomalyProficiency", scale: 1 },
  penRate: { panelStat: "penetrationRatio", scale: 100 },
}
const LUMINIZE_PROFICIENCY_RATE = R("0.002")

function toChannelValue(entry, resolved) {
  const raw = entry.raw
  if (raw.stat === "radianceMultFactor") {
    // 耀变换算：上游记录给出精通点数作为耀变精通输入，倍率由固定映射比例乘入。
    return {
      model: STAT_MODEL.radianceMultFactor,
      value: resolved.sourceValue,
      rate: div(R(raw.convert.ratioPercent), 10000),
    }
  }
  const model = STAT_MODEL[raw.stat]
  assert(model, `Unmapped upstream stat ${raw.stat} at ${entry.pointer}`)
  const value =
    model.scale === "percent"
      ? div(resolved.converted, 100)
      : resolved.converted
  return { model, value: model.negate ? neg(value) : value }
}

/** 按固定原始记录解析一条选中效果的值（手填来源、阈值、上限都在这里生效）。 */
function resolveEntry(entry, panels) {
  const raw = entry.raw
  if (raw.kind === "convert") {
    const convert = raw.convert
    assert(convert, entry.pointer)
    const source = convert.panelSource ?? "external"
    const sourceKey = CONVERT_SOURCE_KEYS[convert.from]
    assert(sourceKey, `Unmapped convert source ${convert.from}`)
    let from
    if (source === "manual") {
      assert(
        entry.source,
        `manual convert requires a declared source value: ${entry.pointer}`,
      )
      from = mul(R(entry.source.value), R(sourceKey.scale))
    } else {
      from = mul(
        panels[source === "final" ? "current" : "declared"](entry.holderKey)[
          sourceKey.panelStat
        ],
        R(sourceKey.scale),
      )
    }
    const convertible = maximum(ZERO, sub(from, R(convert.initialBase ?? 0)))
    let amount = div(mul(convertible, R(convert.ratioPercent)), 100)
    if (convert.cap !== null && convert.cap !== undefined) {
      const cap = R(Math.abs(convert.cap))
      amount = clampRational(amount, neg(cap), cap)
    }
    // 交叉核对：固定上游原函数给出同一数值（4 位显示舍入在本批不影响结果）。
    const sourceValues =
      source === "manual"
        ? {}
        : { [source]: { [convert.from]: Number(from.n) / Number(from.d) } }
    const pinned = upstream.resolveConvertValue(
      raw,
      {},
      source === "manual" ? Number(from.n) / Number(from.d) : null,
      sourceValues,
    )
    assert(
      closeEnough(amount, R(pinned)),
      `convert mismatch at ${entry.pointer}: ${toNumber(amount)} vs ${pinned}`,
    )
    return { converted: amount, sourceValue: from }
  }
  const pinnedBase = upstream.resolveEffectBaseValue(raw, entry.layers)
  if (raw.stackable || raw.kind === "stacked") {
    const per = R(raw.valuePerStack ?? raw.value ?? 0)
    const used = BigInt(
      Math.min(Math.max(1, raw.maxStacks ?? 1), Math.max(0, entry.layers)),
    )
    return { converted: mul(per, used), sourceValue: null }
  }
  assert.equal(raw.kind, "fixed", `${entry.pointer} kind`)
  assert.equal(
    toNumber(R(raw.value ?? 0)),
    pinnedBase,
    `${entry.pointer} value`,
  )
  return { converted: R(raw.value ?? 0), sourceValue: null }
}

// ── 面板与命中模型 ────────────────────────────────────────────────────────
function declaredPanel(agentKey, overrides) {
  const agent = teamDifferentialAgentByKey[agentKey]
  assert(agent, agentKey)
  const declared = { ...agent.panel, ...overrides?.[agentKey] }
  return {
    attack: R(declared.attack),
    health: R(declared.health),
    defense: R(declared.defense),
    impact: R(declared.impact),
    anomalyProficiency: R(declared.anomalyProficiency),
    anomalyMastery: R(declared.anomalyMastery),
    energyRegen: R(declared.energyRegen),
    criticalRate: R(declared.criticalRate),
    criticalDamage: R(declared.criticalDamage),
    penetrationRatio: R(declared.penetrationRatio),
    penetrationValue: R(declared.penetrationValue),
    sharpCriticalDamage: R(declared.sharpCriticalDamage),
    sheerForce:
      declared.sheerForce === undefined ? null : R(declared.sheerForce),
    damageBonuses: Object.fromEntries(
      Object.entries(declared.damageBonuses).map(([element, value]) => [
        element,
        R(value),
      ]),
    ),
  }
}
/** 单个面板的字段级比较：数值用精确有理数比较，null 只与 null 相等。 */
function panelEqual(left, right) {
  const keys = Object.keys(left)
  if (keys.length !== Object.keys(right).length) return false
  for (const key of keys) {
    if (!Object.hasOwn(right, key)) return false
    const a = left[key]
    const b = right[key]
    if (key === "damageBonuses") {
      if (
        Object.keys(a).length !== Object.keys(b).length ||
        Object.keys(a).some((element) => compare(a[element], b[element]) !== 0)
      )
        return false
      continue
    }
    if (a === null || b === null) {
      if (a !== b) return false
      continue
    }
    if (compare(a, b) !== 0) return false
  }
  return true
}
/** 队伍级比较：逐角色比较面板，缺角色直接判定不等。 */
function teamPanelsEqual(left, right) {
  const keys = Object.keys(left)
  if (keys.length !== Object.keys(right).length) return false
  return keys.every(
    (key) => right[key] !== undefined && panelEqual(left[key], right[key]),
  )
}

/** 招式大类 → 技能等级组；本批已核对（终极技属 chain 组、强化特殊技属 special 组）。 */
const LEVEL_GROUP_OF_SKILL_CATEGORY = {
  "basic": "basic",
  "dodge": "dodge",
  "assist": "assist",
  "special": "special",
  "enhanced-special": "special",
  "chain": "chain",
  "ultimate": "chain",
}
const SKILL_CATEGORY_OF_SKILL_TYPE = {
  basic: "basic",
  dodge: "dodge",
  assist: "assist",
  special: "special",
  specialEnhanced: "enhanced-special",
  chain: "chain",
  ultimate: "ultimate",
}
const DAMAGE_TYPE_OF_HIT_KIND = {
  regular: "direct",
  sheer: "direct",
  sharpen: "direct",
  luminize: "radiance",
}

/**
 * 核验声明的固定技能身份：ID、/skills/<index> 指针、持有人、有效等级倍率、
 * 招式类别与等级组、元素与招式锚点。缺记录或冲突直接失败，不用其余来源回填。
 */
function attributeRead(entityKey, stat, value) {
  return { entityId: actorEntityId(entityKey), stat, stage: "current", value }
}

function verifyAgentActionSkill(event) {
  const agent = teamDifferentialAgentByKey[event.actor]
  assert(agent, event.actor)
  const record = skillData.skills.find(
    (skill) => skill.id === event.upstreamSkillId,
  )
  assert(record, `missing pinned skill record: ${event.upstreamSkillId}`)
  const pointer = /^\/skills\/(\d+)$/u.exec(event.upstreamSkillPointer)
  assert(
    pointer,
    `skill pointer must address the pinned skills array: ${event.upstreamSkillPointer}`,
  )
  assert.equal(
    skillData.skills[Number(pointer[1])]?.id,
    event.upstreamSkillId,
    `${event.upstreamSkillPointer} must anchor ${event.upstreamSkillId}`,
  )
  assert.equal(record.agentId, agent.upstreamAgentId, `${record.id} holder`)
  assert.equal(
    record.damageType,
    DAMAGE_TYPE_OF_HIT_KIND[event.damageKind],
    `${record.id} damage type`,
  )
  assert.equal(
    (record.damagePercentage +
      record.damagePercentageGrowth * (event.effectiveLevel - 1)) /
      10000,
    event.multiplier,
    `${record.id} multiplier at effective level ${event.effectiveLevel}`,
  )
  assert.equal(
    record.baseMult / record.baseMultFactor,
    event.multiplier,
    `${record.id} base multiplier`,
  )
  if (
    record.radianceTalentKey !== undefined &&
    record.radianceTalentKey !== null
  )
    assert.equal(
      record.radianceTalentKey,
      event.levelGroup,
      `${record.id} radiance level group`,
    )
  else
    assert.equal(
      LEVEL_GROUP_OF_SKILL_CATEGORY[event.skillCategory],
      event.levelGroup,
      `${record.id} level group`,
    )
  const categories = (record.skillTypes ?? [])
    .map((type) => SKILL_CATEGORY_OF_SKILL_TYPE[type])
    .filter((category) => category !== undefined)
  if (categories.length)
    assert(
      categories.includes(event.skillCategory),
      `${record.id} category ${event.skillCategory} not in ${record.skillTypes.join(",")}`,
    )
  else
    assert.equal(event.skillCategory, "uncategorized", `${record.id} category`)
  const element = CHINESE_ELEMENTS[record.element]
  if (element === undefined) {
    // 耀变记录不写元素；本批按流明结算。
    assert.equal(event.damageKind, "luminize", `${record.id} element`)
    assert.equal(event.element, "lumiflux", `${record.id} element`)
  } else
    assert(
      event.element === element ||
        ELEMENT_INHERITANCE[event.element] === element,
      `${record.id} element ${event.element} disagrees with ${record.element}`,
    )
  if (record.buffAnchorId !== null && record.buffAnchorId !== undefined)
    assert(
      event.skillTargetIds.includes(`zzz-hp:skill:${record.buffAnchorId}`),
      `${record.id} anchor ${record.buffAnchorId} is not among the declared skill targets`,
    )
  else
    assert.equal(
      event.skillTargetIds.length,
      0,
      `${record.id} declares no anchor but the fixture lists skill targets; audit before extending`,
    )
  return record
}

/**
 * 转换边界声明核对：阈值、比率与上限只从固定原始记录读取，不在这里重复维护。
 * 断言边界位置标签与该记录算出的取值形状一致，并返回可冻结的边界事实。
 */
function verifyConversionBoundary(slot, record) {
  const boundary = slot.case.conversionBoundary
  if (boundary === undefined) return null
  const group = teamDifferentialBuffGroups[boundary.groupId]
  assert(group, `unknown boundary group ${boundary.groupId}`)
  assert(
    slot.team.includes(group.holder),
    `${boundary.groupId} holder ${group.holder} is not in ${slot.slotId}`,
  )
  const source = group.effects[0]
  assert.equal(
    group.effects.length,
    1,
    `${boundary.groupId} must declare exactly one effect for its boundary`,
  )
  const raw = atPointer(effectData, source.pointers[0])
  assert(raw && raw.kind === "convert", `${boundary.groupId} convert record`)
  const convert = raw.convert
  const sourceKey = CONVERT_SOURCE_KEYS[convert.from]
  assert(sourceKey, `Unmapped convert source ${convert.from}`)
  const model = STAT_MODEL[raw.stat]
  assert(model, `Unmapped upstream stat ${raw.stat}`)
  const off = boundary.position === "off"
  // 关闭对照仍核对来源事实：组声明的手填值或面板读数与边界输入一致。
  if (convert.panelSource === "manual") {
    assert(
      source.source,
      `${boundary.groupId} manual convert requires a declared source value`,
    )
    assert.equal(
      source.source.value,
      boundary.sourceValue,
      `${boundary.groupId} declared source value`,
    )
    assert.equal(source.source.unit, boundary.sourceUnit)
  } else {
    const panel = declaredPanel(group.holder, slot.case.panelOverrides)
    assert.equal(
      toNumber(panel[sourceKey.panelStat]),
      boundary.sourceValue,
      `${boundary.groupId} must read the declared panel ${sourceKey.panelStat}`,
    )
  }
  if (off)
    assert.equal(
      slot.case.buffGroups.includes(boundary.groupId),
      false,
      `${slot.slotId} is the off control but selects its group`,
    )
  else
    assert(
      slot.case.buffGroups.includes(boundary.groupId),
      `${slot.slotId} must select ${boundary.groupId}`,
    )
  const scale = R(sourceKey.scale)
  const from = mul(R(boundary.sourceValue), scale)
  const initialBase = R(convert.initialBase ?? 0)
  const rate = div(R(convert.ratioPercent), 100)
  const uncapped = mul(maximum(ZERO, sub(from, initialBase)), rate)
  const cap =
    convert.cap === null || convert.cap === undefined
      ? null
      : R(Math.abs(convert.cap))
  const amount =
    cap === null ? uncapped : clampRational(uncapped, neg(cap), cap)
  // 按固定记录算出的转换值；关闭对照不选中该记录，贡献为 0，但仍记录该值。
  const recordConversion =
    model.scale === "percent" ? div(amount, R(100)) : amount
  assert.equal(
    model.scale === "percent",
    boundary.outputUnit === "ratio",
    `${slot.slotId} output unit ${boundary.outputUnit}`,
  )
  if (off)
    assert.equal(
      boundary.expectedConversion,
      0,
      `${slot.slotId} the off control contributes nothing`,
    )
  else
    assert(
      closeEnough(recordConversion, R(boundary.expectedConversion)),
      `${slot.slotId} expected conversion ${toNumber(recordConversion)} != ${boundary.expectedConversion}`,
    )
  switch (boundary.position) {
    case "below-threshold":
      assert(compare(from, initialBase) < 0, `${slot.slotId} below-threshold`)
      break
    case "at-threshold":
      assert.equal(compare(from, initialBase), 0, `${slot.slotId} at-threshold`)
      break
    case "above-threshold":
      assert(compare(from, initialBase) > 0, `${slot.slotId} above-threshold`)
      assert(compare(uncapped, ZERO) > 0, `${slot.slotId} above-threshold`)
      if (cap !== null)
        assert(
          compare(uncapped, cap) < 0,
          `${slot.slotId} above-threshold must stay below the cap`,
        )
      break
    case "at-cap":
      assert(cap !== null, `${slot.slotId} at-cap requires a cap`)
      assert.equal(compare(uncapped, cap), 0, `${slot.slotId} at-cap`)
      break
    case "above-cap":
      assert(cap !== null, `${slot.slotId} above-cap requires a cap`)
      assert(compare(uncapped, cap) > 0, `${slot.slotId} above-cap`)
      break
    case "off":
      // 关闭对照必须非平凡：同一面板选中该记录时确实有转换值。
      assert(compare(uncapped, ZERO) > 0, `${slot.slotId} off control`)
      break
    default:
      assert(false, `${slot.slotId} unknown boundary position`)
  }
  if (!off) {
    const entry = record.resolved.find(
      (item) => item.groupId === boundary.groupId,
    )
    assert(entry, `${slot.slotId} missing resolved boundary entry`)
    assert(
      closeEnough(entry.value, R(boundary.expectedConversion)),
      `${slot.slotId} engine-facing boundary value`,
    )
  } else
    assert.equal(
      record.resolved.some((item) => item.groupId === boundary.groupId),
      false,
      `${slot.slotId} off control must not resolve its group`,
    )
  return {
    optionId: source.optionId,
    pointers: [...source.pointers],
    position: boundary.position,
    sourceUnit: boundary.sourceUnit,
    sourceValue: decimalString(R(boundary.sourceValue)),
    initialBase: decimalString(initialBase),
    ratioPercent: decimalString(R(convert.ratioPercent)),
    cap: cap === null ? null : decimalString(cap),
    outputUnit: boundary.outputUnit,
    expectedConversion: decimalString(R(boundary.expectedConversion)),
    recordConversion: decimalString(recordConversion),
  }
}

function evaluateSlot(slot) {
  const team = slot.team
  const overrides = slot.case.panelOverrides
  const event = slot.event
  const kind =
    event.kind === "agent-action"
      ? event.damageKind
      : event.kind === "ordinary-anomaly"
        ? "anomaly"
        : "disorder"
  const actorKey = event.actor
  const powerSourceKey =
    event.kind === "agent-action" ? event.actor : event.powerSource
  if (event.kind === "agent-action") verifyAgentActionSkill(event)
  const declaredPanels = Object.fromEntries(
    team.map((key) => [key, declaredPanel(key, overrides)]),
  )

  // 选中效果：按 fixture 声明的增益组顺序展开，每条原始指针独立解析。
  const entries = []
  for (const groupId of slot.case.buffGroups) {
    const group = teamDifferentialBuffGroups[groupId]
    assert(group, `unknown buff group ${groupId}`)
    assert(
      team.includes(group.holder),
      `${groupId} holder ${group.holder} is not in ${slot.slotId}`,
    )
    for (const selection of group.effects) {
      for (const pointer of selection.pointers) {
        const raw = atPointer(effectData, pointer)
        assert(raw && raw.id, pointer)
        assert(
          raw.applyTarget === "team" || raw.applyTarget === "self",
          `Unmapped applyTarget at ${pointer}`,
        )
        entries.push({
          groupId,
          optionId: selection.optionId,
          holderKey: group.holder,
          pointer,
          raw,
          layers: selection.layers,
          source: selection.source,
          damageKinds: selection.damageKinds ?? null,
        })
      }
    }
  }

  // 实体级效果（攻击、直伤属性）先结算到队伍成员面板；转模读取当前或局外
  // 面板，按迭代求稳定值（本批一轮内稳定）。
  let currentPanels = declaredPanels
  let resolved = []
  let stabilised = false
  for (let round = 0; round < 4; round += 1) {
    const panels = {
      declared: (key) => declaredPanels[key],
      current: (key) => currentPanels[key],
    }
    resolved = entries.map((entry) => {
      const resolvedValue = resolveEntry(entry, panels)
      const channel = toChannelValue(entry, resolvedValue)
      return { ...entry, ...channel, resolvedValue }
    })
    const next = Object.fromEntries(
      team.map((key) => {
        const panel = { ...declaredPanels[key] }
        for (const record of resolved) {
          if (!record.model.panelStat) continue
          const beneficiaries =
            record.raw.applyTarget === "team" ? team : [record.holderKey]
          if (!beneficiaries.includes(key)) continue
          panel[record.model.panelStat] = add(
            panel[record.model.panelStat],
            record.value,
          )
        }
        return [key, panel]
      }),
    )
    if (teamPanelsEqual(next, currentPanels)) {
      currentPanels = next
      stabilised = true
      break
    }
    currentPanels = next
  }
  assert(stabilised, `conversion did not stabilise for ${slot.slotId}`)
  // 转换边界声明：从固定记录核对阈值/比率/上限与期望贡献（关闭对照也核对来源事实）。
  const boundary = verifyConversionBoundary(slot, { resolved })

  const hit = {
    actorKey,
    powerSourceKey,
    damageKind: kind,
    element: event.element,
    skillTargetIds: event.kind === "agent-action" ? event.skillTargetIds : [],
  }
  const channels = new Map()
  for (const record of resolved) {
    const beneficiaries =
      record.raw.applyTarget === "team" ? team : [record.holderKey]
    if (!beneficiaries.includes(actorKey)) continue
    if (!elementMatches(record.raw.elementFilter, hit.element)) continue
    if (record.damageKinds && !record.damageKinds.includes(kind)) continue
    // 招式限定：只有带具体子分类的原始招式目标参与匹配；仅有大类（子分类为
    // null）的目标不在本批建模，固定映射已把它们并入适用类别声明。
    const skillTargets = (record.raw.skillTargets ?? []).filter(
      (target) => target.subcategoryId != null,
    )
    if (skillTargets.length) {
      const matched = skillTargets.some((target) =>
        hit.skillTargetIds.includes(`zzz-hp:skill:${target.subcategoryId}`),
      )
      assert(
        matched,
        `${record.optionId} declares subtarget-scoped skill targets that this batch's action does not match; audit before extending`,
      )
    }
    if (record.model.panelStat) continue
    const list = channels.get(record.model.channel) ?? []
    list.push({ value: record.value, optionId: record.optionId })
    channels.set(record.model.channel, list)
  }
  const channelSum = (channel) =>
    sumRationals((channels.get(channel) ?? []).map((item) => item.value))
  // 持续时间贡献由目录在 preparations 中单独返回，不进入命中贡献列表；
  // 这里仍保留在通道表内参与时长计算，序列化时单独输出。
  const durationPreparations = channels.get("anomaly-duration-addition") ?? []
  if (kind !== "disorder")
    assert.equal(durationPreparations.length, 0, `${slot.slotId} duration`)

  const identity = {
    actorEntityId: actorEntityId(actorKey),
    powerSourceEntityId: actorEntityId(powerSourceKey),
    baseStat: null,
    damageBonusSource: null,
    durationAdjustmentSeconds: null,
    luminize: null,
    // 引擎在命中上公开的属性读数（entityId + 阶段 + 数值），逐个核对来源身份。
    attributeReads: null,
  }
  const defenseOf = (panel, defenseAdjustments) => {
    const pinned = upstream.computeDefenseZone({
      defensePanel: {
        penRate: toNumber(mul(panel.penetrationRatio, 100)),
        pen: toNumber(panel.penetrationValue),
        ignoreDefense: 0,
        reduceDefense: toNumber(mul(defenseAdjustments, -100)),
      },
      isMb: false,
      enemyDefense: teamDifferentialTarget.baseDefense,
    })
    return {
      pinned: pinned.defenseMultiplier,
      value: defenseZoneOf(panel, defenseAdjustments),
    }
  }

  let totals
  let criticalRate
  let criticalSemantics
  let factors
  if (kind === "luminize") {
    const actor = currentPanels[actorKey]
    const attackEntries = resolved.filter(
      (record) =>
        record.model.channel === "attack" && record.raw.convert?.from === "atk",
    )
    for (const record of attackEntries)
      assert.equal(
        record.raw.convert.panelSource,
        "external",
        "Only external self attack converts are verified for the special Voidflare restricted read",
      )
    const selfAttackConvert = sumRationals(
      attackEntries.map((record) => record.value),
    )
    // 受限读取 = 局外攻击 + 自身攻击转模；不使用已经含队友增益的当前攻击。
    const restrictedAttack = add(
      declaredPanels[actorKey].attack,
      selfAttackConvert,
    )
    for (const record of resolved)
      assert(
        record.model.panelStat !== "anomalyProficiency",
        "Mastery effects are not part of the verified restricted reading for this batch",
      )
    const restrictedMastery = declaredPanels[actorKey].anomalyProficiency
    const proficiencyInput = channelSum("luminize-proficiency-input")
    const proficiencyRates = [
      ...new Set(
        resolved
          .filter((record) => record.rate)
          .map((record) => decimalString(record.rate)),
      ),
    ]
    assert.deepEqual(proficiencyRates, ["0.002"], "luminize proficiency rate")
    const specialAddition = add(ONE, channelSum("luminize-special-addition"))
    const luminizeMultiplier = mul(
      mul(
        R(event.multiplier),
        add(ONE, mul(proficiencyInput, LUMINIZE_PROFICIENCY_RATE)),
      ),
      specialAddition,
    )
    const refringe = add(ONE, channelSum("refringe-coefficient-increase"))
    const anomalyDamageBonus = clampRational(
      add(ONE, channelSum("anomaly-damage-bonus")),
      ZERO,
      R(3),
    )
    const damageBonus = R(
      upstream.computeRemielSelfRadianceSpecialLevelZone(60),
    )
    const levelZone = R(upstream.computeRemielSelfRadianceStandardLevelZone(60))
    const defense = defenseOf(actor, channelSum("target-defense-adjustment"))
    assert(
      closeEnough(defense.value, R(defense.pinned)),
      "luminize defense zone",
    )
    const resistance = clampRational(
      add(
        sub(ONE, R(event.luminizeEquivalentElementResistance)),
        channelSum("attacker-resistance-ignore"),
      ),
      ZERO,
      R(2),
    )
    const proficiencyZone = clampRational(
      div(restrictedMastery, 100),
      ZERO,
      R(10),
    )
    const nonCritical = mul(
      mul(
        mul(mul(mul(restrictedAttack, damageBonus), proficiencyZone), refringe),
        luminizeMultiplier,
      ),
      mul(mul(anomalyDamageBonus, defense.value), mul(resistance, levelZone)),
    )
    totals = {
      nonCritical,
      critical: null,
      expected: nonCritical,
      displayedNonCritical: null,
      displayedCritical: null,
    }
    criticalRate = ZERO
    criticalSemantics = "no-critical-settlement"
    factors = {
      nonCritical: {
        baseDamage: restrictedAttack,
        damageBonus,
        anomalyProficiency: proficiencyZone,
        refringe,
        luminizeMultiplier,
        anomalyDamageBonus,
        defense: defense.value,
        resistance,
        damageTaken: ONE,
        stunDamage: ONE,
        anomalyDamageLevel: levelZone,
      },
      critical: null,
    }
    identity.baseStat = {
      stat: "attack",
      entityId: actorEntityId(actorKey),
      multiplier: ONE,
      value: restrictedAttack,
    }
    identity.attributeReads = [
      attributeRead(actorKey, "attack", restrictedAttack),
      attributeRead(actorKey, "anomalyProficiency", restrictedMastery),
      attributeRead(actorKey, "penetrationRatio", actor.penetrationRatio),
      attributeRead(actorKey, "criticalRate", actor.criticalRate),
    ]
    identity.damageBonusSource = "luminize-special-level-zone"
    identity.luminize = {
      restrictedAttack,
      restrictedMastery,
      proficiencyInput,
      proficiencyConversionRate: LUMINIZE_PROFICIENCY_RATE,
    }
    return {
      kind,
      actorKey,
      powerSourceKey,
      hit,
      hitPanelKey: actorKey,
      declaredPanels,
      currentPanels,
      channels,
      durationPreparations,
      totals,
      criticalRate,
      criticalSemantics,
      factors,
      identity,
      conversionBoundary: boundary,
    }
  }

  const hitPanel =
    kind === "anomaly" || kind === "disorder"
      ? currentPanels[powerSourceKey]
      : currentPanels[actorKey]
  const defenseAdjustments = channelSum("target-defense-adjustment")
  const resistanceTarget =
    kind === "anomaly" || kind === "disorder"
      ? R(teamDifferentialTarget.resistances[hit.element] ?? 0)
      : R(
          teamDifferentialTarget.resistances[hit.element] ??
            teamDifferentialTarget.resistances[
              ELEMENT_INHERITANCE[hit.element]
            ] ??
            0,
        )
  const resistance = clampRational(sub(ONE, resistanceTarget), ZERO, R(2))
  const panelElementBonus = (panel) =>
    panel.damageBonuses[hit.element] ??
    panel.damageBonuses[ELEMENT_INHERITANCE[hit.element]] ??
    ZERO
  const damageBonus =
    kind === "anomaly" || kind === "disorder"
      ? add(ONE, panelElementBonus(declaredPanels[powerSourceKey]))
      : clampRational(
          add(
            add(ONE, panelElementBonus(hitPanel)),
            channelSum("damage-bonus"),
          ),
          ZERO,
          R(6),
        )

  if (kind === "regular" || kind === "sheer" || kind === "sharpen") {
    const multiplier = R(event.multiplier)
    const defense = defenseOf(hitPanel, defenseAdjustments)
    assert(
      closeEnough(defense.value, R(defense.pinned)),
      `${slot.slotId} defense zone`,
    )
    const criticalDamage = clampRational(hitPanel.criticalDamage, ZERO, R(5))
    let baseDamage
    let nonCriticalFactors
    let criticalFactors
    let expectedZone = null
    if (kind === "regular") {
      baseDamage = mul(hitPanel.attack, multiplier)
      nonCriticalFactors = {
        baseDamage,
        damageBonus,
        critical: ONE,
        defense: defense.value,
        resistance,
        damageTaken: ONE,
        stunDamage: ONE,
      }
      criticalFactors = {
        ...nonCriticalFactors,
        critical: add(ONE, criticalDamage),
      }
      identity.baseStat = {
        stat: "attack",
        entityId: actorEntityId(actorKey),
        multiplier,
        value: hitPanel.attack,
      }
    } else if (kind === "sheer") {
      assert.equal(hitPanel.sheerForce === null, false, `${slot.slotId} sheer`)
      const pinnedPierce = upstream.computePiercePower(
        toNumber(hitPanel.health),
        toNumber(hitPanel.attack),
      )
      const sheerForce = add(
        hitPanel.sheerForce,
        add(
          mul(R("0.1"), sub(hitPanel.health, declaredPanels[actorKey].health)),
          mul(R("0.3"), sub(hitPanel.attack, declaredPanels[actorKey].attack)),
        ),
      )
      baseDamage = mul(sheerForce, multiplier)
      nonCriticalFactors = {
        baseDamage,
        damageBonus,
        critical: ONE,
        sheerDamageBonus: ONE,
        resistance,
        damageTaken: ONE,
        stunDamage: ONE,
      }
      criticalFactors = {
        ...nonCriticalFactors,
        critical: add(ONE, criticalDamage),
      }
      identity.baseStat = {
        stat: "sheerForce",
        entityId: actorEntityId(actorKey),
        multiplier,
        value: sheerForce,
      }
      identity.referencePiercePower = pinnedPierce
    } else {
      baseDamage = mul(hitPanel.defense, multiplier)
      const sharpBonus = hitPanel.sharpCriticalDamage
      const rate = clampRational(hitPanel.criticalRate, ZERO, R(2))
      const overflow = maximum(ZERO, sub(rate, ONE))
      const forced = mul(
        add(ONE, sharpBonus),
        add(ONE, mul(sharpBonus, overflow)),
      )
      const pinnedForced = upstream.computeSharpenCritFullCritZone(
        toNumber(mul(hitPanel.criticalRate, 100)),
        toNumber(mul(sharpBonus, 100)),
      )
      assert(closeEnough(forced, R(pinnedForced)), `${slot.slotId} sharp zone`)
      expectedZone = add(
        sub(ONE, minimum(ONE, rate)),
        mul(minimum(ONE, rate), forced),
      )
      const pinnedExpected = upstream.computeSharpenCritExpectedZone(
        toNumber(mul(hitPanel.criticalRate, 100)),
        toNumber(mul(sharpBonus, 100)),
      )
      assert(
        closeEnough(expectedZone, R(pinnedExpected)),
        `${slot.slotId} sharp expected zone`,
      )
      nonCriticalFactors = {
        baseDamage,
        damageBonus,
        sharpenDamageBonus: ONE,
        sharpCritical: ONE,
        defense: defense.value,
        resistance,
        damageTaken: ONE,
        stunDamage: ONE,
      }
      criticalFactors = {
        ...nonCriticalFactors,
        sharpCritical: forced,
      }
      identity.baseStat = {
        stat: "defense",
        entityId: actorEntityId(actorKey),
        multiplier,
        value: hitPanel.defense,
      }
    }
    identity.attributeReads = [
      attributeRead(actorKey, identity.baseStat.stat, identity.baseStat.value),
      ...(kind === "regular"
        ? [
            attributeRead(actorKey, "criticalDamage", hitPanel.criticalDamage),
            attributeRead(
              actorKey,
              "penetrationRatio",
              hitPanel.penetrationRatio,
            ),
          ]
        : kind === "sheer"
          ? [attributeRead(actorKey, "criticalDamage", hitPanel.criticalDamage)]
          : [
              attributeRead(
                actorKey,
                "sharpCriticalDamage",
                hitPanel.sharpCriticalDamage,
              ),
              attributeRead(
                actorKey,
                "penetrationRatio",
                hitPanel.penetrationRatio,
              ),
            ]),
      attributeRead(actorKey, "criticalRate", hitPanel.criticalRate),
    ]
    const nonCritical = productOf(nonCriticalFactors)
    const critical = productOf(criticalFactors)
    const rate = clampRational(hitPanel.criticalRate, ZERO, ONE)
    totals = {
      nonCritical,
      critical,
      expected:
        kind === "sharpen"
          ? mul(nonCritical, expectedZone)
          : add(mul(sub(ONE, rate), nonCritical), mul(rate, critical)),
      displayedNonCritical: null,
      displayedCritical: null,
    }
    criticalRate = rate
    criticalSemantics =
      kind === "sharpen" ? "sharp-critical-forced-first-layer" : "critical-hit"
    factors = { nonCritical: nonCriticalFactors, critical: criticalFactors }
    identity.damageBonusSource = "panel-element"
    return {
      kind,
      actorKey,
      powerSourceKey,
      hit,
      hitPanelKey: actorKey,
      declaredPanels,
      currentPanels,
      channels,
      durationPreparations,
      totals,
      criticalRate,
      criticalSemantics,
      factors,
      identity,
      conversionBoundary: boundary,
    }
  }

  // 普通异常与紊乱：基础/精通/穿透取异常强度提供者，触发者只承载意匠身份。
  let multiplier
  if (kind === "disorder") {
    const seconds = channelSum("anomaly-duration-addition")
    const remaining = maximum(
      ZERO,
      sub(add(R(event.baseDurationSeconds), seconds), R(event.elapsedSeconds)),
    )
    assert.equal(
      CHINESE_ELEMENTS["火"],
      event.originalAnomalyAttribute,
      "disorder source attribute mapping",
    )
    const stats = upstream.defaultDisorderStats("火")
    assert(
      stats.disorderBaseMult > 0 && stats.disorderCompMult > 0,
      "disorder multiplier table",
    )
    const effective = upstream.effectiveAnomalyDuration(
      toNumber(remaining),
      "火",
    )
    assert.equal(
      effective,
      Number(floorRational(div(remaining, R("0.5")))),
      "fire effective duration",
    )
    multiplier = add(
      div(R(stats.disorderBaseMult), 100),
      mul(R(effective), div(R(stats.disorderCompMult), 100)),
    )
    identity.durationAdjustmentSeconds = seconds
  } else {
    const pinned = skillData.skills.find(
      (skill) => skill.id === event.upstreamSkillId,
    )
    assert(pinned, event.upstreamSkillId)
    assert.equal(event.baseMultiplier, pinned.baseMult / pinned.baseMultFactor)
    assert.equal(pinned.damageType, "anomaly", `${pinned.id} damage type`)
    assert.equal(pinned.agentId, "", `${pinned.id} must stay a public preset`)
    assert.equal(
      CHINESE_ELEMENTS[pinned.element],
      event.element,
      `${pinned.id} element mapping`,
    )
    assert.equal(upstream.defaultAnomalyMultByElement("物理"), pinned.baseMult)
    multiplier = R(event.baseMultiplier)
  }
  const defense = defenseOf(hitPanel, defenseAdjustments)
  assert(
    closeEnough(defense.value, R(defense.pinned)),
    `${slot.slotId} defense`,
  )
  const proficiencyZone = clampRational(
    div(hitPanel.anomalyProficiency, 100),
    ZERO,
    R(10),
  )
  const anomalyDamageBonus = clampRational(
    add(ONE, channelSum("anomaly-damage-bonus")),
    ZERO,
    R(3),
  )
  const refringe = add(ONE, channelSum("refringe-coefficient-increase"))
  const baseDamage = mul(hitPanel.attack, multiplier)
  const levelZone = R(upstream.computeLevelZone(60))
  const criticalDamage = clampRational(
    channelSum("anomaly-critical-damage"),
    ZERO,
    R(2),
  )
  const common = {
    baseDamage,
    damageBonus,
    anomalyProficiency: proficiencyZone,
    defense: defense.value,
    resistance,
    damageTaken: ONE,
    stunDamage: ONE,
    anomalyDamageLevel: levelZone,
    anomalyDamageBonus,
    refringe,
  }
  const nonCritical = productOf({ ...common, anomalyCritical: ONE })
  const critical = productOf({
    ...common,
    anomalyCritical: add(ONE, criticalDamage),
  })
  const rate = clampRational(channelSum("anomaly-critical-rate"), ZERO, ONE)
  totals = {
    nonCritical,
    critical,
    expected: add(mul(sub(ONE, rate), nonCritical), mul(rate, critical)),
    displayedNonCritical: null,
    displayedCritical: null,
  }
  criticalRate = rate
  criticalSemantics = "critical-hit"
  factors = {
    nonCritical: { ...common, anomalyCritical: ONE },
    critical: { ...common, anomalyCritical: add(ONE, criticalDamage) },
  }
  identity.baseStat = {
    stat: "attack",
    // 紊乱/强击的基础属性来自强度提供者（可能与触发者不同）。
    entityId: actorEntityId(powerSourceKey),
    multiplier,
    value: hitPanel.attack,
  }
  identity.attributeReads = [
    attributeRead(powerSourceKey, "attack", hitPanel.attack),
    attributeRead(
      powerSourceKey,
      "anomalyProficiency",
      hitPanel.anomalyProficiency,
    ),
    attributeRead(
      powerSourceKey,
      "penetrationRatio",
      hitPanel.penetrationRatio,
    ),
    attributeRead(
      actorKey,
      "criticalRate",
      currentPanels[actorKey].criticalRate,
    ),
  ]
  identity.damageBonusSource = "settled-power-source-element"
  return {
    kind,
    actorKey,
    powerSourceKey,
    hit,
    hitPanelKey: powerSourceKey,
    declaredPanels,
    currentPanels,
    channels,
    durationPreparations,
    totals,
    criticalRate,
    criticalSemantics,
    factors,
    identity,
    conversionBoundary: boundary,
  }
}

function productOf(factors) {
  return Object.values(factors).reduce(
    (product, value) => mul(product, value),
    ONE,
  )
}
/** 防御区：与固定上游 computeDefenseZone 同口径的独立有理数实现。 */
function defenseZoneOf(panel, defenseAdjustments) {
  const penRateRatio = clampRational(panel.penetrationRatio, ZERO, R("0.95"))
  const defenseFactor = maximum(ZERO, add(ONE, defenseAdjustments))
  const effectiveDefense = maximum(
    ZERO,
    sub(
      mul(
        mul(R(teamDifferentialTarget.baseDefense), defenseFactor),
        sub(ONE, penRateRatio),
      ),
      panel.penetrationValue,
    ),
  )
  return compare(effectiveDefense, ZERO) === 0
    ? ONE
    : div(R(794), add(R(794), effectiveDefense))
}

// ── 生成参考 ──────────────────────────────────────────────────────────────
function serializePanel(panel) {
  return {
    stats: {
      attack: toNumber(panel.attack),
      health: toNumber(panel.health),
      defense: toNumber(panel.defense),
      impact: toNumber(panel.impact),
      anomalyProficiency: toNumber(panel.anomalyProficiency),
      anomalyMastery: toNumber(panel.anomalyMastery),
      energyRegen: toNumber(panel.energyRegen),
      criticalRate: toNumber(panel.criticalRate),
      criticalDamage: toNumber(panel.criticalDamage),
      penetrationRatio: toNumber(panel.penetrationRatio),
      sharpCriticalDamage: toNumber(panel.sharpCriticalDamage),
      ...(panel.sheerForce === null
        ? {}
        : { sheerForce: toNumber(panel.sheerForce) }),
    },
    penetrationValue: toNumber(panel.penetrationValue),
    damageBonuses: Object.fromEntries(
      Object.entries(panel.damageBonuses).map(([element, value]) => [
        element,
        toNumber(value),
      ]),
    ),
  }
}
const serializeFactors = (factors) =>
  Object.fromEntries(
    Object.entries(factors).map(([name, value]) => [name, toNumber(value)]),
  )

const cases = {}
for (const slot of teamDifferentialSlots) {
  const result = evaluateSlot(slot)
  cases[slot.slotId] = {
    presetId: slot.presetId,
    caseId: slot.case.caseId,
    label: slot.case.label,
    eventId: slot.eventId,
    kind: result.kind,
    team: slot.team,
    buffGroups: slot.case.buffGroups,
    upstreamEvidence: slot.upstreamEvidence,
    ...(result.conversionBoundary === null
      ? {}
      : { conversionBoundary: result.conversionBoundary }),
    selections: slot.case.buffGroups.flatMap((groupId) => {
      const group = teamDifferentialBuffGroups[groupId]
      return group.effects.map((effect) => ({
        holderId: actorEntityId(group.holder),
        optionId: effect.optionId,
        layers: effect.layers,
      }))
    }),
    sourceInputs: slot.case.buffGroups.flatMap((groupId) => {
      const group = teamDifferentialBuffGroups[groupId]
      return group.effects
        .filter((effect) => effect.source)
        .map((effect) => ({
          holderKey: group.holder,
          unit: effect.source.unit,
          value: effect.source.value,
          readFrom: effect.source.readFrom,
        }))
    }),
    declaredPanels: Object.fromEntries(
      Object.entries(result.declaredPanels).map(([key, panel]) => [
        actorEntityId(key),
        serializePanel(panel),
      ]),
    ),
    // 命中基础读数所用的当前面板（异常/紊乱为强度提供者，其余为出招者）。
    hitReadPanel: serializePanel(result.currentPanels[result.hitPanelKey]),
    totals: {
      nonCritical: decimalString(result.totals.nonCritical),
      critical:
        result.totals.critical === null
          ? null
          : decimalString(result.totals.critical),
      expected: decimalString(result.totals.expected),
      displayedNonCritical: null,
      displayedCritical: null,
    },
    criticalRate: decimalString(result.criticalRate),
    criticalSemantics: result.criticalSemantics,
    factors: {
      nonCritical: serializeFactors(result.factors.nonCritical),
      critical: result.factors.critical
        ? serializeFactors(result.factors.critical)
        : null,
    },
    channels: [...result.channels.entries()]
      .filter(([channel]) => channel !== "anomaly-duration-addition")
      .flatMap(([channel, list]) =>
        list.map((item) => ({
          channel,
          entityId: actorEntityId(result.actorKey),
          optionId: item.optionId,
          value: decimalString(item.value),
        })),
      ),
    durationPreparations: (result.durationPreparations ?? []).map((item) => ({
      seconds: decimalString(item.value),
      optionId: item.optionId,
    })),
    identity: {
      actorEntityId: result.identity.actorEntityId,
      powerSourceEntityId: result.identity.powerSourceEntityId,
      damageBonusSource: result.identity.damageBonusSource,
      durationAdjustmentSeconds:
        result.identity.durationAdjustmentSeconds === null
          ? null
          : decimalString(result.identity.durationAdjustmentSeconds),
      baseStat: {
        stat: result.identity.baseStat.stat,
        entityId: result.identity.baseStat.entityId,
        multiplier: decimalString(result.identity.baseStat.multiplier),
        value: decimalString(result.identity.baseStat.value),
      },
      attributeReads: result.identity.attributeReads.map((read) => ({
        entityId: read.entityId,
        stat: read.stat,
        stage: read.stage,
        value: decimalString(read.value),
      })),
      ...(result.identity.referencePiercePower === undefined
        ? {}
        : { referencePiercePower: result.identity.referencePiercePower }),
      ...(result.identity.luminize
        ? {
            luminize: {
              restrictedAttack: decimalString(
                result.identity.luminize.restrictedAttack,
              ),
              restrictedMastery: decimalString(
                result.identity.luminize.restrictedMastery,
              ),
              proficiencyInput: decimalString(
                result.identity.luminize.proficiencyInput,
              ),
              proficiencyConversionRate: decimalString(
                result.identity.luminize.proficiencyConversionRate,
              ),
            },
          }
        : {}),
    },
  }
}

// 自检：覆盖数量、非空期望、以及 39 个事件按返回取整即与上游真实整数一致的
// 已核验事实（仪玄的贯穿力 round(2) 差异由测试单独投影，不写进期望）。
assert.equal(Object.keys(cases).length, teamDifferentialSlots.length)
for (const [slotId, entry] of Object.entries(cases)) {
  assert(entry.totals.nonCritical && entry.totals.expected, slotId)
  if (entry.kind === "luminize")
    assert.equal(entry.totals.critical, null, slotId)
  else assert(entry.totals.critical, slotId)
  assert(entry.identity.attributeReads.length > 0, `${slotId} attribute reads`)
  assert(
    entry.identity.attributeReads.every((read) => read.entityId && read.stat),
    `${slotId} attribute identity`,
  )
  for (const read of entry.identity.attributeReads)
    assert.equal(read.stage, "current", `${slotId} attribute stage`)
  if (entry.kind === "anomaly" || entry.kind === "disorder")
    assert.equal(
      entry.identity.baseStat.entityId,
      entry.identity.powerSourceEntityId,
      `${slotId} base stat must come from the anomaly power source`,
    )
}

const fixture = {
  provenance: {
    fairyBaseline,
    snapshotId,
    effectsRevision: 14,
    effectSource: {
      commit: effectSourceCommit,
      resource: buffResource,
      sha256: digests[`${buffResource}@${effectSourceCommit}`],
    },
    skillSource: {
      commit: skillSourceCommit,
      resource: buffResource,
      sha256: digests[`${buffResource}@${skillSourceCommit}`],
    },
    upstreamReturns: "static-team-differential-upstream-returns.json",
    upstreamReturnsScope:
      "The reviewed-adapter run covers the 12 original presets only. Boundary presets added later are pinned-records-only: they have no upstream integer return and are never compared against a fabricated integer.",
    method:
      "Pinned upstream raw records for effect values and skill multipliers + extracted pinned pure functions as cross-checks + independently reproduced damage chains in exact decimal rational arithmetic. Fairy outputs and upstream rounded integers are never used as expectations.",
    numberFormat:
      "totals, criticalRate, channels, durationPreparations and identity reads are decimal strings with at least 40 significant digits (ROUND_HALF_EVEN); factors and panels are JSON numbers. Regression tolerance stays max(1e-9, abs(reference) * 1e-12).",
    resources,
    extraction,
  },
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
  `Wrote ${Object.keys(cases).length} independent team-differential reference cases to ${output}`,
)
