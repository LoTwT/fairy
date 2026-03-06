// W-Engine stat calculation formulas — verified against gachabase.net
//
// Data sources (from data/crawl/{lang}/gachabase/):
//   gachabase-w-engines.json      — baseStat.value, advancedStat.value, effects
//   w-engine-details.json — levels[lv].baseStatGrowth, stars[star].baseStatGrowth/advancedStatGrowth

/**
 * Calculate W-Engine Base ATK at a given level and star (breakthrough count).
 *
 * Formula: baseVal + floor((lvGrowth + starGrowth) × baseVal / 10000)
 *
 * @param baseVal - baseStat.value from gachabase-w-engines.json (S-rank: 46/48/50, A-rank: 40/42)
 * @param lvBaseStatGrowth - levels[lv].baseStatGrowth from w-engine-details.json (lv 0–60)
 * @param starBaseStatGrowth - stars[star].baseStatGrowth from w-engine-details.json (star 0–5)
 */
export function calcWEngineBaseATK(
  baseVal: number,
  lvBaseStatGrowth: number,
  starBaseStatGrowth: number,
): number {
  return (
    baseVal +
    Math.floor(((lvBaseStatGrowth + starBaseStatGrowth) * baseVal) / 10000)
  )
}

/**
 * Calculate W-Engine secondary stat at a given star (breakthrough count).
 *
 * Formula: baseValue × (1 + advancedStatGrowth / 10000)
 *
 * The growth divisor is always 10000 regardless of stat type.
 * Percentage stats (AM, CRIT Rate, ATK%, …) are stored as decimals (e.g. 0.12 = 12%).
 * Integer stats (Anomaly Proficiency) are stored as integers (e.g. 36).
 *
 * @param baseValue - advancedStat.value from gachabase-w-engines.json
 * @param starAdvancedStatGrowth - stars[star].advancedStatGrowth from w-engine-details.json (star 0–5)
 */
export function calcWEngineSecondaryStat(
  baseValue: number,
  starAdvancedStatGrowth: number,
): number {
  return baseValue * (1 + starAdvancedStatGrowth / 10000)
}
