import type { AgentDetails } from "../gachabase/types.js"
import type {
  ResolveStaticBuildSkillMatrixInput,
  ResolveStaticBuildSkillMatrixResult,
  StaticBuildDamageType,
  StaticBuildSkillMatrixRow,
  StaticBuildSkillTag,
} from "./types.js"
import agentDetailsZh from "../../data/zh-CN/agent-details.json"
import { toAgentAttribute } from "../terms.js"
import { getStaticBuildAgent } from "./catalog.js"
import { resolveStaticBuildDamage } from "./resolver.js"

interface SkillMatrixTemplate {
  id: string
  agentId: string
  group: string
  label: string
  skillTypeId: number
  statName: string
  occurrence?: number
  skillTag: StaticBuildSkillTag
  damageType?: StaticBuildDamageType
  attribute?: string
  combatTags?: string[]
}

function getAgentDetails(agentId: string): AgentDetails {
  const agent = (agentDetailsZh as AgentDetails[]).find(
    (item) => item.id === agentId,
  )
  if (!agent) {
    throw new RangeError(`Missing zh-CN agent details for agentId=${agentId}`)
  }
  return agent
}

function getSkillMultiplier(
  agentId: string,
  skillTypeId: number,
  statName: string,
  occurrence = 1,
) {
  const agent = getAgentDetails(agentId)
  const skill = agent.skills.find((item) => item.typeId === String(skillTypeId))
  if (!skill) {
    throw new RangeError(
      `Missing skill type ${skillTypeId} for agentId=${agentId}`,
    )
  }

  const matches = skill.stats.filter((item) => item.name === statName)
  const stat = matches[occurrence - 1]
  const value = stat?.values.at(-1)
  if (!value) {
    throw new RangeError(
      `Missing stat ${statName}#${occurrence} for agentId=${agentId}, skillTypeId=${skillTypeId}`,
    )
  }

  return value
}

const skillMatrixTemplates: SkillMatrixTemplate[] = [
  {
    id: "1241-basic-1",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·一段",
    skillTypeId: 0,
    statName: "一段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1241-basic-2",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·二段",
    skillTypeId: 0,
    statName: "二段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1241-basic-3",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·三段",
    skillTypeId: 0,
    statName: "三段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1241-basic-4",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·四段",
    skillTypeId: 0,
    statName: "四段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1241-basic-5",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·五段",
    skillTypeId: 0,
    statName: "五段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1241-suppression-physical-1",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·请勿抵抗·物理一段",
    skillTypeId: 0,
    statName: "一段伤害倍率（物理）",
    skillTag: "basic",
    attribute: "Physical",
    combatTags: ["suppressionMode"],
  },
  {
    id: "1241-suppression-physical-2",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·请勿抵抗·物理二段",
    skillTypeId: 0,
    statName: "二段伤害倍率（物理）",
    skillTag: "basic",
    attribute: "Physical",
    combatTags: ["suppressionMode"],
  },
  {
    id: "1241-suppression-physical-3",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·请勿抵抗·物理三段",
    skillTypeId: 0,
    statName: "三段伤害倍率（物理）",
    skillTag: "basic",
    attribute: "Physical",
    combatTags: ["suppressionMode"],
  },
  {
    id: "1241-suppression-ether-1",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·请勿抵抗·以太一段",
    skillTypeId: 0,
    statName: "一段伤害倍率（以太）",
    skillTag: "basic",
    attribute: "Ether",
    combatTags: ["suppressionMode"],
  },
  {
    id: "1241-suppression-ether-2",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·请勿抵抗·以太二段",
    skillTypeId: 0,
    statName: "二段伤害倍率（以太）",
    skillTag: "basic",
    attribute: "Ether",
    combatTags: ["suppressionMode"],
  },
  {
    id: "1241-suppression-ether-3",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·请勿抵抗·以太三段",
    skillTypeId: 0,
    statName: "三段伤害倍率（以太）",
    skillTag: "basic",
    attribute: "Ether",
    combatTags: ["suppressionMode"],
  },
  {
    id: "1241-dash-ambush",
    agentId: "1241",
    group: "闪避",
    label: "冲刺攻击·火力奇袭",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "dash",
  },
  {
    id: "1241-dash-suppression-physical",
    agentId: "1241",
    group: "闪避",
    label: "冲刺攻击·火力压制·物理",
    skillTypeId: 2,
    statName: "伤害倍率（物理）",
    skillTag: "dash",
    attribute: "Physical",
    combatTags: ["suppressionMode"],
  },
  {
    id: "1241-dash-suppression-ether",
    agentId: "1241",
    group: "闪避",
    label: "冲刺攻击·火力压制·以太",
    skillTypeId: 2,
    statName: "伤害倍率（以太）",
    skillTag: "dash",
    attribute: "Ether",
    combatTags: ["suppressionMode"],
  },
  {
    id: "1241-dodge-counter",
    agentId: "1241",
    group: "闪避",
    label: "闪避反击·火力震爆",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "dash",
  },
  {
    id: "1241-assist-quick",
    agentId: "1241",
    group: "支援技",
    label: "快速支援·掩护射击",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "assist",
  },
  {
    id: "1241-assist-follow-up",
    agentId: "1241",
    group: "支援技",
    label: "支援突击·自卫还击",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "assist",
  },
  {
    id: "1241-special",
    agentId: "1241",
    group: "特殊技",
    label: "特殊技·鹿弹射击",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "special",
  },
  {
    id: "1241-enhanced-special",
    agentId: "1241",
    group: "特殊技",
    label: "强化特殊技·全弹连射",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "enhancedSpecial",
  },
  {
    id: "1241-chain",
    agentId: "1241",
    group: "连携技",
    label: "连携技·歼灭模式",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "chain",
  },
  {
    id: "1241-ultimate",
    agentId: "1241",
    group: "连携技",
    label: "终结技·歼灭模式MAX",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "ultimate",
  },
  {
    id: "1321-basic-1",
    agentId: "1321",
    group: "普通攻击",
    label: "普通攻击·一段",
    skillTypeId: 0,
    statName: "一段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1321-basic-2",
    agentId: "1321",
    group: "普通攻击",
    label: "普通攻击·二段",
    skillTypeId: 0,
    statName: "二段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1321-basic-3",
    agentId: "1321",
    group: "普通攻击",
    label: "普通攻击·三段",
    skillTypeId: 0,
    statName: "三段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1321-basic-4",
    agentId: "1321",
    group: "普通攻击",
    label: "普通攻击·四段",
    skillTypeId: 0,
    statName: "四段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1321-basic-5",
    agentId: "1321",
    group: "普通攻击",
    label: "普通攻击·五段",
    skillTypeId: 0,
    statName: "五段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1321-basic-bind",
    agentId: "1321",
    group: "普通攻击",
    label: "普通攻击·绞勒式·I型",
    skillTypeId: 0,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "basic",
  },
  {
    id: "1321-basic-bind-ii",
    agentId: "1321",
    group: "普通攻击",
    label: "普通攻击·绞勒式·II型",
    skillTypeId: 0,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "basic",
  },
  {
    id: "1321-dash",
    agentId: "1321",
    group: "闪避",
    label: "冲刺攻击·穿梭潜袭",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "dash",
  },
  {
    id: "1321-dodge-counter",
    agentId: "1321",
    group: "闪避",
    label: "闪避反击·绞缢反制",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "dash",
  },
  {
    id: "1321-assist-quick",
    agentId: "1321",
    group: "支援技",
    label: "快速支援·烈锋",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "assist",
  },
  {
    id: "1321-assist-follow-up",
    agentId: "1321",
    group: "支援技",
    label: "支援突击·轨迹干涉",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "assist",
  },
  {
    id: "1321-special-lock",
    agentId: "1321",
    group: "特殊技",
    label: "特殊技·锁系控位",
    skillTypeId: 1,
    statName: "一段伤害倍率",
    skillTag: "special",
  },
  {
    id: "1321-special-bind-wrap",
    agentId: "1321",
    group: "特殊技",
    label: "特殊技·束裂式·I型·缠绕",
    skillTypeId: 1,
    statName: "缠绕伤害倍率",
    occurrence: 1,
    skillTag: "special",
  },
  {
    id: "1321-special-bind-detonate",
    agentId: "1321",
    group: "特殊技",
    label: "特殊技·束裂式·I型·引爆",
    skillTypeId: 1,
    statName: "引爆伤害倍率",
    occurrence: 1,
    skillTag: "special",
  },
  {
    id: "1321-enhanced-wrap",
    agentId: "1321",
    group: "特殊技",
    label: "强化特殊技·束裂式·终型·缠绕",
    skillTypeId: 1,
    statName: "缠绕伤害倍率",
    occurrence: 2,
    skillTag: "enhancedSpecial",
  },
  {
    id: "1321-enhanced-detonate",
    agentId: "1321",
    group: "特殊技",
    label: "强化特殊技·束裂式·终型·引爆",
    skillTypeId: 1,
    statName: "引爆伤害倍率",
    occurrence: 2,
    skillTag: "enhancedSpecial",
  },
  {
    id: "1321-chain",
    agentId: "1321",
    group: "连携技",
    label: "连携技·月辉丝·绊",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "chain",
  },
  {
    id: "1321-ultimate-stringsong",
    agentId: "1321",
    group: "连携技",
    label: "终结技·月辉丝·弦音",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "ultimate",
  },
  {
    id: "1321-ultimate-shadow",
    agentId: "1321",
    group: "连携技",
    label: "终结技·月辉丝·弦影",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 3,
    skillTag: "ultimate",
  },
  {
    id: "1371-basic-1",
    agentId: "1371",
    group: "普通攻击",
    label: "普通攻击·一段",
    skillTypeId: 0,
    statName: "一段伤害倍率",
    skillTag: "basic",
    damageType: "sheer",
  },
  {
    id: "1371-basic-2",
    agentId: "1371",
    group: "普通攻击",
    label: "普通攻击·二段",
    skillTypeId: 0,
    statName: "二段伤害倍率",
    skillTag: "basic",
    damageType: "sheer",
  },
  {
    id: "1371-basic-3",
    agentId: "1371",
    group: "普通攻击",
    label: "普通攻击·三段",
    skillTypeId: 0,
    statName: "三段伤害倍率",
    skillTag: "basic",
    damageType: "sheer",
  },
  {
    id: "1371-basic-4",
    agentId: "1371",
    group: "普通攻击",
    label: "普通攻击·四段",
    skillTypeId: 0,
    statName: "四段伤害倍率",
    skillTag: "basic",
    damageType: "sheer",
  },
  {
    id: "1371-basic-5",
    agentId: "1371",
    group: "普通攻击",
    label: "普通攻击·五段",
    skillTypeId: 0,
    statName: "五段伤害倍率",
    skillTag: "basic",
    damageType: "sheer",
  },
  {
    id: "1371-basic-ink-cloud",
    agentId: "1371",
    group: "普通攻击",
    label: "普通攻击·墨影凝云",
    skillTypeId: 0,
    statName: "墨影凝云总伤害倍率",
    skillTag: "basic",
    damageType: "sheer",
  },
  {
    id: "1371-basic-auric-array",
    agentId: "1371",
    group: "普通攻击",
    label: "普通攻击·玄墨极阵",
    skillTypeId: 0,
    statName: "玄墨极阵总伤害倍率",
    skillTag: "basic",
    damageType: "sheer",
  },
  {
    id: "1371-basic-qingming-shock",
    agentId: "1371",
    group: "普通攻击",
    label: "普通攻击·青溟震击",
    skillTypeId: 0,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "basic",
    damageType: "sheer",
  },
  {
    id: "1371-dash",
    agentId: "1371",
    group: "闪避",
    label: "冲刺攻击·凌云破",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "dash",
    damageType: "sheer",
  },
  {
    id: "1371-dodge-counter",
    agentId: "1371",
    group: "闪避",
    label: "闪避反击·除祟一击",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "dash",
    damageType: "sheer",
  },
  {
    id: "1371-assist-quick",
    agentId: "1371",
    group: "支援技",
    label: "快速支援·流云影身",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "assist",
    damageType: "sheer",
  },
  {
    id: "1371-assist-follow-up",
    agentId: "1371",
    group: "支援技",
    label: "支援突击·霄云迅击",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "assist",
    damageType: "sheer",
  },
  {
    id: "1371-special",
    agentId: "1371",
    group: "特殊技",
    label: "特殊技·烬影诀",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "special",
    damageType: "sheer",
  },
  {
    id: "1371-enhanced-ink-form",
    agentId: "1371",
    group: "特殊技",
    label: "强化特殊技·墨痕化形",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "enhancedSpecial",
    damageType: "sheer",
  },
  {
    id: "1371-enhanced-ink-form-charge",
    agentId: "1371",
    group: "特殊技",
    label: "强化特殊技·墨痕化形·蓄力追加",
    skillTypeId: 1,
    statName: "蓄力完成追加伤害倍率",
    skillTag: "enhancedSpecial",
    damageType: "sheer",
  },
  {
    id: "1371-enhanced-cloud-strike",
    agentId: "1371",
    group: "特殊技",
    label: "强化特殊技·霄云迅击-破",
    skillTypeId: 1,
    statName: "[强化特殊技：霄云迅击-破]总伤害倍率",
    skillTag: "enhancedSpecial",
    damageType: "sheer",
  },
  {
    id: "1371-enhanced-qingming-shock",
    agentId: "1371",
    group: "特殊技",
    label: "强化特殊技·青溟震击-破",
    skillTypeId: 1,
    statName: "[强化特殊技：青溟震击-破]总伤害倍率",
    skillTag: "enhancedSpecial",
    damageType: "sheer",
  },
  {
    id: "1371-enhanced-cloud-channel",
    agentId: "1371",
    group: "特殊技",
    label: "强化特殊技·凝云术·蓄力期间",
    skillTypeId: 1,
    statName: "蓄力期间总伤害倍率",
    skillTag: "enhancedSpecial",
    damageType: "sheer",
  },
  {
    id: "1371-enhanced-fade",
    agentId: "1371",
    group: "特殊技",
    label: "强化特殊技·墨烬影消",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 3,
    skillTag: "enhancedSpecial",
    damageType: "sheer",
  },
  {
    id: "1371-chain",
    agentId: "1371",
    group: "连携技",
    label: "连携技·玄墨迅击",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "chain",
    damageType: "sheer",
  },
  {
    id: "1371-ultimate-cloud-shadow",
    agentId: "1371",
    group: "连携技",
    label: "终结技·青溟云影",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "ultimate",
    damageType: "sheer",
  },
  {
    id: "1371-ultimate-thousand-charms",
    agentId: "1371",
    group: "连携技",
    label: "终结技·符法千重",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 3,
    skillTag: "ultimate",
    damageType: "sheer",
  },
]

export function resolveStaticBuildSkillMatrix(
  input: ResolveStaticBuildSkillMatrixInput,
): ResolveStaticBuildSkillMatrixResult {
  const agent = getStaticBuildAgent(input.loadout.agentId)
  if (!agent) {
    throw new RangeError(`Unsupported agentId: ${input.loadout.agentId}`)
  }

  const templates = skillMatrixTemplates.filter(
    (item) => item.agentId === agent.id,
  )
  if (!templates.length) {
    throw new RangeError(`No skill matrix templates for agentId=${agent.id}`)
  }

  const assumptions: string[] = []
  const globalCombatTags = input.context.combatTags ?? []
  const globalExtraAbilityActive = input.context.extraAbilityActive

  const rows = templates.map((template) => {
    const skillMultiplier = getSkillMultiplier(
      template.agentId,
      template.skillTypeId,
      template.statName,
      template.occurrence,
    )
    const attribute =
      toAgentAttribute(template.attribute ?? input.context.attribute) ??
      agent.defaultAttribute
    const combatTags = [
      ...new Set([...(template.combatTags ?? []), ...globalCombatTags]),
    ]

    const build = resolveStaticBuildDamage({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout: input.loadout,
      panel: input.panel,
      scenario: {
        damageType: template.damageType ?? agent.defaultDamageType,
        skillTag: template.skillTag,
        skillMultiplier,
        attribute,
        extraAbilityActive: globalExtraAbilityActive,
        combatTags,
        enemy: input.context.enemy,
      },
      effectOverrides: input.effectOverrides,
    })

    return {
      id: template.id,
      group: template.group,
      label: template.label,
      skillTag: template.skillTag,
      damageType: template.damageType ?? agent.defaultDamageType,
      attribute,
      combatTags,
      skillMultiplier,
      build,
    } satisfies StaticBuildSkillMatrixRow
  })

  const first = rows[0]?.build
  if (!first) {
    throw new RangeError(`Empty skill matrix for agentId=${agent.id}`)
  }

  assumptions.push(
    "技能矩阵按预定义技能模板逐项调用单次 resolver 生成；若用户未额外指定状态，只使用模板自带条件与全局 context",
  )

  return {
    profile: first.profile,
    mode: first.mode,
    manualBaseMode: first.manualBaseMode,
    loadout: first.loadout,
    rows,
    assumptions,
  }
}
