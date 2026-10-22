import fixture from "./evidence/zzz-hp-325-entities.json" with { type: "json" }
import type { StaticCatalogOption } from "@randomplay/shared"
import type { SourceData } from "./source.ts"

/**
 * D4 的 3.2.5 补充来源层。
 *
 * 固定来源 fac62407 与当前 Nanoka integrated 3.2 都没有菲欧妮（1641）、
 * 赛维里安（1631）、涅槃初翎（14164）与禁罪囚笼（14163）。本层只冻结
 * 这四个实体在 ZZZ-HP 2628b32 的真实记录与 36 条技能清单，供 D4 在
 * 不切换 SOURCE_COMMIT、不重建 integrated 的前提下接入；D5 rebaseline
 * 后再由固定来源正式接管。
 *
 * 夹具逐字取自 2628b32 的
 * `zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json`，只保留
 * 四个实体与对应技能；`source.sha256` 是整份上游文件的摘要，
 * `extractSha256` 是本夹具自身的摘要。普通 build/test 不要求 raw 存在。
 */
export const D4_325_SOURCE = {
  ...fixture.source,
  extractPath: "scripts/static-effects/evidence/zzz-hp-325-entities.json",
  extractSha256:
    "5826e29d7527e8013299c8cc9cee8a4d2725d3a522719893b3c7b123f611edca",
}
export const D4_325_BASE_COMMIT = "fac62407f3d3995f8200a66be0038f292b1455fa"
export const D4_325_ENTITY_IDS = [
  "agents:pheony",
  "agents:severian",
  "w-engines:Plume_of_Rebirth",
  "w-engines:Incarcerating_Grip",
] as const

/**
 * D5 rebaseline guard：补充层只能在旧固定源上启用。固定源切换到 2628b32
 * 或已经包含四个实体时，继续 merge 会与正式来源冲突，必须显式失败并
 * 提示移除清单，而不是静默禁用或重复贡献。
 */
export function assertD4OverlayBase(
  sourceCommit: string,
  catalogEntityIds: readonly string[],
): void {
  if (
    sourceCommit === D4_325_BASE_COMMIT &&
    !catalogEntityIds.some((id) => D4_325_ENTITY_IDS.includes(id as never))
  )
    return
  throw new Error(
    "D4 supplemental overlay requires fac62407 without the four 3.2.5 entities; D5 must remove d4-325.ts, d4-merge.ts, d4-pheony.ts, d4-severian.ts, their evidence files, and the converter fallbacks (raw.conditions, supplementalSubtypeStats, settlement-critical-channel, supplemental-flat-source) before rebaselining",
  )
}

export type D4EntitySlug =
  | "pheony"
  | "severian"
  | "Plume_of_Rebirth"
  | "Incarcerating_Grip"

/** 按批次实际接管的实体裁剪来源层；夹具始终保留四个实体的完整记录。 */
export function d4EntityData(enabled: readonly D4EntitySlug[]): SourceData {
  const fixtureData = fixture as unknown as SourceData & {
    skills?: readonly {
      id: string
      agentId: string
      name: string
      damageType: string
      skillTypes: readonly string[]
      element?: string
      baseMult: number
    }[]
  }
  const enabledAgents = new Set<string>(
    enabled.filter((id) => id === "pheony" || id === "severian"),
  )
  const enabledWEngines = new Set<string>(
    enabled.filter(
      (id) => id === "Plume_of_Rebirth" || id === "Incarcerating_Grip",
    ),
  )
  return {
    ...fixtureData,
    agents: fixtureData.agents.filter((entity) =>
      enabledAgents.has(entity.id as D4EntitySlug),
    ),
    wengines: fixtureData.wengines.filter((entity) =>
      enabledWEngines.has(entity.id as D4EntitySlug),
    ),
  }
}

/** 涅槃初翎五档选项的消费端标签：不把魔法 stat 名当成用户可读名称。 */
export function d4PlumeOptionLabels(
  options: readonly StaticCatalogOption[],
): Readonly<
  Record<
    string,
    { readonly name: string; readonly conditionDescription?: string }
  >
> {
  return Object.fromEntries(
    options
      .filter(
        (option) => option.catalogEntityId === "w-engines:Plume_of_Rebirth",
      )
      .map((option) => {
        const variant = option.variants[0]
        const rank = variant?.configuration.refinements?.[0]
        const isFire = variant?.effectIds.some((effectId) =>
          /:eff-[13579]:/.test(effectId),
        )
        return [
          option.optionId,
          isFire
            ? {
                name: `精${rank ?? "?"} · 火属性增伤（选中即声明触发）`,
                conditionDescription: `选中即声明触发已生效；${option.conditionDescription}`,
              }
            : { name: `精${rank ?? "?"} · 异常精通` },
        ] as const
      }),
  )
}

export function d4SkillInventory(enabled: readonly D4EntitySlug[]): readonly {
  agentId: string
  skillId: string
  name: string
  damageType: string
  skillTypes: readonly string[]
  element: string | null
  baseMult: number
}[] {
  const agents = new Set<string>(
    enabled.filter((id) => id === "pheony" || id === "severian"),
  )
  return (
    fixture.skills as readonly {
      id: string
      agentId: string
      name: string
      damageType: string
      skillTypes: readonly string[]
      element?: string
      baseMult: number
    }[]
  )
    .filter((skill) => agents.has(skill.agentId as D4EntitySlug))
    .map((skill) => ({
      agentId: skill.agentId,
      skillId: skill.id,
      name: skill.name,
      damageType: skill.damageType,
      skillTypes: skill.skillTypes,
      element: skill.element ?? null,
      baseMult: skill.baseMult,
    }))
}

export function d4BasePanels(enabled: readonly D4EntitySlug[]): readonly {
  catalogEntityId: string
  identity: string
  values: Readonly<Record<string, unknown>>
}[] {
  const agents = new Set<string>(
    enabled.filter((id) => id === "pheony" || id === "severian"),
  )
  const wengines = new Set<string>(
    enabled.filter(
      (id) => id === "Plume_of_Rebirth" || id === "Incarcerating_Grip",
    ),
  )
  return [
    ...(
      fixture.agents as readonly {
        id: string
        basePanel?: Readonly<Record<string, unknown>>
      }[]
    )
      .filter((agent) => agents.has(agent.id as D4EntitySlug))
      .map((agent) => ({
        catalogEntityId: `agents:${agent.id}`,
        identity: `agent/${agent.id === "pheony" ? "1641" : "1631"}`,
        values: agent.basePanel ?? {},
      })),
    ...(
      fixture.wengines as readonly {
        id: string
        baseAtk?: number
        baseDef?: number
        advancedStats?: Readonly<Record<string, unknown>>
      }[]
    )
      .filter((wengine) => wengines.has(wengine.id as D4EntitySlug))
      .map((wengine) => ({
        catalogEntityId: `w-engines:${wengine.id}`,
        identity: `w-engine/${
          wengine.id === "Plume_of_Rebirth" ? "14164" : "14163"
        }`,
        values: {
          baseAtk: wengine.baseAtk ?? null,
          baseDef: wengine.baseDef ?? null,
          advancedStats: wengine.advancedStats ?? {},
        },
      })),
  ]
}
