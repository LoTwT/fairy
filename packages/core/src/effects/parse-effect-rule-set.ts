import type { Result, RuleSet } from "./types.ts"
import { IssueCollector, failure } from "./internal/issues.ts"
import { validatePendingModifications } from "./internal/modification.ts"
import { validateRuleSetStructure } from "./internal/rule.ts"
import type { Unit } from "./types.ts"

/**
 * 在 JSON 消费边界解析并校验规则集。
 *
 * 校验结构、判别联合、必填字段、单位、档位、引用与跨字段上下文限制；
 * 无效定义即使未被任何绑定启用也在此报告。解析不代替 `prepareEffects`
 * 对实际绑定、配置选择与来源归属的检查。
 */
export function parseEffectRuleSet(input: unknown): Result<RuleSet> {
  const collector = new IssueCollector()
  const validated = validateRuleSetStructure(input, collector)
  if (validated !== undefined) {
    const stateParameterUnits = new Map<string, ReadonlyMap<string, Unit>>()
    for (const [stateId, stateEntry] of validated.statesById) {
      const units = new Map<string, Unit>()
      const rawParameters = stateEntry["parameters"]
      if (typeof rawParameters === "object" && rawParameters !== null) {
        for (const [name, parameter] of Object.entries(
          rawParameters as Record<string, unknown>,
        )) {
          const unit = (parameter as { unit?: unknown })["unit"]
          if (typeof unit === "string") {
            units.set(name, unit as Unit)
          }
        }
      }
      stateParameterUnits.set(stateId, units)
    }
    validatePendingModifications(
      validated,
      validated.entriesByEffectId,
      stateParameterUnits,
      validated.knownStates,
      validated.knownActions,
      collector,
    )
  }
  if (validated === undefined || !collector.isEmpty) {
    return failure(collector)
  }
  return { ok: true, value: validated.ruleSet }
}
