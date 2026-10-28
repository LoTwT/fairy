/**
 * 菲欧妮（1641）额外能力[黑枝王牌]的同阵营资格来源。
 *
 * Nanoka `/passive/level/1641501—1641507/desc/1` 的最终原文为
 * “队伍中存在其他[异常]角色或同阵营角色时触发”；英文使用
 * “another character”，明确排除持有者本人。`camp` 12 的完整成员集合
 * 由固定 integrated 索引按 Pointer 派生，不接受手填无证据集合。
 */
export const PHEONY_ADDITIONAL_ABILITY_TEAM_CONDITION_DIFFERENCE_ID =
  "pheony-additional-ability-team-condition"

export const PHEONY_ADDITIONAL_ABILITY_SAME_FACTION_CAMP = 12

export const PHEONY_ADDITIONAL_ABILITY_SAME_FACTION_AGENT_ENTITY_IDS = [
  "1341",
  "1471",
  "1481",
  "1541",
  "1641",
] as const

export const PHEONY_ADDITIONAL_ABILITY_INDEX_EVIDENCE = {
  path: "index.json",
  sha256: "d68ad1d80b203b9633f2cd6d176e4051c15c52f2ea3c0d71a2d2310c8b1a1b6d",
  pointers: PHEONY_ADDITIONAL_ABILITY_SAME_FACTION_AGENT_ENTITY_IDS.map(
    (agentEntityId) =>
      `/entities/agents/members/${agentEntityId}/sourceRecord/camp`,
  ),
} as const

interface IntegratedAgentMember {
  readonly sourceRecord?: { readonly camp?: unknown }
}

interface IntegratedIndex {
  readonly entities?: {
    readonly agents?: {
      readonly members?: Readonly<Record<string, IntegratedAgentMember>>
    }
  }
}

function pointerExists(document: unknown, pointer: string): boolean {
  let current: unknown = document
  for (const raw of pointer.split("/").slice(1)) {
    const token = raw.replaceAll("~1", "/").replaceAll("~0", "~")
    if (current === null || typeof current !== "object") return false
    if (!Object.hasOwn(current, token)) return false
    current = (current as Record<string, unknown>)[token]
  }
  return true
}

/**
 * 生成期核验：固定 integrated 索引必须仍把预期五个代理人登记为 camp 12，
 * 且 camp 12 没有其他成员。Pointer 缺失、成员增减或 camp 变化都拒绝生成。
 */
export function verifyPheonyAdditionalAbilitySameFactionIndex(
  document: unknown,
): readonly string[] {
  const members = (document as IntegratedIndex).entities?.agents?.members
  if (members === undefined)
    throw new Error("Pheony additional ability faction index has no agents")
  for (const pointer of PHEONY_ADDITIONAL_ABILITY_INDEX_EVIDENCE.pointers) {
    if (!pointerExists(document, pointer))
      throw new Error(
        `Pheony additional ability faction pointer missing: ${pointer}`,
      )
    const memberId = pointer.split("/")[4]
    const camp =
      memberId === undefined ? undefined : members[memberId]?.sourceRecord?.camp
    if (camp !== PHEONY_ADDITIONAL_ABILITY_SAME_FACTION_CAMP)
      throw new Error(
        `Pheony additional ability faction camp changed: ${pointer}=${String(camp)}`,
      )
  }
  const derived = Object.entries(members)
    .filter(
      ([, member]) =>
        member.sourceRecord?.camp ===
        PHEONY_ADDITIONAL_ABILITY_SAME_FACTION_CAMP,
    )
    .map(([agentEntityId]) => agentEntityId)
    .toSorted()
  const expected = [...PHEONY_ADDITIONAL_ABILITY_SAME_FACTION_AGENT_ENTITY_IDS]
  if (JSON.stringify(derived) !== JSON.stringify(expected))
    throw new Error(
      `Pheony additional ability faction membership changed: ${JSON.stringify(derived)}`,
    )
  return derived
}
