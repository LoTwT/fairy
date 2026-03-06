// Bangboo stat calculation formula — verified against gachabase.net
//
// Data source: data/crawl/{lang}/gachabase-bangboo.json
//
// optimizationBoost stores cumulative values per optimization level.
// Pass the boost value from the CURRENT unlocked level directly (do NOT sum across levels).

/**
 * Calculate a Bangboo base stat at a given level with optimization boost.
 *
 * Formula: floor(value + (growthPerLevel ?? 0) × (level − 1)) + optimizationBoost
 *
 * @param value - baseStats[i].value (lv1 base, already divided by divisor)
 * @param growthPerLevel - baseStats[i].growthPerLevel (null for fixed stats like CRIT Rate)
 * @param level - bangboo level (1–60)
 * @param optimizationBoost - optimizations[currentLevel].statBoosts[statId].value (cumulative, take current level directly)
 */
export function calcBangbooStat(
  value: number,
  growthPerLevel: number | null,
  level: number,
  optimizationBoost: number,
): number {
  const growth = growthPerLevel ?? 0
  return Math.floor(value + growth * (level - 1)) + optimizationBoost
}
