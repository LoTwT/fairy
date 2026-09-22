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

/**
 * 配置阶段数值归约：任何非有限中间结果都按定义失败处理。
 * NaN 表示上游已经报告的问题，不重复报告；其余非有限值在此报告。
 */
function requireFiniteConfigurationValue(
  value: number,
  collector: IssueCollector,
  description: string,
): number {
  if (Number.isFinite(value) || Number.isNaN(value)) {
    return value
  }
  collector.report(
    "INVALID_DEFINITION",
    "",
    `${description} is not a finite number`,
  )
  return Number.NaN
}

/**
 * 逐项算术归约：每一步都检查数值边界，不靠最终输出兜底。
 * 表达式节点与修改归约共用同一契约。
 */
function foldFiniteValues(
  values: readonly number[],
  identity: number,
  combine: (accumulated: number, value: number) => number,
  collector: IssueCollector,
  description: string,
): number {
  let accumulated = identity
  for (const value of values) {
    accumulated = requireFiniteConfigurationValue(
      combine(accumulated, value),
      collector,
      description,
    )
    if (!Number.isFinite(accumulated)) {
      return accumulated
    }
  }
  return accumulated
}

/** 配置阶段数值求值：字面量、参数、配置数字与算术组合。 */
export function evaluateConfigurationExpression(
  expression: NumericExpression<Unit, "configuration">,
  parameters: ReadonlyMap<string, Quantity<Unit>>,
  configuration: Readonly<Record<string, number>>,
  collector: IssueCollector,
): number {
  const evaluate = (operand: NumericExpression<Unit, "configuration">) =>
    evaluateConfigurationExpression(
      operand,
      parameters,
      configuration,
      collector,
    )
  switch (expression.kind) {
    case "literal":
      return expression.value
    case "parameter": {
      const parameter = parameters.get(expression.name)
      if (parameter === undefined) {
        collector.report(
          "MISSING_RANK",
          "",
          `Parameter "${expression.name}" has no value for the selected rank`,
        )
        return Number.NaN
      }
      return parameter.value
    }
    case "configuration-number":
      return configuration[expression.field] ?? 0
    case "add":
      return foldFiniteValues(
        expression.operands.map(evaluate),
        0,
        (sum, operand) => sum + operand,
        collector,
        "A configuration-stage sum",
      )
    case "minimum":
      return foldFiniteValues(
        expression.operands.map(evaluate),
        Number.POSITIVE_INFINITY,
        (lowest, operand) => Math.min(lowest, operand),
        collector,
        "A configuration-stage minimum",
      )
    case "maximum":
      return foldFiniteValues(
        expression.operands.map(evaluate),
        Number.NEGATIVE_INFINITY,
        (highest, operand) => Math.max(highest, operand),
        collector,
        "A configuration-stage maximum",
      )
    case "multiply":
      return foldFiniteValues(
        [evaluate(expression.value), evaluate(expression.coefficient)],
        1,
        (product, operand) => product * operand,
        collector,
        "A configuration-stage product",
      )
    case "convert":
      return foldFiniteValues(
        [evaluate(expression.input), evaluate(expression.rate)],
        1,
        (product, operand) => product * operand,
        collector,
        "A configuration-stage conversion",
      )
  }
}

export function evaluateConfigurationCondition(
  condition: Condition<"configuration">,
  parameters: ReadonlyMap<string, Quantity<Unit>>,
  configuration: Readonly<Record<string, number>>,
  collector: IssueCollector,
): boolean {
  switch (condition.kind) {
    case "constant":
      return condition.value
    case "all":
      for (const entry of condition.conditions) {
        if (
          !evaluateConfigurationCondition(
            entry,
            parameters,
            configuration,
            collector,
          )
        ) {
          return false
        }
      }
      return true
    case "any":
      for (const entry of condition.conditions) {
        if (
          evaluateConfigurationCondition(
            entry,
            parameters,
            configuration,
            collector,
          )
        ) {
          return true
        }
      }
      return false
    case "not":
      return !evaluateConfigurationCondition(
        condition.condition,
        parameters,
        configuration,
        collector,
      )
    case "compare-number": {
      const left = requireFiniteConfigurationValue(
        evaluateConfigurationExpression(
          condition.left,
          parameters,
          configuration,
          collector,
        ),
        collector,
        "A compared configuration operand",
      )
      const right = requireFiniteConfigurationValue(
        evaluateConfigurationExpression(
          condition.right,
          parameters,
          configuration,
          collector,
        ),
        collector,
        "A compared configuration operand",
      )
      if (!Number.isFinite(left) || !Number.isFinite(right)) {
        return false
      }
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
    if (rankValue === undefined) continue
    const value = parameter.values[String(rankValue)]
    if (value === undefined) {
      continue
    }
    resolved.set(name, { unit: parameter.unit, value })
  }
  return resolved
}

function reportMissingRanks(
  parameters: Readonly<Record<string, import("../types.ts").AnyParameter>>,
  configuration: Readonly<Record<string, number>>,
  collector: IssueCollector,
  pointer: string,
  identity: { readonly bindingId: BindingId; readonly effectId?: EffectId },
): void {
  for (const [name, parameter] of Object.entries(parameters)) {
    if (parameter.kind === "constant") continue
    const tier = configuration[parameter.rank]
    if (
      (parameter.values as Readonly<Record<string, number>>)[String(tier)] ===
      undefined
    ) {
      const key = name.replaceAll("~", "~0").replaceAll("/", "~1")
      collector.report(
        "MISSING_RANK",
        `${pointer}/${key}/values/${String(tier)}`,
        `Parameter "${name}" has no confirmed value for ${parameter.rank} ${String(tier)}`,
        identity,
      )
    }
  }
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

/**
 * 层数上限与唯一性优先级都是配置阶段表达式：用绑定的配置与参数视图完整求值，
 * 不能用 Infinity 或 0 掩盖尚未执行的表达式；非法值在准备阶段明确失败。
 */
function resolveConfigurationInteger(
  expression: NumericExpression<Unit, "configuration">,
  parameters: ReadonlyMap<string, Quantity<Unit>>,
  configuration: Readonly<Record<string, number>>,
  collector: IssueCollector,
  pointer: string,
  description: string,
  identity: { readonly effectId: EffectId; readonly bindingId: BindingId },
  constraint: "positive" | "any",
): number | undefined {
  const value = evaluateConfigurationExpression(
    expression,
    parameters,
    configuration,
    collector,
  )
  const valid = Number.isInteger(value) && (constraint === "any" || value > 0)
  if (!valid) {
    collector.report(
      "INVALID_DEFINITION",
      pointer,
      `${description} must be ${
        constraint === "positive" ? "a positive integer" : "an integer"
      }, received ${String(value)}`,
      identity,
    )
    return undefined
  }
  return value
}

export interface PreparedContributionEntry extends PreparedRuleEntry {
  readonly rule: ContributionRule
  readonly foldedParameters: ReadonlyMap<string, Quantity<Unit>>
  /** 配置阶段求出的层数上限；非触发式或未声明上限的组不受限。 */
  readonly resolvedLayerMaximum: number
  /** 配置阶段求出的唯一性优先级；未声明 priority 选择时为 0。 */
  readonly resolvedPriority: number
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
): ResultPreparation {
  return prepareEffectsWithSelection(definitions, bindings)
}

type ResultPreparation =
  | { readonly ok: true; readonly value: PreparedEffects }
  | ReturnType<typeof failure>

/** 静态入口只对选中 supplied 规则、continuous 规则和相关修改选参。 */
export function prepareSelectedEffects(
  definitions: RuleSet,
  bindings: readonly SourceBinding[],
  selections: ReadonlySet<string>,
): ResultPreparation {
  return prepareEffectsWithSelection(definitions, bindings, selections)
}

function prepareEffectsWithSelection(
  definitions: RuleSet,
  bindings: readonly SourceBinding[],
  selections?: ReadonlySet<string>,
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
  const selectedContribution = (
    rule: EffectRule,
    binding: SourceBinding,
  ): boolean =>
    rule.kind === "contribution" &&
    (rule.activation.kind === "continuous" ||
      selections!.has(JSON.stringify([binding.bindingId, rule.effectId])))
  for (const binding of ownedBindings) {
    if (!binding.eligible) {
      continue
    }
    const matched: ActiveRule[] = []
    for (const [ruleIndex, rule] of ownedRuleSet.effects.entries()) {
      if (
        rule.source.identity.kind !== binding.kind ||
        rule.source.identity.entityId !== binding.sourceEntityId
      ) {
        continue
      }
      if (selections !== undefined) {
        if (rule.kind === "instant") continue
        if (
          rule.kind === "contribution" &&
          !selectedContribution(rule, binding)
        )
          continue
        if (rule.kind === "modification" && rule.target.kind === "effect") {
          const targetId = rule.target.effectId
          const target = ownedRuleSet.effects.find(
            (candidate) => candidate.effectId === targetId,
          )
          if (
            target === undefined ||
            !ownedBindings.some(
              (candidate) =>
                candidate.eligible &&
                candidate.holderId === binding.holderId &&
                candidate.kind === target.source.identity.kind &&
                candidate.sourceEntityId === target.source.identity.entityId &&
                selectedContribution(target, candidate),
            )
          )
            continue
        }
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
          collector,
        )
      ) {
        continue
      }
      reportMissingRanks(
        rule.parameters,
        binding.configuration as Readonly<Record<string, number>>,
        collector,
        `/effects/${ruleIndex}/parameters`,
        { effectId: rule.effectId, bindingId: binding.bindingId },
      )
      matched.push({ rule, binding, parameters: resolved })
    }
    activeRulesByBinding.set(binding.bindingId, matched)
  }
  if (!collector.isEmpty) return failure(collector)

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
          collector,
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
  const effectPointer = (effectId: string): string => {
    const index = ownedRuleSet.effects.findIndex(
      (rule) => rule.effectId === effectId,
    )
    return index < 0 ? "" : `/effects/${index}`
  }
  const targetPointer = (effectId: string): string =>
    `${effectPointer(effectId)}/parameters`

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
            const description = `The folded parameter "${name}" of "${active.rule.effectId}"`
            const withAdds = requireFiniteConfigurationValue(
              (set ?? quantity.value) + addSum,
              collector,
              description,
            )
            foldedParameters.set(name, {
              unit: quantity.unit,
              value: requireFiniteConfigurationValue(
                withAdds * scaleProduct,
                collector,
                description,
              ),
            })
          }
        }
        const bindingConfiguration = binding.configuration as Readonly<
          Record<string, number>
        >
        const activation = active.rule.activation
        const layerMaximum =
          activation.kind === "triggered"
            ? activation.layering.maximum
            : activation.kind === "supplied"
              ? activation.maximumLayers
              : undefined
        const resolvedLayerMaximum =
          layerMaximum !== undefined
            ? resolveConfigurationInteger(
                layerMaximum,
                foldedParameters,
                bindingConfiguration,
                collector,
                `${effectPointer(active.rule.effectId)}/activation/${activation.kind === "triggered" ? "layering/maximum" : "maximumLayers"}`,
                `Layer maximum of "${active.rule.effectId}"`,
                { effectId: active.rule.effectId, bindingId },
                "positive",
              )
            : Number.POSITIVE_INFINITY
        const uniqueness = active.rule.uniqueness
        const resolvedPriority =
          uniqueness !== undefined && uniqueness.select.kind === "priority"
            ? resolveConfigurationInteger(
                uniqueness.select.priority,
                foldedParameters,
                bindingConfiguration,
                collector,
                `${effectPointer(active.rule.effectId)}/uniqueness/select/priority`,
                `Uniqueness priority of "${active.rule.effectId}"`,
                { effectId: active.rule.effectId, bindingId },
                "any",
              )
            : 0
        if (
          resolvedLayerMaximum === undefined ||
          resolvedPriority === undefined
        ) {
          continue
        }
        contributions.push({
          rule: active.rule,
          bindingId,
          holderId: binding.holderId,
          resolvedParameters: active.parameters,
          foldedParameters,
          resolvedLayerMaximum,
          resolvedPriority,
          outputAddSum:
            fold === undefined
              ? 0
              : foldFiniteValues(
                  fold.outputAdds,
                  0,
                  (sum, value) => sum + value,
                  collector,
                  `The folded output additions of "${active.rule.effectId}"`,
                ),
          outputScaleProduct:
            fold === undefined
              ? 1
              : foldFiniteValues(
                  fold.outputScales,
                  1,
                  (product, value) => product * value,
                  collector,
                  `The folded output scales of "${active.rule.effectId}"`,
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
                    addSum: foldFiniteValues(
                      fold.duration.adds,
                      0,
                      (sum, value) => sum + value,
                      collector,
                      `The folded duration additions of "${active.rule.effectId}"`,
                    ),
                    scaleProduct: foldFiniteValues(
                      fold.duration.scales,
                      1,
                      (product, value) => product * value,
                      collector,
                      `The folded duration scales of "${active.rule.effectId}"`,
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
                    addSum: foldFiniteValues(
                      fold.extensionMaximum.adds,
                      0,
                      (sum, value) => sum + value,
                      collector,
                      `The folded extension maximum additions of "${active.rule.effectId}"`,
                    ),
                    scaleProduct: foldFiniteValues(
                      fold.extensionMaximum.scales,
                      1,
                      (product, value) => product * value,
                      collector,
                      `The folded extension maximum scales of "${active.rule.effectId}"`,
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

  if (!collector.isEmpty) {
    return failure(collector)
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
      reportMissingRanks(
        state.parameters,
        binding.configuration as Readonly<Record<string, number>>,
        collector,
        `/states/${ownedRuleSet.states.indexOf(state)}/parameters`,
        { bindingId: binding.bindingId },
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
        const description = `The folded state parameter "${name}" of "${state.stateId}"`
        const withAdds = requireFiniteConfigurationValue(
          (set ?? quantity.value) + addSum,
          collector,
          description,
        )
        parameters[name] = {
          unit: quantity.unit,
          value: requireFiniteConfigurationValue(
            withAdds * scaleProduct,
            collector,
            description,
          ),
        }
      }
      stateParameters.push({
        stateId: state.stateId,
        bindingId: binding.bindingId,
        parameters,
      })
    }
  }
  if (!collector.isEmpty) {
    return failure(collector)
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
  // 累加本身也要逐步检查：先溢出再乘零会得到未报告的 NaN。
  const description = `The accumulated parameter modifications for "${name}"`
  if (operator === "add") {
    fold.addSums.set(
      name,
      requireFiniteConfigurationValue(
        (fold.addSums.get(name) ?? 0) + value,
        collector,
        description,
      ),
    )
    return
  }
  fold.scaleProducts.set(
    name,
    requireFiniteConfigurationValue(
      (fold.scaleProducts.get(name) ?? 1) * value,
      collector,
      description,
    ),
  )
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
