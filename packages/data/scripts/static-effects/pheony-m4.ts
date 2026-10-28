import { isDeepStrictEqual } from "node:util"
import type { Condition, DamageElement, EffectId } from "@randomplay/shared"
import type {
  Supplement,
  SupplementEvidenceReference,
  SupplementOption,
} from "./supplements.ts"

/**
 * PR-B2：菲欧妮（1641）影画 4[生命尽头与冷酷仙境]的六元素独立异放。
 *
 * Nanoka 3.3.12+19634983 的 `/talent/4/desc` 中英文同文证明：
 * [烬火追魂]或[普通攻击：焚罪]终结一击命中处于异常状态的敌人时，额外触发
 * 一次[异放]，固定结算 600% 倍率的对应属性异常伤害。ZZZ-HP 的
 * `anomalyBaseExpected` 不含原异常系数，因此本项目归一后的最终倍率等于
 * 原异常系数 × 6：物理 7.13×6=42.78、火 0.5×6=3、冰 5×6=30、
 * 电 1.25×6=7.5、以太 0.625×6=3.75、风 12.5×6=75。
 *
 * 每个元素选项是当前 `independent-settlement` 目录变体：共享独立
 * `uncategorized` 目标与零初始倍率伤害项，`anomaly-source` 属性来源必须
 * 与本次 `damage.anomalySource` 一致；同目标、同元素的附加规则只把 40%
 * 追加到 `anomaly-settlement-critical-damage` 专用通道。固定源常驻 40%
 * 旧位置（rank0 `eff-9`）继续保持 semantic-conflict 迁移入口，不生成常驻
 * 贡献；rank4 当前是真实空 pack，出现任何新编码即拒绝生成并要求重核。
 *
 * 触发招式、异常状态与命中时点由调用方显式声明；不模拟异常积蓄、持续
 * 时间或动作时间线。独立目标、零初始倍率、逐次声明与 uncategorized 分类
 * 要求是本项目采用的独立结算契约，不是原始游戏证据。
 */
export const PHEONY_M4_TARGET_SLUG = "pheony-m4-anomaly-settlement"
export const PHEONY_M4_TARGET_ID = `zzz-hp:skill:${PHEONY_M4_TARGET_SLUG}`
export const PHEONY_M4_ITEM_ID = "pheony:m4-anomaly-settlement"

export const PHEONY_M4_ELEMENTS = [
  { element: "physical", label: "物理", multiplier: 42.78 },
  { element: "fire", label: "火", multiplier: 3 },
  { element: "ice", label: "冰", multiplier: 30 },
  { element: "electric", label: "电", multiplier: 7.5 },
  { element: "ether", label: "以太", multiplier: 3.75 },
  { element: "wind", label: "风", multiplier: 75 },
] as const

const pheonyM4EvidenceSha256 = {
  zh: "d1aff9ae32d0a60fbf30cf41a998bd3a5cdee82daf2c6d78c6ae6a1863869a14",
  en: "1102a848035a054bafe6f570d38f8313686e33c9e6c965b7c000e6849852485e",
} as const

const evidence = (locale: "zh" | "en"): SupplementEvidenceReference => ({
  path: `agents/1641/details.${locale}.json`,
  pointer: "/talent/4/desc",
  sha256: pheonyM4EvidenceSha256[locale],
})

const mindscapeAtLeast = (minimum: number): Condition<"configuration"> => ({
  kind: "compare-number",
  unit: "count",
  operator: "gte",
  left: {
    kind: "configuration-number",
    unit: "count",
    field: "mindscapeRank",
  },
  right: { kind: "literal", unit: "count", value: minimum },
})

/**
 * 固定源 rank4 当前是真实空 pack；未来任何直接倍率或异放倍率机器编码都
 * 要求重新核对，不能让上游记录与补充规则静默重复贡献。rank0 的常驻 40%
 * 旧位置由 SOURCE_SEMANTICS 的 semantic-conflict 登记单独锁定。
 */
const fixedSourceContextStats = [
  "directDmgMult",
  "directDmgMultFactor",
  "anomalyReleaseMult",
  "anomalyReleaseMultFactor",
  "anomalyReleaseCritDmg",
] as const

const pheonyM4When = (element: DamageElement): Condition<"contribution"> => ({
  kind: "all",
  conditions: [
    {
      kind: "one-of",
      fact: "hit.damageKind",
      values: ["anomaly-settlement"],
    },
    { kind: "one-of", fact: "hit.element", values: [element] },
    {
      kind: "one-of",
      fact: "hit.skillTag",
      values: [PHEONY_M4_TARGET_ID],
    },
  ],
})

const optionId = (element: string) =>
  `nanoka:agents:1641:m4-anomaly-settlement-${element}`
const effectId = (element: string) =>
  `agent:1641:nanoka:m4-anomaly-settlement-${element}:mindscape:4` as EffectId
const critEffectId = (element: string) =>
  `${effectId(element)}-crit-damage` as EffectId

export const PHEONY_M4_SUPPLEMENTS: readonly SupplementOption[] =
  PHEONY_M4_ELEMENTS.map((spec, index) => {
    const when = pheonyM4When(spec.element)
    return {
      kind: "option",
      supplementId: optionId(spec.element),
      source: "nanoka-integrated@3.3.12+19634983 agents/1641 /talent/4/desc",
      catalogEntityId: "agents:pheony",
      optionId: optionId(spec.element),
      supportedRanks: "影画 4—6；层数 0—1",
      computationTarget:
        "catalog option on the mapped agent entity; the independent settlement reuses the original anomaly source",
      // 条款上下文：固定源影画 4 是真实空 pack。该 rank 出现任何新编码
      // （无论 stat，含 note-only 块）或直接/异放倍率家族记录即拒绝生成。
      clauseContextGuard: {
        rankKind: "mindscape",
        rank: 4,
        stats: fixedSourceContextStats,
        expectsEmptyPack: true,
      },
      ...(index === 0
        ? {
            skillTarget: {
              targetId: PHEONY_M4_TARGET_SLUG,
              agentEntityId: "1641",
              category: "uncategorized" as const,
              name: "影画4异放结算",
            },
          }
        : {}),
      evidence: [evidence("zh"), evidence("en")],
      verification: `Nanoka 3.3.12+19634983 的 agents/1641/details.zh.json、details.en.json 的 /talent/4/desc 同文确认：[烬火追魂]或[普通攻击：焚罪]终结一击命中处于异常状态的敌人时，额外触发一次[异放]，固定结算 600% 倍率的对应属性异常伤害（英文：When the Finishing Move of Soul-Searching Blaze or Basic Attack: Purifying Flame hits an enemy affected by an Anomaly, it triggers 1 additional instance of Abloom, resolving the corresponding Attribute Anomaly at a fixed 600% multiplier）。ZZZ-HP 的 anomalyBaseExpected 不含原异常系数，因此本项目把最终倍率归一为原异常系数 × 6：物理 7.13×6=42.78、火 0.5×6=3、冰 5×6=30、电 1.25×6=7.5、以太 0.625×6=3.75、风 12.5×6=75；${spec.label}为 ${spec.multiplier}。原异常系数来自固定提交 991bb0ef2a00387f8a1fa18293bbda17256d7270 的 publicAnomalySkills.ts（物理 713%、火 50%、冰 500%、电 125%、以太 62.5%、风 1250%）；该归一推导未经游戏实测。固定源 /agents/52/mindscapeBuffs/4 是真实空 pack，本批登记 rank4 空位守卫：出现任何新编码即拒绝生成。固定源 /agents/52/mindscapeBuffs/0/effectBlocks/0/effects/17（eff-9）把“该次异放触发暴击时暴伤额外+40%”编为自身常驻 anomalyReleaseCritDmg 40；本批不把该记录变成常驻贡献，继续保留为 semantic-conflict 迁移入口，并以本选项的附加规则只对同一 M4 独立目标、同一元素的本次异放追加 anomaly-settlement-critical-damage 0.4。六条选项共用独立目标 ${PHEONY_M4_TARGET_ID}、伤害项 ${PHEONY_M4_ITEM_ID} 与零初始倍率，按 hit.element 裁决：其他元素、其他结算目标、未选择本项均不获得该倍率或 40% 规则。伤害项必须由调用方以 attack/base/direct、anomaly-source 提供，且 statSource 与 damage.anomalySource 的实体与快照一致；异放复用原异常虚拟来源的攻击、异常精通、等级与穿透，菲欧妮是本次效果持有者与结算角色，不因此改用她的实时面板。独立目标、零初始倍率、逐次声明与 uncategorized 分类要求是本项目采用的独立结算契约，不是原始游戏证据；触发招式、异常状态与命中时点由调用方显式声明，不模拟异常积蓄、持续时间或动作时间线。`,
      rule: {
        effectId: effectId(spec.element),
        identity: { kind: "agent", entityId: "1641" },
        section: "影画4：生命尽头与冷酷仙境（异放结算）",
        config: mindscapeAtLeast(4),
        parameters: {},
        scope: "hit",
        when,
        operation: {
          kind: "hit-adjustment",
          field: "damageMultiplier",
          operator: "add",
          itemIds: [PHEONY_M4_ITEM_ID],
          value: {
            kind: "literal",
            unit: "multiplier",
            value: spec.multiplier,
          },
        },
        maximumLayers: 1,
      },
      additionalRules: [
        {
          effectId: critEffectId(spec.element),
          identity: { kind: "agent", entityId: "1641" },
          section: "影画4：生命尽头与冷酷仙境（异放暴伤）",
          config: mindscapeAtLeast(4),
          parameters: {},
          scope: "hit",
          when,
          operation: {
            kind: "factor-contribution",
            channel: "anomaly-settlement-critical-damage",
            value: { kind: "literal", unit: "ratio", value: 0.4 },
          },
          maximumLayers: 1,
        },
      ],
      variant: {
        configuration: { minimumMindscape: 4 },
        inputs: [],
        applicability: {},
        mechanism: {
          kind: "independent-settlement",
          damageItemRequirements: [
            {
              itemId: PHEONY_M4_ITEM_ID,
              stat: "attack",
              role: "base",
              allowedModes: ["direct"],
              source: "anomaly-source",
              requiredDirectMultiplier: 0,
              requiredSkillCategory: "uncategorized",
            },
          ],
        },
        conditionDescription: `影画4：[烬火追魂]或[普通攻击：焚罪]终结一击命中处于异常状态的敌人时，额外触发一次[异放]，固定结算 600% 倍率的${spec.label}属性异常伤害（本项目归一基础倍率 ${spec.multiplier} = 原异常系数 × 6；ZZZ-HP 的 anomalyBaseExpected 不含原异常系数）。本选项只覆盖${spec.label}元素：调用方声明本次触发与命中元素，命中以 uncategorized 分类携带独立目标、以 anomaly-settlement 结算，伤害项从 0 倍率开始由规则一次赋值，statSource 与 damage.anomalySource 一致；该次异放暴击时额外 40% 暴伤只进入 anomaly-settlement-critical-damage。其他元素、其他结算目标与未选择本项均不获得该倍率或 40%。`,
        name: `影画4 · 异放结算（${spec.label}）`,
        target: "self",
      },
    } satisfies SupplementOption
  })

/**
 * 生成期登记守卫：任一保留 supplementId / optionId / effectId 命中时，整条
 * 登记必须与冻结形状逐字段一致。六元素倍率、40% 附加规则、独立项要求或
 * 证据引用漂移都会让生成失败；合法子集（测试只注入部分元素）仍可用。
 */
export function verifyPheonyM4Registrations(
  supplements: readonly Supplement[],
): void {
  const expectedBySupplementId = new Map(
    PHEONY_M4_SUPPLEMENTS.map((entry) => [entry.supplementId, entry]),
  )
  const expectedByOptionId = new Map(
    PHEONY_M4_SUPPLEMENTS.map((entry) => [entry.optionId, entry]),
  )
  const expectedByEffectId = new Map(
    PHEONY_M4_SUPPLEMENTS.flatMap((entry) =>
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
      throw new Error("Duplicate Pheony M4 effect registration")
    const matches = [
      expectedBySupplementId.get(actual.supplementId),
      "optionId" in actual
        ? expectedByOptionId.get(actual.optionId)
        : undefined,
      ...reservedEffectIds.map((effectId) => expectedByEffectId.get(effectId)),
    ].filter((entry) => entry !== undefined)
    if (new Set(matches).size > 1)
      throw new Error(
        `Pheony M4 registration drift: ${actual.supplementId}; conflicting reserved identities`,
      )
    return matches.length === 0 ? [] : [{ actual, expected: matches[0]! }]
  })
  if (
    new Set(selected.map(({ expected }) => expected.supplementId)).size !==
    selected.length
  )
    throw new Error("Duplicate Pheony M4 supplement registration")
  for (const { actual, expected } of selected)
    if (!isDeepStrictEqual(actual, expected))
      throw new Error(
        `Pheony M4 registration drift: ${actual.supplementId}; re-review the frozen clause`,
      )
}
