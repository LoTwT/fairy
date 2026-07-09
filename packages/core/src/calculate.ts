import { resolveBuckets } from "./resolve-buckets"
import type { CalculationInput, CalculationResult } from "./types"

export function calculate(input: CalculationInput): CalculationResult {
  const resolved = resolveBuckets(input)

  if (!resolved.ok) {
    return {
      ok: false,
      formulaId: resolved.formulaId,
      error: resolved.error,
      warnings: resolved.warnings,
      buckets: resolved.buckets,
      trace: resolved.trace,
    }
  }

  const value = resolved.buckets.reduce(
    (total, bucket) => total * bucket.value,
    1,
  )

  return {
    ok: true,
    formulaId: resolved.formulaSpec.formulaId,
    value,
    buckets: resolved.breakdown,
    warnings: resolved.warnings,
    trace: resolved.trace,
  }
}
