// effects revision 54—56 伤害种类范围回归的独立参考生成器（离线维护脚本，
// 不进入 build/test/check/CI）。
//
// 用法：
//   node packages/data/test/fixtures/generate-revision-53-56-scope-reference.mjs \
//     /path/to/ZZZ-HP /absolute/new-reference.json
//
// 参考分层（互不替代）：
//   1. 游戏原文（Nanoka 中英文与各修正文档引用的原文）给出修正后的数值与范围；
//      案例夹具逐条声明这些原文事实。
//   2. 固定 ZZZ-HP 991bb0e 的原始记录给出上游同一选择下的编码（stat、数值、
//      层数、元素筛选）；本脚本逐字段核对，并按该版本 damageCalc.ts 的乘区
//      表达式重放上游结果来源指针与公式。不执行上游应用。
//   3. 伤害链用独立十进制有理数算式重建：中立面板攻击 1,000、等级 1、防御 0、
//      抗性 0、异常精通 100、暴击率 0，其余乘区恒为 1。期望值不使用 Fairy
//      实际输出、既有对比结果或上游取整整数回填。
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { scopeCases, scopePanel } from "./revision-53-56-scope-cases.ts"

const [repository, output] = process.argv.slice(2)
assert(
  repository && output,
  "Provide the upstream Git repository and a NEW output file",
)
assert(!existsSync(output), `Refusing to overwrite existing output: ${output}`)

const effectSourceCommit = "991bb0ef2a00387f8a1fa18293bbda17256d7270"
const buffResource = "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json"
const damageCalcResource = "zzz-hp/src/utils/damageCalc.ts"
const digests = {
  [buffResource]:
    "f1df0144ee962138cd09dbdd36511eab46fb3d6016ec638ddab7fc4a01737095",
  [damageCalcResource]:
    "763c7447cf6ab208c48f5412516de430b1e2ba1669e90bf37ecb83526bc0629d",
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex")
const resources = []
function upstreamFile(path) {
  const bytes = execFileSync(
    "git",
    ["-C", repository, "show", `${effectSourceCommit}:${path}`],
    { maxBuffer: 40 * 1024 * 1024 },
  )
  assert.equal(hash(bytes), digests[path], `${path}@${effectSourceCommit}`)
  resources.push({ path, commit: effectSourceCommit, sha256: hash(bytes) })
  return bytes.toString("utf8")
}
const buffs = JSON.parse(upstreamFile(buffResource))
const damageCalc = upstreamFile(damageCalcResource)
const generatorPath = fileURLToPath(import.meta.url)
const generatorSha256 = hash(readFileSync(generatorPath))

// 上游 991bb0e 的乘区表达式。逐条固定到源码文本，任何漂移都拒绝生成。
const upstreamFormulas = {
  anomaly: "const anomalyDmgBonusZone = 1 + bonusPanel.anomalyDmgBonus / 100",
  anomalyCritical:
    "const anomalyCritZone = 1 + anomalyCritRateRatio * anomalyCritDmgRatio",
  anomalyCriticalDamage:
    "const anomalyCritDmgRatio = clamp(bonusPanel.anomalyCritDmg / 100, 0, 20)",
  anomalyRelease:
    "1 + (bonusPanel.anomalyReleaseDmgBonus + bonusPanel.anomalyDmgBonus) / 100",
  turbulence:
    "1 + (bonusPanel.turbulenceDmgBonus + bonusPanel.anomalyDmgBonus) / 100",
  radiance:
    "1 + (radianceDmgBonusForCombined + anomalyDmgBonusForCombined) / 100",
  pierce: "usedBaseSource === 'pierce' ? 1 + pierceDmgBonusRatio : 1",
}
for (const [name, formula] of Object.entries(upstreamFormulas))
  assert(
    damageCalc.includes(formula),
    `pinned damageCalc is missing the ${name} zone formula: ${formula}`,
  )

const atPointer = (value, pointer) =>
  pointer
    .split("/")
    .slice(1)
    .reduce((current, key) => current[key], value)

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
const ELEMENT_INHERITANCE = { "frost": "ice", "auric-ink": "ether" }
function elementMatches(filter, element) {
  if (filter === undefined || filter === "all") return true
  const filters = Array.isArray(filter) ? filter : [filter]
  const names = filters.map((name) => CHINESE_ELEMENTS[name] ?? name)
  return names.includes(element) || names.includes(ELEMENT_INHERITANCE[element])
}

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
const sub = (left, right) => add(left, { n: -R(right).n, d: R(right).d })
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
const minimum = (left, right) =>
  R(left).n * R(right).d <= R(right).n * R(left).d ? R(left) : R(right)
const maximum = (left, right) =>
  R(left).n * R(right).d >= R(right).n * R(left).d ? R(left) : R(right)
const clampRational = (value, low, high) => minimum(maximum(value, low), high)
const toNumber = (value) => {
  value = R(value)
  return Number(value.n) / Number(value.d)
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

// ── 上游记录模型 ──────────────────────────────────────────────────────────
const UPSTREAM_STAT_SCOPE = {
  anomalyDmgBonus: {
    channel: "anomaly-damage-bonus",
    kinds: ["anomaly", "anomaly-settlement", "vortex", "luminize"],
  },
  turbulenceDmgBonus: {
    channel: "anomaly-damage-bonus",
    kinds: ["vortex"],
  },
  anomalyCritRate: {
    channel: "anomaly-critical-rate",
    kinds: ["anomaly"],
  },
  anomalyCritDmg: {
    channel: "anomaly-critical-damage",
    kinds: ["anomaly"],
  },
}
const CORRECTED_CHANNELS = new Set([
  "anomaly-damage-bonus",
  "anomaly-critical-rate",
  "anomaly-critical-damage",
  "sheer-damage-bonus",
])
function roundTo(value, places) {
  const scale = 10n ** BigInt(places)
  const scaled = value.n * scale
  let quotient = scaled / value.d
  const remainder = scaled % value.d
  const twice = remainder * 2n
  if (twice > value.d || (twice === value.d && quotient % 2n !== 0n))
    quotient += 1n
  return rational(quotient, scale)
}
function recordRatioPerLayer(record) {
  if (record.kind === "convert") {
    assert(record.convert, `${record.id}: convert record without convert block`)
    assert.equal(record.convert.from, "mastery", `${record.id}: convert source`)
    assert.equal(
      record.convert.initialBase ?? 0,
      0,
      `${record.id}: initial base`,
    )
    const mastery = scopePanel.anomalyProficiency
    const raw = (mastery * record.convert.ratioPercent) / 100
    const capped = Math.max(
      -Math.abs(record.convert.cap ?? raw),
      Math.min(raw, Math.abs(record.convert.cap ?? raw)),
    )
    assert.equal(
      capped,
      scopePanel.anomalyProficiency * (record.convert.ratioPercent / 100),
      `${record.id}: conversion cap unexpectedly active`,
    )
    // 上游 resolveConvertValue 输出 4 位小数的面板点数；面板点数是百分比单位。
    return div(roundTo(fromDecimal(String(raw)), 4), 100)
  }
  const perLayer =
    record.kind === "stacked" || record.stackable
      ? record.valuePerStack
      : record.value
  return div(fromDecimal(String(perLayer)), 100)
}
function validateSelection(caseEntry, selection) {
  const record = atPointer(buffs, selection.source.pointer)
  assert(record, `${caseEntry.caseId}: missing ${selection.source.pointer}`)
  const source = selection.source
  assert.equal(record.stat, source.stat, `${caseEntry.caseId}: stat`)
  assert.equal(
    record.applyTarget,
    source.applyTarget,
    `${caseEntry.caseId}: applyTarget`,
  )
  assert.deepEqual(
    record.elementFilter,
    source.elementFilter,
    `${caseEntry.caseId}: elementFilter`,
  )
  assert.equal(
    record.maxStacks,
    source.maxStacks,
    `${caseEntry.caseId}: maxStacks`,
  )
  assert.equal(
    record.defaultStacks,
    source.defaultStacks,
    `${caseEntry.caseId}: defaultStacks`,
  )
  const stacked = record.kind === "stacked" || record.stackable
  assert.equal(
    stacked ? record.valuePerStack : record.value,
    stacked ? source.valuePerStack : source.value,
    `${caseEntry.caseId}: per-layer source value`,
  )
  assert(
    selection.layers >= 1 && selection.layers <= source.maxStacks,
    `${caseEntry.caseId}: layers ${selection.layers} exceed ${source.maxStacks}`,
  )
  assert(
    CORRECTED_CHANNELS.has(selection.channel),
    `${caseEntry.caseId}: unknown channel ${selection.channel}`,
  )
  const upstreamScope = UPSTREAM_STAT_SCOPE[source.stat]
  assert(upstreamScope, `${caseEntry.caseId}: unmapped stat ${source.stat}`)
  if (selection.sourceStatCorrected) {
    assert.equal(
      selection.differenceId,
      "wrathful-vajra-r2-fire-sheer-stat",
      `${caseEntry.caseId}: only the registered stat correction may change the channel`,
    )
    assert.equal(selection.channel, "sheer-damage-bonus")
    assert.deepEqual(selection.correctedKinds, ["sheer"])
  } else {
    assert.equal(
      upstreamScope.channel,
      selection.channel,
      `${caseEntry.caseId}: channel mapping`,
    )
    for (const kind of selection.correctedKinds)
      assert(
        upstreamScope.kinds.includes(kind),
        `${caseEntry.caseId}: corrected kind ${kind} is outside ${source.stat}`,
      )
  }
  assert(
    elementMatches(record.elementFilter, caseEntry.holder.element),
    `${caseEntry.caseId}: holder ${caseEntry.holder.element} does not match upstream elementFilter`,
  )
  const recordRatio = recordRatioPerLayer(record)
  assert.equal(
    selection.sourcePerLayer,
    toNumber(recordRatio),
    `${caseEntry.caseId}: declared sourcePerLayer does not match the raw record`,
  )
  return { upstreamScope, recordRatio }
}

function channelTotals(entries) {
  const totals = Object.fromEntries(
    [...CORRECTED_CHANNELS].map((channel) => [channel, ZERO]),
  )
  for (const entry of entries)
    totals[entry.channel] = add(totals[entry.channel], entry.value)
  return totals
}

/**
 * Fairy 的异常暴伤上限是 2；991bb0e 的 damageCalc.ts 对 `anomalyCritDmg`
 * 使用 0—20 的独立上限。两者只在超出低上限时才产生差值，本批现有案例都在
 * 低上限内，因此数值不变，但上游投影仍按上游上限计算。
 */
function factorsFor(kind, channels, anomalyCriticalDamageCeiling) {
  if (kind === "sheer") {
    const sheer = add(ONE, channels["sheer-damage-bonus"])
    return {
      nonCritical: {
        baseDamage: fromDecimal(scopePanel.attack),
        sheerDamageBonus: sheer,
      },
      critical: { critical: ONE },
      criticalRate: ZERO,
      nonCriticalValue: mul(fromDecimal(scopePanel.attack), sheer),
      criticalValue: mul(fromDecimal(scopePanel.attack), sheer),
      expectedValue: mul(fromDecimal(scopePanel.attack), sheer),
    }
  }
  const damageBonus = add(ONE, channels["anomaly-damage-bonus"])
  const rate = clampRational(channels["anomaly-critical-rate"], ZERO, ONE)
  const damage = clampRational(
    channels["anomaly-critical-damage"],
    ZERO,
    fromDecimal(anomalyCriticalDamageCeiling),
  )
  const nonCriticalValue = mul(fromDecimal(scopePanel.attack), damageBonus)
  const criticalFactor = add(ONE, damage)
  if (kind === "luminize") {
    return {
      nonCritical: {
        baseDamage: fromDecimal(scopePanel.attack),
        anomalyDamageBonus: damageBonus,
      },
      critical: null,
      criticalRate: ZERO,
      nonCriticalValue,
      criticalValue: null,
      expectedValue: nonCriticalValue,
    }
  }
  const criticalValue = mul(nonCriticalValue, criticalFactor)
  const expectedValue = mul(nonCriticalValue, add(ONE, mul(rate, damage)))
  return {
    nonCritical: {
      baseDamage: fromDecimal(scopePanel.attack),
      anomalyDamageBonus: damageBonus,
    },
    critical: { anomalyCritical: criticalFactor },
    criticalRate: rate,
    nonCriticalValue,
    criticalValue,
    expectedValue,
  }
}

// 防止把 Fairy 的 2 点上限误用到上游：同一 5 点异常暴伤在两种上限下必须不同。
const highAnomalyCriticalDamage = channelTotals([
  { channel: "anomaly-critical-damage", value: fromDecimal(5) },
])
assert(
  toNumber(factorsFor("anomaly", highAnomalyCriticalDamage, 20).criticalValue) >
    toNumber(factorsFor("anomaly", highAnomalyCriticalDamage, 2).criticalValue),
  "upstream anomaly critical damage must use its own 0-20 ceiling",
)

const decimalMap = (record) =>
  Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, decimalString(value)]),
  )
function totalsJson(totals) {
  return {
    nonCritical: decimalString(totals.nonCriticalValue),
    critical:
      totals.criticalValue === null
        ? null
        : decimalString(totals.criticalValue),
    expected: decimalString(totals.expectedValue),
    criticalRate: decimalString(totals.criticalRate),
    factors: {
      nonCritical: decimalMap(totals.nonCritical),
      critical: totals.critical === null ? null : decimalMap(totals.critical),
    },
  }
}

const cases = {}
for (const caseEntry of scopeCases) {
  assert(
    !Object.hasOwn(cases, caseEntry.caseId),
    `duplicate ${caseEntry.caseId}`,
  )
  const validated = caseEntry.selections.map((selection) => ({
    selection,
    ...validateSelection(caseEntry, selection),
  }))
  const correctedEntries = validated
    .filter(
      ({ selection }) =>
        selection.correctedKinds.includes(caseEntry.hit.kind) &&
        (selection.correctedElements === undefined ||
          selection.correctedElements.includes(caseEntry.hit.element)),
    )
    .map(({ selection }) => ({
      channel: selection.channel,
      value: mul(fromDecimal(selection.perLayer), selection.layers),
    }))
  const upstreamEntries = validated
    .filter(({ upstreamScope }) =>
      upstreamScope.kinds.includes(caseEntry.hit.kind),
    )
    .map(({ selection, upstreamScope, recordRatio }) => ({
      channel: upstreamScope.channel,
      value: mul(recordRatio, selection.layers),
    }))
  const expected = factorsFor(
    caseEntry.hit.kind,
    channelTotals(correctedEntries),
    2,
  )
  const upstream = caseEntry.upstreamProjection
    ? factorsFor(caseEntry.hit.kind, channelTotals(upstreamEntries), 20)
    : null
  cases[caseEntry.caseId] = {
    correction: caseEntry.correction,
    hit: caseEntry.hit,
    holder: caseEntry.holder,
    wEngine: caseEntry.wEngine,
    selections: caseEntry.selections.map((selection) => ({
      optionId: selection.optionId,
      layers: selection.layers,
      channel: selection.channel,
      perLayer: decimalString(fromDecimal(selection.perLayer)),
      correctedKinds: selection.correctedKinds,
      correctedElements: selection.correctedElements ?? null,
      differenceId: selection.differenceId,
      source: { pointer: selection.source.pointer },
    })),
    expected: totalsJson(expected),
    upstream:
      upstream === null
        ? null
        : {
            nonCritical: decimalString(upstream.nonCriticalValue),
            critical:
              upstream.criticalValue === null
                ? null
                : decimalString(upstream.criticalValue),
            expected: decimalString(upstream.expectedValue),
            criticalRate: decimalString(upstream.criticalRate),
          },
    difference:
      upstream === null
        ? null
        : {
            nonCritical: decimalString(
              sub(expected.nonCriticalValue, upstream.nonCriticalValue),
            ),
            critical:
              expected.criticalValue === null || upstream.criticalValue === null
                ? null
                : decimalString(
                    sub(expected.criticalValue, upstream.criticalValue),
                  ),
            expected: decimalString(
              sub(expected.expectedValue, upstream.expectedValue),
            ),
            criticalRate: decimalString(
              sub(expected.criticalRate, upstream.criticalRate),
            ),
          },
  }
}

const reference = {
  provenance: {
    fairyBaseline: "a2015864",
    effectsRevision: 56,
    zzzHpCommit: effectSourceCommit,
    resources,
    generatorSha256,
    precision:
      "Reference and difference assertions use max(1e-9, abs(reference) * 1e-12). This batch has no upstream integer projection; upstream values are the pinned raw-record/zone projection.",
    layers: [
      "Nanoka zh/en text and the revision 54—56 correction documents declare the corrected values and damage-kind scope in the case fixture.",
      "Pinned ZZZ-HP 991bb0e raw records freeze the upstream encoding; the pinned damageCalc.ts zone expressions are asserted verbatim and replayed, not executed as an app.",
      "An independent exact-decimal rational chain uses a neutral 1,000-attack panel, level 1, zero defense/resistance, 100 anomaly proficiency and zero crit rate; all other factors are one.",
    ],
  },
  cases,
}

writeFileSync(output, `${JSON.stringify(reference, null, 2)}\n`)
// 冻结参考同时接受全仓格式检查：显式维护脚本在写完后按仓库格式化器收敛。
execFileSync("pnpm", ["exec", "oxfmt", "--write", output], {
  cwd: fileURLToPath(new URL("../../../../", import.meta.url)),
  stdio: "ignore",
})
console.log(
  `wrote ${Object.keys(cases).length} cases to ${output} (${dirname(output)})`,
)
