import type { CrawlTask } from "./shared.js"
import { batchProcess, decodeSvelteKitData, fetchJson } from "./shared.js"

const BASE_URL = "https://zzz.gachabase.net"

// 将字符串中的各类 Unicode 空白归一化为普通空格
function norm(s: unknown) {
  return String(s ?? "")
    .replace(/\s/g, " ")
    .trim()
}

interface SvelteKitDataJson {
  type: string
  nodes: Array<{ type: string; data: unknown[] } | null>
}

// nodes[1].data 内每条 entry 的字段均为 data 数组的索引值
interface RawEntry {
  slug: number
  id: number
  name: number
  icon: number
  rarity: number
  attack_types: number
  attributes: number
  specialty: number
  faction: number
}

function parseAgentList(html: string) {
  const json = JSON.parse(html) as SvelteKitDataJson
  const pageNode = json.nodes[1]
  if (!pageNode || !Array.isArray(pageNode.data)) {
    throw new Error("Unexpected __data.json structure")
  }

  const d = pageNode.data

  // 按已知路径导航：data[0].entries → data[1].data → data[2].entries → 实际列表
  const root = d[0] as { entries: number }
  const wrapper = d[root.entries] as { data: number }
  const pageData = d[wrapper.data] as { entries: number }
  // d[pageData.entries] 是索引数组，每个数字再指向实际 entry 对象（两层间接）
  const entryIndices = d[pageData.entries] as number[]
  const entries = entryIndices.map((i) => d[i] as RawEntry)

  // 解析 {id: N, name: M, icon: P} 结构：取 name 字段的字符串值（可读名称）
  const resolveName = (ref: number) =>
    norm(d[(d[ref] as { name: number }).name])
  // rarity 用 id 字段（4 / 5 星级数字）
  const resolveRarity = (ref: number) =>
    Number(d[(d[ref] as { id: number }).id])
  const resolveNames = (arrayRef: number) =>
    (d[arrayRef] as number[]).map(resolveName)

  return entries
    .filter((entry) => resolveRarity(entry.rarity) >= 3)
    .map((entry) => ({
      id: String(d[entry.id]),
      slug: String(d[entry.slug]),
      name: norm(d[entry.name]),
      rarity: resolveRarity(entry.rarity),
      specialty: resolveName(entry.specialty),
      attributes: resolveNames(entry.attributes),
      attackTypes: resolveNames(entry.attack_types),
      url: `${BASE_URL}/agents/${d[entry.id]}/${d[entry.slug]}`,
    }))
}

// ---- 详情页解析 ----

type AgentListEntry = ReturnType<typeof parseAgentList>[number]

interface StatValue {
  id: string
  name: string
  /** level 1 基础值（已除以 divisor） */
  value: number
  /** 每级增量（已除以 divisor），null 表示该属性无成长 */
  growthPerLevel: number | null
}

interface StatBoost {
  statId: string
  value: number
}

interface Promotion {
  promotion: number
  maxLevel: number
  statBoosts: StatBoost[]
}

interface SkillDescription {
  id: string
  name: string
  description: string
}

interface SkillStat {
  id: string
  name: string
  values: string[]
}

interface Skill {
  typeId: string
  typeName: string
  descriptions: SkillDescription[]
  stats: SkillStat[]
}

interface CoreSkill {
  typeName: string
  level: number
  skills: SkillDescription[]
  statBoosts: StatBoost[]
}

interface Mindscape {
  level: number
  name: string
  description: string
  flavorDesc: string
}

interface Faction {
  id: string
  name: string
}

interface ExclusiveWeapon {
  id: string
  slug: string
  name: string
}

interface PotentialVision {
  id: string
  name: string
  abilityName: string
  abilityDesc: string
}

interface SkinAssets {
  menuIcon: string
  tabIcon: string
  circleIcon: string
  splashArt: { url: string; width: number; height: number }
}

interface Skin {
  id: string
  name: string
  description: string
  assets: SkinAssets
}

interface AgentProfile {
  gender: string
  height: string
  birthday: string
  details: string
  details2: string
  aptitude: string
  titles: string[]
}

interface AgentDetail {
  id: string
  fullName: string
  faction: Faction | null
  exclusiveWeapon: ExclusiveWeapon | null
  profile: AgentProfile
  skins: Skin[]
  stats: StatValue[]
  promotions: Promotion[]
  skills: Skill[]
  coreSkills: CoreSkill[]
  mindscapes: Mindscape[]
  potentialVisions: PotentialVision[]
}

// 直接导航辅助：读取 d[idx] 的字面值（不再向下解析）
function readVal<T>(d: unknown[], idx: number): T {
  return d[idx] as T
}

function parseAgentDetail(pageData: unknown[], agentId: string): AgentDetail {
  const d = pageData
  const root = d[0] as { data: number }
  const agentObj = d[root.data] as Record<string, number>

  // faction
  const factionRaw = d[agentObj.faction] as {
    id: number
    name: number
  } | null
  const faction: Faction | null = factionRaw
    ? {
        id: String(readVal(d, factionRaw.id)),
        name: norm(readVal(d, factionRaw.name)),
      }
    : null

  // exclusive_weapon
  const ewRaw = d[agentObj.exclusive_weapon] as {
    id: number
    slug: number
    name: number
  } | null
  const exclusiveWeapon: ExclusiveWeapon | null = ewRaw
    ? {
        id: String(readVal(d, ewRaw.id)),
        slug: String(readVal(d, ewRaw.slug)),
        name: norm(readVal(d, ewRaw.name)),
      }
    : null

  // 通用解码器（一次调用，供 profile / skins / skills 复用）
  const decoded = decodeSvelteKitData(pageData) as {
    data: Record<string, unknown>
  }
  const a = decoded.data

  // full_name — 直接导航（简单字符串）
  const fullName = norm(readVal(d, agentObj.full_name))

  // profile — 用通用解码器（全为文本/数字字段）
  const profileDecoded = a.profile as {
    gender: string
    height: number
    birthday: string
    details: string
    details_2: string
    aptitude: string
    titles: string[]
  }
  const profile: AgentProfile = {
    gender: norm(profileDecoded.gender),
    height: norm(String(profileDecoded.height ?? "")),
    birthday: norm(profileDecoded.birthday),
    details: norm(profileDecoded.details),
    details2: norm(profileDecoded.details_2),
    aptitude: norm(profileDecoded.aptitude),
    titles: (profileDecoded.titles ?? []).map((t) => norm(t)),
  }

  // skins — 直接导航取 assets URL，解码器取文本
  const skinsRawArr = readVal<number[]>(d, agentObj.skins)
  const decodedSkinsArr = a.skins as Array<{
    id: unknown
    name: string
    desc: string
    assets: {
      menu_icon: string
      tab_icon: string
      circle_icon: string
      splash_art: { url: string; width: number; height: number }
    }
  }>
  const skins: Skin[] = skinsRawArr.map((sIdx, i) => {
    const sRaw = d[sIdx] as { assets: number }
    const assetsRaw = d[sRaw.assets] as {
      menu_icon: number
      tab_icon: number
      circle_icon: number
      splash_art: number
    }
    const splashRaw = d[assetsRaw.splash_art] as {
      url: number
      width: number
      height: number
    }
    const decodedSkin = decodedSkinsArr[i]
    return {
      id: String(readVal(d, (d[sIdx] as { id: number }).id)),
      name: norm(decodedSkin.name),
      description: norm(decodedSkin.desc),
      assets: {
        menuIcon: String(readVal(d, assetsRaw.menu_icon)),
        tabIcon: String(readVal(d, assetsRaw.tab_icon)),
        circleIcon: String(readVal(d, assetsRaw.circle_icon)),
        splashArt: {
          url: String(readVal(d, splashRaw.url)),
          width: readVal<number>(d, splashRaw.width),
          height: readVal<number>(d, splashRaw.height),
        },
      },
    }
  })

  // base_stats: 直接导航取 value、growth 和 divisor，计算后写入
  const bsArr = readVal<number[]>(d, agentObj.base_stats)
  // 先建 statId → divisor 映射，供 promotions / coreSkills 复用
  const divisorById: Record<string, number> = {}
  const stats: StatValue[] = bsArr.map((bsIdx) => {
    const bs = d[bsIdx] as { stat: number; value: number; growth: number }
    const statObj = d[bs.stat] as {
      id: number
      name: number
      divisor: number
    }
    const statId = String(readVal(d, statObj.id))
    const divisor = readVal<number>(d, statObj.divisor) || 1
    divisorById[statId] = divisor
    const rawValue = readVal<number>(d, bs.value)
    const rawGrowth =
      bs.growth != null ? (readVal<number | null>(d, bs.growth) ?? null) : null
    return {
      id: statId,
      name: norm(readVal(d, statObj.name)),
      value: rawValue / divisor,
      // growth 存储单位为 1/10000 的 stat 原始值，再除以 divisor 得显示单位每级增量
      growthPerLevel: rawGrowth != null ? rawGrowth / 10000 / divisor : null,
    }
  })

  // promotions: 直接导航取每阶段的 stat_boost 加成值（除以对应 divisor）
  const promotionsArr = readVal<number[]>(d, agentObj.promotions)
  const promotions: Promotion[] = promotionsArr.map((pIdx) => {
    const p = d[pIdx] as {
      promotion: number
      max_level: number
      stat_boost: number
    }
    const statBoostArr = readVal<number[]>(d, p.stat_boost)
    const statBoosts: StatBoost[] = statBoostArr.map((sbIdx) => {
      const sb = d[sbIdx] as { stat: number; value: number }
      const statObj = d[sb.stat] as { id: number }
      const statId = String(readVal(d, statObj.id))
      const divisor = divisorById[statId] ?? 1
      return { statId, value: readVal<number>(d, sb.value) / divisor }
    })
    return {
      promotion: readVal<number>(d, p.promotion),
      maxLevel: readVal<number>(d, p.max_level),
      statBoosts,
    }
  })

  // skills: descriptions 用通用解码器（工作正常），stats（倍率）用直接导航
  const rawSkillsObj = agentObj.skills
  const skillsObjRaw = d[rawSkillsObj] as Record<string, number>

  const skills: Skill[] = Object.entries(skillsObjRaw).map(
    ([typeKey, skillIdx]) => {
      const skillRaw = d[skillIdx] as {
        type: number
        descriptions: number
        stats: number
      }
      const typeObj = d[skillRaw.type] as { id: number; name: number }

      // descriptions — from decoded data (handles text fields correctly)
      const decodedSkills = (
        a.skills as Record<
          string,
          {
            type: { id: string; name: string }
            descriptions: Array<{
              id: string
              name: string
              description: string
            }>
          }
        >
      )[typeKey]
      const descriptions: SkillDescription[] = decodedSkills.descriptions.map(
        (desc) => ({
          id: desc.id,
          name: norm(desc.name),
          description: norm(desc.description),
        }),
      )

      // stats (倍率) — 直接导航，避免大整数被误解析
      const statsArr = readVal<number[]>(d, skillRaw.stats)
      const skillStats: SkillStat[] = statsArr
        .map((sIdx) => {
          const s = d[sIdx] as { id: number; name: number; values: number }
          const valuesArr = readVal<number[]>(d, s.values)
          if (!valuesArr.length) return null
          const values = valuesArr.map((vIdx) => {
            const inner = d[vIdx]
            return String(
              Array.isArray(inner) ? d[(inner as number[])[0]] : inner,
            )
          })
          return {
            id: String(readVal(d, s.id)),
            name: norm(readVal(d, s.name)),
            values,
          }
        })
        .filter((s): s is SkillStat => s !== null)

      return {
        typeId: String(readVal(d, typeObj.id)),
        typeName: norm(readVal(d, typeObj.name)),
        descriptions,
        stats: skillStats,
      }
    },
  )

  // core_skills — 文本用通用解码器，stat_boosts 用直接导航（需要 divisor）
  const coreSkillsRawArr = readVal<number[]>(d, agentObj.core_skills)
  const coreSkills: CoreSkill[] = (
    a.core_skills as Array<{
      type: { name: string }
      level: unknown
      skills: Array<{ id: string; name: string; description: string }>
    }>
  ).map((cs, i) => {
    const csRaw = d[coreSkillsRawArr[i]] as { stat_boosts: number }
    const sbArr = readVal<number[]>(d, csRaw.stat_boosts)
    const statBoosts: StatBoost[] = sbArr.map((sbIdx) => {
      const sb = d[sbIdx] as { stat: number; value: number }
      const statObj = d[sb.stat] as { id: number }
      const statId = String(readVal(d, statObj.id))
      const divisor = divisorById[statId] ?? 1
      return { statId, value: readVal<number>(d, sb.value) / divisor }
    })
    return {
      typeName: norm(cs.type.name),
      level: typeof cs.level === "number" ? cs.level : i + 1,
      skills: cs.skills.map((s) => ({
        id: s.id,
        name: norm(s.name),
        description: norm(s.description),
      })),
      statBoosts,
    }
  })

  // mindscapes — level 字段为字面整数 1-6，但 SvelteKit 格式无法区分字面值与索引
  // 若解码为非整数（误解析成其他数据），按数组位置 fallback
  const mindscapes = (
    a.mindscapes as Array<{
      level: unknown
      name: string
      desc: string
      flavor_desc: string
    }>
  ).map((m, i) => ({
    level: typeof m.level === "number" ? m.level : i + 1,
    name: norm(m.name),
    description: norm(m.desc),
    flavorDesc: norm(m.flavor_desc),
  }))

  // potentials_info — 潜能激化，部分代理人有 6 个等级
  const potentialVisions: PotentialVision[] = (
    (a.potentials_info ?? []) as Array<{
      id: string
      name: string
      ability_name: string
      ability_desc: string
    }>
  ).map((p) => ({
    id: p.id,
    name: norm(p.name),
    abilityName: norm(p.ability_name),
    abilityDesc: norm(p.ability_desc),
  }))

  return {
    id: agentId,
    fullName,
    faction,
    exclusiveWeapon,
    profile,
    skins,
    stats,
    promotions,
    skills,
    coreSkills,
    mindscapes,
    potentialVisions,
  }
}

async function fetchAllAgentDetails(
  agentList: AgentListEntry[],
  lang: string,
): Promise<AgentDetail[]> {
  return batchProcess(
    agentList,
    async (agent) => {
      const json = await fetchJson<SvelteKitDataJson>(
        `${agent.url}/__data.json?lang=${lang}`,
      )
      const pageNode = json.nodes[1]
      if (!pageNode || !Array.isArray(pageNode.data)) {
        throw new Error(`Unexpected detail structure for agent ${agent.id}`)
      }
      return parseAgentDetail(pageNode.data, agent.id)
    },
    5,
    1000,
  )
}

// ---- Tasks ----

const LANGS = ["en", "zh-CN"] as const

export const tasks: CrawlTask[] = LANGS.flatMap((lang) => [
  {
    name: `${lang}/gachabase-agents`,
    url: `${BASE_URL}/agents/__data.json?lang=${lang}`,
    extract: (_, html) => parseAgentList(html),
  },
  {
    name: `${lang}/gachabase-agent-details`,
    url: `${BASE_URL}/agents/__data.json?lang=${lang}`,
    extract: async (_, html) =>
      fetchAllAgentDetails(parseAgentList(html), lang),
  },
])
