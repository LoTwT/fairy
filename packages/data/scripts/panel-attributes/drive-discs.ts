import type {
  PanelAttributeBonus,
  SDriveDiscMaxLevelAffixes,
} from "../../src/attributes/types.ts"

/** 固定版本的主、副词条数值；生成入口验证原始两份 TS 文件的摘要。 */
export function sDriveDiscMaxLevelAffixes(): SDriveDiscMaxLevelAffixes {
  const attack: PanelAttributeBonus = {
    attribute: "attack",
    operation: "initial-percentage",
    unit: "ratio",
    value: 0.3,
  }
  const health: PanelAttributeBonus = {
    attribute: "health",
    operation: "initial-percentage",
    unit: "ratio",
    value: 0.3,
  }
  const defense: PanelAttributeBonus = {
    attribute: "defense",
    operation: "initial-percentage",
    unit: "ratio",
    value: 0.48,
  }
  return {
    schemaVersion: 1,
    rarity: "S",
    enhancement: "maximum",
    mainStatsBySlot: {
      1: [
        {
          attribute: "health",
          operation: "initial-fixed",
          unit: "health-points",
          value: 2200,
        },
      ],
      2: [
        {
          attribute: "attack",
          operation: "initial-fixed",
          unit: "attack-points",
          value: 316,
        },
      ],
      3: [
        {
          attribute: "defense",
          operation: "initial-fixed",
          unit: "defense-points",
          value: 184,
        },
      ],
      4: [
        {
          attribute: "criticalDamage",
          operation: "ratio-add",
          unit: "ratio",
          value: 0.48,
        },
        {
          attribute: "criticalRate",
          operation: "ratio-add",
          unit: "ratio",
          value: 0.24,
        },
        attack,
        health,
        {
          attribute: "anomalyProficiency",
          operation: "initial-fixed",
          unit: "anomaly-proficiency-points",
          value: 92,
        },
        defense,
      ],
      5: [
        attack,
        health,
        defense,
        {
          attribute: "penetrationRatio",
          operation: "ratio-add",
          unit: "ratio",
          value: 0.24,
        },
        ...(["physical", "fire", "ice", "electric", "ether"] as const).map(
          (element) => ({
            attribute: "damageBonus" as const,
            operation: "damage-bonus" as const,
            element,
            unit: "ratio" as const,
            value: 0.3,
          }),
        ),
      ],
      6: [
        attack,
        health,
        defense,
        {
          attribute: "anomalyMastery",
          operation: "initial-percentage",
          unit: "ratio",
          value: 0.3,
        },
        {
          attribute: "impact",
          operation: "initial-percentage",
          unit: "ratio",
          value: 0.18,
        },
        {
          attribute: "energyRegen",
          operation: "initial-percentage",
          unit: "ratio",
          value: 0.6,
        },
      ],
    },
    substatsPerRoll: [
      {
        attribute: "health",
        operation: "initial-fixed",
        unit: "health-points",
        value: 112,
      },
      { ...health, value: 0.03 },
      {
        attribute: "attack",
        operation: "initial-fixed",
        unit: "attack-points",
        value: 19,
      },
      { ...attack, value: 0.03 },
      {
        attribute: "defense",
        operation: "initial-fixed",
        unit: "defense-points",
        value: 15,
      },
      { ...defense, value: 0.048 },
      {
        attribute: "penetrationValue",
        operation: "initial-fixed",
        unit: "defense-points",
        value: 9,
      },
      {
        attribute: "criticalRate",
        operation: "ratio-add",
        unit: "ratio",
        value: 0.024,
      },
      {
        attribute: "criticalDamage",
        operation: "ratio-add",
        unit: "ratio",
        value: 0.048,
      },
      {
        attribute: "anomalyProficiency",
        operation: "initial-fixed",
        unit: "anomaly-proficiency-points",
        value: 9,
      },
    ],
  }
}
