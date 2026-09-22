import {
  calculateStandardDisorderDamageMultiplier,
  calculateStandardVortexDamageMultiplier,
} from "@randomplay/core"
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
  rejectUnknownFields,
} from "./checks.ts"
import { SKILL_CATEGORIES } from "./expression.ts"
import { IssueCollector, failure } from "./issues.ts"
import { validateNumericInputs } from "./numeric-input.ts"
import { validateSourceBindings } from "./rule.ts"
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
      ],
      checks(p),
      "catalog entity",
    )
    unique(entity["catalogEntityId"], `${p}/catalogEntityId`, entityIds)
    for (const key of ["upstreamId", "name"])
      expectNonEmptyString(entity[key], checks(`${p}/${key}`), key)
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
          ],
          checks(`${vp}/configuration`),
          "variant configuration",
        )
        for (const [key, min, max, isArray] of [
          ["minimumMindscape", 0, 6, false],
          ["minimumSetPieces", 0, 6, false],
          ["refinements", 1, 5, true],
          ["coreSkillLevels", 1, 7, true],
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
      ? ["damageMultiplier"]
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
      ["fire", "electric", "ether", "ice", "physical", "auric_ink", "frost"],
      { ...checks, pointer: `${pointer}/originalAnomalyAttribute` },
      "disorder source attribute",
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
  if (hit["skillTags"] !== undefined)
    expectArray(hit["skillTags"], checks("/hit/skillTags"), "skill tags")
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
  const expanded: StaticEffectSelection[] = []
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
    equipment = new Set<string>()
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
      ["optionId", "bindingId", "layers"],
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
    const variants = option.variants.filter(
      (v) =>
        !v.configuration.refinements ||
        (binding.kind === "w-engine" &&
          v.configuration.refinements.includes(
            binding.configuration.refinement,
          )),
    )
    if (variants.length !== 1) {
      collector.report(
        "MISSING_RANK",
        p,
        "Selected option has no unique variant for this refinement",
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
    const holder = actors.get(binding.holderId)!
    if (
      !binding.eligible ||
      (binding.kind === "w-engine" && source.profession !== holder.profession)
    )
      continue
    const holderActor = world.actors.get(binding.holderId)!
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
    const guard: Condition<"contribution"> = {
      kind: "all",
      conditions: [
        {
          kind: "same-entity",
          left: { role: "holder" },
          right: { role: "entity", entityId: binding.holderId },
        },
        {
          kind: "any",
          conditions: beneficiaries.map(([entityId]) => ({
            kind: "same-entity",
            left: { role: "beneficiary" },
            right: { role: "entity", entityId },
          })),
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
      expanded.push({ effectId, bindingId: binding.bindingId, layers })
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
  const categoryGroups: Record<string, string> = {
    "dash": "dodge",
    "dodge-counter": "dodge",
    "enhanced-special": "special",
    "quick-assist": "assist",
    "defensive-assist": "assist",
    "evasive-assist": "assist",
    "follow-up": "follow_up",
  }
  tags.add(
    `zzz-hp:category:${categoryGroups[input.hit.skillCategory] ?? input.hit.skillCategory}`,
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
    if (source) {
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
          "Remielle's self-provided anomaly strength requires a new level formula outside the current core contract",
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
        ...(anomalySource.snapshotId
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
          ? { ...entity, deriveSheerForce: true }
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
          ? source.originalAnomalyAttribute === "auric_ink"
            ? "auric-ink"
            : source.originalAnomalyAttribute
          : profileElements[source.profile]
      const durationResult = evaluateStaticDamage({
        ...lowInput,
        selections: durationSelections,
        hit: { ...lowInput.hit, element },
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
      ...lowInput,
      selections: preparesDuration
        ? expanded.filter((selection) => !durationIds.has(selection.effectId))
        : expanded,
      hit: { ...lowInput.hit, damageItems: preparedItems },
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
              (1 + take("luminize-special-increase")),
          ],
        },
      }
    }
    const evaluation = {
      ...evaluated.value.evaluation,
      hit: { ...evaluated.value.evaluation.hit!, damageItems },
    }
    const result = calculateDamageFromEvaluation(
      preparedDamage,
      evaluated.value.hit,
      evaluation,
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
