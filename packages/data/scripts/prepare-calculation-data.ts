import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { validateStaticCatalog } from "../../core/src/effects/internal/static-catalog.ts"
import { parseEffectRuleSet } from "../../core/src/effects/parse-effect-rule-set.ts"
import { writeFileAtomically } from "./atomic-write.ts"
import { claretPanelConversion } from "./claret-panel-conversion.ts"
import {
  loadAgentActionsManifest,
  loadPanelAttributesManifest,
} from "./data-product/manifests.ts"
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

function validationError(
  file: string,
  issues: readonly {
    readonly code: string
    readonly pointer: string
    readonly message: string
  }[],
): Error {
  const shown = issues
    .slice(0, 5)
    .map(
      (issue) => `${issue.code} at ${issue.pointer || "/"}: ${issue.message}`,
    )
  const omitted = issues.length - shown.length
  return new Error(
    `${file}: ${shown.join("; ")}${omitted > 0 ? `; ${omitted} more issue(s)` : ""}`,
  )
}

function parseCalculationRuleSet(file: string, value: unknown): RuleSet {
  const parsed = parseEffectRuleSet(value)
  if (!parsed.ok) throw validationError(file, parsed.issues)
  return parsed.value
}

function validateCalculationCatalog(
  file: string,
  value: unknown,
  definitions: RuleSet,
): StaticEffectCatalog {
  const validated = validateStaticCatalog(value, definitions)
  if (!validated.ok) throw validationError(file, validated.issues)
  return validated.value
}

/** 属性与技能 manifest 的结构以 P1-1 读取器为权威；构建期复验同次快照。 */
function verifyDefinitionManifests(directory: string): void {
  const definitionsDirectory = join(directory, "definitions")
  try {
    loadPanelAttributesManifest(definitionsDirectory)
    loadAgentActionsManifest(definitionsDirectory)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`definitions/${message}`, { cause: error })
  }
}

/** 只读取同次冻结副本；新增未核实的 extraProperty 形态必须显式接入。 */
export async function prepareCalculationData(
  directory: string,
  index: IntegratedSnapshotIndex,
  packageVersion: string,
): Promise<void> {
  // D5-2 起 Nanoka integrated 与静态 effects 都已切到 3.3 基线。
  // 计算数据标记 3.3，同时接受带构建号的当前 Nanoka 快照版本。
  const supportedIntegratedVersions = new Set([
    CALCULATION_GAME_VERSION,
    "3.3.12+19634983",
  ])
  if (!supportedIntegratedVersions.has(index.source.version))
    throw new Error(
      `Unsupported calculation game version: ${index.source.version}`,
    )
  const read = async (path: string) =>
    JSON.parse(await readFile(join(directory, path), "utf8"))
  const definitions = parseCalculationRuleSet(
    "definitions/effects/static.json",
    await read("definitions/effects/static.json"),
  )
  const catalog = validateCalculationCatalog(
    "definitions/effects/static-catalog.json",
    await read("definitions/effects/static-catalog.json"),
    definitions,
  )
  verifyDefinitionManifests(directory)
  const agents: Record<string, StaticPanelRules["agents"][string]> = {}
  const damageElementInheritance: StaticPanelRules["damageElementInheritance"][number][] =
    []
  const members = index.entities.agents!
  for (const id of members.memberIds) {
    const reference = members.members[id]!.files.details.zh!
    const details = (await read(`integrated/${reference.path}`)) as AgentDetails
    const special = details.specialElementType
    // 3.2 特殊属性 id 编码即判定身份：205 玄墨（auric-ink，基于 ether 结算）、
    // 202 烈霜（frost，基于 ice 结算）；200 凛刃无面板元素继承。不匹配本地化文本。
    if ("id" in special && (special.id === 205 || special.id === 202)) {
      const ink = special.id === 205
      const sourceCode = ink ? "205" : "202"
      if (!Object.hasOwn(details.elementType, sourceCode))
        throw new Error(
          `agents/${id}: special-element inheritance requires source element type ${sourceCode}`,
        )
      damageElementInheritance.push({
        element: ink ? "auric-ink" : "frost",
        baseElement: ink ? "ether" : "ice",
        source: { path: reference.path, pointer: "/specialElementType/id" },
      })
    }
    const rows = Object.entries(details.passive.level).toSorted(
      ([a], [b]) => Number(a) - Number(b),
    )
    const conversions: ContributionRule[] = []
    let deriveSheerForce = false
    if (id === "1611")
      conversions.push(
        claretPanelConversion(
          await readFile(join(directory, "integrated", reference.path)),
          await read(`integrated/${members.members[id]!.files.data.path}`),
          definitions,
          catalog,
          index.source.version,
        ),
      )
    if (
      id === "1511" &&
      rows.length === 7 &&
      rows.every(([, row]) =>
        row.desc.some((line) =>
          line
            .replace(/<[^>]*>/gu, "")
            .includes(
              "初始异常掌控大于110点时，每超过1点初始异常掌控会使自身的冲击力提升1点",
            ),
        ),
      )
    ) {
      // 全部 7 行核心说明均包含同一固定转化：输入为初始异常掌控（initial），
      // 无条件常驻被动与 panelRules 的常驻面板转化先例一致；输出阶段
      // initial-fixed 与既有 initialConversions 的口径相同。
      conversions.push({
        kind: "contribution",
        effectId: `agent:${id}:permanent:mastery-to-impact`,
        source: {
          identity: { kind: "agent", entityId: id },
          section: "permanent-panel-conversion",
          references: rows.map(([rowId]) => ({
            sourceId: "nanoka-zzz",
            version: index.source.version,
            locale: "zh",
            resourcePath: reference.path,
            pointer: `/passive/level/${rowId}/desc/0`,
          })) as unknown as ContributionRule["source"]["references"],
        },
        config: { kind: "constant", value: true },
        parameters: {},
        activation: { kind: "continuous" },
        beneficiary: { kind: "holder" },
        scope: "entity",
        when: { kind: "constant", value: true },
        operation: {
          kind: "stat-adjustment",
          stat: "impact",
          stage: "initial-fixed",
          value: {
            kind: "convert",
            unit: "impact-points",
            input: {
              kind: "maximum",
              unit: "anomaly-mastery-points",
              operands: [
                { kind: "literal", unit: "anomaly-mastery-points", value: 0 },
                {
                  kind: "add",
                  unit: "anomaly-mastery-points",
                  operands: [
                    {
                      kind: "stat",
                      unit: "anomaly-mastery-points",
                      entity: { role: "holder" },
                      stat: "anomalyMastery",
                      stage: "initial",
                      at: "evaluation",
                    },
                    {
                      kind: "literal",
                      unit: "anomaly-mastery-points",
                      value: -110,
                    },
                  ],
                },
              ],
            },
            rate: { kind: "literal", unit: "multiplier", value: 1 },
          },
        },
      })
    }
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
  const declaredOutOfScopeTwoPiece = new Map<
    string,
    { contributions: string[] }
  >()
  for (const option of catalog.options) {
    if (!option.variants.some((v) => v.configuration.minimumSetPieces === 2))
      continue
    const variant = option.variants[0]!
    const identity = catalog.entities.find(
      (e) => e.catalogEntityId === option.catalogEntityId,
    )?.identity
    if (option.variants.length !== 1 || identity?.kind !== "drive-disc")
      throw new Error(`${option.optionId}: unsupported two-piece definition`)
    if (variant.status === "unsupported") {
      // 只接受目录如实声明的 formula-out-of-scope 二件套条款：该套装的
      // 二件套效果存在但不在当前伤害计算范围，注册表据此声明消费状态；
      // 其他不可用原因（缺身份、缺证据、语义冲突）仍是数据缺陷。
      if (variant.reason !== "formula-out-of-scope")
        throw new Error(`${option.optionId}: unsupported two-piece definition`)
      const entityId = identity.entityId
      if (declaredOutOfScopeTwoPiece.has(entityId))
        throw new Error(
          `${entityId}: duplicate declared out-of-scope two-piece option`,
        )
      declaredOutOfScopeTwoPiece.set(entityId, {
        contributions: [option.conditionDescription],
      })
      continue
    }
    if (variant.maximumLayers !== 1 || variant.inputs.length)
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
  const driveDiscSets: StaticPanelRules["driveDiscSets"][number][] = []
  for (const entity of catalog.entities) {
    if (entity.identity?.kind !== "drive-disc") continue
    const entityId = entity.identity.entityId
    const options = twoPieceOptions.filter((o) => o.sourceEntityId === entityId)
    const outOfScope = declaredOutOfScopeTwoPiece.get(entityId)
    if (options.length && outOfScope)
      throw new Error(
        `${entity.catalogEntityId}: two-piece rules and out-of-scope declarations conflict`,
      )
    // 每个已映射套装的二件套消费状态都必须可分类：有规则、或由目录如实
    // 声明越界；两者都不是时是数据缺陷，生成期即拒绝，不留给消费端猜。
    if (options.length)
      driveDiscSets.push({
        sourceEntityId: entityId,
        twoPieceConsumption: { kind: "auto-selected-options" },
      })
    else if (outOfScope)
      driveDiscSets.push({
        sourceEntityId: entityId,
        twoPieceConsumption: {
          kind: "declared-out-of-scope",
          contributions: outOfScope.contributions,
        },
      })
    else
      throw new Error(
        `${entity.catalogEntityId}: unclassified two-piece consumption; add verified rules or a declared boundary`,
      )
  }
  const panelRules: StaticPanelRules = {
    agents,
    driveDiscSets,
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
    gameVersion: CALCULATION_GAME_VERSION,
    snapshotId: `sha256:${hash.digest("hex")}`,
  }
  await writeFileAtomically(
    join(directory, "calculation-data.ts"),
    `// Generated from the verified publication snapshot.\nimport type { CalculationDataVersion, StaticPanelRules } from "@randomplay/shared"\nexport const calculationDataVersion: CalculationDataVersion = Object.freeze(${JSON.stringify(version)})\nexport const staticPanelRules: StaticPanelRules = ${JSON.stringify(panelRules)}\n`,
  )
}
