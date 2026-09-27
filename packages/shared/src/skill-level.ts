import type {
  ResolvedSkillLevel,
  SkillLevelGroup,
  SkillLevelInput,
} from "./skills.ts"

/** 代理人技能等级加成表的最小结构；来自 AgentActions.skillLevelBonuses。 */
export interface SkillLevelBonusEntry {
  readonly minimumMindscapeRank: number
  readonly bonus: number
  readonly groups: readonly SkillLevelGroup[]
}

const SKILL_LEVEL_GROUPS: readonly SkillLevelGroup[] = [
  "basic",
  "dodge",
  "assist",
  "special",
  "chain",
]

function requireInteger(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum)
    throw new RangeError(
      `${label} must be an integer within ${minimum}–${maximum}`,
    )
}

/**
 * 纯技能等级解析：trained 是玩家培养等级（1—12），effective 是已含影画提升的最终等级。
 * M3/M5 等影画加级规则完全由来源角色的 skillLevelBonuses 提供，本函数不硬编码任何加级规则；
 * data 的公开 resolveAgentSkillLevel 与 core 的完整静态入口共用本实现。
 */
export function resolveAgentSkillLevelFromBonuses(input: {
  readonly skillLevelBonuses: readonly SkillLevelBonusEntry[]
  readonly group: SkillLevelGroup
  readonly mindscapeRank: number
  readonly level: SkillLevelInput
}): ResolvedSkillLevel {
  requireInteger(input.mindscapeRank, 0, 6, "Mindscape rank")
  if (!SKILL_LEVEL_GROUPS.includes(input.group))
    throw new TypeError("Unknown skill level group")
  if (input.level?.mode !== "trained" && input.level?.mode !== "effective")
    throw new TypeError("Skill level mode must be trained or effective")
  let bonus = 0
  for (const entry of input.skillLevelBonuses) {
    requireInteger(
      entry.minimumMindscapeRank,
      1,
      6,
      "Skill bonus mindscape rank",
    )
    requireInteger(entry.bonus, 1, 4, "Skill level bonus")
    if (
      input.mindscapeRank >= entry.minimumMindscapeRank &&
      entry.groups.includes(input.group)
    )
      bonus += entry.bonus
  }
  requireInteger(bonus, 0, 4, "Total skill level bonus")
  const minimum = input.level.mode === "trained" ? 1 : 1 + bonus
  const maximum = input.level.mode === "trained" ? 12 : 12 + bonus
  requireInteger(input.level.value, minimum, maximum, "Skill level")
  const trained =
    input.level.mode === "trained"
      ? input.level.value
      : input.level.value - bonus
  return { trained, bonus, effective: trained + bonus }
}
