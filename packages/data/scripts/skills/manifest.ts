import { readFile } from "node:fs/promises"
import type { IntegratedSnapshotIndex } from "../../src/integration/snapshot-types.ts"
import type {
  AgentActionManifest,
  AgentActions,
} from "../../src/skills/types.ts"
import {
  directoryRoot,
  readBytes,
  sha256,
} from "../nanoka-integration/files.ts"
import {
  maximumAttributeBytes,
  regularFiles,
} from "../panel-attributes/manifest.ts"
import evidence from "./evidence.json" with { type: "json" }

export const rulesVersion = "agent-actions/1"
export const limitations = [
  "动作与分支须显式选择，不根据入场、蓄力或前序招式推断战斗状态，不自动相加互斥档位。",
  "只解析有限的线性倍率语法；来源 CAL 特殊机制及 potential 分支逐项标记，不将缺失数据视为零。",
  "已确认逐次命中时逐段向上取整；仅有合计倍率时允许合理取整误差，但不能用于逐次附加伤害或不同命中乘区。",
  "技能等级输入明确区分训练值与最终值；M3/M5 各加二级，最终值不再叠加；普通等级一至十二。",
  "没有自动施加减防、影画伤害增益、核心属性转化或装备效果；沿用现有静态效果与后续面板适配。",
  "失衡倍率独立于伤害倍率；耀变基础倍率独立于攻击力直伤，实际结算复用现有 core/effects 公式。",
] as const

export function actionSourceContract(index: IntegratedSnapshotIndex) {
  const agents = index.entities.agents
  if (!agents) throw new Error("Agent actions require agents")
  return {
    sourceVersion: index.source.version,
    members: [...agents.memberIds],
    inputs: agents.memberIds.flatMap((id) => {
      const member = agents.members[id]
      if (!member) throw new Error(`Missing action source member: ${id}`)
      return [
        member.files.data,
        member.files.details.zh,
        member.files.details.en,
      ].map((reference) => {
        if (!reference) throw new Error(`Missing action source language: ${id}`)
        return { path: reference.path, sha256: reference.sha256 }
      })
    }),
  }
}

export async function actionRegistryDigest(): Promise<string> {
  return sha256(await readFile(new URL("./registry.json", import.meta.url)))
}

export function actionCoverage(
  agents: readonly AgentActions[],
): AgentActionManifest["coverage"] {
  const actions = agents.flatMap((agent) => agent.actions)
  return {
    agents: agents.length,
    actions: actions.length,
    damage: actions.filter((action) => action.calculation.kind === "damage")
      .length,
    dazeOnly: actions.filter(
      (action) => action.calculation.kind === "daze-only",
    ).length,
    luminize: actions.filter((action) => action.calculation.kind === "luminize")
      .length,
    unavailable: actions.filter(
      (action) => action.calculation.kind === "unavailable",
    ).length,
    individualHitActions: actions.filter(
      (action) =>
        action.calculation.kind === "damage" &&
        action.calculation.segments.every(
          (segment) => segment.granularity === "individual",
        ),
    ).length,
  }
}

function same(actual: unknown, expected: unknown, label: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(
      `Agent actions ${label} mismatch; regenerate the candidate actions`,
    )
}

/** 输入仅为固定副本及其索引；不读取或修复可变 integrated。 */
export async function verifyAgentActions(
  directory: string,
  index: IntegratedSnapshotIndex,
  staticCatalogFile: string,
): Promise<AgentActionManifest> {
  const root = await directoryRoot(directory)
  const manifest = JSON.parse(
    Buffer.from(
      await readBytes(root, "manifest.json", maximumAttributeBytes),
    ).toString("utf8"),
  ) as AgentActionManifest
  same(manifest.schemaVersion, 1, "schema version")
  same(manifest.rulesVersion, rulesVersion, "rules version")
  const source = actionSourceContract(index)
  same(manifest.sourceVersion, source.sourceVersion, "source version")
  same(manifest.members, source.members, "members")
  same(manifest.inputs, source.inputs, "source hashes")
  same(manifest.evidence, evidence, "evidence")
  same(manifest.registrySha256, await actionRegistryDigest(), "registry hash")
  same(
    manifest.staticCatalogSha256,
    sha256(await readFile(staticCatalogFile)),
    "static catalog hash",
  )
  same(manifest.limitations, limitations, "limitations")
  const paths = source.members.map((id) => `agents/${id}.json`).toSorted()
  same(Object.keys(manifest.artifacts).toSorted(), paths, "artifact membership")
  same(
    await regularFiles(root),
    [...paths, "manifest.json"].toSorted(),
    "directory membership",
  )
  const agents: AgentActions[] = []
  for (const path of paths) {
    const bytes = await readBytes(root, path, maximumAttributeBytes)
    if (sha256(bytes) !== manifest.artifacts[path])
      throw new Error(`Agent actions artifact checksum mismatch: ${path}`)
    agents.push(JSON.parse(Buffer.from(bytes).toString("utf8")) as AgentActions)
  }
  same(manifest.coverage, actionCoverage(agents), "coverage")
  const actionIds = agents.flatMap((agent) =>
    agent.actions.map((action) => action.actionId),
  )
  if (new Set(actionIds).size !== actionIds.length)
    throw new Error("Duplicate published action ID")
  return manifest
}
