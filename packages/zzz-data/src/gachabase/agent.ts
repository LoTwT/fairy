// Agent stat calculation formula — verified against gachabase.net
//
// Data source: data/crawl/{lang}/gachabase/agent-details.json
//
// Both promotionBoost and coreSkillBoost store cumulative values per level.
// Pass the boost value from the CURRENT unlocked level directly (do NOT sum across levels).

export type AgentBaseStatValue = number

export type AgentStatGrowthPerLevel = number

export type AgentLevel = number

export type AgentPromotionBoost = number

export type AgentCoreSkillBoost = number

export type AgentCalculatedStatValue = number

/**
 * Calculate an Agent base stat at a given level with promotion and core skill boosts.
 *
 * Formula: floor(value + growthPerLevel × (level − 1)) + promotionBoost + coreSkillBoost
 *
 * @param value - stats[i].value (lv1 base, already divided by divisor)
 * @param growthPerLevel - stats[i].growthPerLevel (already divided by divisor)
 * @param level - agent level (1–60)
 * @param promotionBoost - promotions[currentPromotion].statBoosts[statId].value (cumulative, take current level directly)
 * @param coreSkillBoost - coreSkills[currentLevel].statBoosts[statId].value (cumulative, take current level directly)
 */
export function calcAgentStat(
  value: AgentBaseStatValue,
  growthPerLevel: AgentStatGrowthPerLevel,
  level: AgentLevel,
  promotionBoost: AgentPromotionBoost,
  coreSkillBoost: AgentCoreSkillBoost,
): AgentCalculatedStatValue {
  return (
    Math.floor(value + growthPerLevel * (level - 1)) +
    promotionBoost +
    coreSkillBoost
  )
}
