import { isDeepStrictEqual } from "node:util"
import type {
  DamageElement,
  StaticCatalogApplicability,
} from "@randomplay/shared"
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
    exclusiveGroup: `roxy:${clause.stat}:core-state-model`,
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
            ? "4b4f267a85665ace084d57c47d7202d5687009a98f2c0873b0c89e8124b329e3"
            : "7f1f2e152f9a3b9f23e94e04067af5608b372d74a04762b8686ddd3fa1767887",
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

const elementStates: readonly {
  element: DamageElement
  hitElements: readonly [DamageElement, ...DamageElement[]]
}[] = [
  { element: "physical", hitElements: ["physical", "wind"] },
  { element: "fire", hitElements: ["fire", "wind"] },
  { element: "ice", hitElements: ["ice", "frost", "wind"] },
  { element: "electric", hitElements: ["electric", "wind"] },
  { element: "ether", hitElements: ["ether", "auric-ink", "wind"] },
]
const elementInputName = (element: DamageElement) =>
  `roxy:core:active-buff:${element}`
const elementDescription =
  "调用方用activeBuffElements明确声明本来源仍有效的元素增益集合（physical/fire/ice/electric/ether），正层必须非空且无重复，0层关闭。每个元素状态分别由调用方维护50秒及刷新；不推算浸染、净化、风化覆盖或时间线，不代表敌人当前风化/浸染状态。按命中元素匹配已激活属性或风，冰包含烈霜，以太包含玄墨；不改实际攻击元素，不支持把wind/frost/auric-ink/lumiflux声明为独立浸染属性。多个属性取覆盖并集，同一命中只贡献一次；两职业分支共用本绑定的元素事实及局外CR，声明必须一致。非锋御普通CD、锋御锐暴伤，核心1—7与局外CR帽沿原文。同绑定同职业分支与旧core-wind选项互斥，不能双算；不同来源在实际消费同一输出时仍按single-source-only明确拒绝，不猜覆盖或最强来源。此选项不包括额外能力的8%直接伤害。"

/** 复用旧分支数值和职业契约；状态集合只派生布尔事实，不成为层数。 */
export const ROXY_CORE_ELEMENT_SUPPLEMENTS: readonly SupplementOption[] =
  ROXY_CORE_WIND_SUPPLEMENTS.map((legacy, index) => {
    const slug = index
      ? "core-element-sharp-critical-damage"
      : "core-element-critical-damage"
    const name = index
      ? "核心 · 有效元素增益锐暴伤"
      : "核心 · 有效元素增益普通暴伤"
    return {
      ...legacy,
      supplementId: `nanoka:agents:1621:${slug}`,
      optionId: `nanoka:agents:1621:${slug}`,
      supportedRanks: "核心1—7；影画0—6；0—1开关；显式有效元素集合",
      computationTarget:
        "critical damage on the union of explicitly active elemental buffs and wind",
      evidence: [
        ...legacy.evidence,
        ...(
          [
            [
              "1091",
              "zh",
              "5f00f24d508f8916dbfc94993a7ff4dffda09d0fafddb30259f64cee791aa841",
            ],
            [
              "1091",
              "en",
              "aa51b473f18c002f70fb7b68cdefd7425cd11b3255e86b62fca228674f9fb26e",
            ],
            [
              "1371",
              "zh",
              "bcf0924fe9fbdc799e4118e5590aef75e2b9bd1d0b0e0cf964179bfabcd77a01",
            ],
            [
              "1371",
              "en",
              "f10dab754c5901446ddc404de6edd5c96e416911d0bc618fbde76acd32fd0c8e",
            ],
          ] as const
        ).map(([id, locale, sha256]) => ({
          path: `agents/${id}/details.${locale}.json`,
          pointer: "/specialElementType/desc",
          sha256,
        })),
      ],
      verification: `Nanoka 3.2 中英文七档核心desc/0确认对应属性及风属性、不同属性独立50秒刷新；公式沿旧风分支min(cap(core), coefficient×max(0,c))。当前ZZZ-HP 0a6c2d872babf36c017db92981ef2fa659fc6c56 /agents/33/mindscapeBuffs/0/effectBlocks/0 的note同文，但机器记录elementFilter=all，普通CD未排除锋御；当前zzz_calculator da6a8c08bcc447c49da2bbb657891ded6dfa11d6 /teammates/0/buffs/0及实际网站/api/meta的/combatBuffs/0仍省略元素条件，不照搬。烈霜/玄墨依Nanoka3.2中英specialElementType/desc与既有元素继承契约匹配冰/以太。${elementDescription}低层supplied需显式提供五个绑定count状态读数（1有效、0无效），不提供不会默认为全元素有效；职业事实继续由目录保证。未进行游戏实测。`,
      rule: {
        ...legacy.rule,
        effectId: `agent:1621:nanoka:${slug}`,
        section: name,
        when: {
          kind: "any",
          conditions: elementStates.map(({ element, hitElements }) => ({
            kind: "all",
            conditions: [
              { kind: "one-of", fact: "hit.element", values: hitElements },
              {
                kind: "compare-number",
                unit: "count",
                operator: "eq",
                left: {
                  kind: "input",
                  unit: "count",
                  name: elementInputName(element),
                },
                right: { kind: "literal", unit: "count", value: 1 },
              },
            ],
          })),
        },
      },
      variant: {
        ...legacy.variant,
        name,
        conditionDescription: elementDescription,
        elementBuffInputs: elementStates.map(({ element }) => ({
          element,
          inputName: elementInputName(element),
        })),
      },
    }
  })

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
    const matches = [
      ...ROXY_CORE_WIND_SUPPLEMENTS,
      ...ROXY_CORE_ELEMENT_SUPPLEMENTS,
    ].filter(
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
