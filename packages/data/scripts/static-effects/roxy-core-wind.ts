import { isDeepStrictEqual } from "node:util"
import type { StaticCatalogApplicability } from "@randomplay/shared"
import type { Supplement, SupplementOption } from "./supplements.ts"

const inputName = "roxy:core:external-critical-rate"
const clauses: readonly {
  slug: string
  name: string
  stat: "criticalDamage" | "sharpCriticalDamage"
  coefficient: number
  caps: readonly [number, number, number, number, number, number, number]
  applicability: StaticCatalogApplicability
}[] = [
  {
    slug: "core-wind-critical-damage",
    name: "核心 · 单状态风伤普通暴伤",
    stat: "criticalDamage",
    coefficient: 0.4,
    caps: [0.22, 0.25, 0.28, 0.31, 0.34, 0.37, 0.4],
    applicability: { excludedBeneficiaryProfession: "锋御" },
  },
  {
    slug: "core-wind-sharp-critical-damage",
    name: "核心 · 单状态风伤锐暴伤",
    stat: "sharpCriticalDamage",
    coefficient: 0.2,
    caps: [0.1, 0.115, 0.13, 0.145, 0.16, 0.175, 0.2],
    applicability: { beneficiaryProfession: "锋御" },
  },
]
const description =
  "调用方声明洛克茜提供的一个真实有效属性增益状态；仅计算本次风属性命中。同队含本人，非锋御获得普通暴伤，锋御获得锐暴伤，按目录真实职业分流，不要求额外能力的另一名队友资格。0关闭、1开启，不代表属性层数；两个职业分支可同选并共用本绑定的局外暴击率ratio读数（0.5代表50%），无默认值，不读持有者战斗current CR或受益者CR。持续50秒、刷新和触发由调用方维护。当前实际消费的同一受益者/输出最多一个本分支有效来源，多来源包括同值或零值按既有UNIQUENESS_CONFLICT拒绝；非风、非适用职业分支、异队和关闭态隔离。这是单来源单状态条件模型，不是游戏全队唯一结论，不计算染色属性、多属性风伤叠加或事件时间线。"

/** 固定 fac62407 无 Roxy；只补充 Nanoka 已有实体的双职业风伤分支。 */
export const ROXY_CORE_WIND_SUPPLEMENTS: readonly SupplementOption[] =
  clauses.map((clause) => ({
    kind: "option",
    supplementId: `nanoka:agents:1621:${clause.slug}`,
    optionId: `nanoka:agents:1621:${clause.slug}`,
    catalogEntityId: "nanoka:agents:1621",
    source:
      "nanoka-integrated@3.2 agents/1621 /passive/level/1621501—1621507/desc/0",
    supportedRanks: "核心1—7；影画0—6；单有效状态0—1",
    computationTarget:
      "single-state wind hit critical damage with one effective source per consumed output",
    evidence: (["zh", "en"] as const).flatMap((locale) =>
      Array.from({ length: 7 }, (_, i) => ({
        rank: i + 1,
        path: `agents/1621/details.${locale}.json`,
        pointer: `/passive/level/${1621501 + i}/desc/0`,
        sha256:
          locale === "zh"
            ? "c2389b7393c05632b298733831b079f8d19dc74f7af54f121f93e9c54134b30e"
            : "30a75cab3c664648ca8f9bbcfdce04bc5d92b5897b9187c17c6620c76c282b2a",
      })),
    ),
    verification: `Nanoka 3.2 中英七档完整核心段确认非锋御普通CD每1% CR增加0.4%，上限22/25/28/31/34/37/40%；锋御锐暴伤每1% CR增加0.2%，上限10/11.5/13/14.5/16/17.5/20%。同队含本人，对应属性及风属性受益，本补充只接一个有效状态的风支路。固定主仓7a4f2776bf4a44cb108fcd7f5834f63606ade914 /agents/33/mindscapeBuffs/0 中 eff-mupozzur-l99yxv 和 eff-muppa3a3-cb9a32 的 external critRate→critDmg/sharpenCritDmgBonus、40%/20%及 resolveConvertValue 连续阈值/帽作为局外读数执行佐证；不移植其all元素或普通CD未排除锋御。采用min(cap(core), coefficient×max(0,c))，有限负数归零，c>1不按概率裁剪；不升级固定来源。${description}不保证暴击、不改CR、伤害种类或倍率；命中属性来源及快照继续按既有规则。裸supplied调用方负责职业/局外读数/状态事实，规则级唯一性仍在实际消费输出时执行。代码与固定来源核验不等于游戏实测。`,
    rule: {
      effectId: `agent:1621:nanoka:${clause.slug}`,
      identity: { kind: "agent", entityId: "1621" },
      section: clause.name,
      config: { kind: "constant", value: true },
      parameters: {
        coefficient: {
          kind: "constant",
          unit: "ratio",
          value: clause.coefficient,
        },
        cap: {
          kind: "by-rank",
          rank: "coreSkillLevel",
          unit: "ratio",
          values: {
            1: clause.caps[0],
            2: clause.caps[1],
            3: clause.caps[2],
            4: clause.caps[3],
            5: clause.caps[4],
            6: clause.caps[5],
            7: clause.caps[6],
          },
        },
      },
      scope: "hit",
      beneficiary: { kind: "team" },
      when: { kind: "one-of", fact: "hit.element", values: ["wind"] },
      operation: {
        kind: "stat-adjustment",
        stat: clause.stat,
        stage: "direct",
        value: {
          kind: "minimum",
          unit: "ratio",
          operands: [
            { kind: "parameter", unit: "ratio", name: "cap" },
            {
              kind: "multiply",
              unit: "ratio",
              value: {
                kind: "maximum",
                unit: "ratio",
                operands: [
                  { kind: "literal", unit: "ratio", value: 0 },
                  { kind: "input", unit: "ratio", name: inputName },
                ],
              },
              coefficient: {
                kind: "parameter",
                unit: "ratio",
                name: "coefficient",
              },
            },
          ],
        },
      },
      maximumLayers: 1,
      uniqueness: {
        key: `nanoka:agents:1621:${clause.slug}:single-source`,
        scope: "team",
        select: { kind: "single-source-only" },
      },
    },
    variant: {
      configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
      inputs: [
        {
          name: inputName,
          unit: "ratio",
          description:
            "该绑定洛克茜的局外暴击率读数，0.5代表50%；调用方显式提供，无默认值，不读战斗current CR。",
        },
      ],
      applicability: clause.applicability,
      conditionDescription: description,
      name: clause.name,
      target: "team",
    },
  }))

/** 任一保留 supplement/option/主附加 effect 身份都在折叠前检查完整登记。 */
export function verifyRoxyCoreWindRegistrations(
  supplements: readonly Supplement[],
): void {
  const seen = new Set<string>()
  for (const actual of supplements) {
    const effects =
      "rule" in actual
        ? [actual.rule, ...(actual.additionalRules ?? [])].map(
            (rule) => rule.effectId,
          )
        : []
    const matches = ROXY_CORE_WIND_SUPPLEMENTS.filter(
      (expected) =>
        actual.supplementId === expected.supplementId ||
        ("optionId" in actual && actual.optionId === expected.optionId) ||
        effects.includes(expected.rule.effectId),
    )
    if (!matches.length) continue
    const expected = matches[0]!
    if (
      matches.some((entry) => seen.has(entry.supplementId)) ||
      matches.some(
        (entry) =>
          effects.filter((id) => id === entry.rule.effectId).length > 1,
      )
    )
      throw new Error("Duplicate Roxy core wind registration")
    if (matches.length !== 1 || !isDeepStrictEqual(actual, expected))
      throw new Error(
        `Roxy core wind registration drift: ${actual.supplementId}`,
      )
    seen.add(expected.supplementId)
  }
}
