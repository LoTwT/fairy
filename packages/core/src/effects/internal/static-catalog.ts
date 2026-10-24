import {
  validateTargetWindswept,
  validateWindsweptDirectAttack,
} from "./windswept-direct-damage.ts"
import {
  isLucyGuardBoarRule,
  validateLucyGuardBoarCatalog,
} from "./lucy-guard-boar-rules.ts"
import { calculateLucyGuardBoar } from "./lucy-guard-boar.ts"
import {
  calculateStandardDisorderDamageMultiplier,
  calculateStandardVortexDamageMultiplier,
  DISORDER_SOURCE_ATTRIBUTES,
} from "../../formulas.ts"
import type { LuminizeAnomalyDamageLevelInput } from "../../formulas.ts"
import { parseEffectRuleSet } from "../parse-effect-rule-set.ts"
import type {
  AliceCorePeriodicCatalogInput,
  AliceCorePeriodicDamageResult,
  BindingId,
  Condition,
  ContributionOperation,
  ContributionRule,
  DamageElement,
  EffectId,
  EffectRule,
  EntityId,
  FactorChannel,
  NonEmpty,
  NumericExpression,
  Result,
  StaticCatalogDamageInput,
  StaticCatalogDamageItem,
  StaticCatalogDamageItemRequirement,
  StaticCatalogElementBuffInput,
  StaticCatalogParameterMapping,
  StaticCatalogVariant,
  StaticCatalogVariantMechanism,
  StaticCatalogWindsweptDirectDamage,
  StaticDamageInput,
  StaticDamageParameters,
  StaticDamageResult,
  StaticEffectCatalog,
  StaticEffectSelection,
  Unit,
} from "../types.ts"
import {
  ALICE_CORE_PERIODIC_MECHANISM,
  calculateAliceCorePeriodicDamage,
  isAliceCorePeriodicRule,
  validateAliceCorePeriodicCatalog,
} from "./alice-core-periodic.ts"
import {
  expectArray,
  expectFiniteNumber,
  expectLiteral,
  expectNonEmptyString,
  expectObject,
  isPlainObject,
  rejectUnknownFields,
} from "./checks.ts"
import { SKILL_CATEGORIES } from "./expression.ts"
import { IssueCollector, failure } from "./issues.ts"
import { validateNumericInputs } from "./numeric-input.ts"
import { validateCatalogActorSourceFields } from "./catalog-actor-source.ts"
import { validateSourceBindings } from "./rule.ts"
import {
  assembleRemielleSpecialVoidflareReadings,
  remielleSpecialVoidflareDamageBonus,
  remielleSpecialVoidflareRejectsEffect,
  remielleSpecialVoidflareRequested,
  validateRemielleSpecialVoidflareInput,
  type RemielleSpecialVoidflareContext,
} from "./special-voidflare.ts"
import {
  calculateDamageFromEvaluation,
  evaluateStaticDamage,
} from "./static-damage.ts"
import {
  DAMAGE_ELEMENTS,
  GENERAL_STATS,
  isEntityId,
  UNITS,
} from "./vocabulary.ts"
import {
  validateAttributeSource,
  validateSnapshots,
  validateWorldObservation,
} from "./world.ts"

/** 只识别普通失衡输出独占的目录输入；未知/独立前提保持必填。 */
function discardedStunInputOwners(
  name: string,
  variant: StaticCatalogVariant,
  rules: readonly EffectRule[],
): readonly string[] | undefined {
  const reads = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(reads)
    if (!isPlainObject(value)) return false
    return (
      (value["kind"] === "input" && value["name"] === name) ||
      Object.values(value).some(reads)
    )
  }
  if (variant.mechanism?.kind === "luminize-proficiency-mapping")
    return undefined
  const owners = new Set<string>()
  for (const id of variant.effectIds) {
    const rule = rules.find((entry) => entry.effectId === id)
    if (rule === undefined) return undefined
    if (!reads(rule)) continue
    if (
      rule.kind === "contribution" &&
      rule.operation.kind === "factor-contribution" &&
      rule.operation.channel === "stun-damage-adjustment"
    ) {
      const { operation, ...remainder } = rule
      if (reads(remainder) || !reads(operation.value)) return undefined
      owners.add(rule.effectId)
    } else if (rule.kind === "modification" && rule.phase === "contribution") {
      const target = rules.find(
        (entry) => entry.effectId === rule.target.effectId,
      )
      if (
        target?.kind !== "contribution" ||
        target.operation.kind !== "factor-contribution" ||
        target.operation.channel !== "stun-damage-adjustment"
      )
        return undefined
      // 贡献阶段的参数/输出修改都在目标 when 之后求值。目标可由其他选项
      // 选中；展开后仍须以本次实际替代的 (bindingId, effectId) 确认归属。
      owners.add(target.effectId)
    } else return undefined
  }
  return owners.size > 0 ? [...owners] : undefined
}

const unavailableReasons = [
  "missing-identity",
  "missing-rank-evidence",
  "missing-parameter",
  "semantic-conflict",
  "formula-out-of-scope",
]

/** 来源临时归类到求值分类别名的唯一映射；求值标签与并集条件共用。 */
const SKILL_CATEGORY_GROUPS: Record<string, string> = {
  "dash": "dodge",
  "dodge-counter": "dodge",
  "enhanced-special": "special",
  "quick-assist": "assist",
  "defensive-assist": "assist",
  "evasive-assist": "assist",
  "counter-assist": "assist",
  "assist-follow-up": "assist",
  "follow-up": "follow_up",
}

/**
 * 命中在求值时实际携带的分类标签：原始分类（按来源别名归一）、调用方保留
 * 的分类标签，以及合法技能目标展开出的分类与追加攻击标记。用于独立结算项
 * 的最终分类校验；未知目标留给既有 MISSING_REFERENCE 报告，不在此重复报告。
 */
function effectiveSkillCategoryTags(
  input: StaticCatalogDamageInput,
  catalog: StaticEffectCatalog,
): string[] {
  const signature = input.hit.skillCategory
  const tags = [
    `zzz-hp:category:${SKILL_CATEGORY_GROUPS[signature] ?? signature}`,
  ]
  if (signature === "follow-up") tags.push("zzz-hp:follow-up")
  for (const tag of input.hit.skillTags ?? [])
    if (tag.startsWith("zzz-hp:category:") || tag === "zzz-hp:follow-up")
      tags.push(tag)
  const skillTargetIds = input.hit["skillTargetIds"]
  if (Array.isArray(skillTargetIds))
    for (const id of skillTargetIds) {
      const target = catalog.skillTargets.find((t) => t.targetId === id)
      if (!target) continue
      // 目标展开的分类标签与原始分类（下方）同用别名归一：独立结算项的
      // 最终分类校验按归一化大类比较（follow-up → follow_up、
      // enhanced-special → special），避免同一分类在原始/目标两条展开
      // 路径产生两个不同标签而被误判冲突。when 匹配的规则条件不受影响。
      tags.push(
        `zzz-hp:category:${SKILL_CATEGORY_GROUPS[target.category] ?? target.category}`,
      )
      if (target.countsAsFollowUp) tags.push("zzz-hp:follow-up")
    }
  return tags
}

/** 机制标记的形状校验谓词：contribution 的 stat-adjustment 且来源类别一致。 */
function isStatAdjustment(
  rule: EffectRule,
  stat: string,
  kind: "agent" | "w-engine" | "drive-disc",
): boolean {
  return (
    rule.kind === "contribution" &&
    rule.operation.kind === "stat-adjustment" &&
    rule.operation.stat === stat &&
    rule.source.identity.kind === kind
  )
}

/** 仅沿数值表达式实际求值的子节点识别 input 读取。 */
function expressionConsumesInput(
  expression: NumericExpression<Unit, "contribution">,
  name: string,
  unit: Unit,
): boolean {
  switch (expression.kind) {
    case "input":
      return expression.name === name && expression.unit === unit
    case "literal":
    case "parameter":
    case "stat":
    case "configuration-number":
      return false
    case "convert":
      return (
        expressionConsumesInput(expression.input, name, unit) ||
        expressionConsumesInput(expression.rate, name, unit)
      )
    case "add":
    case "minimum":
    case "maximum":
      return expression.operands.some((operand) =>
        expressionConsumesInput(operand, name, unit),
      )
    case "multiply":
      return (
        expressionConsumesInput(expression.value, name, unit) ||
        expressionConsumesInput(expression.coefficient, name, unit)
      )
  }
}

function operationConsumesInput(
  operation: ContributionOperation,
  name: string,
  unit: Unit,
): boolean {
  switch (operation.kind) {
    case "stat-adjustment":
    case "factor-contribution":
    case "hit-adjustment":
      return expressionConsumesInput(operation.value, name, unit)
    case "stun-damage-replacement":
      return (
        expressionConsumesInput(operation.bonus, name, unit) ||
        expressionConsumesInput(operation.maximumBonus, name, unit)
      )
    case "lucy-guard-boar-inheritance":
    case "lucy-guard-boar-m6-damage":
    case "astra-yao-m4-quick-assist-damage":
    case "alice-core-periodic-damage":
    case "guaranteed-critical":
      return false
  }
}

function conditionConsumesElementFlag(
  condition: Condition<"contribution">,
  name: string,
): boolean {
  if (condition.kind === "all" || condition.kind === "any")
    return condition.conditions.some((child) =>
      conditionConsumesElementFlag(child, name),
    )
  return (
    condition.kind === "compare-number" &&
    condition.unit === "count" &&
    condition.operator === "eq" &&
    condition.left.kind === "input" &&
    condition.left.name === name &&
    condition.right.kind === "literal" &&
    condition.right.value === 1
  )
}

const VARIANT_MECHANISM_KINDS = [
  "complete-state",
  "holder-level",
  "independent-settlement",
  "declared-teammate-beneficiary",
  "squad-unique",
  "windswept-direct",
  "element-buff-inputs",
  "luminize-proficiency-mapping",
] as const

const ORIGINAL_ANOMALY_ATTRIBUTES = [
  "fire",
  "electric",
  "ether",
  "ice",
  "physical",
  "auric-ink",
  "frost",
] as const

const DAMAGE_PREPARATION_MODES = [
  "direct",
  "standard-disorder",
  "standard-vortex",
] as const

type DamageItemRequirementStat = StaticCatalogDamageItemRequirement["stat"]
type DamageItemRequirementRole = StaticCatalogDamageItemRequirement["role"]
type DamageItemRequirementMode =
  StaticCatalogDamageItemRequirement["allowedModes"][number]
type DamageItemRequirementSource = NonNullable<
  StaticCatalogDamageItemRequirement["source"]
>
type DamageItemRequirementSkillCategory = NonNullable<
  StaticCatalogDamageItemRequirement["requiredSkillCategory"]
>
type DamageItemRequirementAnomalyAttribute = NonNullable<
  StaticCatalogDamageItemRequirement["originalAnomalyAttribute"]
>

function isDamageItemRequirementStat(
  value: unknown,
): value is DamageItemRequirementStat {
  return typeof value === "string" && GENERAL_STATS.has(value as never)
}

function isDamageItemRequirementRole(
  value: unknown,
): value is DamageItemRequirementRole {
  return value === "base" || value === "settlement"
}

function isDamagePreparationMode(
  value: unknown,
): value is DamageItemRequirementMode {
  return DAMAGE_PREPARATION_MODES.some((mode) => mode === value)
}

function isDamageItemRequirementSource(
  value: unknown,
): value is DamageItemRequirementSource {
  return value === "holder-current" || value === "anomaly-source"
}

function isDamageItemRequirementSkillCategory(
  value: unknown,
): value is DamageItemRequirementSkillCategory {
  return SKILL_CATEGORIES.some((category) => category === value)
}

function isDamageItemRequirementAnomalyAttribute(
  value: unknown,
): value is DamageItemRequirementAnomalyAttribute {
  return ORIGINAL_ANOMALY_ATTRIBUTES.some((attribute) => attribute === value)
}

function isDamageElement(value: unknown): value is DamageElement {
  return DAMAGE_ELEMENTS.some((element) => element === value)
}

/**
 * 解析并校验单个伤害项要求。字段级形状错误沿用 INVALID_INPUT；返回值只包含
 * 已确认的字段，调用方不再按裸索引读取。
 */
function parseDamageItemRequirement(
  value: unknown,
  pointer: string,
  collector: IssueCollector,
): StaticCatalogDamageItemRequirement | undefined {
  const checks = { collector, pointer, structureCode: "INVALID_INPUT" as const }
  const requirement = expectObject(value, checks, "damage item requirement")
  if (!requirement) return undefined
  rejectUnknownFields(
    requirement,
    [
      "itemId",
      "stat",
      "role",
      "allowedModes",
      "source",
      "requiredDirectMultiplier",
      "requiredSkillCategory",
      "requiredCriticalRateDeclaration",
      "originalAnomalyAttribute",
    ],
    checks,
    "damage item requirement",
  )
  let valid = true
  const itemId = expectNonEmptyString(
    requirement["itemId"],
    { ...checks, pointer: `${pointer}/itemId` },
    "damage item identity",
  )
  if (itemId === undefined) valid = false
  const stat = requirement["stat"]
  if (!isDamageItemRequirementStat(stat)) {
    collector.report(
      "INVALID_INPUT",
      `${pointer}/stat`,
      "Expected a general stat",
    )
    valid = false
  }
  const role = requirement["role"]
  if (!isDamageItemRequirementRole(role)) {
    collector.report(
      "INVALID_INPUT",
      `${pointer}/role`,
      "Expected a damage item role",
    )
    valid = false
  }
  const allowedModes: DamageItemRequirementMode[] = []
  const modes =
    expectArray(
      requirement["allowedModes"],
      { ...checks, pointer: `${pointer}/allowedModes` },
      "allowed modes",
    ) ?? []
  for (const mode of modes) {
    if (!isDamagePreparationMode(mode)) {
      collector.report(
        "INVALID_INPUT",
        `${pointer}/allowedModes`,
        "Expected a nonempty damage preparation mode list",
      )
      valid = false
      continue
    }
    allowedModes.push(mode)
  }
  if (!modes.length) {
    collector.report(
      "INVALID_INPUT",
      `${pointer}/allowedModes`,
      "Expected a nonempty damage preparation mode list",
    )
    valid = false
  }
  const source = requirement["source"]
  if (source !== undefined && !isDamageItemRequirementSource(source)) {
    collector.report(
      "INVALID_INPUT",
      `${pointer}/source`,
      "Unknown damage item source restriction",
    )
    valid = false
  }
  const requiredDirectMultiplier = requirement["requiredDirectMultiplier"]
  if (
    requiredDirectMultiplier !== undefined &&
    requiredDirectMultiplier !== 0
  ) {
    collector.report(
      "INVALID_INPUT",
      `${pointer}/requiredDirectMultiplier`,
      "Direct requirements must demand a zero initial multiplier",
    )
    valid = false
  }
  const requiredSkillCategory = requirement["requiredSkillCategory"]
  if (
    requiredSkillCategory !== undefined &&
    !isDamageItemRequirementSkillCategory(requiredSkillCategory)
  ) {
    collector.report(
      "INVALID_INPUT",
      `${pointer}/requiredSkillCategory`,
      "Unknown required skill category",
    )
    valid = false
  }
  const requiredCriticalRateDeclaration =
    requirement["requiredCriticalRateDeclaration"]
  if (
    requiredCriticalRateDeclaration !== undefined &&
    requiredCriticalRateDeclaration !== true
  ) {
    collector.report(
      "INVALID_INPUT",
      `${pointer}/requiredCriticalRateDeclaration`,
      "Expected the literal true",
    )
    valid = false
  }
  const originalAnomalyAttribute = requirement["originalAnomalyAttribute"]
  if (
    originalAnomalyAttribute !== undefined &&
    !isDamageItemRequirementAnomalyAttribute(originalAnomalyAttribute)
  ) {
    collector.report(
      "INVALID_INPUT",
      `${pointer}/originalAnomalyAttribute`,
      "Unknown original anomaly attribute",
    )
    valid = false
  }
  if (
    !valid ||
    itemId === undefined ||
    !isDamageItemRequirementStat(stat) ||
    !isDamageItemRequirementRole(role)
  )
    return undefined
  return {
    itemId,
    stat,
    role,
    allowedModes,
    ...(isDamageItemRequirementSource(source) ? { source } : {}),
    ...(requiredDirectMultiplier === 0
      ? { requiredDirectMultiplier: 0 as const }
      : {}),
    ...(isDamageItemRequirementSkillCategory(requiredSkillCategory)
      ? { requiredSkillCategory }
      : {}),
    ...(requiredCriticalRateDeclaration === true
      ? { requiredCriticalRateDeclaration: true as const }
      : {}),
    ...(isDamageItemRequirementAnomalyAttribute(originalAnomalyAttribute)
      ? { originalAnomalyAttribute }
      : {}),
  }
}

function parseCompleteStateBridge(
  value: unknown,
  pointer: string,
  collector: IssueCollector,
): { readonly layerCountInputName: string } | undefined {
  const checks = {
    collector,
    pointer,
    structureCode: "INVALID_DEFINITION" as const,
  }
  const bridge = expectObject(value, checks, "complete-state bridge")
  if (!bridge) return undefined
  rejectUnknownFields(
    bridge,
    ["layerCountInputName"],
    checks,
    "complete-state bridge",
  )
  const name = expectNonEmptyString(
    bridge["layerCountInputName"],
    { ...checks, pointer: `${pointer}/layerCountInputName` },
    "layer count input name",
  )
  return name === undefined ? undefined : { layerCountInputName: name }
}

function parseWindsweptMetadata(
  value: unknown,
  pointer: string,
  collector: IssueCollector,
): StaticCatalogWindsweptDirectDamage | undefined {
  const checks = {
    collector,
    pointer,
    structureCode: "INVALID_DEFINITION" as const,
  }
  const metadata = expectObject(
    value,
    checks,
    "windswept direct damage metadata",
  )
  if (!metadata) return undefined
  rejectUnknownFields(
    metadata,
    ["applicabilityInputName", "applierTeam", "singleActiveSourceGroup"],
    checks,
    "windswept direct damage metadata",
  )
  const applicabilityInputName = expectNonEmptyString(
    metadata["applicabilityInputName"],
    { ...checks, pointer: `${pointer}/applicabilityInputName` },
    "windswept applicability input",
  )
  const applierTeam = metadata["applierTeam"]
  if (applierTeam !== "holder")
    collector.report(
      "INVALID_DEFINITION",
      `${pointer}/applierTeam`,
      "Unknown applier team",
    )
  const singleActiveSourceGroup = metadata["singleActiveSourceGroup"]
  if (singleActiveSourceGroup !== undefined)
    expectNonEmptyString(
      singleActiveSourceGroup,
      { ...checks, pointer: `${pointer}/singleActiveSourceGroup` },
      "single active source group",
    )
  if (applicabilityInputName === undefined || applierTeam !== "holder")
    return undefined
  return {
    applicabilityInputName,
    applierTeam: "holder",
    ...(typeof singleActiveSourceGroup === "string" &&
    singleActiveSourceGroup.trim().length > 0
      ? { singleActiveSourceGroup }
      : {}),
  }
}

function parseElementBuffInputs(
  value: unknown,
  pointer: string,
  collector: IssueCollector,
): NonEmpty<StaticCatalogElementBuffInput> | undefined {
  const checks = {
    collector,
    pointer,
    structureCode: "INVALID_DEFINITION" as const,
  }
  const entries = expectArray(value, checks, "element buff inputs") ?? []
  const inputs: StaticCatalogElementBuffInput[] = []
  const elements = new Set<unknown>()
  const names = new Set<unknown>()
  if (!entries.length)
    collector.report(
      "INVALID_DEFINITION",
      pointer,
      "Element buff inputs require a nonempty mapping",
    )
  for (const [index, rawEntry] of entries.entries()) {
    const entryPointer = `${pointer}/${String(index)}`
    const entry = expectObject(
      rawEntry,
      { ...checks, pointer: entryPointer },
      "element buff input",
    )
    if (!entry) continue
    rejectUnknownFields(
      entry,
      ["element", "inputName"],
      { ...checks, pointer: entryPointer },
      "element buff input",
    )
    const element = entry["element"]
    if (!isDamageElement(element)) {
      collector.report(
        "INVALID_DEFINITION",
        `${entryPointer}/element`,
        "Unknown buff element",
      )
      continue
    }
    if (elements.has(element))
      collector.report(
        "DUPLICATE_ID",
        `${entryPointer}/element`,
        "Element buff entries must use unique elements",
      )
    elements.add(element)
    const inputName = expectNonEmptyString(
      entry["inputName"],
      { ...checks, pointer: `${entryPointer}/inputName` },
      "element buff input name",
    )
    if (inputName === undefined) continue
    if (names.has(inputName))
      collector.report(
        "DUPLICATE_ID",
        `${entryPointer}/inputName`,
        "Element buff entries must use unique input names",
      )
    names.add(inputName)
    inputs.push({ element, inputName })
  }
  const [first, ...rest] = inputs
  return first === undefined ? undefined : [first, ...rest]
}

function parseParameterMapping(
  value: unknown,
  pointer: string,
  collector: IssueCollector,
): StaticCatalogParameterMapping | undefined {
  const checks = { collector, pointer, structureCode: "INVALID_INPUT" as const }
  const mapping = expectObject(value, checks, "parameter mapping")
  if (!mapping) return undefined
  rejectUnknownFields(
    mapping,
    ["kind", "rate", "source", "inputName"],
    checks,
    "parameter mapping",
  )
  if (mapping["kind"] !== "luminize-proficiency")
    collector.report(
      "INVALID_INPUT",
      `${pointer}/kind`,
      "Unknown core parameter mapping",
    )
  const source = mapping["source"]
  if (
    source !== "holder-current" &&
    source !== "holder-initial" &&
    source !== "input"
  )
    collector.report(
      "INVALID_INPUT",
      `${pointer}/source`,
      "Unknown parameter source",
    )
  const rate = expectFiniteNumber(
    mapping["rate"],
    { ...checks, pointer: `${pointer}/rate` },
    "conversion rate",
  )
  if (rate !== undefined && rate < 0)
    collector.report(
      "INVALID_INPUT",
      `${pointer}/rate`,
      "Conversion rate cannot be negative",
    )
  const inputName =
    mapping["inputName"] === undefined
      ? undefined
      : expectNonEmptyString(
          mapping["inputName"],
          { ...checks, pointer: `${pointer}/inputName` },
          "parameter mapping input name",
        )
  if (
    mapping["kind"] !== "luminize-proficiency" ||
    (source !== "holder-current" &&
      source !== "holder-initial" &&
      source !== "input") ||
    rate === undefined
  )
    return undefined
  return {
    kind: "luminize-proficiency",
    rate,
    source,
    ...(inputName === undefined ? {} : { inputName }),
  }
}

/**
 * 解析变体机制判别联合：每个 arm 只接受自己的字段，未知 arm 明确拒绝，
 * 不按旧字段是否存在推断机制。
 */
function parseVariantMechanism(
  value: unknown,
  pointer: string,
  collector: IssueCollector,
): StaticCatalogVariantMechanism | undefined {
  const checks = {
    collector,
    pointer,
    structureCode: "INVALID_DEFINITION" as const,
  }
  const mechanism = expectObject(value, checks, "variant mechanism")
  if (!mechanism) return undefined
  const kind = mechanism["kind"]
  if (
    typeof kind !== "string" ||
    !VARIANT_MECHANISM_KINDS.some((known) => known === kind)
  ) {
    collector.report("INVALID_DEFINITION", pointer, "Unknown variant mechanism")
    return undefined
  }
  switch (kind) {
    case "complete-state": {
      rejectUnknownFields(
        mechanism,
        ["kind", "layerCountInputName"],
        checks,
        "complete-state mechanism",
      )
      const layerCountInputName = expectNonEmptyString(
        mechanism["layerCountInputName"],
        { ...checks, pointer: `${pointer}/layerCountInputName` },
        "layer count input name",
      )
      return layerCountInputName === undefined
        ? undefined
        : { kind, layerCountInputName }
    }
    case "holder-level": {
      rejectUnknownFields(
        mechanism,
        ["kind", "holderLevelInputName"],
        checks,
        "holder-level mechanism",
      )
      const holderLevelInputName = expectNonEmptyString(
        mechanism["holderLevelInputName"],
        { ...checks, pointer: `${pointer}/holderLevelInputName` },
        "holder level input name",
      )
      return holderLevelInputName === undefined
        ? undefined
        : { kind, holderLevelInputName }
    }
    case "independent-settlement": {
      rejectUnknownFields(
        mechanism,
        [
          "kind",
          "damageItemRequirements",
          "isolateDamageItems",
          "completeState",
        ],
        checks,
        "independent-settlement mechanism",
      )
      const requirementsPointer = `${pointer}/damageItemRequirements`
      const rawRequirements =
        expectArray(
          mechanism["damageItemRequirements"],
          { ...checks, pointer: requirementsPointer },
          "damage item requirements",
        ) ?? []
      if (!rawRequirements.length)
        collector.report(
          "INVALID_DEFINITION",
          requirementsPointer,
          "Independent settlement requires at least one damage item requirement",
        )
      const requirements: StaticCatalogDamageItemRequirement[] = []
      for (const [index, rawRequirement] of rawRequirements.entries()) {
        const requirement = parseDamageItemRequirement(
          rawRequirement,
          `${requirementsPointer}/${String(index)}`,
          collector,
        )
        if (requirement !== undefined) requirements.push(requirement)
      }
      const isolateDamageItems = mechanism["isolateDamageItems"]
      if (isolateDamageItems !== undefined && isolateDamageItems !== true)
        collector.report(
          "INVALID_INPUT",
          `${pointer}/isolateDamageItems`,
          "Expected the literal true",
        )
      const completeState =
        mechanism["completeState"] === undefined
          ? undefined
          : parseCompleteStateBridge(
              mechanism["completeState"],
              `${pointer}/completeState`,
              collector,
            )
      const [first, ...rest] = requirements
      if (
        first === undefined ||
        requirements.length !== rawRequirements.length ||
        (completeState === undefined &&
          mechanism["completeState"] !== undefined)
      )
        return undefined
      return {
        kind,
        damageItemRequirements: [first, ...rest],
        ...(isolateDamageItems === true
          ? { isolateDamageItems: true as const }
          : {}),
        ...(completeState === undefined ? {} : { completeState }),
      }
    }
    case "declared-teammate-beneficiary":
    case "squad-unique": {
      rejectUnknownFields(mechanism, ["kind"], checks, `${kind} mechanism`)
      return { kind }
    }
    case "windswept-direct": {
      rejectUnknownFields(
        mechanism,
        ["kind", "metadata"],
        checks,
        "windswept-direct mechanism",
      )
      const metadata = parseWindsweptMetadata(
        mechanism["metadata"],
        `${pointer}/metadata`,
        collector,
      )
      return metadata === undefined ? undefined : { kind, metadata }
    }
    case "element-buff-inputs": {
      rejectUnknownFields(
        mechanism,
        ["kind", "inputs"],
        checks,
        "element-buff-inputs mechanism",
      )
      const inputs = parseElementBuffInputs(
        mechanism["inputs"],
        `${pointer}/inputs`,
        collector,
      )
      return inputs === undefined ? undefined : { kind, inputs }
    }
    case "luminize-proficiency-mapping": {
      rejectUnknownFields(
        mechanism,
        ["kind", "mapping"],
        checks,
        "luminize-proficiency-mapping mechanism",
      )
      const mapping = parseParameterMapping(
        mechanism["mapping"],
        `${pointer}/mapping`,
        collector,
      )
      return mapping === undefined ? undefined : { kind, mapping }
    }
  }
}

/** JSON 目录与 TypeScript 调用共享校验；不信任类型断言或未选中条目的引用。 */
export function validateStaticCatalog(
  catalogValue: unknown,
  definitions: StaticCatalogDamageInput["definitions"],
): Result<StaticEffectCatalog> {
  const collector = new IssueCollector()
  const checks = (pointer: string) => ({
    collector,
    pointer,
    structureCode: "INVALID_INPUT" as const,
  })
  const catalog = expectObject(
    catalogValue,
    checks("/catalog"),
    "static catalog",
  )
  if (catalog === undefined) return failure(collector)
  rejectUnknownFields(
    catalog,
    [
      "schemaVersion",
      "ruleSetId",
      "revision",
      "source",
      "entities",
      "options",
      "skillTargets",
      "mechanisms",
      "differences",
    ],
    checks("/catalog"),
    "static catalog",
  )
  if (
    catalog["schemaVersion"] !== 2 ||
    catalog["ruleSetId"] !== definitions.ruleSetId ||
    catalog["revision"] !== definitions.revision
  )
    collector.report(
      "CONTEXT_MISMATCH",
      "/catalog",
      "Catalog schema, ruleSetId and revision must match the definitions",
    )
  const array = (key: string) =>
    expectArray(catalog[key], checks(`/catalog/${key}`), key) ?? []
  const entities = array("entities"),
    options = array("options"),
    targets = array("skillTargets"),
    differences = array("differences")
  const entityIds = new Set<string>(),
    optionIds = new Set<string>(),
    targetIds = new Set<string>(),
    differenceIds = new Set<string>()
  const unique = (value: unknown, pointer: string, set: Set<string>) => {
    const id = expectNonEmptyString(value, checks(pointer), "identity")
    if (id !== undefined) {
      if (set.has(id))
        collector.report("DUPLICATE_ID", pointer, `Duplicate identity "${id}"`)
      set.add(id)
    }
    return id
  }
  const source = expectObject(
    catalog["source"],
    checks("/catalog/source"),
    "source",
  )
  if (source !== undefined) {
    rejectUnknownFields(
      source,
      ["repository", "commit", "files"],
      checks("/catalog/source"),
      "source",
    )
    for (const key of ["repository", "commit"])
      expectNonEmptyString(source[key], checks(`/catalog/source/${key}`), key)
    const files =
      expectArray(
        source["files"],
        checks("/catalog/source/files"),
        "source files",
      ) ?? []
    for (const [i, file] of files.entries()) {
      const pointer = `/catalog/source/files/${i}`,
        entry = expectObject(file, checks(pointer), "source file")
      if (!entry) continue
      rejectUnknownFields(
        entry,
        ["path", "sha256"],
        checks(pointer),
        "source file",
      )
      expectNonEmptyString(
        entry["path"],
        checks(`${pointer}/path`),
        "source path",
      )
      if (
        typeof entry["sha256"] !== "string" ||
        !/^[a-f0-9]{64}$/.test(entry["sha256"])
      )
        collector.report(
          "INVALID_INPUT",
          `${pointer}/sha256`,
          "Expected a SHA-256 digest",
        )
    }
  }
  for (const [i, value] of entities.entries()) {
    const p = `/catalog/entities/${i}`,
      entity = expectObject(value, checks(p), "catalog entity")
    if (!entity) continue
    // 补充溯源先确认对象与资源数组形状，再读取内部字段；
    // 形状非法时仅报告错误，不继续解引用。
    const provenance = entity["supplementProvenance"]
    const provenanceRecord = isPlainObject(provenance)
      ? (provenance as Record<string, unknown>)
      : undefined
    if (provenance !== undefined && provenanceRecord === undefined)
      collector.report(
        "INVALID_INPUT",
        `${p}/supplementProvenance`,
        "Supplement provenance must be a plain object with sourceId, version and resources",
      )
    const resources =
      provenanceRecord === undefined
        ? undefined
        : expectArray(
            provenanceRecord["resources"],
            checks(`${p}/supplementProvenance/resources`),
            "provenance resources",
          )
    rejectUnknownFields(
      entity,
      [
        "catalogEntityId",
        "upstreamId",
        "name",
        "identity",
        "status",
        "profession",
        "element",
        "supplementProvenance",
      ],
      checks(p),
      "catalog entity",
    )
    unique(entity["catalogEntityId"], `${p}/catalogEntityId`, entityIds)
    // 补充实体的 ZZZ-HP upstreamId 为 null，但必须携带补充溯源信息
    if (entity["upstreamId"] !== null)
      expectNonEmptyString(
        entity["upstreamId"],
        checks(`${p}/upstreamId`),
        "upstreamId",
      )
    else if (provenance === undefined)
      collector.report(
        "INVALID_INPUT",
        `${p}/upstreamId`,
        "A null upstreamId requires supplement provenance",
      )
    expectNonEmptyString(entity["name"], checks(`${p}/name`), "name")
    if (provenanceRecord !== undefined) {
      for (const key of ["sourceId", "version"])
        expectNonEmptyString(
          provenanceRecord[key],
          checks(`${p}/supplementProvenance/${key}`),
          key,
        )
      for (const [index, resource] of (resources ?? []).entries()) {
        const rp = `${p}/supplementProvenance/resources/${index}`
        if (!isPlainObject(resource)) {
          collector.report("INVALID_INPUT", rp, "Expected a resource record")
          continue
        }
        expectNonEmptyString(resource["path"], checks(`${rp}/path`), "path")
        if (
          typeof resource["sha256"] !== "string" ||
          !/^[a-f0-9]{64}$/.test(resource["sha256"])
        )
          collector.report(
            "INVALID_INPUT",
            `${rp}/sha256`,
            "Expected a SHA-256 digest",
          )
      }
    }
    expectLiteral(
      entity["status"],
      ["mapped", "missing-identity", "placeholder"],
      checks(`${p}/status`),
      "entity status",
    )
    if (entity["status"] === "mapped") {
      const identity = expectObject(
        entity["identity"],
        checks(`${p}/identity`),
        "source identity",
      )
      if (identity) {
        rejectUnknownFields(
          identity,
          ["kind", "entityId"],
          checks(`${p}/identity`),
          "source identity",
        )
        expectLiteral(
          identity["kind"],
          ["agent", "w-engine", "drive-disc"],
          checks(`${p}/identity/kind`),
          "catalog source kind",
        )
        expectNonEmptyString(
          identity["entityId"],
          checks(`${p}/identity/entityId`),
          "source entity",
        )
      }
    } else if (entity["identity"] !== null)
      collector.report(
        "INVALID_INPUT",
        `${p}/identity`,
        "Unmapped entities must not claim an identity",
      )
    if (entity["profession"] !== null)
      expectNonEmptyString(
        entity["profession"],
        checks(`${p}/profession`),
        "profession",
      )
    if (
      entity["element"] !== null &&
      !DAMAGE_ELEMENTS.includes(entity["element"] as never)
    )
      collector.report("INVALID_INPUT", `${p}/element`, "Unknown element")
  }
  for (const [i, value] of differences.entries()) {
    const p = `/catalog/differences/${i}`,
      entry = expectObject(value, checks(p), "difference")
    if (!entry) continue
    unique(entry["differenceId"], `${p}/differenceId`, differenceIds)
    expectNonEmptyString(
      entry["explanation"],
      checks(`${p}/explanation`),
      "difference explanation",
    )
  }
  if (!collector.isEmpty) return failure(collector)
  for (const [i, value] of targets.entries()) {
    const p = `/catalog/skillTargets/${i}`,
      entry = expectObject(value, checks(p), "skill target")
    if (!entry) continue
    rejectUnknownFields(
      entry,
      [
        "targetId",
        "upstreamId",
        "agentEntityId",
        "category",
        "name",
        "countsAsFollowUp",
      ],
      checks(p),
      "skill target",
    )
    unique(entry["targetId"], `${p}/targetId`, targetIds)
    for (const key of ["category", "name"])
      expectNonEmptyString(entry[key], checks(`${p}/${key}`), key)
    if (typeof entry["countsAsFollowUp"] !== "boolean")
      collector.report(
        "INVALID_INPUT",
        `${p}/countsAsFollowUp`,
        "Expected a boolean",
      )
    if (
      entry["agentEntityId"] !== null &&
      !entities.some(
        (e) =>
          typeof e === "object" &&
          e !== null &&
          "identity" in e &&
          (e.identity as { kind?: string; entityId?: string } | null)?.kind ===
            "agent" &&
          (e.identity as { entityId?: string }).entityId ===
            entry["agentEntityId"],
      )
    )
      collector.report(
        "MISSING_REFERENCE",
        `${p}/agentEntityId`,
        "Unknown skill target agent",
      )
  }
  const effects = new Map(
    definitions.effects.map((rule) => [rule.effectId, rule]),
  )
  for (const [mi, mechanismValue] of (
    expectArray(
      catalog["mechanisms"] ?? [],
      checks("/catalog/mechanisms"),
      "catalog mechanisms",
    ) ?? []
  ).entries()) {
    const mp = `/catalog/mechanisms/${mi}`,
      mechanism = expectObject(mechanismValue, checks(mp), "catalog mechanism")
    if (!mechanism) continue
    if (
      mechanism["mechanism"] === ALICE_CORE_PERIODIC_MECHANISM ||
      mechanism["mechanism"] === ASTRA_YAO_M4_MECHANISM ||
      mechanism["mechanism"] === "lucy-guard-boar"
    )
      continue
    rejectUnknownFields(
      mechanism,
      [
        "mechanism",
        "agentEntityId",
        "strengths",
        "selfAttackConvertEffectIds",
        "wEngineMasteryEffectIds",
        "wEngineMasteryElementExemptEffectIds",
        "driveDiscFourPieceMasteryEffectIds",
        "radianceResistanceIgnoreEffectIds",
        "references",
      ],
      checks(mp),
      "catalog mechanism",
    )
    expectLiteral(
      mechanism["mechanism"],
      ["remielle-special-voidflare"],
      checks(`${mp}/mechanism`),
      "mechanism",
    )
    const agentEntityId = expectNonEmptyString(
      mechanism["agentEntityId"],
      checks(`${mp}/agentEntityId`),
      "mechanism agent entity",
    )
    if (
      agentEntityId !== undefined &&
      !(entities as unknown as StaticEffectCatalog["entities"]).some(
        (e) =>
          e.identity?.kind === "agent" && e.identity.entityId === agentEntityId,
      )
    )
      collector.report(
        "MISSING_REFERENCE",
        `${mp}/agentEntityId`,
        "The mechanism agent is not a mapped catalog agent",
      )
    const strengths = expectArray(
      mechanism["strengths"],
      checks(`${mp}/strengths`),
      "mechanism strengths",
    )
    const strengthIds = new Set<string>()
    if (strengths !== undefined) {
      if (strengths.length === 0)
        collector.report(
          "INVALID_INPUT",
          `${mp}/strengths`,
          "A mechanism requires at least one strength tier",
        )
      for (const [si, value] of strengths.entries()) {
        const sp = `${mp}/strengths/${si}`,
          strength = expectObject(value, checks(sp), "mechanism strength")
        if (!strength) continue
        rejectUnknownFields(
          strength,
          ["strength", "minimumMindscape"],
          checks(sp),
          "mechanism strength",
        )
        const strengthId = expectLiteral(
          strength["strength"],
          ["full", "mindscape-6-quarter"],
          checks(`${sp}/strength`),
          "strength",
        )
        if (strengthId !== undefined) {
          if (strengthIds.has(strengthId))
            collector.report(
              "DUPLICATE_ID",
              `${sp}/strength`,
              "Duplicate mechanism strength",
            )
          strengthIds.add(strengthId)
        }
        const minimum = strength["minimumMindscape"]
        if (
          typeof minimum !== "number" ||
          !Number.isInteger(minimum) ||
          minimum < 0 ||
          minimum > 6
        )
          collector.report(
            "INVALID_INPUT",
            `${sp}/minimumMindscape`,
            "Expected a mindscape rank from 0 to 6",
          )
      }
    }
    const markedRules = (
      field: string,
      expected: (
        rule: StaticCatalogDamageInput["definitions"]["effects"][number],
      ) => boolean,
      message: string,
    ) => {
      const ids =
        expectArray(mechanism[field], checks(`${mp}/${field}`), field) ?? []
      const seen = new Set<string>()
      for (const [ei, value] of ids.entries()) {
        const id = expectNonEmptyString(
          value,
          checks(`${mp}/${field}/${ei}`),
          "effect identity",
        )
        if (id === undefined) continue
        if (seen.has(id))
          collector.report(
            "DUPLICATE_ID",
            `${mp}/${field}/${ei}`,
            "Duplicate marked effect",
          )
        seen.add(id)
        const effect = effects.get(id as EffectId)
        if (!effect)
          collector.report(
            "MISSING_REFERENCE",
            `${mp}/${field}/${ei}`,
            `Unknown marked effect "${id}"`,
          )
        else if (!expected(effect))
          collector.report("CONTEXT_MISMATCH", `${mp}/${field}/${ei}`, message)
      }
      return new Set(ids.filter((id) => typeof id === "string") as string[])
    }
    const wEngineMasteryIds = markedRules(
      "wEngineMasteryEffectIds",
      (rule) => isStatAdjustment(rule, "anomalyProficiency", "w-engine"),
      "A w-engine mastery marking must reference an anomaly-proficiency w-engine rule",
    )
    const exemptIds = markedRules(
      "wEngineMasteryElementExemptEffectIds",
      (rule) => isStatAdjustment(rule, "anomalyProficiency", "w-engine"),
      "An element-exempt marking must reference an anomaly-proficiency w-engine rule",
    )
    // 只遍历已校验的集合；原始值可能不是数组，直接遍历会把结构错误变成裸
    // TypeError 泄漏给调用方。
    for (const id of exemptIds)
      if (!wEngineMasteryIds.has(id))
        collector.report(
          "CONTEXT_MISMATCH",
          `${mp}/wEngineMasteryElementExemptEffectIds`,
          "Element-exempt markings must reference marked w-engine mastery effects",
        )
    markedRules(
      "selfAttackConvertEffectIds",
      (rule) =>
        isStatAdjustment(rule, "attack", "agent") &&
        rule.source.identity.entityId === agentEntityId,
      "A self attack convert marking must reference an attack rule of the mechanism agent",
    )
    markedRules(
      "driveDiscFourPieceMasteryEffectIds",
      (rule) => isStatAdjustment(rule, "anomalyProficiency", "drive-disc"),
      "A four-piece mastery marking must reference an anomaly-proficiency drive-disc rule",
    )
    markedRules(
      "radianceResistanceIgnoreEffectIds",
      (rule) =>
        rule.kind === "contribution" &&
        rule.operation.kind === "factor-contribution" &&
        rule.operation.channel === "attacker-resistance-ignore",
      "A radiance resistance marking must reference an attacker-resistance-ignore rule",
    )
    const mechanismReferences = expectArray(
      mechanism["references"],
      checks(`${mp}/references`),
      "source references",
    )
    if (mechanismReferences !== undefined && !mechanismReferences.length)
      collector.report(
        "INVALID_INPUT",
        `${mp}/references`,
        "Source references are required",
      )
    for (const [ri, value] of (mechanismReferences ?? []).entries()) {
      const ref = expectObject(
        value,
        checks(`${mp}/references/${ri}`),
        "source reference",
      )
      if (ref)
        for (const field of ["sourceId", "version", "resourcePath", "pointer"])
          if (typeof ref[field] !== "string")
            collector.report(
              "INVALID_INPUT",
              `${mp}/references/${ri}/${field}`,
              "Expected source reference text",
            )
    }
  }
  for (const [i, optionValue] of options.entries()) {
    const p = `/catalog/options/${i}`,
      option = expectObject(optionValue, checks(p), "catalog option")
    if (!option) continue
    rejectUnknownFields(
      option,
      [
        "optionId",
        "catalogEntityId",
        "name",
        "conditionDescription",
        "target",
        "exclusiveGroup",
        "variants",
      ],
      checks(p),
      "catalog option",
    )
    unique(option["optionId"], `${p}/optionId`, optionIds)
    const catalogEntityId = expectNonEmptyString(
      option["catalogEntityId"],
      checks(`${p}/catalogEntityId`),
      "catalog entity identity",
    )
    if (catalogEntityId !== undefined && !entityIds.has(catalogEntityId))
      collector.report(
        "MISSING_REFERENCE",
        `${p}/catalogEntityId`,
        "Unknown option entity",
      )
    const owner = (entities as unknown as StaticEffectCatalog["entities"]).find(
      (e) => e.catalogEntityId === option["catalogEntityId"],
    )
    expectLiteral(
      option["target"],
      ["self", "team"],
      checks(`${p}/target`),
      "option target",
    )
    for (const key of ["name", "conditionDescription"])
      if (typeof option[key] !== "string")
        collector.report("INVALID_INPUT", `${p}/${key}`, "Expected text")
    if (option["exclusiveGroup"] !== undefined)
      expectNonEmptyString(
        option["exclusiveGroup"],
        checks(`${p}/exclusiveGroup`),
        "exclusive group",
      )
    const variants =
      expectArray(option["variants"], checks(`${p}/variants`), "variants") ?? []
    if (variants.length === 0)
      collector.report(
        "INVALID_INPUT",
        `${p}/variants`,
        "At least one variant is required",
      )
    for (const [vi, variantValue] of variants.entries()) {
      const vp = `${p}/variants/${vi}`,
        variant = expectObject(variantValue, checks(vp), "variant")
      if (!variant) continue
      rejectUnknownFields(
        variant,
        [
          "configuration",
          "target",
          "status",
          "reason",
          "explanation",
          "references",
          "effectIds",
          "maximumLayers",
          "inputs",
          "applicability",
          "differences",
          "mechanism",
        ],
        checks(vp),
        "variant",
      )
      expectLiteral(
        variant["status"],
        ["converted", "corrected", "unsupported"],
        checks(`${vp}/status`),
        "variant status",
      )
      if (
        variant["target"] !== undefined &&
        variant["target"] !== "self" &&
        variant["target"] !== "team"
      )
        collector.report(
          "INVALID_INPUT",
          `${vp}/target`,
          "Unknown variant target",
        )
      if (variant["status"] === "unsupported")
        expectLiteral(
          variant["reason"],
          unavailableReasons,
          checks(`${vp}/reason`),
          "unsupported reason",
        )
      if (
        variant["explanation"] !== undefined &&
        typeof variant["explanation"] !== "string"
      )
        collector.report(
          "INVALID_INPUT",
          `${vp}/explanation`,
          "Expected explanation text",
        )
      if (
        !Number.isSafeInteger(variant["maximumLayers"]) ||
        Number(variant["maximumLayers"]) < 1
      )
        collector.report(
          "INVALID_INPUT",
          `${vp}/maximumLayers`,
          "Layer maximum must be a positive safe integer",
        )
      // 变体机制：先解析判别联合，再按 arm 读取字段。旧 9 个并列 optional
      // 字段不再接受；一个变体最多一个 mechanism，未知 arm 明确拒绝。
      const mechanism =
        variant["mechanism"] === undefined
          ? undefined
          : parseVariantMechanism(
              variant["mechanism"],
              `${vp}/mechanism`,
              collector,
            )
      const layerCountInputName =
        mechanism?.kind === "complete-state"
          ? mechanism.layerCountInputName
          : mechanism?.kind === "independent-settlement"
            ? mechanism.completeState?.layerCountInputName
            : undefined
      const holderLevelInputName =
        mechanism?.kind === "holder-level"
          ? mechanism.holderLevelInputName
          : undefined
      const declaredTeammateBeneficiary =
        mechanism?.kind === "declared-teammate-beneficiary"
      const windsweptMetadata =
        mechanism?.kind === "windswept-direct" ? mechanism.metadata : undefined
      const elementBuffInputs =
        mechanism?.kind === "element-buff-inputs" ? mechanism.inputs : undefined
      const damageItemRequirements =
        mechanism?.kind === "independent-settlement"
          ? mechanism.damageItemRequirements
          : undefined
      const exclusiveDamageItem =
        mechanism?.kind === "independent-settlement" &&
        mechanism.isolateDamageItems === true
      const parameterMapping =
        mechanism?.kind === "luminize-proficiency-mapping"
          ? mechanism.mapping
          : undefined
      // 完整状态层数桥接：声明的 count 输入名必须真实对应所引用贡献里消费
      // 的 count 输入；该贡献必须是一次 supplied 完整状态（maximumLayers 1），
      // 防止把普通叠层选项静默改成单实例。详细校验在 effectIds 解析后进行。
      // 声明式同队受益者：受益者不是持有者，选项的有效 target 必须是 team，
      // 避免把“同队另一名实体”静默折算成 self。
      if (
        declaredTeammateBeneficiary &&
        (variant["target"] ?? option["target"]) !== "team"
      )
        collector.report(
          "INVALID_DEFINITION",
          `${vp}/mechanism`,
          "A declared teammate beneficiary requires the team option target",
        )
      // 独占伤害项声明要求恰好一个伤害项：启用时命中的伤害项被锁定为该
      // 唯一项（选择循环强制），不把该声明扩展成通用的多项组合校验。
      if (
        exclusiveDamageItem &&
        damageItemRequirements !== undefined &&
        damageItemRequirements.length !== 1
      )
        collector.report(
          "INVALID_DEFINITION",
          `${vp}/mechanism/isolateDamageItems`,
          "An exclusive damage item declaration requires exactly one damage item requirement",
        )
      // 声明最终暴击概率的要求项：必须位于独占变体的唯一要求项上，且该
      // 要求项是 base 角色、仅 direct 模式、holder-current——概率声明与
      // 被结算的独立项一一对应，不允许多项命中级覆盖的模糊定义。
      if (damageItemRequirements !== undefined)
        for (const [ri, requirement] of damageItemRequirements.entries()) {
          if (requirement.requiredCriticalRateDeclaration === undefined)
            continue
          const declarationPointer = `${vp}/mechanism/damageItemRequirements/${ri}/requiredCriticalRateDeclaration`
          if (!exclusiveDamageItem)
            collector.report(
              "INVALID_DEFINITION",
              declarationPointer,
              "A required critical rate declaration must sit on an exclusive damage item variant",
            )
          if (damageItemRequirements.length !== 1)
            collector.report(
              "INVALID_DEFINITION",
              declarationPointer,
              "A required critical rate declaration must sit on the single damage item requirement of its variant",
            )
          if (requirement.role !== "base")
            collector.report(
              "INVALID_DEFINITION",
              declarationPointer,
              "A required critical rate declaration requires the base damage item role",
            )
          if (
            requirement.allowedModes.length !== 1 ||
            requirement.allowedModes[0] !== "direct"
          )
            collector.report(
              "INVALID_DEFINITION",
              declarationPointer,
              "A required critical rate declaration requires the direct damage preparation mode only",
            )
          if (requirement.source !== "holder-current")
            collector.report(
              "INVALID_DEFINITION",
              declarationPointer,
              "A required critical rate declaration requires the holder-current damage item source",
            )
        }
      const config = expectObject(
        variant["configuration"],
        checks(`${vp}/configuration`),
        "variant configuration",
      )
      if (config) {
        rejectUnknownFields(
          config,
          [
            "minimumMindscape",
            "refinements",
            "minimumSetPieces",
            "coreSkillLevels",
            "specialSkillLevels",
            "potentialLevels",
          ],
          checks(`${vp}/configuration`),
          "variant configuration",
        )
        for (const [key, min, max, isArray] of [
          ["minimumMindscape", 0, 6, false],
          ["minimumSetPieces", 0, 6, false],
          ["refinements", 1, 5, true],
          ["coreSkillLevels", 1, 7, true],
          ["specialSkillLevels", 1, 16, true],
          ["potentialLevels", 0, 6, true],
        ] as const) {
          if (config[key] === undefined) continue
          const ranks = isArray
            ? (expectArray(
                config[key],
                checks(`${vp}/configuration/${key}`),
                "ranks",
              ) ?? [])
            : [config[key]]
          if (
            !ranks.length ||
            ranks.some(
              (rank) =>
                typeof rank !== "number" ||
                !Number.isInteger(rank) ||
                rank < min ||
                rank > max,
            ) ||
            new Set(ranks).size !== ranks.length
          )
            collector.report(
              "INVALID_INPUT",
              `${vp}/configuration/${key}`,
              "Invalid or duplicate rank",
            )
        }
      }
      const effectIds =
        expectArray(
          variant["effectIds"],
          checks(`${vp}/effectIds`),
          "effect ids",
        ) ?? []
      if (new Set(effectIds).size !== effectIds.length)
        collector.report(
          "DUPLICATE_ID",
          `${vp}/effectIds`,
          "Effect references must be unique",
        )
      if (
        variant["status"] === "unsupported"
          ? effectIds.length !== 0
          : effectIds.length === 0
      )
        collector.report(
          "INVALID_INPUT",
          `${vp}/effectIds`,
          "Available variants require effects; unsupported variants must not contribute",
        )
      for (const [ei, value] of effectIds.entries()) {
        const id = expectNonEmptyString(
          value,
          checks(`${vp}/effectIds/${ei}`),
          "effect identity",
        )
        if (id === undefined) continue
        const effect = effects.get(id as EffectId)
        if (!effect)
          collector.report(
            "MISSING_REFERENCE",
            `${vp}/effectIds`,
            `Unknown effect "${id}"`,
          )
        else if (
          effect.source.identity.kind !== owner?.identity?.kind ||
          effect.source.identity.entityId !== owner.identity.entityId
        )
          collector.report(
            "CONTEXT_MISMATCH",
            `${vp}/effectIds`,
            "Option and effect source identity disagree",
          )
      }
      for (const [di, value] of (
        expectArray(
          variant["differences"],
          checks(`${vp}/differences`),
          "difference ids",
        ) ?? []
      ).entries()) {
        const id = expectNonEmptyString(
          value,
          checks(`${vp}/differences/${di}`),
          "difference identity",
        )
        if (id !== undefined && !differenceIds.has(id))
          collector.report(
            "MISSING_REFERENCE",
            `${vp}/differences`,
            "Unknown difference",
          )
      }
      for (const [field, named] of [
        ["layerCountInputName", layerCountInputName],
        ["holderLevelInputName", holderLevelInputName],
      ] as const) {
        if (typeof named !== "string") continue
        // 声明的派生输入必须由所引用的贡献真实消费（同 binding 的 count
        // input），且该贡献是一次 supplied 完整状态；不允许靠名称猜测。
        // 该变体的 contribution 必须恰好一条（允许引用的 modification）：
        // 多引用普通叠层或第二条贡献会在展开时派生同键冲突，定义阶段即拒绝。
        const consumers = effectIds.flatMap((id) => {
          const effect = effects.get(id as EffectId)
          return effect?.kind === "contribution" ? [effect] : []
        })
        const literalOne = (expression: unknown): boolean => {
          if (typeof expression !== "object" || expression === null)
            return false
          const entry = expression as {
            readonly kind?: unknown
            readonly unit?: unknown
            readonly value?: unknown
          }
          return (
            entry.kind === "literal" &&
            entry.unit === "count" &&
            entry.value === 1
          )
        }
        if (
          consumers.length !== 1 ||
          consumers[0]!.activation.kind !== "supplied" ||
          !literalOne(consumers[0]!.activation.maximumLayers) ||
          !operationConsumesInput(consumers[0]!.operation, named, "count") ||
          (field === "holderLevelInputName" && variant["maximumLayers"] !== 1)
        )
          collector.report(
            "INVALID_DEFINITION",
            `${vp}/mechanism`,
            field === "layerCountInputName"
              ? "The layer-count input must be consumed as a count input by exactly one supplied single-instance contribution (maximumLayers literal count 1) in this variant"
              : `${String(option["optionId"])}: holderLevelInputName must be consumed as a count input by exactly one supplied single-instance contribution (maximumLayers literal count 1); the variant also requires maximumLayers 1`,
          )
      }
      const refs =
        expectArray(
          variant["references"],
          checks(`${vp}/references`),
          "source references",
        ) ?? []
      if (!refs.length)
        collector.report(
          "INVALID_INPUT",
          `${vp}/references`,
          "Source references are required",
        )
      for (const [ri, value] of refs.entries()) {
        const ref = expectObject(
          value,
          checks(`${vp}/references/${ri}`),
          "source reference",
        )
        if (ref)
          for (const field of [
            "sourceId",
            "version",
            "resourcePath",
            "pointer",
          ])
            if (typeof ref[field] !== "string")
              collector.report(
                "INVALID_INPUT",
                `${vp}/references/${ri}/${field}`,
                "Expected source reference text",
              )
      }
      const inputNames = new Set<string>()
      for (const [ii, value] of (
        expectArray(variant["inputs"], checks(`${vp}/inputs`), "inputs") ?? []
      ).entries()) {
        const entry = expectObject(
          value,
          checks(`${vp}/inputs/${ii}`),
          "required input",
        )
        if (!entry) continue
        rejectUnknownFields(
          entry,
          ["name", "unit", "description", "preset"],
          checks(`${vp}/inputs/${ii}`),
          "required input",
        )
        unique(entry["name"], `${vp}/inputs/${ii}/name`, inputNames)
        expectNonEmptyString(
          entry["description"],
          checks(`${vp}/inputs/${ii}/description`),
          "input description",
        )
        if (entry["preset"] !== undefined)
          expectFiniteNumber(
            entry["preset"],
            checks(`${vp}/inputs/${ii}/preset`),
            "display preset",
          )
        if (!UNITS.has(entry["unit"] as never))
          collector.report(
            "UNIT_MISMATCH",
            `${vp}/inputs/${ii}/unit`,
            "Unknown input unit",
          )
      }
      if (windsweptMetadata !== undefined) {
        const wp = `${vp}/mechanism/metadata`
        const name = windsweptMetadata.applicabilityInputName
        const consumers = effectIds.flatMap((id) => {
          const effect = effects.get(id as EffectId)
          return effect?.kind === "contribution" ? [effect] : []
        })
        const consumer = consumers[0]
        const maximum =
          consumer?.activation.kind === "supplied"
            ? consumer.activation.maximumLayers
            : undefined
        if (
          consumers.length !== 1 ||
          variant["maximumLayers"] !== 1 ||
          maximum?.kind !== "literal" ||
          maximum.unit !== "count" ||
          maximum.value !== 1 ||
          consumer?.operation.kind !== "factor-contribution" ||
          consumer.operation.channel !==
            "windswept-direct-damage-coefficient-increase" ||
          consumer.scope !== "hit" ||
          consumer.when.kind !== "constant" ||
          consumer.when.value !== true ||
          !operationConsumesInput(consumer.operation, name, "count")
        )
          collector.report(
            "INVALID_DEFINITION",
            wp,
            "Windswept metadata requires exactly one unconditional hit-scoped supplied single-instance coefficient contribution consuming the count input",
          )
        if (
          inputNames.has(name) ||
          name === layerCountInputName ||
          name === holderLevelInputName ||
          elementBuffInputs?.some((entry) => entry.inputName === name)
        )
          collector.report(
            "INVALID_DEFINITION",
            wp,
            "Windswept applicability input conflicts with another input declaration",
          )
      }
      if (elementBuffInputs !== undefined) {
        const fieldPath = `${vp}/mechanism/inputs`
        const consumers = effectIds.flatMap((id) => {
          const effect = effects.get(id as EffectId)
          return effect?.kind === "contribution" ? [effect] : []
        })
        const consumer = consumers[0]
        const maximum =
          consumer?.activation.kind === "supplied"
            ? consumer.activation.maximumLayers
            : undefined
        if (
          variant["maximumLayers"] !== 1 ||
          consumers.length !== 1 ||
          maximum?.kind !== "literal" ||
          maximum.unit !== "count" ||
          maximum.value !== 1
        )
          collector.report(
            "INVALID_DEFINITION",
            fieldPath,
            "Element buff inputs require a nonempty mapping and exactly one supplied single-instance contribution (maximumLayers 1)",
          )
        for (const [ei, entry] of elementBuffInputs.entries()) {
          const name = entry.inputName
          if (
            inputNames.has(name) ||
            name === layerCountInputName ||
            name === holderLevelInputName
          )
            collector.report(
              "INVALID_DEFINITION",
              `${fieldPath}/${ei}/inputName`,
              "Element buff input conflicts with another input declaration",
            )
          if (
            !consumer ||
            !conditionConsumesElementFlag(consumer.when, name) ||
            operationConsumesInput(consumer.operation, name, "count")
          )
            collector.report(
              "INVALID_DEFINITION",
              `${fieldPath}/${ei}/inputName`,
              "Element buff input must be compared with count 1 in the contribution condition",
            )
        }
      }
      // 派生层数名不得与外部输入要求同名：调用方不能手工提供同一
      // (bindingId, name)，若同时列为必填则该选项没有任何可满足的输入。
      if (
        layerCountInputName !== undefined &&
        inputNames.has(layerCountInputName)
      )
        collector.report(
          "INVALID_DEFINITION",
          `${vp}/mechanism`,
          "The layer-count input name must not be an external input requirement of the same variant",
        )
      if (
        holderLevelInputName !== undefined &&
        (inputNames.has(holderLevelInputName) ||
          holderLevelInputName === layerCountInputName)
      )
        collector.report(
          "INVALID_DEFINITION",
          `${vp}/mechanism`,
          `${String(option["optionId"])}: holder level input must not also name an external requirement or the layer-count input`,
        )
      const applies = expectObject(
        variant["applicability"],
        checks(`${vp}/applicability`),
        "applicability",
      )
      if (applies) {
        rejectUnknownFields(
          applies,
          [
            "beneficiaryProfession",
            "excludedBeneficiaryProfession",
            "beneficiaryElements",
            "teamProfession",
            "otherTeammateProfessions",
          ],
          checks(`${vp}/applicability`),
          "applicability",
        )
        if (applies["beneficiaryProfession"] !== undefined)
          expectNonEmptyString(
            applies["beneficiaryProfession"],
            checks(`${vp}/applicability/beneficiaryProfession`),
            "profession",
          )
        if (applies["excludedBeneficiaryProfession"] !== undefined) {
          const excluded = expectNonEmptyString(
            applies["excludedBeneficiaryProfession"],
            checks(`${vp}/applicability/excludedBeneficiaryProfession`),
            "excluded profession",
          )
          if (
            excluded !== undefined &&
            excluded === applies["beneficiaryProfession"]
          )
            collector.report(
              "INVALID_DEFINITION",
              `${vp}/applicability/excludedBeneficiaryProfession`,
              "The included and excluded beneficiary professions must differ",
            )
        }
        if (applies["otherTeammateProfessions"] !== undefined) {
          const pointer = `${vp}/applicability/otherTeammateProfessions`
          const professions = expectArray(
            applies["otherTeammateProfessions"],
            checks(pointer),
            "other teammate professions",
          )
          if (professions) {
            if (
              !professions.length ||
              new Set(professions).size !== professions.length
            )
              collector.report(
                "INVALID_INPUT",
                pointer,
                "Expected nonempty unique professions",
              )
            for (const [index, profession] of professions.entries())
              expectNonEmptyString(
                profession,
                checks(`${pointer}/${index}`),
                "profession",
              )
          }
        }
        if (applies["beneficiaryElements"] !== undefined) {
          const elements =
            expectArray(
              applies["beneficiaryElements"],
              checks(`${vp}/applicability/beneficiaryElements`),
              "elements",
            ) ?? []
          if (elements.some((e) => !DAMAGE_ELEMENTS.includes(e as never)))
            collector.report(
              "INVALID_INPUT",
              `${vp}/applicability/beneficiaryElements`,
              "Unknown element",
            )
        }
        if (applies["teamProfession"] !== undefined) {
          const gate = expectObject(
            applies["teamProfession"],
            checks(`${vp}/applicability/teamProfession`),
            "team gate",
          )
          if (gate) {
            expectNonEmptyString(
              gate["profession"],
              checks(`${vp}/applicability/teamProfession/profession`),
              "profession",
            )
            const counts =
              expectArray(
                gate["counts"],
                checks(`${vp}/applicability/teamProfession/counts`),
                "counts",
              ) ?? []
            if (
              counts.some(
                (n) =>
                  typeof n !== "number" ||
                  !Number.isInteger(n) ||
                  n < 1 ||
                  n > 3,
              )
            )
              collector.report(
                "INVALID_INPUT",
                `${vp}/applicability/teamProfession/counts`,
                "Expected exact team counts 1–3",
              )
          }
        }
      }
      if (parameterMapping !== undefined) {
        const mapping = parameterMapping
        const mapped = effectIds
          .map((id) => effects.get(id as EffectId))
          .filter(
            (rule) =>
              rule?.kind === "contribution" &&
              rule.operation.kind === "factor-contribution" &&
              rule.operation.channel === "luminize-proficiency-input",
          )
        if (mapped.length !== 1)
          collector.report(
            "MISSING_REFERENCE",
            `${vp}/mechanism/mapping`,
            "A luminize mapping requires exactly one proficiency contribution",
          )
        else {
          const rule = mapped[0] as ContributionRule
          const expression =
            rule.operation.kind === "factor-contribution"
              ? rule.operation.value
              : undefined
          const matchesSource =
            mapping.source === "input"
              ? expression?.kind === "input" &&
                expression.name === mapping.inputName &&
                inputNames.has(expression.name)
              : expression?.kind === "stat" &&
                expression.stat === "anomalyProficiency" &&
                expression.entity.role === "holder" &&
                expression.at === "evaluation" &&
                expression.stage ===
                  (mapping.source === "holder-current" ? "current" : "initial")
          if (!matchesSource)
            collector.report(
              "CONTEXT_MISMATCH",
              `${vp}/mechanism/mapping`,
              "Mapping source must match its proficiency expression",
            )
        }
      }
    }
  }
  if (collector.isEmpty)
    validateAliceCorePeriodicCatalog(
      catalogValue as StaticEffectCatalog,
      definitions,
      collector,
    )
  if (collector.isEmpty)
    validateAstraYaoM4Catalog(
      catalogValue as StaticEffectCatalog,
      definitions,
      collector,
    )
  if (collector.isEmpty)
    validateLucyGuardBoarCatalog(
      catalogValue as StaticEffectCatalog,
      definitions,
      collector,
    )
  return collector.isEmpty
    ? { ok: true, value: catalogValue as StaticEffectCatalog }
    : failure(collector)
}

function prepareItem(
  value: unknown,
  index: number,
  collector: IssueCollector,
): StaticCatalogDamageItem | undefined {
  const pointer = `/hit/damageItems/${index}`,
    checks = { collector, pointer, structureCode: "INVALID_INPUT" as const }
  const item = expectObject(value, checks, "catalog damage item")
  if (!item) return undefined
  const common = ["itemId", "stat", "statSource", "role", "mode"]
  const mode = item["mode"]
  const fields =
    mode === "direct"
      ? // 直接倍率可携带可选的 originalAnomalyAttribute 归属元数据：
        // 不据此重算传入倍率，也不引入时间派生；仅按公开类型的枚举校验。
        ["damageMultiplier", "originalAnomalyAttribute"]
      : mode === "standard-disorder"
        ? ["originalAnomalyAttribute", "baseDurationSeconds", "elapsedSeconds"]
        : mode === "standard-vortex"
          ? ["profile", "baseDurationSeconds"]
          : []
  if (!fields.length)
    collector.report(
      "INVALID_INPUT",
      `${pointer}/mode`,
      "Unknown damage preparation mode",
    )
  rejectUnknownFields(
    item,
    [...common, ...fields],
    checks,
    "catalog damage item",
  )
  expectNonEmptyString(
    item["itemId"],
    { ...checks, pointer: `${pointer}/itemId` },
    "damage item identity",
  )
  if (!GENERAL_STATS.has(item["stat"] as never))
    collector.report(
      "INVALID_INPUT",
      `${pointer}/stat`,
      "Expected a general stat",
    )
  validateAttributeSource(
    item["statSource"],
    collector,
    `${pointer}/statSource`,
  )
  if (item["role"] !== "base" && item["role"] !== "settlement")
    collector.report(
      "INVALID_INPUT",
      `${pointer}/role`,
      "Expected base or settlement role",
    )
  for (const field of fields.filter(
    (f) => f !== "originalAnomalyAttribute" && f !== "profile",
  )) {
    const n = expectFiniteNumber(
      item[field],
      { ...checks, pointer: `${pointer}/${field}` },
      field,
    )
    if (n !== undefined && n < 0)
      collector.report(
        "INVALID_INPUT",
        `${pointer}/${field}`,
        "Value must be non-negative",
      )
  }
  if (mode === "standard-disorder")
    expectLiteral(
      item["originalAnomalyAttribute"],
      DISORDER_SOURCE_ATTRIBUTES,
      { ...checks, pointer: `${pointer}/originalAnomalyAttribute` },
      "disorder source attribute",
    )
  if (mode === "direct" && Object.hasOwn(item, "originalAnomalyAttribute"))
    // 可选元数据只在显式提供时校验：显式 undefined、null、数字、空串与
    // 未知枚举都拒绝，与 exactOptionalPropertyTypes 的可选语义一致。
    expectLiteral(
      item["originalAnomalyAttribute"],
      DISORDER_SOURCE_ATTRIBUTES,
      { ...checks, pointer: `${pointer}/originalAnomalyAttribute` },
      "original anomaly attribute",
    )
  if (mode === "standard-vortex")
    expectLiteral(
      item["profile"],
      ["corruption", "shock", "burn", "assault", "frostbite", "frost"],
      { ...checks, pointer: `${pointer}/profile` },
      "vortex profile",
    )
  return item as unknown as StaticCatalogDamageItem
}

export function calculateStaticDamageFromCatalog(
  input: import("../types.ts").LucyGuardBoarCatalogInput,
): Result<import("../types.ts").LucyGuardBoarResult>
export function calculateStaticDamageFromCatalog(
  input: import("../types.ts").AstraYaoM4CatalogInput,
): Result<import("../types.ts").AstraYaoM4DamageResult>
export function calculateStaticDamageFromCatalog(
  input: AliceCorePeriodicCatalogInput,
): Result<AliceCorePeriodicDamageResult>
export function calculateStaticDamageFromCatalog(
  input: StaticCatalogDamageInput,
): Result<StaticDamageResult>
export function calculateStaticDamageFromCatalog(
  input:
    | StaticCatalogDamageInput
    | AliceCorePeriodicCatalogInput
    | import("../types.ts").AstraYaoM4CatalogInput
    | import("../types.ts").LucyGuardBoarCatalogInput,
): Result<
  | StaticDamageResult
  | AliceCorePeriodicDamageResult
  | import("../types.ts").AstraYaoM4DamageResult
  | import("../types.ts").LucyGuardBoarResult
> {
  if (input && typeof input === "object" && "mechanism" in input) {
    if (input.mechanism === "lucy-guard-boar")
      return calculateLucyGuardBoar(input, true)
    if (input.mechanism === ASTRA_YAO_M4_MECHANISM)
      return calculateAstraYaoM4Damage(input, true)
    if (input.mechanism === ALICE_CORE_PERIODIC_MECHANISM)
      return calculateAliceCorePeriodicDamage(input, true)
    const collector = new IssueCollector()
    collector.report(
      "INVALID_INPUT",
      "/mechanism",
      "Unknown named damage mechanism",
    )
    return failure(collector)
  }
  return calculateOrdinaryStaticDamageFromCatalog(input)
}

export function calculateOrdinaryStaticDamageFromCatalog(
  input: StaticCatalogDamageInput,
  astraM4?: ValidatedAstraYaoM4Context,
): Result<StaticDamageResult> {
  const collector = new IssueCollector()
  const checks = (pointer: string) => ({
    collector,
    pointer,
    structureCode: "INVALID_INPUT" as const,
  })
  const object = expectObject(input, checks(""), "catalog damage input")
  if (!object) return failure(collector)
  rejectUnknownFields(
    object,
    [
      "definitions",
      "catalog",
      "bindings",
      "selections",
      "actorSources",
      "world",
      "hit",
      "damage",
      "inputs",
      "snapshots",
      "atSeconds",
      "targetWindswept",
    ],
    checks(""),
    "catalog damage input",
  )
  const parsed = parseEffectRuleSet(object["definitions"])
  if (!parsed.ok) return parsed
  const validated = validateStaticCatalog(object["catalog"], parsed.value)
  if (!validated.ok) return validated
  const catalog = validated.value
  const world = validateWorldObservation(object["world"], collector, "/world")
  const snapshots = validateSnapshots(
    object["snapshots"] ?? [],
    collector,
    "/snapshots",
  )
  const selections = expectArray(
    object["selections"],
    checks("/selections"),
    "selections",
  )
  const bindings = validateSourceBindings(object["bindings"], collector)
  if (bindings) validateNumericInputs(object["inputs"], bindings, collector)
  const actorSources = expectArray(
    object["actorSources"],
    checks("/actorSources"),
    "actor sources",
  )
  const hit = expectObject(object["hit"], checks("/hit"), "catalog hit")
  const damage = expectObject(
    object["damage"],
    checks("/damage"),
    "catalog damage",
  )
  if (
    !world ||
    !snapshots ||
    !selections ||
    !bindings ||
    !actorSources ||
    !hit ||
    !damage
  )
    return failure(collector)
  if (hit["skillTags"] !== undefined) {
    const skillTags = expectArray(
      hit["skillTags"],
      checks("/hit/skillTags"),
      "skill tags",
    )
    // 逐元素确认非空字符串：后续独立分类校验会读取这些标签，非法成员必须
    // 在分类解释前按准确路径返回错误 Result，而不是在求值中抛裸异常。
    if (skillTags !== undefined)
      for (const [index, tag] of skillTags.entries())
        expectNonEmptyString(
          tag,
          checks(`/hit/skillTags/${index}`),
          "skill tag",
        )
  }
  expectLiteral(
    hit["skillCategory"],
    SKILL_CATEGORIES,
    checks("/hit/skillCategory"),
    "skill category",
  )
  // 声明最终暴击概率的取值校验（归属/缺声明/误带字段在选择循环判定；
  // regular/唯一项/缩放来源等结算范围由低层公共入口强制）。
  const declaredCriticalRate = hit["declaredCriticalRate"]
  if (declaredCriticalRate !== undefined) {
    if (
      typeof declaredCriticalRate !== "number" ||
      !Number.isFinite(declaredCriticalRate) ||
      declaredCriticalRate < 0 ||
      declaredCriticalRate > 1
    )
      collector.report(
        "INVALID_INPUT",
        "/hit/declaredCriticalRate",
        "The declared critical rate must be a finite number within [0, 1]",
      )
  }
  const items = (
    expectArray(
      hit["damageItems"],
      checks("/hit/damageItems"),
      "damage items",
    ) ?? []
  ).map((v, i) => prepareItem(v, i, collector))
  if (!items.length)
    collector.report(
      "INVALID_INPUT",
      "/hit/damageItems",
      "At least one damage item is required",
    )
  const actors = new Map<EntityId, StaticEffectCatalog["entities"][number]>()
  const actorLevels = new Map<
    EntityId,
    { index: number; level: number | undefined }
  >()
  for (const [i, value] of actorSources.entries()) {
    const p = `/actorSources/${i}`,
      source = expectObject(value, checks(p), "actor source")
    if (!source) continue
    const level = validateCatalogActorSourceFields(source, p, collector)
    const id = source["entityId"]
    const entity = catalog.entities.find(
      (e) =>
        e.identity?.kind === "agent" &&
        e.identity.entityId === source["agentEntityId"],
    )
    if (
      !isEntityId(id) ||
      (!world.actors.has(id) &&
        !snapshots.some((s) =>
          s.world.entities.some((e) => e.kind === "actor" && e.entityId === id),
        )) ||
      !entity
    )
      collector.report(
        "CONTEXT_MISMATCH",
        p,
        "Actor source must identify an observed actor and a mapped catalog agent",
      )
    else {
      if (actors.has(id))
        collector.report("DUPLICATE_ID", p, "Duplicate actor source")
      actors.set(id, entity)
      actorLevels.set(id, { index: i, level })
    }
  }
  const windswept = validateTargetWindswept(
    object["targetWindswept"],
    hit["targetId"],
    world,
    collector,
  )
  const windsweptApplicable = validateWindsweptDirectAttack(
    hit["directAttack"],
    damage["kind"],
    hit["element"],
    windswept,
    collector,
  )
  if (windswept?.status === "active" && !actors.has(windswept.applierActorId))
    collector.report(
      "MISSING_FACT",
      "/targetWindswept/applierActorId",
      "The current windswept applier requires a catalog agent identity",
    )
  // Every actor on a participating team needs identity facts; opponents need none.
  const seenBindings = new Set<string>()
  for (const [i, value] of bindings.entries()) {
    const binding = expectObject(
      value,
      checks(`/bindings/${i}`),
      "source binding",
    )
    if (!binding) continue
    if (typeof binding["bindingId"] !== "string") {
      collector.report(
        "INVALID_INPUT",
        `/bindings/${i}/bindingId`,
        "Missing binding identity",
      )
      continue
    }
    if (seenBindings.has(binding["bindingId"]))
      collector.report(
        "DUPLICATE_ID",
        `/bindings/${i}/bindingId`,
        "Duplicate binding",
      )
    seenBindings.add(binding["bindingId"])
    expectObject(
      binding["configuration"],
      checks(`/bindings/${i}/configuration`),
      "binding configuration",
    )
    const holder = world.actors.get(binding["holderId"] as EntityId)
    if (!holder || !actors.has(holder.entityId))
      collector.report(
        "MISSING_FACT",
        `/bindings/${i}/holderId`,
        "A source holder requires an observed catalog agent",
      )
    else {
      for (const actor of world.actors.values())
        if (actor.teamId === holder.teamId && !actors.has(actor.entityId))
          collector.report(
            "MISSING_FACT",
            "/actorSources",
            `Missing teammate identity: ${actor.entityId}`,
          )
      if (
        binding["kind"] === "agent" &&
        actors.get(holder.entityId)?.identity?.entityId !==
          binding["sourceEntityId"]
      )
        collector.report(
          "CONTEXT_MISMATCH",
          `/bindings/${i}`,
          "Agent binding and actor source disagree",
        )
    }
  }
  if (!collector.isEmpty) return failure(collector)
  // 特殊虚曜机制在选项展开前完成身份、档位与输入形状校验；后续选择循环
  // 依据请求标志拒绝与该机制互斥的倍率贡献。
  const specialVoidflareRequested = remielleSpecialVoidflareRequested(
    damage as Record<string, unknown>,
  )
  const specialVoidflare: RemielleSpecialVoidflareContext | undefined =
    specialVoidflareRequested
      ? validateRemielleSpecialVoidflareInput({
          damage: damage as Record<string, unknown>,
          hit: hit as Record<string, unknown>,
          items,
          actors,
          bindings: input.bindings,
          catalog,
          collector,
        })
      : undefined
  const expanded: StaticEffectSelection[] = []
  const deferredStunInputs: {
    bindingId: string
    effectIds: readonly string[]
    pointer: string
    message: string
  }[] = []
  /**
   * 目录派生的绑定 count 输入，保留来源以区分角色等级与逻辑状态层数。
   * 同一 holder 等级可幂等复用；异来源同键与手工覆盖必须明确拒绝。
   */
  const derivedCountInputs = new Map<
    string,
    {
      bindingId: string
      name: string
      value: number
      source:
        | "selection.layers"
        | "actorSources.level"
        | "selection.activeBuffElements"
        | "targetWindswept"
    }
  >()
  const durationIds = new Set(
    parsed.value.effects
      .filter(
        (r) =>
          r.kind === "contribution" &&
          r.operation.kind === "factor-contribution" &&
          r.operation.channel === "anomaly-duration-addition",
      )
      .map((r) => r.effectId),
  )
  const preparesDuration =
    input.damage.kind === "disorder" || input.damage.kind === "vortex"
  const guards = new Map<EffectId, Condition<"contribution">[]>()
  const mappings: {
    variant: StaticCatalogVariant
    bindingId: string
    mapping: StaticCatalogParameterMapping
  }[] = []
  const seenSelections = new Set<string>(),
    exclusive = new Set<string>(),
    equipment = new Set<string>(),
    squadUniqueSources = new Map<string, string>(),
    windsweptSources = new Map<string, string>()
  // 声明最终暴击概率的有效归属：当前命中 actor 上合法启用（layers > 0、
  // eligible、职业适配、holder === actor）且要求项校验通过的独占选项。
  const declarationOwners: {
    readonly optionId: string
    readonly bindingId: BindingId
    readonly itemId: string
  }[] = []
  for (const binding of input.bindings) {
    const key = JSON.stringify([
      binding.holderId,
      binding.kind,
      binding.kind === "drive-disc" ? binding.sourceEntityId : "",
    ])
    if (equipment.has(key))
      collector.report(
        "CONTEXT_MISMATCH",
        "/bindings",
        "Duplicate agent/equipment binding on the same holder",
      )
    equipment.add(key)
  }
  for (const [i, raw] of selections.entries()) {
    const p = `/selections/${i}`,
      selection = expectObject(raw, checks(p), "option selection")
    if (!selection) continue
    rejectUnknownFields(
      selection,
      [
        "optionId",
        "bindingId",
        "layers",
        "beneficiaryActorId",
        "trigger",
        "activeBuffElements",
      ],
      checks(p),
      "option selection",
    )
    const optionId = expectNonEmptyString(
      selection["optionId"],
      checks(`${p}/optionId`),
      "option identity",
    )
    const bindingId = expectNonEmptyString(
      selection["bindingId"],
      checks(`${p}/bindingId`),
      "binding identity",
    )
    if (optionId === undefined || bindingId === undefined) continue
    const key = JSON.stringify([bindingId, optionId])
    if (seenSelections.has(key))
      collector.report("DUPLICATE_ID", p, "Select each bound option only once")
    seenSelections.add(key)
    const option = catalog.options.find((o) => o.optionId === optionId)
    const binding = input.bindings.find((b) => b.bindingId === bindingId)
    if (!option || !binding) {
      collector.report(
        "MISSING_REFERENCE",
        p,
        "Unknown option or source binding",
      )
      continue
    }
    const source = catalog.entities.find(
      (e) => e.catalogEntityId === option.catalogEntityId,
    )!
    if (
      !source.identity ||
      source.identity.kind !== binding.kind ||
      source.identity.entityId !== binding.sourceEntityId
    ) {
      collector.report(
        "CONTEXT_MISMATCH",
        p,
        "Option and binding source identities disagree",
      )
      continue
    }
    const normalizedPotential =
      binding.kind === "agent"
        ? (binding.configuration.potentialLevel ?? 0)
        : undefined
    const variants = option.variants.filter(
      (v) =>
        (!v.configuration.refinements ||
          (binding.kind === "w-engine" &&
            v.configuration.refinements.includes(
              binding.configuration.refinement,
            ))) &&
        (!v.configuration.potentialLevels ||
          (binding.kind === "agent" &&
            normalizedPotential !== undefined &&
            v.configuration.potentialLevels.includes(normalizedPotential))),
    )
    if (variants.length !== 1) {
      collector.report(
        "MISSING_RANK",
        p,
        "Selected option has no unique variant for this refinement or potential level",
      )
      continue
    }
    const variant = variants[0]!,
      configuration = variant.configuration
    const mechanism = variant.mechanism
    const windsweptMetadata =
      mechanism?.kind === "windswept-direct" ? mechanism.metadata : undefined
    const elementBuffInputs =
      mechanism?.kind === "element-buff-inputs" ? mechanism.inputs : undefined
    const holderLevelInputName =
      mechanism?.kind === "holder-level"
        ? mechanism.holderLevelInputName
        : undefined
    const declaredTeammateBeneficiary =
      mechanism?.kind === "declared-teammate-beneficiary"
    const damageItemRequirements =
      mechanism?.kind === "independent-settlement"
        ? mechanism.damageItemRequirements
        : undefined
    const exclusiveDamageItem =
      mechanism?.kind === "independent-settlement" &&
      mechanism.isolateDamageItems === true
    const squadUniqueEffect = mechanism?.kind === "squad-unique"
    const layerCountInputName =
      mechanism?.kind === "complete-state"
        ? mechanism.layerCountInputName
        : mechanism?.kind === "independent-settlement"
          ? mechanism.completeState?.layerCountInputName
          : undefined
    const parameterMapping =
      mechanism?.kind === "luminize-proficiency-mapping"
        ? mechanism.mapping
        : undefined
    const explain = `${option.optionId}; source ${variant.references.map((r) => r.pointer).join(", ")}`
    if (variant.status === "unsupported") {
      collector.report(
        "INVALID_INPUT",
        p,
        `${variant.reason}: ${variant.explanation ?? ""}; ${explain}`,
      )
      continue
    }
    if (
      (configuration.minimumMindscape !== undefined &&
        (binding.kind !== "agent" ||
          binding.configuration.mindscapeRank <
            configuration.minimumMindscape)) ||
      (configuration.minimumSetPieces !== undefined &&
        (binding.kind !== "drive-disc" ||
          binding.configuration.setPieces < configuration.minimumSetPieces))
    ) {
      collector.report(
        "CONTEXT_MISMATCH",
        p,
        `Option is not unlocked; ${explain}`,
      )
      continue
    }
    if (
      configuration.coreSkillLevels &&
      (binding.kind !== "agent" ||
        !configuration.coreSkillLevels.includes(
          binding.configuration.coreSkillLevel,
        ))
    ) {
      collector.report(
        "MISSING_RANK",
        p,
        `No verified core parameters for this level; ${explain}`,
      )
      continue
    }
    if (
      configuration.specialSkillLevels &&
      (binding.kind !== "agent" ||
        binding.configuration.specialSkillLevel === undefined ||
        !configuration.specialSkillLevels.includes(
          binding.configuration.specialSkillLevel,
        ))
    ) {
      collector.report(
        "MISSING_RANK",
        p,
        `No verified special skill parameters for this level; ${explain}`,
      )
      continue
    }
    const layers = selection["layers"]
    if (
      typeof layers !== "number" ||
      !Number.isSafeInteger(layers) ||
      layers < 0 ||
      layers > variant.maximumLayers
    ) {
      collector.report(
        "INVALID_INPUT",
        `${p}/layers`,
        `Expected 0–${variant.maximumLayers} integral layers; ${explain}`,
      )
      continue
    }
    if (windsweptMetadata !== undefined) {
      const externalIndex =
        input.inputs?.findIndex(
          (entry) =>
            entry.bindingId === binding.bindingId &&
            entry.name === windsweptMetadata.applicabilityInputName,
        ) ?? -1
      if (externalIndex >= 0)
        collector.report(
          "DUPLICATE_ID",
          `/inputs/${externalIndex}`,
          `Windswept applicability is derived from current facts, not supplied inputs; ${explain}`,
          { bindingId: binding.bindingId },
        )
      if (layers > 0 && windswept === undefined)
        collector.report(
          "MISSING_FACT",
          "/targetWindswept",
          `Declare the current target windswept state (absent or active); ${explain}`,
          { bindingId: binding.bindingId, effectId: variant.effectIds[0]! },
        )
    }
    if (layers === 0) continue
    const activeBuffElements = selection["activeBuffElements"]
    if (activeBuffElements !== undefined || elementBuffInputs !== undefined) {
      const ep = `${p}/activeBuffElements`
      if (!elementBuffInputs)
        collector.report(
          "CONTEXT_MISMATCH",
          ep,
          `This option does not accept elemental buff states; ${explain}`,
        )
      else if (activeBuffElements === undefined)
        collector.report(
          "MISSING_FACT",
          ep,
          `Declare the active elemental buffs; ${explain}`,
        )
      else {
        const elements = expectArray(
          activeBuffElements,
          checks(ep),
          "active elemental buffs",
        )
        if (!elements?.length)
          collector.report(
            "INVALID_INPUT",
            ep,
            "Enabled elemental buffs require a nonempty set; use layers 0 to disable",
          )
        const seenElements = new Set<unknown>()
        for (const [ei, element] of (elements ?? []).entries()) {
          if (!elementBuffInputs.some((entry) => entry.element === element))
            collector.report(
              "INVALID_INPUT",
              `${ep}/${ei}`,
              `Unsupported buff element; ${explain}`,
            )
          if (seenElements.has(element))
            collector.report(
              "DUPLICATE_ID",
              `${ep}/${ei}`,
              "Declare each active buff element once",
            )
          seenElements.add(element)
        }
        for (const entry of elementBuffInputs) {
          const elementInputKey = JSON.stringify([
            binding.bindingId,
            entry.inputName,
          ])
          const value = seenElements.has(entry.element) ? 1 : 0
          const previous = derivedCountInputs.get(elementInputKey)
          if (
            previous &&
            (previous.source !== "selection.activeBuffElements" ||
              previous.value !== value)
          )
            collector.report(
              "CONTEXT_MISMATCH",
              ep,
              `Conflicting declarations of bound input ${entry.inputName}; ${explain}`,
            )
          else
            derivedCountInputs.set(elementInputKey, {
              bindingId: binding.bindingId,
              name: entry.inputName,
              value,
              source: "selection.activeBuffElements",
            })
        }
      }
    }
    // 正层选择先履行等级输入契约，资格、when、受益者或绑定失效均不豁免。
    if (holderLevelInputName !== undefined) {
      const name = holderLevelInputName
      const fact = actorLevels.get(binding.holderId)
      if (fact?.level === undefined)
        collector.report(
          "MISSING_FACT",
          fact === undefined
            ? "/actorSources"
            : `/actorSources/${fact.index}/level`,
          `Missing current character level of holder ${binding.holderId}; ${explain}`,
          { bindingId: binding.bindingId, effectId: variant.effectIds[0]! },
        )
      else {
        const levelInputKey = JSON.stringify([binding.bindingId, name])
        const previous = derivedCountInputs.get(levelInputKey)
        if (previous !== undefined && previous.source !== "actorSources.level")
          collector.report(
            "CONTEXT_MISMATCH",
            p,
            `Input ${name} is derived from both holder level and ${previous.source}; ${explain}`,
            { bindingId: binding.bindingId },
          )
        else
          derivedCountInputs.set(levelInputKey, {
            bindingId: binding.bindingId,
            name,
            value: fact.level,
            source: "actorSources.level",
          })
      }
    }
    // 声明式同队受益者：启用（layers > 0）的选择按变体声明校验。需要声明的
    // 变体缺声明、不需要声明的变体带声明、声明实体未观察/无身份/非同队/是
    // 持有者本人，都是输入错误；不用近似（如把命中角色当前场角色）兜底。
    const beneficiaryActorId = selection["beneficiaryActorId"]
    if (beneficiaryActorId !== undefined || declaredTeammateBeneficiary) {
      if (!declaredTeammateBeneficiary)
        collector.report(
          "CONTEXT_MISMATCH",
          `${p}/beneficiaryActorId`,
          `This option does not take a declared beneficiary actor; ${explain}`,
        )
      else {
        if (beneficiaryActorId === undefined)
          collector.report(
            "MISSING_FACT",
            `${p}/beneficiaryActorId`,
            `This option requires the declared beneficiary actor identity; ${explain}`,
          )
        else if (
          typeof beneficiaryActorId !== "string" ||
          !isEntityId(beneficiaryActorId)
        )
          collector.report(
            "INVALID_INPUT",
            `${p}/beneficiaryActorId`,
            `Expected the declared beneficiary actor identity; ${explain}`,
          )
        else {
          const declaredObservation = world.actors.get(beneficiaryActorId)
          const declaredIdentity = actors.get(beneficiaryActorId)
          const holderObservation = world.actors.get(binding.holderId)
          if (
            declaredObservation === undefined ||
            declaredIdentity === undefined
          )
            collector.report(
              "MISSING_FACT",
              `${p}/beneficiaryActorId`,
              `The declared beneficiary actor "${beneficiaryActorId}" must be an observed actor with identity facts; ${explain}`,
            )
          else if (beneficiaryActorId === binding.holderId)
            collector.report(
              "CONTEXT_MISMATCH",
              `${p}/beneficiaryActorId`,
              `The declared beneficiary must be a teammate other than the holder; ${explain}`,
            )
          else if (
            holderObservation === undefined ||
            declaredObservation.teamId !== holderObservation.teamId
          )
            collector.report(
              "CONTEXT_MISMATCH",
              `${p}/beneficiaryActorId`,
              `The declared beneficiary actor must be on the holder's team; ${explain}`,
            )
        }
      }
    }
    // 特殊虚曜分支：基础区只读受限攻击，动作倍率与档位语义已由具名机制表达；
    // 逐命中调整与被 strength 取代的旧倍率通道在选中时明确拒绝，不静默丢弃。
    if (specialVoidflareRequested) {
      for (const effectId of variant.effectIds) {
        const rule = parsed.value.effects.find((r) => r.effectId === effectId)
        if (rule !== undefined && remielleSpecialVoidflareRejectsEffect(rule)) {
          collector.report(
            "CONTEXT_MISMATCH",
            p,
            `The special Voidflare branch rejects per-hit or superseded multiplier contributions from "${effectId}"; ${explain}`,
          )
        }
      }
    }
    if (option.exclusiveGroup) {
      const group = JSON.stringify([binding.bindingId, option.exclusiveGroup])
      if (exclusive.has(group))
        collector.report(
          "CONTEXT_MISMATCH",
          p,
          `Conflicting exclusive option; ${explain}`,
        )
      exclusive.add(group)
    }
    const onlySettledRefringe =
      typeof damage["refringe"] === "object" &&
      damage["refringe"] !== null &&
      "mode" in damage["refringe"] &&
      damage["refringe"].mode === "settled" &&
      variant.effectIds.length > 0 &&
      variant.effectIds.every((id) => {
        const rule = parsed.value.effects.find((r) => r.effectId === id)
        return (
          rule?.kind === "contribution" &&
          rule.operation.kind === "factor-contribution" &&
          rule.operation.channel === "refringe-coefficient-increase"
        )
      })
    for (const requirement of onlySettledRefringe ? [] : variant.inputs) {
      const provided = input.inputs?.find(
        (v) => v.bindingId === binding.bindingId && v.name === requirement.name,
      )
      if (!provided) {
        const effectIds = discardedStunInputOwners(
          requirement.name,
          variant,
          parsed.value.effects,
        )
        const message = `Missing input ${requirement.name}; ${explain}`
        if (effectIds === undefined)
          collector.report("MISSING_FACT", p, message)
        else
          deferredStunInputs.push({
            bindingId: binding.bindingId,
            effectIds,
            pointer: p,
            message,
          })
      } else if (provided.value?.unit !== requirement.unit)
        collector.report(
          "UNIT_MISMATCH",
          p,
          `Input ${requirement.name} requires ${requirement.unit}; ${explain}`,
        )
    }
    // 声明最终暴击概率的归属：只有当前命中 actor 的
    // 唯一有效启用要求项授权该声明。0 层关闭、绑定 ineligible、职业不
    // 适配、目录受益筛选把当前 actor 筛掉或其他持有者的选择都不授权
    // （也不强制声明）；误带字段且无授权来源按非法输入拒绝，有效但错
    // 持有者按上下文冲突拒绝。错持有者的拒绝在生效校验内先行；owner
    // 登记复用下方算出的最终受益集合，延后到该集合之后执行。
    const declarationRequirement = damageItemRequirements?.find(
      (requirement) => requirement.requiredCriticalRateDeclaration === true,
    )
    // 伤害项要求：仅对实际生效（层数大于 0）的选中选项校验；缺项报 MISSING_REFERENCE。
    if (damageItemRequirements !== undefined && layers > 0) {
      const disorderAttributeSource = (
        damage as {
          anomalySource?: { entityId?: unknown; snapshotId?: unknown }
        }
      ).anomalySource
      for (const requirement of damageItemRequirements) {
        const item = items.find((entry) => entry?.itemId === requirement.itemId)
        if (item === undefined) {
          collector.report(
            "MISSING_REFERENCE",
            p,
            `Required damage item "${requirement.itemId}" is absent from the hit; ${explain}`,
          )
          continue
        }
        const itemRecord = item as unknown as Record<string, unknown>
        if (item.stat !== requirement.stat)
          collector.report(
            "CONTEXT_MISMATCH",
            p,
            `Damage item "${requirement.itemId}" scales ${item.stat}, expected ${requirement.stat}; ${explain}`,
          )
        if (item.role !== requirement.role)
          collector.report(
            "CONTEXT_MISMATCH",
            p,
            `Damage item "${requirement.itemId}" has role ${item.role}, expected ${requirement.role}; ${explain}`,
          )
        if (!requirement.allowedModes.includes(item.mode))
          collector.report(
            "CONTEXT_MISMATCH",
            p,
            `Damage item "${requirement.itemId}" uses mode ${item.mode}; ${explain}`,
          )
        if (
          requirement.originalAnomalyAttribute !== undefined &&
          itemRecord["originalAnomalyAttribute"] !==
            requirement.originalAnomalyAttribute
        )
          collector.report(
            "CONTEXT_MISMATCH",
            p,
            `Damage item "${requirement.itemId}" does not carry original anomaly attribute ${requirement.originalAnomalyAttribute}; ${explain}`,
          )
        if (
          item.mode === "direct" &&
          requirement.requiredDirectMultiplier === 0 &&
          (item as unknown as { damageMultiplier: number }).damageMultiplier !==
            0
        )
          collector.report(
            "CONTEXT_MISMATCH",
            p,
            `Independent damage item "${requirement.itemId}" must start from a zero multiplier; ${explain}`,
          )
        if (requirement.requiredSkillCategory !== undefined) {
          // 独立结算项按最终有效分类校验：原始分类、调用方保留的分类标签、
          // 合法技能目标展开的分类与追加攻击标记都参与求值，任何与声明分类
          // 不同的标签都按 CONTEXT_MISMATCH 拒绝，不静默丢弃冲突输入。
          const required = requirement.requiredSkillCategory
          const requiredTag = `zzz-hp:category:${
            SKILL_CATEGORY_GROUPS[required] ?? required
          }`
          const conflict = effectiveSkillCategoryTags(input, catalog).find(
            (tag) =>
              tag !== requiredTag &&
              !(tag === "zzz-hp:follow-up" && required === "follow-up"),
          )
          if (conflict)
            collector.report(
              "CONTEXT_MISMATCH",
              p,
              `Independent damage item "${requirement.itemId}" must settle as ${required}, but the hit carries ${conflict}; ${explain}`,
            )
        }
        const statSource = item.statSource as {
          entityId?: string
          snapshotId?: string
        }
        if (requirement.source === "holder-current") {
          if (
            statSource.entityId !== binding.holderId ||
            statSource.snapshotId !== undefined
          )
            collector.report(
              "CONTEXT_MISMATCH",
              p,
              `Damage item "${requirement.itemId}" must read the bound holder's current attributes; ${explain}`,
            )
        }
        if (requirement.source === "anomaly-source") {
          if (disorderAttributeSource === undefined)
            collector.report(
              "MISSING_FACT",
              p,
              `Damage item "${requirement.itemId}" requires an explicit anomaly source; ${explain}`,
            )
          else if (
            statSource.entityId !== disorderAttributeSource.entityId ||
            statSource.snapshotId !== disorderAttributeSource.snapshotId
          )
            collector.report(
              "CONTEXT_MISMATCH",
              p,
              `Damage item "${requirement.itemId}" must read from the declared anomaly source; ${explain}`,
            )
        }
      }
      // 独占伤害项：启用该变体时，命中的伤害项必须恰好是其声明的唯一项。
      // 该变体自带命中级机制（如必定暴击），会把同一请求的全部伤害项卷入；
      // 混合请求明确拒绝，不静默丢弃多余项。0 层关闭不进入本分支。
      if (exclusiveDamageItem) {
        const declaredItemIds = new Set(
          damageItemRequirements.map((requirement) => requirement.itemId),
        )
        for (const item of items) {
          const itemId = (item as { itemId?: unknown }).itemId
          if (!declaredItemIds.has(itemId as string))
            collector.report(
              "CONTEXT_MISMATCH",
              p,
              `Independent damage item ${JSON.stringify(declaredItemIds.size === 1 ? [...declaredItemIds][0] : [...declaredItemIds])} must settle as the sole damage item of the hit; remove ${JSON.stringify(itemId)} or settle it in a separate request; ${explain}`,
            )
        }
      }
      if (declarationRequirement !== undefined) {
        if (binding.holderId !== input.hit.actorId) {
          if (declaredCriticalRate !== undefined)
            collector.report(
              "CONTEXT_MISMATCH",
              p,
              `The declared critical rate belongs to the hit actor's settlement, but ${option.optionId} is bound to holder ${JSON.stringify(binding.holderId)}; enable the option on the current actor's binding or settle separately; ${explain}`,
              { bindingId: binding.bindingId },
            )
        }
      }
    }
    const holder = actors.get(binding.holderId)!
    if (
      !binding.eligible ||
      (binding.kind === "w-engine" && source.profession !== holder.profession)
    )
      continue
    const holderActor = world.actors.get(binding.holderId)!
    // 全队唯一效果：同队最多一个启用来源（跨绑定），调用方以单一启用选择
    // 声明有效来源；第二个启用选择明确拒绝，不猜最高值或时间覆盖。职业
    // 不适配等既有零贡献绑定已在上方跳过，不占用队伍名额；0 层关闭同样
    // 不占用。键为（持有者队伍， optionId）：同队两名持有者（不同绑定）
    // 冲突，异队各持有互不冲突。
    if (squadUniqueEffect) {
      const teamKey = JSON.stringify([holderActor.teamId, option.optionId])
      if (squadUniqueSources.has(teamKey))
        collector.report(
          "CONTEXT_MISMATCH",
          p,
          `The squad-unique effect of ${option.optionId} allows only one active source per team; declare a single effective source by enabling it on one binding only; ${explain}`,
        )
      else squadUniqueSources.set(teamKey, binding.bindingId)
    }
    const gate = variant.applicability.teamProfession
    const otherProfessions = variant.applicability.otherTeammateProfessions
    const hasQualifyingTeammate =
      otherProfessions === undefined ||
      [...actors].some(
        ([id, entity]) =>
          id !== binding.holderId &&
          world.actors.get(id)?.teamId === holderActor.teamId &&
          entity.profession !== null &&
          otherProfessions.includes(entity.profession),
      )
    const count = gate
      ? [...actors].filter(
          ([id, e]) =>
            world.actors.get(id)?.teamId === holderActor.teamId &&
            e.profession === gate.profession,
        ).length
      : 0
    const beneficiaries = [...actors].filter(
      ([id, e]) =>
        world.actors.get(id)?.teamId === holderActor.teamId &&
        hasQualifyingTeammate &&
        ((variant.target ?? option.target) === "team" ||
          id === binding.holderId) &&
        (!gate || gate.counts.includes(count)) &&
        (!variant.applicability.beneficiaryProfession ||
          e.profession === variant.applicability.beneficiaryProfession) &&
        (variant.applicability.excludedBeneficiaryProfession === undefined ||
          (e.profession !== null &&
            e.profession !==
              variant.applicability.excludedBeneficiaryProfession)) &&
        (!variant.applicability.beneficiaryElements ||
          (preparesDuration &&
            variant.effectIds.every((effectId) => durationIds.has(effectId))) ||
          (e.element !== null &&
            variant.applicability.beneficiaryElements.includes(e.element))),
    )
    // 声明式同队受益者把受益集合收敛为声明的单个实体：与原受益集合
    // （同队、职业、元素、队伍职业人数筛选后的合法候选）求交而不是替换，
    // 声明实体落在筛选结果之外时该选择保持原有的零贡献契约，不新增报错；
    // 也不与全队候选并列，防止未被声明的队友同时受益。观察、身份、同队
    // 与非持有者的输入错误校验在启用选择阶段先行执行。
    const declaredBeneficiaryId =
      declaredTeammateBeneficiary &&
      typeof selection["beneficiaryActorId"] === "string"
        ? (selection["beneficiaryActorId"] as EntityId)
        : undefined
    // 声明归属登记：复用本次选择的最终受益集合（含声明受益者交集，如
    // 有），只有当前命中 actor 仍在集合中，该要求项才授权并强制声明；
    // 被受益筛选（队伍职业人数、受益职业/元素）筛掉的选择不授权也不
    // 强制，保持其原有零贡献语义。规则 when 仍只决定贡献，不反向求值
    // 任意 when 来授权字段。
    if (
      declarationRequirement !== undefined &&
      binding.holderId === input.hit.actorId &&
      (declaredBeneficiaryId === undefined
        ? beneficiaries
        : beneficiaries.filter(([id]) => id === declaredBeneficiaryId)
      ).some(([id]) => id === binding.holderId)
    ) {
      declarationOwners.push({
        optionId: option.optionId,
        bindingId: binding.bindingId,
        itemId: declarationRequirement.itemId,
      })
    }
    if (windsweptMetadata !== undefined) {
      const applies =
        windsweptApplicable &&
        windswept?.status === "active" &&
        world.actors.get(windswept.applierActorId)?.teamId ===
          holderActor.teamId &&
        beneficiaries.some(
          ([id]) =>
            id === input.hit.actorId &&
            (declaredBeneficiaryId === undefined ||
              id === declaredBeneficiaryId),
        )
      const name = windsweptMetadata.applicabilityInputName
      const key = JSON.stringify([binding.bindingId, name])
      if (derivedCountInputs.has(key))
        collector.report(
          "CONTEXT_MISMATCH",
          p,
          `Multiple selections derive windswept input ${name}; ${explain}`,
        )
      else
        derivedCountInputs.set(key, {
          bindingId: binding.bindingId,
          name,
          value: applies ? 1 : 0,
          source: "targetWindswept",
        })
      if (applies && windsweptMetadata.singleActiveSourceGroup !== undefined) {
        const groupKey = JSON.stringify([
          holderActor.teamId,
          input.hit.targetId,
          windsweptMetadata.singleActiveSourceGroup,
        ])
        const previous = windsweptSources.get(groupKey)
        if (previous !== undefined)
          collector.report(
            "CONTEXT_MISMATCH",
            p,
            `Declare one effective windswept coefficient source; ${previous} conflicts with ${binding.bindingId}; ${explain}`,
            { bindingId: binding.bindingId, effectId: variant.effectIds[0]! },
          )
        else windsweptSources.set(groupKey, binding.bindingId)
      }
    }
    const beneficiaryCandidates: Condition<"contribution"> = {
      kind: "any",
      conditions: beneficiaries.map(([entityId]) => ({
        kind: "same-entity",
        left: { role: "beneficiary" },
        right: { role: "entity", entityId },
      })),
    }
    const guard: Condition<"contribution"> = {
      kind: "all",
      conditions: [
        {
          kind: "same-entity",
          left: { role: "holder" },
          right: { role: "entity", entityId: binding.holderId },
        },
        declaredBeneficiaryId === undefined
          ? beneficiaryCandidates
          : {
              kind: "all",
              conditions: [
                {
                  kind: "same-entity",
                  left: { role: "beneficiary" },
                  right: { role: "entity", entityId: declaredBeneficiaryId },
                },
                beneficiaryCandidates,
              ],
            },
      ],
    }
    for (const effectId of variant.effectIds) {
      const rule = parsed.value.effects.find((r) => r.effectId === effectId)!
      if (rule.kind === "modification") continue
      if (rule.kind !== "contribution") {
        collector.report(
          "INVALID_DEFINITION",
          p,
          "Catalog options must select contributions",
        )
        continue
      }
      // 完整状态层数桥接：声明 layerCountInputName 的选项把 selection.layers
      // 作为逻辑状态层数派生为绑定作用域内的 count 输入，实际展开固定
      // layers 1（一次完整状态）；未声明的选项保持逐层展开行为。
      if (layerCountInputName === undefined) {
        expanded.push({
          effectId,
          bindingId: binding.bindingId,
          layers,
          ...(selection["trigger"] === undefined
            ? {}
            : {
                trigger: selection["trigger"] as NonNullable<
                  StaticEffectSelection["trigger"]
                >,
              }),
        })
      } else {
        const key = JSON.stringify([binding.bindingId, layerCountInputName])
        if (derivedCountInputs.has(key)) {
          collector.report(
            derivedCountInputs.get(key)!.source === "actorSources.level"
              ? "CONTEXT_MISMATCH"
              : "DUPLICATE_ID",
            p,
            derivedCountInputs.get(key)!.source === "actorSources.level"
              ? `Input ${layerCountInputName} is derived from both holder level and selection.layers; ${explain}`
              : `Multiple selections derive the same layer-count input ${layerCountInputName}; ${explain}`,
          )
          continue
        }
        derivedCountInputs.set(key, {
          bindingId: binding.bindingId,
          name: layerCountInputName,
          value: layers,
          source: "selection.layers",
        })
        expanded.push({
          effectId,
          bindingId: binding.bindingId,
          layers: 1,
          ...(selection["trigger"] === undefined
            ? {}
            : {
                trigger: selection["trigger"] as NonNullable<
                  StaticEffectSelection["trigger"]
                >,
              }),
        })
      }
      const list = guards.get(effectId) ?? []
      list.push(
        preparesDuration &&
          durationIds.has(effectId) &&
          variant.applicability.beneficiaryElements?.length
          ? {
              kind: "all",
              conditions: [
                guard,
                {
                  kind: "one-of",
                  fact: "hit.element",
                  values: variant.applicability.beneficiaryElements as NonEmpty<
                    StaticCatalogDamageInput["hit"]["element"]
                  >,
                },
              ],
            }
          : guard,
      )
      guards.set(effectId, list)
    }
    if (parameterMapping)
      mappings.push({
        variant,
        bindingId: binding.bindingId,
        mapping: parameterMapping,
      })
  }
  // 声明最终暴击概率的请求级裁决：一个声明最多归属一个有效要求项；
  // 缺声明只对真正具备归属的启用项报告，误带字段且无归属来源拒绝。
  if (declarationOwners.length > 1) {
    const [first, ...rest] = declarationOwners
    collector.report(
      "CONTEXT_MISMATCH",
      "/hit/declaredCriticalRate",
      `The declared critical rate must belong to exactly one enabled settlement; ${JSON.stringify(first!.itemId)} of ${first!.optionId} conflicts with ${rest
        .map((owner) => JSON.stringify(owner.itemId))
        .join(", ")}; settle each declared settlement in its own request`,
    )
  } else if (declaredCriticalRate !== undefined && !declarationOwners.length) {
    collector.report(
      "INVALID_INPUT",
      "/hit/declaredCriticalRate",
      "The declared critical rate requires an enabled exclusive settlement that requires the declaration; settle the request with the option enabled or omit the field",
    )
  } else if (
    declaredCriticalRate === undefined &&
    declarationOwners.length === 1
  ) {
    const [owner] = declarationOwners
    collector.report(
      "MISSING_FACT",
      "/hit/declaredCriticalRate",
      `The final critical rate of this settlement must be declared explicitly (${JSON.stringify(owner!.itemId)} of ${owner!.optionId}); no default probability is assumed from the holder's panel`,
      { bindingId: owner!.bindingId },
    )
  }
  const skillTargetIds =
    hit["skillTargetIds"] === undefined
      ? []
      : (expectArray(
          hit["skillTargetIds"],
          checks("/hit/skillTargetIds"),
          "skill targets",
        ) ?? [])
  const tags = new Set(input.hit.skillTags ?? [])
  for (const [i, id] of skillTargetIds.entries()) {
    const target = catalog.skillTargets.find((t) => t.targetId === id)
    if (!target) {
      collector.report(
        "MISSING_REFERENCE",
        `/hit/skillTargetIds/${i}`,
        "Unknown skill target",
      )
      continue
    }
    if (
      target.agentEntityId &&
      target.agentEntityId !==
        actors.get(input.hit.actorId)?.identity?.entityId &&
      !(astraM4 && target.targetId === ASTRA_YAO_M4_TARGET)
    )
      collector.report(
        "CONTEXT_MISMATCH",
        `/hit/skillTargetIds/${i}`,
        "Skill target belongs to another agent",
      )
    tags.add(target.targetId)
    tags.add(`zzz-hp:category:${target.category}`)
    if (target.countsAsFollowUp) tags.add("zzz-hp:follow-up")
  }
  tags.add(
    `zzz-hp:category:${SKILL_CATEGORY_GROUPS[input.hit.skillCategory] ?? input.hit.skillCategory}`,
  )
  if (input.hit.skillCategory === "follow-up") tags.add("zzz-hp:follow-up")
  const lowDamage = { ...damage }
  let refringeMode: "from-effects" | "settled" | undefined
  if ("refringe" in damage) {
    const refringe = expectObject(
      damage["refringe"],
      checks("/damage/refringe"),
      "catalog refringe",
    )
    if (refringe) {
      if (refringe["mode"] === "from-effects") {
        rejectUnknownFields(
          refringe,
          ["mode"],
          checks("/damage/refringe"),
          "refringe",
        )
        refringeMode = "from-effects"
        lowDamage["refringe"] = { settledMultiplier: 1 }
      } else if (refringe["mode"] === "settled") {
        rejectUnknownFields(
          refringe,
          ["mode", "multiplier"],
          checks("/damage/refringe"),
          "refringe",
        )
        expectFiniteNumber(
          refringe["multiplier"],
          checks("/damage/refringe/multiplier"),
          "settled refringe",
        )
        refringeMode = "settled"
        lowDamage["refringe"] = { settledMultiplier: refringe["multiplier"] }
      } else
        collector.report(
          "INVALID_INPUT",
          "/damage/refringe/mode",
          "Choose from-effects or settled refringe",
        )
    }
    const source = expectObject(
      damage["anomalySource"],
      checks("/damage/anomalySource"),
      "anomaly source",
    )
    if (specialVoidflareRequested) {
      // 特殊虚曜分支：等级唯一来自具名来源；增伤区由角色等级 helper 准备，
      // 不接受调用方的手工已结算倍率或独立防御等级。结构校验失败时此处
      // 不再组装，统一由收集器中已报告的问题在检查点失败。
      if (specialVoidflare) {
        const defense = expectObject(
          damage["defense"],
          checks("/damage/defense"),
          "defense",
        )
        if (defense)
          lowDamage["defense"] = {
            ...defense,
            attackerLevel: specialVoidflare.level,
          }
        lowDamage["damageBonus"] = remielleSpecialVoidflareDamageBonus(
          specialVoidflare.level,
        )
      }
    } else if (source) {
      const { level, ...attributeSource } = source
      validateAttributeSource(
        attributeSource,
        collector,
        "/damage/anomalySource",
      )
      expectFiniteNumber(
        level,
        checks("/damage/anomalySource/level"),
        "source level",
      )
      if (!actors.has(attributeSource["entityId"] as EntityId))
        collector.report(
          "MISSING_FACT",
          "/damage/anomalySource",
          "The anomaly source requires an explicit catalog actor identity",
        )
      if (
        actors.get(attributeSource["entityId"] as EntityId)?.identity
          ?.entityId === "1581"
      )
        collector.report(
          "INVALID_INPUT",
          "/damage/anomalySource",
          "Remielle's self-provided anomaly strength requires the remielle-special-voidflare mechanism",
        )
      const defense = expectObject(
        damage["defense"],
        checks("/damage/defense"),
        "defense",
      )
      if (defense) lowDamage["defense"] = { ...defense, attackerLevel: level }
    }
    delete lowDamage["anomalySource"]
  }
  if (damage["kind"] === "luminize") {
    const multiplier = expectObject(
      damage["luminizeMultiplier"],
      checks("/damage/luminizeMultiplier"),
      "catalog luminize parameters",
    )
    if (multiplier) {
      rejectUnknownFields(
        multiplier,
        [
          "baseLuminizeMultiplier",
          "multiplicativeLuminizeMultiplierAdjustments",
        ],
        checks("/damage/luminizeMultiplier"),
        "catalog luminize parameters",
      )
      lowDamage["luminizeMultiplier"] = {
        ...multiplier,
        remielleAnomalyProficiency: 0,
        anomalyProficiencyConversionRate: 0,
      }
    }
  }
  if (!collector.isEmpty) return failure(collector)
  const { skillTargetIds: _targets, ...lowHit } = input.hit
  const anomalySource =
    "anomalySource" in input.damage ? input.damage.anomalySource : undefined
  const anomalyAttributeSource = anomalySource
    ? {
        entityId: anomalySource.entityId,
        ...("snapshotId" in anomalySource && anomalySource.snapshotId
          ? { snapshotId: anomalySource.snapshotId }
          : {}),
      }
    : undefined
  if (astraM4?.active)
    expanded.push({
      effectId: astraM4.effectId,
      bindingId: astraM4.bindingId,
      layers: 1,
    })
  const definitions = {
    ...parsed.value,
    effects: parsed.value.effects.map((rule): EffectRule => {
      if (isAliceCorePeriodicRule(rule) || isLucyGuardBoarRule(rule))
        return rule
      if (isAstraYaoM4Rule(rule))
        return astraM4 ? bridgeAstraYaoM4Rule(rule) : rule
      if (
        rule.kind === "contribution" &&
        rule.operation.kind === "factor-contribution" &&
        rule.operation.channel === "refringe-coefficient-increase" &&
        refringeMode === "settled"
      )
        return { ...rule, when: { kind: "constant", value: false } }
      const guard = guards.get(rule.effectId)
      if (rule.kind !== "contribution" || !guard) return rule
      return {
        ...rule,
        when: {
          kind: "all",
          conditions: [rule.when, { kind: "any", conditions: guard }],
        },
      } as ContributionRule
    }),
  }
  const low: StaticDamageInput = {
    ...input,
    definitions,
    selections: expanded,
    world: {
      ...input.world,
      entities: input.world.entities.map((entity) =>
        entity.kind === "actor"
          ? { ...entity, deriveSheerForce: entity.deriveSheerForce ?? true }
          : entity,
      ),
    },
    hit: {
      ...lowHit,
      skillTags: [...tags],
      ...(astraM4
        ? {
            attributeSources: {
              criticalDamage: astraM4.conditionalModel.criticalDamageSource,
              penetrationRatio: astraM4.conditionalModel.penetrationRatioSource,
            },
          }
        : {}),
      ...(anomalyAttributeSource
        ? {
            attributeSources: {
              anomalyProficiency: anomalyAttributeSource,
              penetrationRatio: anomalyAttributeSource,
            },
          }
        : {}),
      damageItems: items.map((item) => ({
        itemId: item!.itemId,
        stat: item!.stat,
        statSource: item!.statSource,
        damageMultiplier: item!.mode === "direct" ? item!.damageMultiplier : 0,
      })) as unknown as StaticDamageInput["hit"]["damageItems"],
    },
    damage: lowDamage as unknown as StaticDamageParameters,
  }
  // Root fields remain exact on the low-level input.
  const {
    catalog: _catalog,
    actorSources: _actors,
    ...lowInput
  } = low as StaticDamageInput &
    Pick<StaticCatalogDamageInput, "catalog" | "actorSources">
  // 经目录验证的层数或 holder 等级派生为绑定 count 输入；外部 inputs
  // 不能提供同一 (bindingId, name)，即使数值相同也拒绝。
  let bridgedInput = lowInput
  if (derivedCountInputs.size > 0) {
    const externalInputs = input.inputs ?? []
    const externalIndices = new Map(
      externalInputs.map((entry, index) => [
        JSON.stringify([entry.bindingId, entry.name]),
        index,
      ]),
    )
    for (const [key, derived] of derivedCountInputs) {
      const externalIndex = externalIndices.get(key)
      if (externalIndex !== undefined)
        collector.report(
          derived.source === "actorSources.level"
            ? "CONTEXT_MISMATCH"
            : "DUPLICATE_ID",
          derived.source === "actorSources.level"
            ? `/inputs/${externalIndex}`
            : "/inputs",
          `Input ${derived.name} of binding ${derived.bindingId} is derived from ${derived.source} and must not be provided externally`,
        )
    }
    if (!collector.isEmpty) return failure(collector)
    bridgedInput = {
      ...lowInput,
      inputs: [
        ...externalInputs,
        ...[...derivedCountInputs.values()].map((derived) => ({
          bindingId: derived.bindingId,
          name: derived.name,
          value: { unit: "count" as const, value: derived.value },
        })),
      ],
    } as StaticDamageInput
  }
  const durationSelections = expanded.filter((selection) =>
    durationIds.has(selection.effectId),
  )
  if (
    preparesDuration &&
    durationSelections.length &&
    items.some((item) => item!.role === "base" && item!.mode === "direct")
  ) {
    collector.report(
      "MISSING_FACT",
      "/hit/damageItems",
      "Selected duration effects require explicit duration preparation for each base item",
    )
    return failure(collector)
  }
  try {
    const preparations: NonNullable<
      StaticDamageResult["preparations"]
    >[number][] = []
    const profileElements = {
      shock: "electric",
      burn: "fire",
      corruption: "ether",
      assault: "physical",
      frostbite: "ice",
      frost: "frost",
    } as const
    for (const item of items) {
      if (item!.mode === "direct") continue
      const source = item!
      const element =
        source.mode === "standard-disorder"
          ? source.originalAnomalyAttribute
          : profileElements[source.profile]
      const durationResult = evaluateStaticDamage({
        ...bridgedInput,
        selections: durationSelections,
        hit: { ...bridgedInput.hit, element },
      })
      if (!durationResult.ok) return durationResult
      const durationContributions =
        durationResult.value.evaluation.contributions.filter(
          (c) =>
            c.address.kind === "factor" &&
            c.address.channel === "anomaly-duration-addition",
        )
      preparations.push({
        itemId: source.itemId,
        durationAdjustment: durationContributions.reduce(
          (sum, c) => sum + c.value.value,
          0,
        ),
        contributions: durationContributions,
      })
    }
    const preparedItems = lowInput.hit.damageItems.map((item, index) => {
      const source = items[index]!
      if (
        (source.mode === "standard-disorder" &&
          input.damage.kind !== "disorder") ||
        (source.mode === "standard-vortex" && input.damage.kind !== "vortex")
      )
        throw new Error("Damage preparation mode and damage kind disagree")
      const duration =
        preparations.find((p) => p.itemId === source.itemId)
          ?.durationAdjustment ?? 0
      let multiplier = item.damageMultiplier
      if (source.mode === "standard-disorder")
        multiplier += calculateStandardDisorderDamageMultiplier({
          originalAnomalyAttribute: source.originalAnomalyAttribute,
          remainingAnomalyDurationInSeconds: Math.max(
            0,
            source.baseDurationSeconds + duration - source.elapsedSeconds,
          ),
        })
      if (source.mode === "standard-vortex")
        multiplier += calculateStandardVortexDamageMultiplier({
          vortexDamageMultiplierProfile: source.profile,
          sourceAnomalyDurationInSeconds: source.baseDurationSeconds + duration,
        })
      return { ...item, damageMultiplier: multiplier }
    }) as unknown as StaticDamageInput["hit"]["damageItems"]
    const evaluated = evaluateStaticDamage(
      {
        ...bridgedInput,
        selections: preparesDuration
          ? expanded.filter((selection) => !durationIds.has(selection.effectId))
          : expanded,
        hit: { ...bridgedInput.hit, damageItems: preparedItems },
      },
      astraM4,
    )
    if (!evaluated.ok) return evaluated
    for (const deferred of deferredStunInputs) {
      if (
        !deferred.effectIds.every((effectId) =>
          evaluated.value.replacedStunOutputs.some(
            (output) =>
              output.bindingId === deferred.bindingId &&
              output.effectId === effectId,
          ),
        )
      ) {
        collector.report("MISSING_FACT", deferred.pointer, deferred.message)
      }
    }
    if (!collector.isEmpty) return failure(collector)
    const consumed = new Set<FactorChannel>()
    const contributions = evaluated.value.evaluation.contributions
    const take = (channel: FactorChannel): number => {
      consumed.add(channel)
      return contributions
        .filter(
          (e) =>
            e.address.kind === "factor" &&
            e.address.channel === channel &&
            e.address.entityId === input.hit.actorId,
        )
        .reduce((sum, e) => sum + e.value.value, 0)
    }
    const addition = take("base-multiplier-addition"),
      increase = take("base-multiplier-increase"),
      settlement = take("settlement-multiplier-addition")
    if (
      settlement !== 0 &&
      !items.some((item) => item!.role === "settlement")
    ) {
      collector.report(
        "MISSING_FACT",
        "/hit/damageItems",
        "Selected settlement contribution requires a separate settlement item",
      )
      return failure(collector)
    }
    const damageItems = evaluated.value.evaluation.hit!.damageItems.map(
      (item, index) => {
        return {
          ...item,
          damageMultiplier:
            (items[index]!.role === "settlement"
              ? item.damageMultiplier + settlement
              : item.damageMultiplier + addition) *
            (1 + increase),
        }
      },
    )
    let preparedDamage = low.damage
    if (refringeMode === "from-effects" && "refringe" in preparedDamage)
      preparedDamage = {
        ...preparedDamage,
        refringe: {
          settledMultiplier: 1 + take("refringe-coefficient-increase"),
        },
      }
    if (preparedDamage.kind === "luminize") {
      const applicableMappings = mappings.filter((m) =>
        contributions.some(
          (c) =>
            c.origin.bindingId === m.bindingId &&
            m.variant.effectIds.includes(c.origin.effectId) &&
            c.address.kind === "factor" &&
            c.address.channel === "luminize-proficiency-input",
        ),
      )
      if (applicableMappings.length !== 1)
        throw new Error(
          "Luminize requires exactly one applicable proficiency parameter mapping",
        )
      const mapping = applicableMappings[0]!.mapping
      preparedDamage = {
        ...preparedDamage,
        luminizeMultiplier: {
          ...preparedDamage.luminizeMultiplier,
          remielleAnomalyProficiency: take("luminize-proficiency-input"),
          anomalyProficiencyConversionRate: mapping.rate,
          multiplicativeLuminizeMultiplierAdjustments: [
            ...preparedDamage.luminizeMultiplier
              .multiplicativeLuminizeMultiplierAdjustments,
            1 + take("luminize-multiplier-increase"),
            (1 + take("luminize-special-addition")) *
              (1 + take("luminize-special-increase")) *
              // 特殊虚曜分支把 strength 档位乘数并入耀变乘区：full 为 1，
              // 影画 6 四分之一为 0.25；普通分支保持恒等。
              (specialVoidflare?.strengthMultiplier ?? 1),
          ],
        },
      }
    }
    let evaluation: StaticDamageResult["evaluation"] = {
      ...evaluated.value.evaluation,
      hit: { ...evaluated.value.evaluation.hit!, damageItems },
    }
    let luminizeAnomalyDamageLevel: LuminizeAnomalyDamageLevelInput | undefined
    if (specialVoidflare) {
      const assembled = assembleRemielleSpecialVoidflareReadings({
        context: specialVoidflare,
        input,
        lowInput,
        expanded,
        evaluation,
        collector,
      })
      if (assembled === undefined) return failure(collector)
      evaluation = assembled.evaluation
      luminizeAnomalyDamageLevel = assembled.luminizeAnomalyDamageLevel
    }
    const result = calculateDamageFromEvaluation(
      preparedDamage,
      evaluated.value.hit,
      evaluation,
      {
        ...(luminizeAnomalyDamageLevel === undefined
          ? {}
          : { luminizeAnomalyDamageLevel }),
        windsweptBaseCoefficient: evaluated.value.windsweptBaseCoefficient,
      },
    )
    return {
      ok: true,
      value: {
        ...result,
        preparations,
        notApplicableContributions: result.notApplicableContributions.filter(
          (c) =>
            c.address.kind !== "factor" || !consumed.has(c.address.channel),
        ),
      },
    }
  } catch (error) {
    collector.report(
      "INVALID_INPUT",
      "/damage",
      error instanceof Error ? error.message : String(error),
    )
    return failure(collector)
  }
}
import {
  ASTRA_YAO_M4_MECHANISM,
  ASTRA_YAO_M4_TARGET,
  bridgeAstraYaoM4Rule,
  calculateAstraYaoM4Damage,
  isAstraYaoM4Rule,
  validateAstraYaoM4Catalog,
  type ValidatedAstraYaoM4Context,
} from "./astra-yao-m4.ts"
