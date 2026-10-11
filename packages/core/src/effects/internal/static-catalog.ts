import {
  calculateStandardDisorderDamageMultiplier,
  calculateStandardVortexDamageMultiplier,
  DISORDER_SOURCE_ATTRIBUTES,
} from "../../formulas.ts"
import type { LuminizeAnomalyDamageLevelInput } from "../../formulas.ts"
import { parseEffectRuleSet } from "../parse-effect-rule-set.ts"
import type {
  Condition,
  ContributionRule,
  EffectId,
  EffectRule,
  EntityId,
  FactorChannel,
  NonEmpty,
  Result,
  StaticCatalogDamageInput,
  StaticCatalogDamageItem,
  StaticCatalogVariant,
  StaticDamageInput,
  StaticDamageParameters,
  StaticDamageResult,
  StaticEffectCatalog,
  StaticEffectSelection,
} from "../types.ts"
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

/** 表达式树里是否存在指定名称、指定单位的 input 读取。 */
function expressionConsumesInput(
  value: unknown,
  name: string,
  unit: string,
): boolean {
  if (typeof value !== "object" || value === null) return false
  const entry = value as {
    readonly kind?: unknown
    readonly name?: unknown
    readonly unit?: unknown
    readonly operands?: readonly unknown[]
    readonly input?: unknown
    readonly rate?: unknown
    readonly value?: unknown
    readonly coefficient?: unknown
    readonly left?: unknown
    readonly right?: unknown
    readonly condition?: unknown
    readonly conditions?: readonly unknown[]
    readonly maximum?: unknown
    readonly limit?: unknown
  }
  if (entry.kind === "input" && entry.name === name && entry.unit === unit)
    return true
  for (const nested of [
    entry.operands,
    entry.input,
    entry.rate,
    entry.value,
    entry.coefficient,
    entry.left,
    entry.right,
    entry.condition,
    entry.maximum,
    entry.limit,
  ])
    if (Array.isArray(nested)) {
      for (const item of nested)
        if (expressionConsumesInput(item, name, unit)) return true
    } else if (
      nested !== undefined &&
      expressionConsumesInput(nested, name, unit)
    )
      return true
  if (Array.isArray(entry.conditions))
    for (const condition of entry.conditions)
      if (expressionConsumesInput(condition, name, unit)) return true
  return false
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
    catalog["schemaVersion"] !== 1 ||
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
          "parameterMapping",
          "damageItemRequirements",
          "layerCountInputName",
          "declaredTeammateBeneficiary",
          "squadUniqueEffect",
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
      // 完整状态层数桥接：声明的 count 输入名必须非空，且必须真实对应
      // 所引用贡献里消费的 count 输入；该贡献必须是一次 supplied 完整状态
      // （maximumLayers 1），防止把普通叠层选项静默改成单实例。详细校验在
      // effectIds 解析后进行（需要已解析的规则）。
      const layerCountInputName = variant["layerCountInputName"]
      if (layerCountInputName !== undefined)
        expectNonEmptyString(
          layerCountInputName,
          checks(`${vp}/layerCountInputName`),
          "layer count input name",
        )
      // 声明式同队受益者：字段只接受字面量 true；受益者不是持有者，选项的
      // 有效 target 必须是 team，避免把“同队另一名实体”静默折算成 self。
      if (variant["declaredTeammateBeneficiary"] !== undefined) {
        if (variant["declaredTeammateBeneficiary"] !== true)
          collector.report(
            "INVALID_INPUT",
            `${vp}/declaredTeammateBeneficiary`,
            "Expected the literal true",
          )
        if ((variant["target"] ?? option["target"]) !== "team")
          collector.report(
            "INVALID_DEFINITION",
            `${vp}/declaredTeammateBeneficiary`,
            "A declared teammate beneficiary requires the team option target",
          )
      }
      // 全队唯一效果声明：字段只接受字面量 true；跨绑定的整队唯一在选择
      // 阶段强制（见选择循环），这里只拒绝非法声明形状。
      if (
        variant["squadUniqueEffect"] !== undefined &&
        variant["squadUniqueEffect"] !== true
      )
        collector.report(
          "INVALID_INPUT",
          `${vp}/squadUniqueEffect`,
          "Expected the literal true",
        )
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
      if (typeof layerCountInputName === "string") {
        const named = layerCountInputName
        // 声明的层数输入必须由所引用的贡献真实消费（同 binding 的 count
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
          !expressionConsumesInput(consumers[0]!.operation, named, "count")
        )
          collector.report(
            "INVALID_DEFINITION",
            `${vp}/layerCountInputName`,
            "The layer-count input must be consumed as a count input by exactly one supplied single-instance contribution (maximumLayers literal count 1) in this variant",
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
      // 派生层数名不得与外部输入要求同名：调用方不能手工提供同一
      // (bindingId, name)，若同时列为必填则该选项没有任何可满足的输入。
      if (
        typeof layerCountInputName === "string" &&
        inputNames.has(layerCountInputName)
      )
        collector.report(
          "INVALID_DEFINITION",
          `${vp}/layerCountInputName`,
          "The layer-count input name must not be an external input requirement of the same variant",
        )
      const applies = expectObject(
        variant["applicability"],
        checks(`${vp}/applicability`),
        "applicability",
      )
      if (applies) {
        rejectUnknownFields(
          applies,
          ["beneficiaryProfession", "beneficiaryElements", "teamProfession"],
          checks(`${vp}/applicability`),
          "applicability",
        )
        if (applies["beneficiaryProfession"] !== undefined)
          expectNonEmptyString(
            applies["beneficiaryProfession"],
            checks(`${vp}/applicability/beneficiaryProfession`),
            "profession",
          )
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
      const requirementList = variant["damageItemRequirements"]
      if (requirementList !== undefined) {
        const requirements =
          expectArray(
            requirementList,
            checks(`${vp}/damageItemRequirements`),
            "damage item requirements",
          ) ?? []
        for (const [ri, value] of requirements.entries()) {
          const rp = `${vp}/damageItemRequirements/${ri}`
          const requirement = expectObject(
            value,
            checks(rp),
            "damage item requirement",
          )
          if (!requirement) continue
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
              "originalAnomalyAttribute",
            ],
            checks(rp),
            "damage item requirement",
          )
          expectNonEmptyString(
            requirement["itemId"],
            checks(`${rp}/itemId`),
            "damage item identity",
          )
          if (!GENERAL_STATS.has(requirement["stat"] as never))
            collector.report(
              "INVALID_INPUT",
              `${rp}/stat`,
              "Expected a general stat",
            )
          expectLiteral(
            requirement["role"],
            ["base", "settlement"],
            checks(`${rp}/role`),
            "damage item role",
          )
          const modes =
            expectArray(
              requirement["allowedModes"],
              checks(`${rp}/allowedModes`),
              "allowed modes",
            ) ?? []
          if (
            !modes.length ||
            modes.some(
              (mode) =>
                mode !== "direct" &&
                mode !== "standard-disorder" &&
                mode !== "standard-vortex",
            )
          )
            collector.report(
              "INVALID_INPUT",
              `${rp}/allowedModes`,
              "Expected a nonempty damage preparation mode list",
            )
          if (
            requirement["source"] !== undefined &&
            requirement["source"] !== "holder-current" &&
            requirement["source"] !== "anomaly-source"
          )
            collector.report(
              "INVALID_INPUT",
              `${rp}/source`,
              "Unknown damage item source restriction",
            )
          if (
            requirement["requiredDirectMultiplier"] !== undefined &&
            requirement["requiredDirectMultiplier"] !== 0
          )
            collector.report(
              "INVALID_INPUT",
              `${rp}/requiredDirectMultiplier`,
              "Direct requirements must demand a zero initial multiplier",
            )
          if (
            requirement["requiredSkillCategory"] !== undefined &&
            !SKILL_CATEGORIES.includes(
              requirement["requiredSkillCategory"] as never,
            )
          )
            collector.report(
              "INVALID_INPUT",
              `${rp}/requiredSkillCategory`,
              "Unknown required skill category",
            )
          if (
            requirement["originalAnomalyAttribute"] !== undefined &&
            ![
              "fire",
              "electric",
              "ether",
              "ice",
              "physical",
              "auric-ink",
              "frost",
            ].includes(requirement["originalAnomalyAttribute"] as string)
          )
            collector.report(
              "INVALID_INPUT",
              `${rp}/originalAnomalyAttribute`,
              "Unknown original anomaly attribute",
            )
        }
      }
      if (variant["parameterMapping"] !== undefined) {
        const mapping = expectObject(
          variant["parameterMapping"],
          checks(`${vp}/parameterMapping`),
          "parameter mapping",
        )
        if (mapping) {
          rejectUnknownFields(
            mapping,
            ["kind", "rate", "source", "inputName"],
            checks(`${vp}/parameterMapping`),
            "parameter mapping",
          )
          if (mapping["kind"] !== "luminize-proficiency")
            collector.report(
              "INVALID_INPUT",
              `${vp}/parameterMapping`,
              "Unknown core parameter mapping",
            )
          expectLiteral(
            mapping["source"],
            ["holder-current", "holder-initial", "input"],
            checks(`${vp}/parameterMapping/source`),
            "parameter source",
          )
          const rate = expectFiniteNumber(
            mapping["rate"],
            checks(`${vp}/parameterMapping/rate`),
            "conversion rate",
          )
          if (rate !== undefined && rate < 0)
            collector.report(
              "INVALID_INPUT",
              `${vp}/parameterMapping/rate`,
              "Conversion rate cannot be negative",
            )
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
              `${vp}/parameterMapping`,
              "A luminize mapping requires exactly one proficiency contribution",
            )
          else {
            const rule = mapped[0] as ContributionRule
            const expression = rule.operation.value
            const matchesSource =
              mapping["source"] === "input"
                ? expression.kind === "input" &&
                  expression.name === mapping["inputName"] &&
                  inputNames.has(expression.name)
                : expression.kind === "stat" &&
                  expression.stat === "anomalyProficiency" &&
                  expression.entity.role === "holder" &&
                  expression.at === "evaluation" &&
                  expression.stage ===
                    (mapping["source"] === "holder-current"
                      ? "current"
                      : "initial")
            if (!matchesSource)
              collector.report(
                "CONTEXT_MISMATCH",
                `${vp}/parameterMapping`,
                "Mapping source must match its proficiency expression",
              )
          }
        }
      }
    }
  }
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
  input: StaticCatalogDamageInput,
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
  for (const [i, value] of actorSources.entries()) {
    const p = `/actorSources/${i}`,
      source = expectObject(value, checks(p), "actor source")
    if (!source) continue
    rejectUnknownFields(
      source,
      ["entityId", "agentEntityId"],
      checks(p),
      "actor source",
    )
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
    }
  }
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
  /**
   * 完整状态层数桥接派生的内部 count 输入：键为 (bindingId, name)，值是
   * 该绑定上经目录严格校验的逻辑层数。外部 inputs 不能提供同一键，多个
   * 选择产生同一键也不允许静默覆盖。
   */
  const derivedLayerInputs = new Map<
    string,
    { bindingId: string; name: string; value: number }
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
  const mappings: { variant: StaticCatalogVariant; bindingId: string }[] = []
  const seenSelections = new Set<string>(),
    exclusive = new Set<string>(),
    equipment = new Set<string>(),
    squadUniqueSources = new Map<string, string>()
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
      ["optionId", "bindingId", "layers", "beneficiaryActorId"],
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
    if (layers === 0) continue
    // 声明式同队受益者：启用（layers > 0）的选择按变体声明校验。需要声明的
    // 变体缺声明、不需要声明的变体带声明、声明实体未观察/无身份/非同队/是
    // 持有者本人，都是输入错误；不用近似（如把命中角色当前场角色）兜底。
    const declaredTeammateBeneficiary =
      variant.declaredTeammateBeneficiary === true
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
      if (!provided)
        collector.report(
          "MISSING_FACT",
          p,
          `Missing input ${requirement.name}; ${explain}`,
        )
      else if (provided.value?.unit !== requirement.unit)
        collector.report(
          "UNIT_MISMATCH",
          p,
          `Input ${requirement.name} requires ${requirement.unit}; ${explain}`,
        )
    }
    // 伤害项要求：仅对实际生效（层数大于 0）的选中选项校验；缺项报 MISSING_REFERENCE。
    if (variant.damageItemRequirements !== undefined && layers > 0) {
      const disorderAttributeSource = (
        damage as {
          anomalySource?: { entityId?: unknown; snapshotId?: unknown }
        }
      ).anomalySource
      for (const requirement of variant.damageItemRequirements as readonly {
        readonly itemId: string
        readonly stat: string
        readonly role: string
        readonly allowedModes: readonly string[]
        readonly source?: "holder-current" | "anomaly-source"
        readonly requiredDirectMultiplier?: number
        readonly requiredSkillCategory?: string
        readonly originalAnomalyAttribute?: string
      }[]) {
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
    if (variant.squadUniqueEffect === true) {
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
        ((variant.target ?? option.target) === "team" ||
          id === binding.holderId) &&
        (!gate || gate.counts.includes(count)) &&
        (!variant.applicability.beneficiaryProfession ||
          e.profession === variant.applicability.beneficiaryProfession) &&
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
      variant.declaredTeammateBeneficiary === true &&
      typeof selection["beneficiaryActorId"] === "string"
        ? (selection["beneficiaryActorId"] as EntityId)
        : undefined
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
      const layerCountInputName = variant.layerCountInputName
      if (layerCountInputName === undefined) {
        expanded.push({ effectId, bindingId: binding.bindingId, layers })
      } else {
        const key = JSON.stringify([binding.bindingId, layerCountInputName])
        if (derivedLayerInputs.has(key)) {
          collector.report(
            "DUPLICATE_ID",
            p,
            `Multiple selections derive the same layer-count input ${layerCountInputName}; ${explain}`,
          )
          continue
        }
        derivedLayerInputs.set(key, {
          bindingId: binding.bindingId,
          name: layerCountInputName,
          value: layers,
        })
        expanded.push({ effectId, bindingId: binding.bindingId, layers: 1 })
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
    if (variant.parameterMapping)
      mappings.push({ variant, bindingId: binding.bindingId })
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
      target.agentEntityId !== actors.get(input.hit.actorId)?.identity?.entityId
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
  const definitions = {
    ...parsed.value,
    effects: parsed.value.effects.map((rule): EffectRule => {
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
  // 完整状态层数桥接：派生 count 输入并入低层 inputs；外部 inputs 不能
  // 提供同一 (bindingId, name)（即使数值相同也拒绝），层数的唯一来源是
  // 目录里经严格校验的 selection.layers。
  let bridgedInput = lowInput
  if (derivedLayerInputs.size > 0) {
    const externalInputs = input.inputs ?? []
    const externalKeys = new Set(
      externalInputs.map((entry) =>
        JSON.stringify([entry.bindingId, entry.name]),
      ),
    )
    for (const [key, derived] of derivedLayerInputs)
      if (externalKeys.has(key))
        collector.report(
          "DUPLICATE_ID",
          "/inputs",
          `Input ${derived.name} of binding ${derived.bindingId} is derived from selection.layers and must not be provided externally`,
        )
    if (!collector.isEmpty) return failure(collector)
    bridgedInput = {
      ...lowInput,
      inputs: [
        ...externalInputs,
        ...[...derivedLayerInputs.values()].map((derived) => ({
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
    const evaluated = evaluateStaticDamage({
      ...bridgedInput,
      selections: preparesDuration
        ? expanded.filter((selection) => !durationIds.has(selection.effectId))
        : expanded,
      hit: { ...bridgedInput.hit, damageItems: preparedItems },
    })
    if (!evaluated.ok) return evaluated
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
      const mapping = applicableMappings[0]!.variant.parameterMapping!
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
      luminizeAnomalyDamageLevel === undefined
        ? undefined
        : { luminizeAnomalyDamageLevel },
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
