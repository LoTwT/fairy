import type {
  AnomalyDamageParams,
  AnomalyType,
  DamageResult,
  DisorderDamageParams,
  NormalDamageParams,
  SheerDamageParams,
} from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  calcAnomalyDamage,
  calcAnomalyDamageCrit,
  calcAnomalyDamageNoCrit,
  calcDisorderDamage,
  calcDisorderDamageCrit,
  calcDisorderDamageNoCrit,
  calcNormalDamage,
  calcNormalDamageCrit,
  calcNormalDamageNoCrit,
  calcSheerDamage,
  calcSheerDamageCrit,
  calcSheerDamageNoCrit,
  getAttackerLevelBase,
} from "zzz-data"

/** Parse a multiplier that may be a number (5.0) or percentage string ("500%") */
function parseMultiplier(v: string | number | undefined): number {
  if (v === undefined) return 0
  if (typeof v === "number") return v
  const s = v.trim()
  if (s.endsWith("%")) return Number.parseFloat(s) / 100
  return Number.parseFloat(s) || 0
}

const anomalyTypes = [
  "fire",
  "electric",
  "ether",
  "ice",
  "physical",
  "auricInk",
  "frost",
] as const

export const calcDamage = createTool({
  id: "calc-damage",
  description: `计算绝区零伤害。支持四种伤害类型：
- normal: 常规伤害（需要 attack + skillMultiplier）
- sheer: 贯穿伤害（需要 attack + skillMultiplier + sheerBonusSum，无防御区）
- anomaly: 属性异常伤害（需要 virtualAgent 系列参数 + damageMultiplier）
- disorder: 紊乱伤害（需要 virtualAgent 系列参数 + anomalyType + remainingTime）
返回期望伤害、暴击伤害、非暴击伤害及各乘区 breakdown。`,
  inputSchema: z.object({
    type: z
      .enum(["normal", "sheer", "anomaly", "disorder"])
      .describe("伤害类型"),

    // --- Base (normal/sheer) ---
    attack: z.number().optional().describe("总攻击力（normal/sheer 时必填）"),
    skillMultiplier: z
      .union([z.number(), z.string()])
      .optional()
      .describe(
        "技能倍率（normal/sheer 时必填）。支持小数（5.0）或百分比字符串（'500%'），内部自动转换",
      ),

    // --- Bonus ---
    bonusDamageSum: z
      .number()
      .default(0)
      .describe("增伤区总和，小数形式如 0.3 = 30%"),

    // --- Crit (normal/sheer) ---
    critRate: z
      .number()
      .default(0.05)
      .describe(
        "暴击率，如 0.5 = 50%。默认 5% 为裸面板值，务必传入角色实际暴击率",
      ),
    critDamage: z
      .number()
      .default(0.5)
      .describe(
        "暴击伤害，如 0.88 = 88%。默认 50% 为裸面板值，务必传入角色实际暴击伤害",
      ),

    // --- Defense (normal/anomaly/disorder, NOT sheer) ---
    attackerLevel: z.number().default(60).describe("攻击者等级"),
    defenderBaseDefense: z
      .number()
      .default(953)
      .describe(
        "敌人基础防御力。默认 953 为 Lv60 标准敌人，Lv70 DA boss 需从 lookupGameMode 获取 def 字段",
      ),
    defenseBonus: z.number().default(0).describe("敌人防御加成"),
    defenseReduction: z
      .number()
      .default(0)
      .describe("减防（无视防御 + 减防之和）"),
    penetrationRate: z.number().default(0).describe("穿透率"),
    penetrationValue: z.number().default(0).describe("穿透值"),

    // --- Resistance ---
    defenderResistance: z
      .number()
      .default(0.2)
      .describe(
        "敌人属性抗性，如 0.2 = 20%。默认 20% 为标准抗性，DA boss 弱点属性 0%、抗性属性约 30%",
      ),
    resistanceReduction: z.number().default(0).describe("减抗"),
    ignoreResistance: z.number().default(0).describe("无视抗性"),

    // --- Vulnerability ---
    vulnerabilityBonus: z
      .number()
      .default(0)
      .describe("易伤加成（受到的伤害提升）"),
    damageReduction: z
      .number()
      .default(0)
      .describe("伤害减免（受到的伤害降低）"),

    // --- Daze ---
    isStunned: z.boolean().default(false).describe("目标是否处于失衡状态"),
    stunVulnerability: z
      .number()
      .default(0)
      .describe("失衡易伤加成，如 0.5 = 50%"),
    nonStunVulnerability: z.number().default(0).describe("非失衡易伤加成"),

    // --- Sheer-specific ---
    sheerBonusSum: z
      .number()
      .optional()
      .describe("贯穿增伤总和（sheer 类型时使用）"),

    // --- Anomaly-specific ---
    virtualAgentLevel: z
      .number()
      .optional()
      .describe("虚拟代理人等级（anomaly/disorder 时必填）"),
    virtualAgentAttack: z
      .number()
      .optional()
      .describe("虚拟代理人攻击力（anomaly/disorder 时必填）"),
    virtualAgentAnomalyProficiency: z
      .number()
      .optional()
      .describe("虚拟代理人异常精通（anomaly/disorder 时必填）"),
    damageMultiplier: z
      .number()
      .optional()
      .describe("异常伤害倍率，如 5.0 = 500%（anomaly 时必填）"),
    anomalyBonusDamageSum: z.number().default(0).describe("异常增伤区总和"),
    anomalyCritRate: z.number().default(0).describe("异常暴击率"),
    anomalyCritDamage: z.number().default(0).describe("异常暴击伤害"),

    // --- Disorder-specific ---
    anomalyType: z
      .enum(anomalyTypes)
      .optional()
      .describe("异常类型（disorder 时必填）"),
    remainingTime: z
      .number()
      .optional()
      .describe("异常状态剩余时间/秒（disorder 时必填）"),

    specialMultiplier: z
      .number()
      .default(1)
      .describe("特殊乘区（距离衰减等），默认 1"),
  }),
  execute: async (input) => {
    const defenseParams = {
      attackerLevelBase: getAttackerLevelBase(input.attackerLevel),
      defenderBaseDefense: input.defenderBaseDefense,
      defenseBonus: input.defenseBonus,
      defenseReduction: input.defenseReduction,
      penetrationRate: input.penetrationRate,
      penetrationValue: input.penetrationValue,
    }
    const resistanceParams = {
      defenderResistance: input.defenderResistance,
      resistanceReduction: input.resistanceReduction,
      ignoreResistance: input.ignoreResistance,
    }
    const vulnerabilityParams = {
      vulnerabilityBonus: input.vulnerabilityBonus,
      damageReduction: input.damageReduction,
    }
    const dazeParams = {
      isStunned: input.isStunned,
      stunVulnerability: input.stunVulnerability,
      nonStunVulnerability: input.nonStunVulnerability,
    }

    let expected: DamageResult
    let crit: DamageResult
    let noCrit: DamageResult

    switch (input.type) {
      case "normal": {
        const baseDamage =
          (input.attack ?? 0) * parseMultiplier(input.skillMultiplier)
        const params: NormalDamageParams = {
          baseDamage,
          bonusDamageSum: input.bonusDamageSum,
          crit: {
            critRate: input.critRate,
            critDamage: input.critDamage,
          },
          defense: defenseParams,
          resistance: resistanceParams,
          vulnerability: vulnerabilityParams,
          dazeVulnerability: dazeParams,
          specialMultiplier: input.specialMultiplier,
        }
        expected = calcNormalDamage(params)
        crit = calcNormalDamageCrit(params)
        noCrit = calcNormalDamageNoCrit(params)
        break
      }

      case "sheer": {
        const baseDamage =
          (input.attack ?? 0) * parseMultiplier(input.skillMultiplier)
        const params: SheerDamageParams = {
          baseDamage,
          bonusDamageSum: input.bonusDamageSum,
          crit: {
            critRate: input.critRate,
            critDamage: input.critDamage,
          },
          sheerBonusSum: input.sheerBonusSum ?? 0,
          resistance: resistanceParams,
          vulnerability: vulnerabilityParams,
          dazeVulnerability: dazeParams,
          specialMultiplier: input.specialMultiplier,
        }
        expected = calcSheerDamage(params)
        crit = calcSheerDamageCrit(params)
        noCrit = calcSheerDamageNoCrit(params)
        break
      }

      case "anomaly": {
        const params: AnomalyDamageParams = {
          virtualAgentLevel: input.virtualAgentLevel ?? 60,
          virtualAgentAttack: input.virtualAgentAttack ?? 0,
          virtualAgentAnomalyProficiency:
            input.virtualAgentAnomalyProficiency ?? 0,
          damageMultiplier: input.damageMultiplier ?? 0,
          bonusDamageSum: input.bonusDamageSum,
          defense: defenseParams,
          resistance: resistanceParams,
          vulnerability: vulnerabilityParams,
          dazeVulnerability: dazeParams,
          anomalyBonusDamageSum: input.anomalyBonusDamageSum,
          anomalyCritRate: input.anomalyCritRate,
          anomalyCritDamage: input.anomalyCritDamage,
        }
        expected = calcAnomalyDamage(params)
        crit = calcAnomalyDamageCrit(params)
        noCrit = calcAnomalyDamageNoCrit(params)
        break
      }

      case "disorder": {
        const params: DisorderDamageParams = {
          virtualAgentLevel: input.virtualAgentLevel ?? 60,
          virtualAgentAttack: input.virtualAgentAttack ?? 0,
          virtualAgentAnomalyProficiency:
            input.virtualAgentAnomalyProficiency ?? 0,
          anomalyType: (input.anomalyType ?? "fire") as AnomalyType,
          remainingTime: input.remainingTime ?? 0,
          bonusDamageSum: input.bonusDamageSum,
          defense: defenseParams,
          resistance: resistanceParams,
          vulnerability: vulnerabilityParams,
          dazeVulnerability: dazeParams,
          anomalyBonusDamageSum: input.anomalyBonusDamageSum,
          anomalyCritRate: input.anomalyCritRate,
          anomalyCritDamage: input.anomalyCritDamage,
        }
        expected = calcDisorderDamage(params)
        crit = calcDisorderDamageCrit(params)
        noCrit = calcDisorderDamageNoCrit(params)
        break
      }
    }

    return {
      expected: {
        total: Math.round(expected.total),
        breakdown: expected.breakdown,
      },
      crit: {
        total: Math.round(crit.total),
        breakdown: crit.breakdown,
      },
      noCrit: {
        total: Math.round(noCrit.total),
        breakdown: noCrit.breakdown,
      },
    }
  },
})
