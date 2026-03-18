export function ceilDisplayDamage(value: number): number {
  return Math.ceil(value)
}

export function sumDisplayedSegments(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + Math.ceil(value), 0)
}
