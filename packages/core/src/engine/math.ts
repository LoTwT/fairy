export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

export function getLevelBase(level: number): number {
  if (level >= 60)
    return 794

  const table: Record<number, number> = {
    1: 50,
    2: 54,
    3: 58,
    4: 62,
    5: 66,
    6: 71,
    7: 76,
    8: 82,
    9: 88,
    10: 94,
    11: 100,
    12: 107,
    13: 114,
    14: 121,
    15: 129,
    16: 137,
    17: 145,
    18: 153,
    19: 162,
    20: 172,
    21: 181,
    22: 191,
    23: 201,
    24: 211,
    25: 222,
    26: 233,
    27: 245,
    28: 256,
    29: 268,
    30: 281,
    31: 293,
    32: 306,
    33: 319,
    34: 333,
    35: 347,
    36: 361,
    37: 375,
    38: 390,
    39: 405,
    40: 421,
    41: 436,
    42: 452,
    43: 469,
    44: 485,
    45: 502,
    46: 519,
    47: 537,
    48: 555,
    49: 573,
    50: 592,
    51: 610,
    52: 629,
    53: 649,
    54: 669,
    55: 689,
    56: 709,
    57: 730,
    58: 751,
    59: 772,
  }

  return table[level] ?? 794
}

export function getDefaultEnemyBaseDefense(level: number, rank: string): number {
  const levelBase = getLevelBase(level)
  const baseDefenseAtLevelOne = rank === "boss"
    ? 60
    : rank === "elite"
      ? 50
      : rank === "special"
        ? 60
        : 40

  return (baseDefenseAtLevelOne / 50) * levelBase
}
