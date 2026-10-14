import { isDeepStrictEqual } from "node:util"
import type {
  Condition,
  ContributionOperation,
  MindscapeRank,
} from "@randomplay/shared"
import type { Supplement } from "./supplements.ts"

const identity = { kind: "agent", entityId: "1621" } as const
const always = { kind: "constant", value: true } as const
const ultimateTarget = "roxy-requiem-for-the-night-burial"
export const ROXY_ULTIMATE_ACTION = {
  actionId: "action:agent:1621:action:0013",
  source: {
    identity,
    section: "终结技：葬夜安魂曲",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.2",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/skill/chain/description/3/param/0",
      },
    ],
  },
} as const
const clauses: readonly {
  slug: string
  rank: MindscapeRank
  name: string
  description: string
  operation: ContributionOperation
  when?: Condition<"contribution">
  team?: true
  ultimate?: true
}[] = [
  {
    slug: "m1-hit-resistance-reduction",
    rank: 1,
    name: "影画1 · 敬请安息命中后的敌方减抗",
    description:
      "声明[强化特殊技：敬请安息]已命中当前敌人且全属性减抗15%的状态仍有效，持有者及合法同队角色对该敌人的后续伤害受益，不要求后续命中仍为强化特殊技。持续50秒、重复触发刷新由调用方维护；更换敌人时须重新声明。与自身暴伤选项独立，0关闭、1开启。",
    team: true,
    operation: {
      kind: "factor-contribution",
      channel: "target-resistance-reduction",
      value: { kind: "literal", unit: "ratio", value: 0.15 },
    },
  },
  {
    slug: "m1-critical-damage",
    rank: 1,
    name: "影画1 · 自身暴击伤害",
    description:
      "洛克茜自身普通暴击伤害提升40%。独立显式选择，不依赖[敬请安息]命中或敌方减抗开关，不给其他持有者增加暴伤；0关闭、1开启。",
    operation: {
      kind: "stat-adjustment",
      stat: "criticalDamage",
      stage: "direct",
      value: { kind: "literal", unit: "ratio", value: 0.4 },
    },
  },
  {
    slug: "m2-stun-damage",
    rank: 2,
    name: "影画2 · 小心风寒命中后的失衡易伤",
    description:
      "声明[强化特殊技：小心风寒]已命中当前敌人且失衡易伤提升30个百分点的状态仍有效，持有者及合法同队角色受益。进入普通失衡加数通道，基础1.5变为1.8；仅目标当前失衡时作用。状态持续至目标从失衡恢复由调用方维护，更换敌人须重新声明；0关闭、1开启。不含失衡值与流势。",
    team: true,
    when: { kind: "one-of", fact: "hit.targetState", values: ["stunned"] },
    operation: {
      kind: "factor-contribution",
      channel: "stun-damage-adjustment",
      value: { kind: "literal", unit: "multiplier", value: 0.3 },
    },
  },
  {
    slug: "m4-ultimate-damage",
    rank: 4,
    name: "影画4 · 葬夜安魂曲伤害",
    description:
      "仅洛克茜自身[终结技：葬夜安魂曲]（action:agent:1621:action:0013）的伤害提升20%，与已有增伤同区加算；须使用正式动作的精确技能目标。0关闭、1开启，不含能量回复或失衡值。",
    ultimate: true,
    when: {
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.actionId",
          values: ["action:agent:1621:action:0013"],
        },
        { kind: "one-of", fact: "hit.skillCategory", values: ["ultimate"] },
        { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: [`zzz-hp:skill:${ultimateTarget}`],
        },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: { kind: "literal", unit: "ratio", value: 0.2 },
    },
  },
  {
    slug: "m6-wind-resistance-ignore",
    rank: 6,
    name: "影画6 · 自身风属性抗性忽视",
    description:
      "洛克茜自身风属性伤害无视目标15%风属性伤害抗性；0关闭、1开启，覆盖regular、anomaly、disorder、vortex及anomaly-settlement。命中actor与全部基础项实际属性提供者须为本绑定同一洛克茜；异常类另要求实际AP提供者同属本人。同实体历史快照保留原读数，其他实例提供者不受益。适用时混合本人和他人基础项须拆成独立请求，否则明确拒绝。不含风眼、余响、巨型风旋倍率与失衡值。",
    when: {
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.element", values: ["wind"] },
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: [
            "regular",
            "anomaly",
            "disorder",
            "vortex",
            "anomaly-settlement",
          ],
        },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "attacker-resistance-ignore",
      value: { kind: "literal", unit: "ratio", value: 0.15 },
    },
  },
]

/** 固定来源没有 Roxy，复用 Nanoka 的真实补充实体；不创建旧来源记录。 */
export const ROXY_MINDSCAPE_SUPPLEMENTS: readonly Supplement[] = clauses.map(
  (clause) => ({
    kind: "option",
    supplementId: `nanoka:agents:1621:${clause.slug}`,
    optionId: `nanoka:agents:1621:${clause.slug}`,
    catalogEntityId: "nanoka:agents:1621",
    source: `nanoka-integrated@3.2 agents/1621 /talent/${clause.rank}/desc`,
    supportedRanks: `影画 ${clause.rank} 及以上；核心 1—7`,
    computationTarget: "catalog option on the existing supplement agent entity",
    evidence: [
      {
        path: "agents/1621/details.zh.json",
        pointer: `/talent/${clause.rank}/desc`,
        sha256:
          "c2389b7393c05632b298733831b079f8d19dc74f7af54f121f93e9c54134b30e",
      },
      {
        path: "agents/1621/details.en.json",
        pointer: `/talent/${clause.rank}/desc`,
        sha256:
          "30a75cab3c664648ca8f9bbcfdce04bc5d92b5897b9187c17c6620c76c282b2a",
      },
    ],
    verification: `Nanoka 3.2 中英文 /talent/${clause.rank}/desc 核对。${clause.description}固定 effects fac62407 没有 Roxy 实体，登记使用 Nanoka 真实补充身份。ZZZ-HP 主仓固定 7a4f2776bf4a44cb108fcd7f5834f63606ade914 /agents/33 的对应独立记录仅作执行语义佐证，不升级来源；M6 在 direct/anomaly/disorder/turbulence/anomalyRelease 的 wind 求值为15、fire为0。此为工具模型核查，未经游戏实测。`,
    ...(clause.ultimate
      ? {
          skillTarget: {
            targetId: ultimateTarget,
            agentEntityId: "1621",
            category: "ultimate" as const,
            name: "终结技：葬夜安魂曲",
          },
        }
      : {}),
    rule: {
      effectId: `agent:1621:nanoka:${clause.slug}`,
      identity,
      section: clause.name,
      config: {
        kind: "compare-number",
        unit: "count",
        operator: "gte",
        left: {
          kind: "configuration-number",
          unit: "count",
          field: "mindscapeRank",
        },
        right: { kind: "literal", unit: "count", value: clause.rank },
      },
      parameters: {},
      scope: clause.operation.kind === "stat-adjustment" ? "entity" : "hit",
      when: clause.when ?? always,
      operation: clause.operation,
      maximumLayers: 1,
      beneficiary: { kind: clause.team ? "team" : "holder" },
    },
    variant: {
      configuration: { minimumMindscape: clause.rank },
      inputs: [],
      applicability: {},
      conditionDescription: clause.description,
      name: clause.name,
      target: clause.team ? "team" : "self",
    },
  }),
)

/** 三类保留身份任一命中均核对完整登记；主规则与附加规则共用效果身份。 */
export function verifyRoxyMindscapeRegistrations(
  supplements: readonly Supplement[],
): void {
  const expectedOptions = ROXY_MINDSCAPE_SUPPLEMENTS.filter(
    (entry) => entry.kind === "option",
  )
  const expectedBySupplementId = new Map(
    expectedOptions.map((entry) => [entry.supplementId, entry]),
  )
  const expectedByOptionId = new Map(
    expectedOptions.map((entry) => [entry.optionId, entry]),
  )
  const expectedByEffectId = new Map(
    expectedOptions.flatMap((entry) =>
      [entry.rule, ...(entry.additionalRules ?? [])].map(
        (rule) => [rule.effectId, entry] as const,
      ),
    ),
  )
  const selected = supplements.flatMap((actual) => {
    const reservedEffectIds = (
      "rule" in actual ? [actual.rule, ...(actual.additionalRules ?? [])] : []
    )
      .map((rule) => rule.effectId)
      .filter((effectId) => expectedByEffectId.has(effectId))
    if (new Set(reservedEffectIds).size !== reservedEffectIds.length)
      throw new Error("Duplicate Roxy mindscape effect registration")
    const matches = [
      expectedBySupplementId.get(actual.supplementId),
      "optionId" in actual
        ? expectedByOptionId.get(actual.optionId)
        : undefined,
      ...reservedEffectIds.map((effectId) => expectedByEffectId.get(effectId)),
    ].filter((entry) => entry !== undefined)
    if (new Set(matches).size > 1)
      throw new Error(
        `Roxy mindscape registration drift: ${actual.supplementId}; conflicting reserved identities`,
      )
    return matches.length === 0 ? [] : [{ actual, expected: matches[0]! }]
  })
  if (
    new Set(selected.map(({ expected }) => expected.supplementId)).size !==
    selected.length
  )
    throw new Error("Duplicate Roxy mindscape supplement registration")
  for (const { actual, expected } of selected) {
    // 完整登记保留来源、语言与条款指针，也核对归属、培养及精确目标。
    if (!isDeepStrictEqual(actual, expected))
      throw new Error(
        `Roxy mindscape registration drift: ${actual.supplementId}; re-review the frozen clause`,
      )
  }
}
