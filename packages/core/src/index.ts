export interface CalculationResult {
  damage: number
}

export function calculate(): CalculationResult {
  return {
    damage: 0,
  }
}
