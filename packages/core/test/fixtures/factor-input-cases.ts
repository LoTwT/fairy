/**
 * 数值因子共用的非法输入矩阵。
 *
 * 各因子文件保留自己的取整、上下界、累加顺序与非数字输入样本；这里只收敛
 * 语义完全相同的非有限值与溢出用例，避免新增边界时逐文件重复维护。
 */

/** 非有限输入：NaN 与正负无穷都必须以 RangeError 拒绝。 */
export const nonFiniteFactorInputs = [NaN, Infinity, -Infinity] as const

/** 输入和溢出：两侧同号的最大值累加必须拒绝，不能返回 Infinity。 */
export const overflowingFactorInputs = [
  [Number.MAX_VALUE, Number.MAX_VALUE],
  [-Number.MAX_VALUE, -Number.MAX_VALUE],
] as const
