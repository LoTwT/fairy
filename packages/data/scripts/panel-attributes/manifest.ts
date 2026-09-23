import { readdir } from "node:fs/promises"
import { join, relative } from "node:path"
import type { PanelAttributeManifest } from "../../src/attributes/types.ts"
import type { IntegratedSnapshotIndex } from "../../src/integration/snapshot-types.ts"
import {
  directoryRoot,
  readBytes,
  sha256,
} from "../nanoka-integration/files.ts"
import evidence from "./evidence.json" with { type: "json" }

export const rulesVersion = "panel-attributes/1"
export const limitations = [
  "只提供 60 级满突破的培养前基础值；核心 1—7 独立选择，extraLevel 提升每行已累计。",
  "不含核心被动属性转化（如本的防御转攻击、命破角色的贯穿力转化）；完整面板适配另行实现，已结算面板不得再次添加。",
  "不含影画、音擎精炼、套装或战斗效果；沿用 effects 的独立增益定义。驱动盘二件套在配装面板阶段结算一次。",
  "保留来源公式的计算精度；显示整数和输入截图不能用于反推隐藏精度。",
  "仅归一化已核实的属性；非零 penDelta、未知属性或缩放格式拒绝生成。特殊资源不推断为能量回复。",
] as const
export const maximumAttributeBytes = 16 * 1024 * 1024
export const discrepancies = [
  {
    id: "disc-impact-percent",
    description:
      "ZZZ-HP affixPanelCalc 将 6 号冲击力 18% 按点数传递；此表按比例 0.18 记录。",
  },
  {
    id: "astra-anomaly-mastery",
    description:
      "耀嘉音异常掌控使用 Nanoka elementAbnormalPower=93；ZZZ-HP 固定默认面板为 92，不推断为核心档位差异。",
  },
  {
    id: "display-rounding",
    description:
      "耀嘉音 F 核心攻击为 715.7699，玲珑妆匣基础攻击为 713.76；ZZZ-HP 对应显示默认值为 715、713，此表不提前取整。",
  },
  {
    id: "ben-passive-conversion",
    description:
      "本 F 核心属性攻击为 653.0866；额外防御转攻击使裸装结果为 1232.31468（ZZZ-HP 默认显示 1232）。该转化不在 extraLevel 或当前静态效果目录内，后续面板适配必须补齐。",
  },
  {
    id: "energy-effect-units",
    description:
      "聚宝箱等音擎的每秒固定回能文案与现有 energyRegen 效果百分比转换有待核对；本轮不改效果定义，也不以此要求用户拆解已结算面板。",
  },
] as const

/** 仅依赖代理人和音擎的成员、公共数据与中英文身份/语义证据。 */
export function attributeSourceContract(index: IntegratedSnapshotIndex) {
  const agents = index.entities.agents
  const wEngines = index.entities["w-engines"]
  if (!agents || !wEngines)
    throw new Error("Panel attributes require agents and w-engines")
  const inputs = [agents, wEngines].flatMap((entity) =>
    entity.memberIds.flatMap((id) => {
      const member = entity.members[id]
      if (!member) throw new Error(`Missing panel source member: ${id}`)
      return [
        member.files.data,
        member.files.details.zh,
        member.files.details.en,
      ].map((ref) => {
        if (!ref) throw new Error(`Missing panel source language: ${id}`)
        return { path: ref.path, sha256: ref.sha256 }
      })
    }),
  )
  return {
    sourceVersion: index.source.version,
    members: {
      agents: [...agents.memberIds],
      wEngines: [...wEngines.memberIds],
    },
    inputs,
  }
}

export function attributeArtifactPaths(
  index: IntegratedSnapshotIndex,
): string[] {
  const { members } = attributeSourceContract(index)
  return [
    ...members.agents.map((id) => `agents/${id}.json`),
    ...members.wEngines.map((id) => `w-engines/${id}.json`),
    "drive-disc-affixes.json",
  ]
}

export async function regularFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true, recursive: true })
  return entries
    .flatMap((entry) => {
      if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory()))
        throw new Error(`Unsupported definitions entry: ${entry.name}`)
      return entry.isFile()
        ? [relative(root, join(entry.parentPath, entry.name))]
        : []
    })
    .toSorted()
}

function same(actual: unknown, expected: unknown, label: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(
      `Panel attributes ${label} mismatch; regenerate the candidate attributes`,
    )
}

/** 只接收已固定的 integrated 索引；不访问可变 integrated，也不参与来源副本获取。 */
export async function verifyPanelAttributes(
  attributesDirectory: string,
  index: IntegratedSnapshotIndex,
): Promise<PanelAttributeManifest> {
  const root = await directoryRoot(attributesDirectory)
  const manifest = JSON.parse(
    Buffer.from(
      await readBytes(root, "manifest.json", maximumAttributeBytes),
    ).toString("utf8"),
  ) as PanelAttributeManifest
  same(manifest.schemaVersion, 1, "schema version")
  same(manifest.rulesVersion, rulesVersion, "rules version")
  const source = attributeSourceContract(index)
  same(manifest.sourceVersion, source.sourceVersion, "source version")
  same(manifest.members, source.members, "members")
  same(manifest.inputs, source.inputs, "source hashes")
  same(manifest.evidence, evidence, "evidence")
  same(manifest.limitations, limitations, "limitations")
  same(manifest.discrepancies, discrepancies, "discrepancies")
  const paths = attributeArtifactPaths(index).toSorted()
  same(Object.keys(manifest.artifacts).toSorted(), paths, "artifact membership")
  same(
    await regularFiles(root),
    [...paths, "manifest.json"].toSorted(),
    "directory membership",
  )
  for (const path of paths) {
    const bytes = await readBytes(root, path, maximumAttributeBytes)
    if (manifest.artifacts[path] !== sha256(bytes))
      throw new Error(`Panel attributes artifact checksum mismatch: ${path}`)
  }
  return manifest
}
