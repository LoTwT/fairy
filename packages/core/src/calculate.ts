import { resolveBuckets } from "./resolve-buckets"
import { trustedIsFiniteNumber } from "./trusted-intrinsics"
import { invalidCalculationResult } from "./warnings"
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

  let value = 1
  for (let index = 0; index < resolved.buckets.length; index += 1) {
    value *= resolved.buckets[index]!.value
  }

  if (!trustedIsFiniteNumber(value)) {
    return {
      ok: false,
      formulaId: resolved.formulaSpec.formulaId,
      error: invalidCalculationResult(),
      warnings: resolved.warnings,
      buckets: resolved.breakdown,
      trace: resolved.trace,
    }
  }

  return {
    ok: true,
    formulaId: resolved.formulaSpec.formulaId,
    value,
    buckets: resolved.breakdown,
    warnings: resolved.warnings,
    trace: resolved.trace,
  }
}
