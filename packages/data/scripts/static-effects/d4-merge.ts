import type {
  EffectRule,
  NonEmpty,
  RuleSet,
  SourceReference,
  StaticEffectCatalog,
  StaticCatalogOption,
} from "@randomplay/shared"
import { BUFF_RESOURCE } from "./source.ts"
import type { convertSource } from "./convert.ts"

/** 单次 convertSource 的完整结果；D4 把固定源与 3.2.5 补充实体层合并。 */
export type StaticEffectsConversion = ReturnType<typeof convertSource>

export interface SupplementalSourceDescriptor {
  readonly repository: string
  readonly commit: string
  readonly resourcePath: string
  readonly sha256: string
  /** 已提交冻结夹具相对 packages/data 的路径与摘要。 */
  readonly extractPath: string
  readonly extractSha256: string
}

export interface SupplementalSkillInventoryEntry {
  readonly agentId: string
  readonly skillId: string
  readonly name: string
  readonly damageType: string
  readonly skillTypes: readonly string[]
  readonly element: string | null
  readonly baseMult: number
}

export interface SupplementalOptionLabel {
  readonly name: string
  readonly conditionDescription?: string
}

export interface SupplementalBasePanelEntry {
  readonly catalogEntityId: string
  readonly identity: string
  readonly values: Readonly<Record<string, unknown>>
}

export interface SupplementalGapEntry {
  readonly clause: string
  readonly reason:
    | "semantic-conflict"
    | "formula-out-of-scope"
    | "missing-parameter"
    | "not-registered-in-d4"
  readonly explanation: string
}

export interface SupplementalSourceReport {
  readonly source: SupplementalSourceDescriptor
  readonly summary: StaticEffectsConversion["coverage"]["summary"]
  readonly entities: StaticEffectsConversion["coverage"]["entities"]
  readonly packs: StaticEffectsConversion["coverage"]["packs"]
  readonly records: StaticEffectsConversion["coverage"]["records"]
  readonly skills: readonly SupplementalSkillInventoryEntry[]
  readonly basePanels: readonly SupplementalBasePanelEntry[]
  readonly gaps: readonly SupplementalGapEntry[]
  readonly consumptionBoundary: {
    readonly status: "catalog-only-until-d5"
    readonly explanation: string
  }
}

type SupplementalCoverageSummary =
  StaticEffectsConversion["coverage"]["summary"] & {
    readonly supplementalSource: {
      readonly entities: number
      readonly packs: number
      readonly rawEffects: number
      readonly rules: number
      readonly options: number
    }
  }

export type SupplementalCoverage = Omit<
  StaticEffectsConversion["coverage"],
  "summary"
> & {
  readonly summary: SupplementalCoverageSummary
  readonly supplementalSource: SupplementalSourceReport
}

const assertUnique = <T>(
  values: readonly T[],
  id: (value: T) => string,
  label: string,
) => {
  const seen = new Set<string>()
  for (const value of values) {
    const key = id(value)
    if (seen.has(key))
      throw new Error(`Supplemental source repeats ${label} ${key}`)
    seen.add(key)
  }
}

/**
 * 把 3.2.5 补充实体层的规则/选项/来源位置并入固定源正式制品。
 *
 * 固定源分母（entities/packs/rawEffects）保持不变；补充层在
 * coverage.supplementalSource 单独记账。规则与目录身份必须唯一；补充层
 * 的 zzz-hp 引用改写到 2628b32，避免把 3.2.5 记录冒充 fac62407。
 */
export function mergeSupplementalSource(
  main: StaticEffectsConversion,
  supplemental: StaticEffectsConversion,
  descriptor: SupplementalSourceDescriptor,
  report: {
    readonly skills: readonly SupplementalSkillInventoryEntry[]
    readonly basePanels: readonly SupplementalBasePanelEntry[]
    readonly gaps: readonly SupplementalGapEntry[]
    readonly optionLabels?: Readonly<Record<string, SupplementalOptionLabel>>
  },
  revision: string,
): StaticEffectsConversion & { readonly coverage: SupplementalCoverage } {
  const rewriteReference = (reference: SourceReference): SourceReference =>
    reference.resourcePath === descriptor.extractPath
      ? {
          ...reference,
          sourceId: "zzz-hp",
          version: descriptor.commit,
        }
      : reference.sourceId === "zzz-hp" &&
          reference.resourcePath === BUFF_RESOURCE
        ? { ...reference, version: descriptor.commit }
        : reference
  const rewriteReferences = (
    references: NonEmpty<SourceReference>,
  ): NonEmpty<SourceReference> =>
    references.map(rewriteReference) as unknown as NonEmpty<SourceReference>

  if (
    supplemental.definitions.states.length > 0 ||
    supplemental.definitions.actions.length > 0
  )
    throw new Error(
      "Supplemental source introduces states/actions that the append-only merge does not install",
    )
  const supplementalEffects = supplemental.definitions.effects.map(
    (effect) => ({
      ...effect,
      source: {
        ...effect.source,
        references: rewriteReferences(effect.source.references),
      },
    }),
  ) as EffectRule[]
  const supplementalRecords = supplemental.coverage.records
  const supplementalEntities = supplemental.catalog.entities.map((entity) => ({
    ...entity,
    supplementProvenance: {
      sourceId: "zzz-hp",
      version: descriptor.commit,
      resources: [
        {
          path: descriptor.resourcePath,
          sha256: descriptor.sha256,
        },
      ],
    },
  }))

  // 追加而非全局重排：既有规则的顺序与 ID 索引保持不变，补充层只新增尾部。
  const effects = [...main.definitions.effects, ...supplementalEffects]
  const supplementalOptions = supplemental.catalog.options.map((option) => {
    const label = report.optionLabels?.[option.optionId]
    return {
      ...option,
      ...(label === undefined ? {} : { name: label.name }),
      ...(label?.conditionDescription === undefined
        ? {}
        : { conditionDescription: label.conditionDescription }),
      variants: option.variants.map((variant) => ({
        ...variant,
        references: rewriteReferences(variant.references),
      })),
    }
  })
  const options = [
    ...main.catalog.options,
    ...(supplementalOptions as unknown as StaticCatalogOption[]),
  ]
  const entities = [...main.catalog.entities, ...supplementalEntities]
  const skillTargets = [
    ...main.catalog.skillTargets,
    ...supplemental.catalog.skillTargets,
  ]
  // 机制元数据是全局登记，补充层的转换会重复生成同一组；按 mechanism
  // 去重并保留主来源已有内容，D4 当前不新增机制。
  const mainMechanisms = main.catalog.mechanisms ?? []
  const extraMechanisms = (supplemental.catalog.mechanisms ?? []).filter(
    (candidate) =>
      !mainMechanisms.some(
        (existing) => existing.mechanism === candidate.mechanism,
      ),
  )
  if (extraMechanisms.length > 0)
    throw new Error(
      `Supplemental source introduced unregistered mechanisms: ${extraMechanisms.map((mechanism) => mechanism.mechanism).join(", ")}`,
    )
  const differences = [
    ...main.catalog.differences,
    ...supplemental.catalog.differences,
  ].filter(
    (difference, index, all) =>
      all.findIndex(
        (candidate) => candidate.differenceId === difference.differenceId,
      ) === index,
  )

  assertUnique(effects, (effect) => effect.effectId, "effect")
  assertUnique(options, (option) => option.optionId, "option")
  assertUnique(entities, (entity) => entity.catalogEntityId, "entity")
  assertUnique(skillTargets, (target) => target.targetId, "skill target")

  const definitions: RuleSet = {
    ...main.definitions,
    revision,
    effects,
  }
  const catalog: StaticEffectCatalog = {
    ...main.catalog,
    revision,
    entities,
    options,
    skillTargets,
    differences,
  }
  const coverage: SupplementalCoverage = {
    ...main.coverage,
    revision,
    // 固定源分母与补充层分开记账：顶层数组只保留 fac62407 的覆盖，
    // 3.2.5 实体/包/记录全部位于 supplementalSource，避免把补充来源
    // 伪装成固定提交的覆盖。
    entities: main.coverage.entities,
    packs: main.coverage.packs,
    records: main.coverage.records,
    summary: {
      ...main.coverage.summary,
      rules: effects.length,
      options: options.length,
      supplementalSource: {
        entities: supplemental.coverage.summary.entities,
        packs: supplemental.coverage.summary.packs,
        rawEffects: supplemental.coverage.summary.rawEffects,
        rules: supplementalEffects.length,
        options: supplemental.catalog.options.length,
      },
    },
    supplementalSource: {
      source: descriptor,
      summary: supplemental.coverage.summary,
      entities: supplementalEntities,
      packs: supplemental.coverage.packs,
      records: supplementalRecords,
      skills: report.skills,
      basePanels: report.basePanels,
      gaps: report.gaps,
      consumptionBoundary: {
        status: "catalog-only-until-d5",
        explanation:
          "D4 supplemental entities are in the static catalog but are not part of the Nanoka integrated dataset; consumers must gate end-to-end entity selection until the D5 rebaseline and must not treat supplementProvenance as integrated provenance.",
      },
    },
  }
  return { definitions, catalog, coverage }
}
