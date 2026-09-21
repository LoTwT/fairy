import type {
  BindingId,
  Condition,
  ContributionRule,
  EffectId,
  EffectRule,
  EntityId,
  InstantRule,
  ModificationRule,
  NumericExpression,
  PreparedEffects,
  Quantity,
  RuleSet,
  SourceBinding,
  StateId,
  Unit,
} from "../types.ts"
import { IssueCollector, failure } from "./issues.ts"
import { validatePendingModifications } from "./modification.ts"
import { validateRuleSetStructure, validateSourceBindings } from "./rule.ts"

/** 配置阶段数值求值：字面量、参数、配置数字与算术组合。 */
export function evaluateConfigurationExpression(
  expression: NumericExpression<Unit, "configuration">,
  parameters: ReadonlyMap<string, Quantity<Unit>>,
  configuration: Readonly<Record<string, number>>,
): number {
  switch (expression.kind) {
    case "literal":
      return expression.value
    case "parameter":
      return parameters.get(expression.name)?.value ?? 0
    case "configuration-number":
      return configuration[expression.field] ?? 0
    case "add":
      return expression.operands.reduce(
        (sum, operand) =>
          sum +
          evaluateConfigurationExpression(operand, parameters, configuration),
        0,
      )
    case "minimum":
      return Math.min(
        ...expression.operands.map((operand) =>
          evaluateConfigurationExpression(operand, parameters, configuration),
        ),
      )
    case "maximum":
      return Math.max(
        ...expression.operands.map((operand) =>
          evaluateConfigurationExpression(operand, parameters, configuration),
        ),
      )
    case "multiply":
      return (
        evaluateConfigurationExpression(
          expression.value,
          parameters,
          configuration,
        ) *
        evaluateConfigurationExpression(
          expression.coefficient,
          parameters,
          configuration,
        )
      )
  }
}

export function evaluateConfigurationCondition(
  condition: Condition<"configuration">,
  parameters: ReadonlyMap<string, Quantity<Unit>>,
  configuration: Readonly<Record<string, number>>,
): boolean {
  switch (condition.kind) {
    case "constant":
      return condition.value
    case "all":
      for (const entry of condition.conditions) {
        if (!evaluateConfigurationCondition(entry, parameters, configuration)) {
          return false
        }
      }
      return true
    case "any":
      for (const entry of condition.conditions) {
        if (evaluateConfigurationCondition(entry, parameters, configuration)) {
          return true
        }
      }
      return false
    case "not":
      return !evaluateConfigurationCondition(
        condition.condition,
        parameters,
        configuration,
      )
    case "compare-number": {
      const left = evaluateConfigurationExpression(
        condition.left,
        parameters,
        configuration,
      )
      const right = evaluateConfigurationExpression(
        condition.right,
        parameters,
        configuration,
      )
      switch (condition.operator) {
        case "eq":
          return left === right
        case "neq":
          return left !== right
        case "lt":
          return left < right
        case "lte":
          return left <= right
        case "gt":
          return left > right
        case "gte":
          return left >= right
      }
    }
  }
}

/** 按绑定配置选择参数档位；by-rank 用实际档位作键，不做数组索引推断。 */
export function resolveParameters(
  parameters: Readonly<
    Record<
      string,
      | {
          readonly kind: "constant"
          readonly unit: Unit
          readonly value: number
        }
      | {
          readonly kind: "by-rank"
          readonly unit: Unit
          readonly rank: string
          readonly values: Readonly<Record<string, number>>
        }
    >
  >,
  configuration: Readonly<Record<string, number>>,
): Map<string, Quantity<Unit>> {
  const resolved = new Map<string, Quantity<Unit>>()
  for (const [name, parameter] of Object.entries(parameters)) {
    if (parameter.kind === "constant") {
      resolved.set(name, { unit: parameter.unit, value: parameter.value })
      continue
    }
    const rankValue = configuration[parameter.rank]
    if (rankValue === undefined) {
      throw new Error(
        `Binding configuration does not provide rank field "${parameter.rank}" required by parameter "${name}"`,
      )
    }
    const value = parameter.values[String(rankValue)]
    if (value === undefined) {
      throw new Error(
        `Parameter "${name}" has no value for rank tier ${String(rankValue)}`,
      )
    }
    resolved.set(name, { unit: parameter.unit, value })
  }
  return resolved
}

/** 数值变换：set → add → scale，公式为 (set 或原值 + Σadd) × Πscale。 */
export interface NumericTransform {
  readonly set: number | undefined
  readonly addSum: number
  readonly scaleProduct: number
}

export interface PreparedRuleEntry {
  readonly rule: EffectRule
  readonly bindingId: BindingId
  readonly holderId: EntityId
  readonly resolvedParameters: ReadonlyMap<string, Quantity<Unit>>
}

export interface PreparedContributionEntry extends PreparedRuleEntry {
  readonly rule: ContributionRule
  readonly foldedParameters: ReadonlyMap<string, Quantity<Unit>>
  readonly outputAddSum: number
  readonly outputScaleProduct: number
  readonly durationTransform: NumericTransform | undefined
  readonly extensionMaximumTransform: NumericTransform | undefined
  readonly appliedModificationIds: readonly EffectId[]
}

export interface PreparedInstantEntry extends PreparedRuleEntry {
  readonly rule: InstantRule
}

export interface PreparedModificationEntry extends PreparedRuleEntry {
  readonly rule: ModificationRule
}

export interface PreparedStateParameters {
  readonly stateId: StateId
  readonly bindingId: BindingId
  readonly parameters: Readonly<Record<string, Quantity<Unit>>>
}

/** PreparedEffects 的引擎内部数据；不进入公开类型，品牌之外的实施细节。 */
export interface PreparedEffectsInternal {
  readonly ruleSet: RuleSet
  readonly bindings: readonly SourceBinding[]
  readonly contributions: readonly PreparedContributionEntry[]
  readonly instants: readonly PreparedInstantEntry[]
  readonly modifications: readonly PreparedModificationEntry[]
  readonly stateParameters: readonly PreparedStateParameters[]
}

interface ActiveRule {
  readonly rule: EffectRule
  readonly binding: SourceBinding
  readonly parameters: ReadonlyMap<string, Quantity<Unit>>
}

interface ParameterFold {
  readonly setValues: Map<string, number>
  readonly addSums: Map<string, number>
  readonly scaleProducts: Map<string, number>
}

interface EffectFold {
  readonly parameters: ParameterFold
  readonly outputAdds: number[]
  readonly outputScales: number[]
  readonly duration: {
    set: number | undefined
    adds: number[]
    scales: number[]
  }
  readonly extensionMaximum: {
    set: number | undefined
    adds: number[]
    scales: number[]
  }
  readonly appliedIds: string[]
}

function emptyParameterFold(): ParameterFold {
  return {
    setValues: new Map<string, number>(),
    addSums: new Map<string, number>(),
    scaleProducts: new Map<string, number>(),
  }
}

function deepFreeze(value: unknown): void {
  if (typeof value !== "object" || value === null) {
    return
  }
  if (Object.isFrozen(value)) {
    return
  }
  Object.freeze(value)
  if (Array.isArray(value)) {
    for (const entry of value) {
      deepFreeze(entry)
    }
    return
  }
  for (const nested of Object.values(value)) {
    deepFreeze(nested)
  }
}

export function prepareEffects(
  definitions: RuleSet,
  bindings: readonly SourceBinding[],
):
  | { readonly ok: true; readonly value: PreparedEffects }
  | ReturnType<typeof failure> {
  const collector = new IssueCollector()
  const validated = validateRuleSetStructure(definitions, collector)
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
  const validatedBindings = validateSourceBindings(bindings, collector)
  if (
    validated === undefined ||
    validatedBindings === undefined ||
    !collector.isEmpty
  ) {
    return failure(collector)
  }

  // 引擎自有副本：冻结准备结果之前先与调用方对象脱钩，
  // 调用方随后修改原始定义或绑定配置不得影响已经生成的准备结果。
  const ownedRuleSet = structuredClone(validated.ruleSet)
  const ownedBindings = validatedBindings.map((binding) =>
    structuredClone(binding),
  )

  const activeRulesByBinding = new Map<BindingId, readonly ActiveRule[]>()
  for (const binding of ownedBindings) {
    if (!binding.eligible) {
      continue
    }
    const matched: ActiveRule[] = []
    for (const rule of ownedRuleSet.effects) {
      if (
        rule.source.identity.kind !== binding.kind ||
        rule.source.identity.entityId !== binding.sourceEntityId
      ) {
        continue
      }
      const resolved = resolveParameters(
        rule.parameters as never,
        binding.configuration as Readonly<Record<string, number>>,
      )
      if (
        !evaluateConfigurationCondition(
          rule.config,
          resolved,
          binding.configuration as Readonly<Record<string, number>>,
        )
      ) {
        continue
      }
      matched.push({ rule, binding, parameters: resolved })
    }
    activeRulesByBinding.set(binding.bindingId, matched)
  }

  const rulesByEffectId = new Map<string, EffectRule>()
  for (const rule of ownedRuleSet.effects) {
    rulesByEffectId.set(rule.effectId, rule)
  }

  // 每个持有者激活的配置阶段修改；操作数在修改前的上下文一次性求出。
  interface FoldedModification {
    readonly rule: ModificationRule
    readonly holderId: EntityId
    readonly targetEffectId: string | undefined
    readonly targetStateId: string | undefined
    readonly operands: readonly {
      readonly field: string
      readonly name?: string
      readonly operator: string
      readonly value: number
    }[]
  }
  const foldedModifications: FoldedModification[] = []
  for (const [bindingId, rules] of activeRulesByBinding) {
    const binding = ownedBindings.find((entry) => entry.bindingId === bindingId)
    if (binding === undefined) {
      continue
    }
    for (const active of rules) {
      if (active.rule.kind !== "modification") {
        continue
      }
      if (active.rule.phase !== "configuration") {
        continue
      }
      const modifications = active.rule.modifications as readonly {
        readonly field: string
        readonly name?: string
        readonly change: {
          readonly operator: "set" | "add" | "scale"
          readonly value: NumericExpression<Unit, "configuration">
        }
      }[]
      const operands = modifications.map((change) => ({
        field: change.field,
        ...(change.name === undefined ? {} : { name: change.name }),
        operator: change.change.operator,
        value: evaluateConfigurationExpression(
          change.change.value,
          active.parameters,
          binding.configuration as Readonly<Record<string, number>>,
        ),
      }))
      foldedModifications.push({
        rule: active.rule,
        holderId: binding.holderId,
        targetEffectId:
          active.rule.target.kind === "effect"
            ? active.rule.target.effectId
            : undefined,
        targetStateId:
          active.rule.target.kind === "state"
            ? active.rule.target.stateId
            : undefined,
        operands,
      })
    }
  }
  foldedModifications.sort((left, right) =>
    left.rule.effectId < right.rule.effectId ? -1 : 1,
  )

  const effectFolds = new Map<string, EffectFold>()
  const stateFolds = new Map<string, ParameterFold>()
  const targetPointer = (effectId: string): string => {
    const index = ownedRuleSet.effects.findIndex(
      (rule) => rule.effectId === effectId,
    )
    return index < 0 ? "" : `/effects/${index}/parameters`
  }

  for (const folded of foldedModifications) {
    if (folded.targetEffectId !== undefined) {
      const targetRule = rulesByEffectId.get(folded.targetEffectId)
      if (targetRule === undefined) {
        continue
      }
      const targetBound = ownedBindings.some(
        (entry) =>
          entry.holderId === folded.holderId &&
          entry.kind === targetRule.source.identity.kind &&
          entry.sourceEntityId === targetRule.source.identity.entityId,
      )
      if (!targetBound) {
        collector.report(
          "INVALID_MODIFICATION",
          targetPointer(folded.targetEffectId),
          `Modification "${folded.rule.effectId}" is active for holder "${folded.holderId}" but target "${folded.targetEffectId}" is not bound for the same holder`,
          { effectId: folded.rule.effectId as EffectId },
        )
        continue
      }
      const key = `${folded.holderId}\u0000${folded.targetEffectId}`
      const fold = effectFolds.get(key) ?? {
        parameters: emptyParameterFold(),
        outputAdds: [],
        outputScales: [],
        duration: { set: undefined, adds: [], scales: [] },
        extensionMaximum: { set: undefined, adds: [], scales: [] },
        appliedIds: [],
      }
      for (const operand of folded.operands) {
        if (operand.field === "parameter") {
          applyParameterOperand(
            fold.parameters,
            operand.name ?? "",
            operand.operator,
            operand.value,
            folded.rule.effectId,
            collector,
            `${targetPointer(folded.targetEffectId)}/${operand.name ?? ""}`,
          )
        } else if (operand.field === "output") {
          if (operand.operator === "add") {
            fold.outputAdds.push(operand.value)
          } else if (operand.operator === "scale") {
            fold.outputScales.push(operand.value)
          }
        } else if (operand.field === "duration-seconds") {
          applyTimingOperand(
            fold.duration,
            operand.operator,
            operand.value,
            folded.rule.effectId,
            collector,
            `${targetPointer(folded.targetEffectId)}/activation/lifetime/seconds`,
          )
        } else if (operand.field === "extension-maximum") {
          applyTimingOperand(
            fold.extensionMaximum,
            operand.operator,
            operand.value,
            folded.rule.effectId,
            collector,
            `${targetPointer(folded.targetEffectId)}/activation/lifetime/onRetrigger/limit/maximum`,
          )
        }
      }
      if (!fold.appliedIds.includes(folded.rule.effectId)) {
        fold.appliedIds.push(folded.rule.effectId)
      }
      effectFolds.set(key, fold)
      continue
    }
    if (folded.targetStateId !== undefined) {
      const stateEntry = validated.statesById.get(folded.targetStateId)
      if (stateEntry === undefined) {
        continue
      }
      const stateSource = (
        stateEntry["source"] as {
          identity: { kind: string; entityId: string }
        }
      )["identity"]
      const stateBound = ownedBindings.some(
        (entry) =>
          entry.holderId === folded.holderId &&
          entry.kind === stateSource.kind &&
          entry.sourceEntityId === stateSource.entityId,
      )
      if (!stateBound) {
        continue
      }
      const key = `${folded.holderId}\u0000${folded.targetStateId}`
      const fold = stateFolds.get(key) ?? emptyParameterFold()
      for (const operand of folded.operands) {
        if (operand.field !== "parameter") {
          continue
        }
        applyParameterOperand(
          fold,
          operand.name ?? "",
          operand.operator,
          operand.value,
          folded.rule.effectId,
          collector,
          `/states/${folded.targetStateId}/parameters/${operand.name ?? ""}`,
        )
      }
      stateFolds.set(key, fold)
    }
  }

  if (!collector.isEmpty) {
    return failure(collector)
  }

  const contributions: PreparedContributionEntry[] = []
  const instants: PreparedInstantEntry[] = []
  const modifications: PreparedModificationEntry[] = []
  for (const [bindingId, rules] of activeRulesByBinding) {
    const binding = ownedBindings.find((entry) => entry.bindingId === bindingId)
    if (binding === undefined) {
      continue
    }
    for (const active of rules) {
      if (active.rule.kind === "contribution") {
        const fold = effectFolds.get(
          `${binding.holderId}\u0000${active.rule.effectId}`,
        )
        const foldedParameters = new Map(active.parameters)
        if (fold !== undefined && fold.appliedIds.length > 0) {
          for (const [name, quantity] of active.parameters) {
            const set = fold.parameters.setValues.get(name)
            const addSum = fold.parameters.addSums.get(name) ?? 0
            const scaleProduct = fold.parameters.scaleProducts.get(name) ?? 1
            foldedParameters.set(name, {
              unit: quantity.unit,
              value: ((set ?? quantity.value) + addSum) * scaleProduct,
            })
          }
        }
        contributions.push({
          rule: active.rule,
          bindingId,
          holderId: binding.holderId,
          resolvedParameters: active.parameters,
          foldedParameters,
          outputAddSum:
            fold === undefined
              ? 0
              : fold.outputAdds.reduce((sum, value) => sum + value, 0),
          outputScaleProduct:
            fold === undefined
              ? 1
              : fold.outputScales.reduce(
                  (product, value) => product * value,
                  1,
                ),
          durationTransform:
            fold === undefined || fold.appliedIds.length === 0
              ? undefined
              : fold.duration.set === undefined &&
                  fold.duration.adds.length === 0 &&
                  fold.duration.scales.length === 0
                ? undefined
                : {
                    set: fold.duration.set,
                    addSum: fold.duration.adds.reduce(
                      (sum, value) => sum + value,
                      0,
                    ),
                    scaleProduct: fold.duration.scales.reduce(
                      (product, value) => product * value,
                      1,
                    ),
                  },
          extensionMaximumTransform:
            fold === undefined || fold.appliedIds.length === 0
              ? undefined
              : fold.extensionMaximum.set === undefined &&
                  fold.extensionMaximum.adds.length === 0 &&
                  fold.extensionMaximum.scales.length === 0
                ? undefined
                : {
                    set: fold.extensionMaximum.set,
                    addSum: fold.extensionMaximum.adds.reduce(
                      (sum, value) => sum + value,
                      0,
                    ),
                    scaleProduct: fold.extensionMaximum.scales.reduce(
                      (product, value) => product * value,
                      1,
                    ),
                  },
          appliedModificationIds:
            fold === undefined ? [] : ([...fold.appliedIds] as EffectId[]),
        })
        continue
      }
      if (active.rule.kind === "instant") {
        instants.push({
          rule: active.rule,
          bindingId,
          holderId: binding.holderId,
          resolvedParameters: active.parameters,
        })
        continue
      }
      if (active.rule.phase !== "configuration") {
        modifications.push({
          rule: active.rule,
          bindingId,
          holderId: binding.holderId,
          resolvedParameters: active.parameters,
        })
      }
    }
  }

  const stateParameters: PreparedStateParameters[] = []
  for (const state of ownedRuleSet.states) {
    const stateEntry = validated.statesById.get(state.stateId)
    if (stateEntry === undefined) {
      continue
    }
    const stateSource = (
      stateEntry["source"] as {
        identity: { kind: string; entityId: string }
      }
    )["identity"]
    for (const binding of ownedBindings) {
      if (
        !binding.eligible ||
        binding.kind !== stateSource.kind ||
        binding.sourceEntityId !== stateSource.entityId
      ) {
        continue
      }
      const resolved = resolveParameters(
        state.parameters as never,
        binding.configuration as Readonly<Record<string, number>>,
      )
      const fold = stateFolds.get(`${binding.holderId}\u0000${state.stateId}`)
      const parameters: Record<string, Quantity<Unit>> = {}
      for (const [name, quantity] of resolved) {
        if (fold === undefined) {
          parameters[name] = quantity
          continue
        }
        const set = fold.setValues.get(name)
        const addSum = fold.addSums.get(name) ?? 0
        const scaleProduct = fold.scaleProducts.get(name) ?? 1
        parameters[name] = {
          unit: quantity.unit,
          value: ((set ?? quantity.value) + addSum) * scaleProduct,
        }
      }
      stateParameters.push({
        stateId: state.stateId,
        bindingId: binding.bindingId,
        parameters,
      })
    }
  }

  const internal: PreparedEffectsInternal = {
    ruleSet: ownedRuleSet,
    bindings: ownedBindings,
    contributions,
    instants,
    modifications,
    stateParameters,
  }
  deepFreeze(internal)

  const prepared = {
    ruleSetId: validated.ruleSet.ruleSetId,
    revision: validated.ruleSet.revision,
    stateParameters: internal.stateParameters,
    internal,
  } as unknown as PreparedEffects
  Object.freeze(prepared)
  return { ok: true, value: prepared }
}

function applyParameterOperand(
  fold: ParameterFold,
  name: string,
  operator: string,
  value: number,
  modificationEffectId: string,
  collector: IssueCollector,
  pointer: string,
): void {
  if (operator === "set") {
    const existing = fold.setValues.get(name)
    if (existing !== undefined && existing !== value) {
      collector.report(
        "MODIFICATION_CONFLICT",
        pointer,
        `Different effective set values (${existing} and ${value}) target parameter "${name}"`,
        { effectId: modificationEffectId as EffectId },
      )
      return
    }
    fold.setValues.set(name, value)
    return
  }
  if (operator === "add") {
    fold.addSums.set(name, (fold.addSums.get(name) ?? 0) + value)
    return
  }
  fold.scaleProducts.set(name, (fold.scaleProducts.get(name) ?? 1) * value)
}

function applyTimingOperand(
  transform: { set: number | undefined; adds: number[]; scales: number[] },
  operator: string,
  value: number,
  modificationEffectId: string,
  collector: IssueCollector,
  pointer: string,
): void {
  if (operator === "set") {
    if (transform.set !== undefined && transform.set !== value) {
      collector.report(
        "MODIFICATION_CONFLICT",
        pointer,
        `Different effective set values (${transform.set} and ${value}) target a timing field`,
        { effectId: modificationEffectId as EffectId },
      )
      return
    }
    transform.set = value
    return
  }
  if (operator === "add") {
    transform.adds.push(value)
    return
  }
  transform.scales.push(value)
}

/** 读取 PreparedEffects 的内部数据；伪造对象没有内部结构时返回 undefined。 */
export function readPreparedInternal(
  prepared: PreparedEffects,
): PreparedEffectsInternal | undefined {
  const internal = (prepared as { internal?: unknown }).internal
  if (
    typeof internal !== "object" ||
    internal === null ||
    !("ruleSet" in internal && "contributions" in internal)
  ) {
    return undefined
  }
  return internal as PreparedEffectsInternal
}
