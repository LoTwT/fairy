import { isDeepStrictEqual } from "node:util"
import type { ContributionOperation } from "@randomplay/shared"
import type { Supplement, SupplementOption } from "./supplements.ts"

const levelInput = "roxy:additional:holder-level"
const clauses: readonly {
  slug: string
  name: string
  description: string
  team?: true
  windswept?: true
  operation: ContributionOperation
}[] = [
  {
    slug: "additional-level-damage",
    name: "额外能力 · 辉金心脏自身等级增伤",
    description:
      "同队另一名强攻、命破或锋御角色任一满足时，洛克茜自身伤害增加(8+min(1.2×角色等级,72))/100。角色等级来自本绑定持有者的actorSources.level，须为真实当前等级的有限整数1—60，无默认值；不是核心或技能等级，也不取命中队友等级。多名合格队友只满足一次。独立0/1开关，不要求队伍攻击命中状态，不包含第三条8%直接伤害或核心团队双暴。",
    operation: {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: {
        kind: "add",
        unit: "ratio",
        operands: [
          { kind: "literal", unit: "ratio", value: 0.08 },
          {
            kind: "minimum",
            unit: "ratio",
            operands: [
              { kind: "literal", unit: "ratio", value: 0.72 },
              {
                kind: "convert",
                unit: "ratio",
                input: { kind: "input", unit: "count", name: levelInput },
                rate: { kind: "literal", unit: "multiplier", value: 0.012 },
              },
            ],
          },
        ],
      },
    },
  },
  {
    slug: "additional-hit-stun-damage",
    name: "额外能力 · 队伍攻击命中后的失衡易伤",
    description:
      "同队另一名强攻、命破或锋御角色任一满足资格；声明队伍角色攻击已命中当前敌人且失衡易伤状态仍有效。持有者及合法同队角色均受益，不按受益者职业筛选；当前敌人失衡时普通失衡加数+0.30，与影画2的+0.30同区相加（基础1.5→1.8，两项有效时2.1）。独立0/1开关，不依赖自身等级增伤或角色等级输入，多名合格队友不倍增。命中、持续和失衡结束由调用方维护，更换目标必须重新声明；不含失衡时间延长、资源或风化/浸染直接伤害。",
    team: true,
    operation: {
      kind: "factor-contribution",
      channel: "stun-damage-adjustment",
      value: { kind: "literal", unit: "multiplier", value: 0.3 },
    },
  },
  {
    slug: "additional-weathered-direct-damage",
    name: "额外能力 · 风化直接攻击伤害",
    description:
      "同队另一名强攻、命破或锋御满足资格时，当前目标处于本队施加的风化，风及当前浸染属性的直接攻击风化系数增加0.08。独立0/1开关；显式提供当前目标状态、施加者、浸染色（null为已知未浸染）、ratio基础系数及本次命中的directAttack。基础系数不含本次增量，无默认10%；关闭本选项仍保留基础风化乘区。同队仅声明一个实际有效的此类来源，不推断多洛克茜覆盖次序。",
    team: true,
    windswept: true,
    operation: {
      kind: "factor-contribution",
      channel: "windswept-direct-damage-coefficient-increase",
      value: {
        kind: "convert",
        unit: "ratio",
        input: {
          kind: "input",
          unit: "count",
          name: "roxy:weathered-direct-damage:applicable",
        },
        rate: { kind: "literal", unit: "multiplier", value: 0.08 },
      },
    },
  },
]

/** 固定 effects 没有 Roxy；只在既有真实 Nanoka 实体上补充独立条款。 */
export const ROXY_ADDITIONAL_SUPPLEMENTS: readonly SupplementOption[] =
  clauses.map((clause) => ({
    kind: "option",
    supplementId: `nanoka:agents:1621:${clause.slug}`,
    optionId: `nanoka:agents:1621:${clause.slug}`,
    catalogEntityId: "nanoka:agents:1621",
    source:
      "nanoka-integrated@3.2 agents/1621 /passive/level/1621501—1621507/desc/1",
    supportedRanks: "核心 1—7；影画 0—6；层数 0—1",
    computationTarget: "catalog option on the existing supplement agent entity",
    evidence: (["zh", "en"] as const).flatMap((locale) =>
      Array.from({ length: 7 }, (_, index) => ({
        rank: index + 1,
        path: `agents/1621/details.${locale}.json`,
        pointer: `/passive/level/${1621501 + index}/desc/1`,
        sha256:
          locale === "zh"
            ? "c2389b7393c05632b298733831b079f8d19dc74f7af54f121f93e9c54134b30e"
            : "30a75cab3c664648ca8f9bbcfdce04bc5d92b5897b9187c17c6620c76c282b2a",
      })),
    ),
    verification: clause.windswept
      ? `Nanoka 3.2中英七档desc/1第三条明确8%。第一手机制报告https://forum.gamer.com.tw/C.php?bsn=74860&snA=6498（阿冰wang730465；冻结HTML SHA256 17d5f46419a3fec9356a0a81624db1dab2dbc47a0c75bd1ae64f6588a939088e；提取文本663—668行）给出1+风化系数、与减易伤乘算、风及浸染属性直接攻击范围，并称洛克茜提升系数。结合两者推论本条+0.08进入独立系数加法；本轮没有游戏内实测。报告当前测得10%不推定所有来源通用，调用方显式声明基础系数。当前固定ZZZ-HP 0a6c2d872babf36c017db92981ef2fa659fc6c56同块eff-muppe3ty-86s1uf special18与目标源码da6a8c08bcc447c49da2bbb657891ded6dfa11d6的Roxy18只作实现对照，不复制泛special/忽略属性限制。网站/api/meta无部署SHA，不声称与源码相同。${clause.description}`
      : `Nanoka 3.2 中英文七核心档 /passive/level/1621501—1621507/desc/1 全文一致确认资格与两个独立条款。中文“队伍中存在”与英文“another character”在洛克茜自身为击破时一致。${clause.description}ZZZ-HP 主仓固定7a4f2776bf4a44cb108fcd7f5834f63606ade914 /agents/33/mindscapeBuffs/0 的 blk-muppaptc-wl5q5a 中 eff-muppaptc-fn832t 固定8、eff-muppd7di-hf2fx8 等级转换上限72、eff-muppdqhh-3qsii7 失衡30仅作执行佐证；等级1/30/60实算9.2/44/80个百分点，与M2同时启用失衡加数60个百分点。同块eff-muppe3ty-86s1uf的special18与正文8%冲突排除，不升级legacy effects来源；未经游戏实测。目录验证角色身份/等级/职业事实后展开，直接低层supplied由调用方自行承担这些领域事实的验证。`,
    rule: {
      effectId: `agent:1621:nanoka:${clause.slug}`,
      identity: { kind: "agent", entityId: "1621" },
      section: clause.name,
      config: { kind: "constant", value: true },
      parameters: {},
      scope: "hit",
      when:
        clause.team && !clause.windswept
          ? { kind: "one-of", fact: "hit.targetState", values: ["stunned"] }
          : { kind: "constant", value: true },
      operation: clause.operation,
      maximumLayers: 1,
      beneficiary: { kind: clause.team ? "team" : "holder" },
    },
    variant: {
      configuration: {},
      inputs: [],
      applicability: { otherTeammateProfessions: ["强攻", "命破", "锋御"] },
      ...(clause.team ? {} : { holderLevelInputName: levelInput }),
      ...(clause.windswept
        ? {
            windsweptDirectDamage: {
              applicabilityInputName: "roxy:weathered-direct-damage:applicable",
              applierTeam: "holder" as const,
              singleActiveSourceGroup: "roxy-additional-windswept",
            },
          }
        : {}),
      conditionDescription: clause.description,
      name: clause.name,
      target: clause.team ? "team" : "self",
    },
  }))

/** 任一保留 supplement/option/主附加 effect 身份都必须保持完整登记。 */
export function verifyRoxyAdditionalRegistrations(
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
    const matches = ROXY_ADDITIONAL_SUPPLEMENTS.filter(
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
      throw new Error("Duplicate Roxy additional ability registration")
    if (matches.length !== 1 || !isDeepStrictEqual(actual, expected))
      throw new Error(
        `Roxy additional ability registration drift: ${actual.supplementId}`,
      )
    seen.add(expected.supplementId)
  }
}
