import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import {
  CALCULATION_CONTRACT_VERSION,
  CALCULATION_GAME_VERSION,
} from "@randomplay/shared"
import type {
  ContributionRule,
  CoreSkillLevel,
  RuleSet,
  StaticEffectCatalog,
  StaticPanelRules,
} from "@randomplay/shared"
import type { AgentDetails } from "../src/integration/agent-types.ts"
import type { IntegratedSnapshotIndex } from "../src/integration/snapshot-types.ts"

/** 只读取同次冻结副本；新增未核实的 extraProperty 形态必须显式接入。 */
export async function prepareCalculationData(
  directory: string,
  index: IntegratedSnapshotIndex,
  packageVersion: string,
): Promise<void> {
  if (index.source.version !== CALCULATION_GAME_VERSION)
    throw new Error(
      `Unsupported calculation game version: ${index.source.version}`,
    )
  const read = async (path: string) =>
    JSON.parse(await readFile(join(directory, path), "utf8"))
  const definitions = (await read("definitions/effects/static.json")) as RuleSet
  const catalog = (await read(
    "definitions/effects/static-catalog.json",
  )) as StaticEffectCatalog
  const agents: Record<string, StaticPanelRules["agents"][string]> = {}
  const damageElementInheritance: StaticPanelRules["damageElementInheritance"][number][] =
    []
  const members = index.entities.agents!
  for (const id of members.memberIds) {
    const reference = members.members[id]!.files.details.zh!
    const details = (await read(`integrated/${reference.path}`)) as AgentDetails
    const special = details.specialElementType
    if (
      "name" in special &&
      (special.name === "玄墨" || special.name === "烈霜")
    ) {
      const ink = special.name === "玄墨"
      const sourceCode = ink ? "205" : "202"
      const baseName = ink ? "以太" : "冰"
      const description = special.desc.replace(/<[^>]*>/gu, "")
      if (
        !Object.hasOwn(details.elementType, sourceCode) ||
        !description.includes(
          `${special.name}属性会基于${baseName}属性结算伤害与增益效果`,
        )
      )
        throw new Error(
          `agents/${id}: special-element inheritance requires matching source evidence`,
        )
      damageElementInheritance.push({
        element: ink ? "auric-ink" : "frost",
        baseElement: ink ? "ether" : "ice",
        source: { path: reference.path, pointer: "/specialElementType/desc" },
      })
    }
    const rows = Object.entries(details.passive.level).toSorted(
      ([a], [b]) => Number(a) - Number(b),
    )
    const conversions: ContributionRule[] = []
    let deriveSheerForce = false
    if (rows.some(([, row]) => Object.keys(row.extraProperty).length)) {
      if (rows.length !== 7)
        throw new Error(
          `agents/${id}: permanent conversion requires seven core rows`,
        )
      const defenseRates: Partial<Record<CoreSkillLevel, number>> = {}
      for (const [rank, [, row]] of rows.entries()) {
        const extra = row.extraProperty
        const keys = Object.keys(extra).toSorted().join(",")
        if (
          keys === "131" &&
          extra["131"]!.target === 121 &&
          Number.isSafeInteger(extra["131"]!.value) &&
          extra["131"]!.value >= 0
        ) {
          defenseRates[(rank + 1) as CoreSkillLevel] =
            extra["131"]!.value / 10000
        } else if (
          keys === "111,121" &&
          extra["111"]!.target === 123 &&
          extra["111"]!.value === 1000 &&
          extra["121"]!.target === 123 &&
          extra["121"]!.value === 3000
        ) {
          deriveSheerForce = true
        } else
          throw new Error(
            `agents/${id}/passive/level/${rows[rank]![0]}: unverified permanent conversion`,
          )
      }
      if (deriveSheerForce && Object.keys(defenseRates).length)
        throw new Error(`agents/${id}: inconsistent conversion across ranks`)
      if (Object.keys(defenseRates).length)
        conversions.push({
          kind: "contribution",
          effectId: `agent:${id}:permanent:defense-to-attack`,
          source: {
            identity: { kind: "agent", entityId: id },
            section: "permanent-panel-conversion",
            references: rows.map(([rowId]) => ({
              sourceId: "nanoka-zzz",
              version: index.source.version,
              locale: "zh",
              resourcePath: reference.path,
              pointer: `/passive/level/${rowId}/extraProperty/131`,
            })) as unknown as ContributionRule["source"]["references"],
          },
          config: { kind: "constant", value: true },
          parameters: {
            rate: {
              kind: "by-rank",
              rank: "coreSkillLevel",
              unit: "multiplier",
              values: defenseRates,
            },
          },
          activation: { kind: "continuous" },
          beneficiary: { kind: "holder" },
          scope: "entity",
          when: { kind: "constant", value: true },
          operation: {
            kind: "stat-adjustment",
            stat: "attack",
            stage: "initial-fixed",
            value: {
              kind: "convert",
              unit: "attack-points",
              input: {
                kind: "stat",
                unit: "defense-points",
                entity: { role: "holder" },
                stat: "defense",
                stage: "initial",
                at: "evaluation",
              },
              rate: { kind: "parameter", unit: "multiplier", name: "rate" },
            },
          },
        })
    }
    agents[id] = { initialConversions: conversions, deriveSheerForce }
  }
  const twoPieceOptions: StaticPanelRules["twoPieceOptions"][number][] = []
  for (const option of catalog.options) {
    if (!option.variants.some((v) => v.configuration.minimumSetPieces === 2))
      continue
    const variant = option.variants[0]!
    const identity = catalog.entities.find(
      (e) => e.catalogEntityId === option.catalogEntityId,
    )?.identity
    if (
      option.variants.length !== 1 ||
      variant.status === "unsupported" ||
      variant.maximumLayers !== 1 ||
      variant.inputs.length ||
      identity?.kind !== "drive-disc"
    )
      throw new Error(`${option.optionId}: unsupported two-piece definition`)
    const outputs: StaticPanelRules["twoPieceOptions"][number]["outputs"][number][] =
      []
    for (const effectId of variant.effectIds) {
      const rule = definitions.effects.find((r) => r.effectId === effectId)
      if (rule?.kind !== "contribution" || rule.beneficiary.kind !== "holder")
        throw new Error(`${effectId}: two-piece rule must target its holder`)
      if (rule.operation.kind === "stat-adjustment" && rule.scope === "entity")
        outputs.push({ effectId, kind: "stat" })
      else if (
        rule.operation.kind === "factor-contribution" &&
        rule.operation.channel === "damage-bonus"
      ) {
        const condition =
          rule.when.kind === "all" && rule.when.conditions.length === 1
            ? rule.when.conditions[0]!
            : rule.when
        outputs.push(
          condition.kind === "one-of" && condition.fact === "hit.element"
            ? { effectId, kind: "elemental-damage", elements: condition.values }
            : { effectId, kind: "conditional-damage" },
        )
      } else throw new Error(`${effectId}: unverified two-piece output`)
    }
    twoPieceOptions.push({
      optionId: option.optionId,
      sourceEntityId: identity.entityId,
      outputs,
    })
  }
  const panelRules: StaticPanelRules = {
    agents,
    twoPieceOptions,
    damageElementInheritance,
  }
  const hash = createHash("sha256")
  for (const path of [
    "integrated/index.json",
    "definitions/attributes/manifest.json",
    "definitions/skills/manifest.json",
    "definitions/effects/static.json",
    "definitions/effects/static-catalog.json",
  ]) {
    hash
      .update(path)
      .update("\0")
      .update(await readFile(join(directory, path)))
      .update("\0")
  }
  hash.update(JSON.stringify(panelRules))
  const version = {
    packageVersion,
    contractVersion: CALCULATION_CONTRACT_VERSION,
    gameVersion: index.source.version,
    snapshotId: `sha256:${hash.digest("hex")}`,
  }
  await writeFile(
    join(directory, "calculation-data.ts"),
    `// Generated from the verified publication snapshot.\nimport type { CalculationDataVersion, StaticPanelRules } from "@randomplay/shared"\nexport const calculationDataVersion: CalculationDataVersion = Object.freeze(${JSON.stringify(version)})\nexport const staticPanelRules: StaticPanelRules = ${JSON.stringify(panelRules)}\n`,
  )
}
