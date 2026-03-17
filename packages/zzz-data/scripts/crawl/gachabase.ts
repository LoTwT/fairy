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
  icon: string
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

interface AgentAssets {
  /** 影画（星映）背景图，共 3 张（对应 mindscapes 1-3） */
  mindscapeImages: Array<{ url: string; width: number; height: number }>
}

interface AgentDetail {
  id: string
  fullName: string
  faction: Faction | null
  exclusiveWeapon: ExclusiveWeapon | null
  assets: AgentAssets
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

function resolveSkillStatValue(
  d: unknown[],
  valueRef: number,
  templateText: string,
): string {
  const value = d[valueRef]

  if (!Array.isArray(value)) {
    return String(value)
  }

  if (value.length === 0) {
    return templateText
  }

  return String(d[value[0] as number])
}

function parseAgentDetail(pageData: unknown[], agentId: string): AgentDetail {
  const d = pageData
  const root = d[0] as { data: number }
  const agentObj = d[root.data] as Record<string, number>

  // faction
  const factionRaw = d[agentObj.faction] as {
    id: number
    name: number
    icon: number
  } | null
  const faction: Faction | null = factionRaw
    ? {
        id: String(readVal(d, factionRaw.id)),
        name: norm(readVal(d, factionRaw.name)),
        icon: String(readVal(d, factionRaw.icon)),
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
    titles: Array<string | { title: string }>
  }
  const profile: AgentProfile = {
    gender: norm(profileDecoded.gender),
    height: norm(String(profileDecoded.height ?? "")),
    birthday: norm(profileDecoded.birthday),
    details: norm(profileDecoded.details),
    details2: norm(profileDecoded.details_2),
    aptitude: norm(profileDecoded.aptitude),
    // titles 有两种结构：普通 agent 是 string[]，特殊 agent 是 {title, description, icon}[]
    titles: (profileDecoded.titles ?? []).map((t) =>
      typeof t === "string" ? norm(t) : norm(t.title),
    ),
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
          const s = d[sIdx] as {
            id: number
            name: number
            text: number
            values: number
          }
          const templateText = norm(readVal(d, s.text))
          const valuesArr = readVal<number[]>(d, s.values)
          if (!valuesArr.length) return null
          const values = valuesArr.map((vIdx) =>
            resolveSkillStatValue(d, vIdx, templateText),
          )
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

  // core_skills — 文本用通用解码器，等级按数组顺序展开，stat_boosts 用直接导航（需要 divisor）
  const coreSkillsRawArr = readVal<number[]>(d, agentObj.core_skills)
  const coreSkills: CoreSkill[] = (
    a.core_skills as Array<{
      type: { name: string }
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
      level: i + 1,
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

  // assets: mindscape_1/2/3 背景图（影画界面背景，与 skin splashArt 不同）
  const assetsRaw = d[agentObj.assets] as {
    mindscape_1: number
    mindscape_2: number
    mindscape_3: number
  }
  const parseMindscapeImage = (ref: number) => {
    const img = d[ref] as { url: number; width: number; height: number }
    return {
      url: String(readVal(d, img.url)),
      width: readVal<number>(d, img.width),
      height: readVal<number>(d, img.height),
    }
  }
  const assets: AgentAssets = {
    mindscapeImages: [
      parseMindscapeImage(assetsRaw.mindscape_1),
      parseMindscapeImage(assetsRaw.mindscape_2),
      parseMindscapeImage(assetsRaw.mindscape_3),
    ],
  }

  return {
    id: agentId,
    fullName,
    faction,
    exclusiveWeapon,
    assets,
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

// ---- W-Engines ----

interface WEngineEffect {
  level: number
  name: string
  effect: string
}

interface WEngineStat {
  id: string
  name: string
  /**
   * 显示单位的值（已除以 divisor）。
   * 百分比属性（AM/CRIT/ATK%等）为小数（如 0.12 = 12%），整数属性（AP）为整数。
   * 二级属性成长公式：stat(star) = value × (1 + stars[star].advancedStatGrowth / 10000)
   * 注意：成长公式的除数始终为 10000，与属性种类无关。
   */
  value: number
}

interface WEngine {
  id: string
  slug: string
  name: string
  icon: string
  /** 3 = A（4★），4 = S（5★） */
  rarity: number
  specialty: { id: string; name: string }
  /**
   * 专属代理人名称（列表页仅有名称，无 id/slug）。
   * null 表示非专属音擎；"" 表示专属但 gachabase 尚未填充名称。
   * 可通过 agent.exclusiveWeapon 反查完整 agent 信息。
   */
  exclusiveAgentName: string | null
  baseStat: WEngineStat
  advancedStat: WEngineStat
  /** 精炼等级 1-5 的效果文本 */
  effects: WEngineEffect[]
}

function parseWEngineList(html: string): WEngine[] {
  const json = JSON.parse(html) as SvelteKitDataJson
  const pageNode = json.nodes[1]
  if (!pageNode || !Array.isArray(pageNode.data)) {
    throw new Error("Unexpected __data.json structure")
  }
  const d = pageNode.data

  // 导航：d[0].data → d[1].entries → d[2].entries → entry 索引数组
  const root = d[0] as { data: number }
  const wrapper = d[root.data] as { entries: number }
  const page = d[wrapper.entries] as { entries: number }
  const entryIndices = d[page.entries] as number[]
  const entries = entryIndices.map((i) => d[i] as Record<string, number>)

  return entries.map((entry) => {
    const rarityObj = d[entry.rarity] as { id: number }
    const rarity = readVal<number>(d, rarityObj.id)

    const specObj = d[entry.specialty] as { id: number; name: number }
    const specialty = {
      id: String(readVal(d, specObj.id)),
      name: norm(readVal(d, specObj.name)),
    }

    // exclusive_agent: -1 = 无专属代理人（哨兵值），否则为指向 {icon, name} 对象的索引
    const eaRaw =
      entry.exclusive_agent === -1
        ? null
        : (d[entry.exclusive_agent] as { icon: number; name: number })
    const exclusiveAgentName: string | null =
      eaRaw === null ? null : norm(readVal(d, eaRaw.name))

    const bsRaw = d[entry.base_stat] as { stat: number; value: number }
    const bsStatObj = d[bsRaw.stat] as {
      id: number
      name: number
      divisor: number
    }
    const bsDivisor = readVal<number>(d, bsStatObj.divisor) || 1
    const baseStat: WEngineStat = {
      id: String(readVal(d, bsStatObj.id)),
      name: norm(readVal(d, bsStatObj.name)),
      value: readVal<number>(d, bsRaw.value) / bsDivisor,
    }

    const advRaw = d[entry.advanced_stat] as { stat: number; value: number }
    const advStatObj = d[advRaw.stat] as {
      id: number
      name: number
      divisor: number
    }
    const advDivisor = readVal<number>(d, advStatObj.divisor) || 1
    const advancedStat: WEngineStat = {
      id: String(readVal(d, advStatObj.id)),
      name: norm(readVal(d, advStatObj.name)),
      value: readVal<number>(d, advRaw.value) / advDivisor,
    }

    const effectIndices = readVal<number[]>(d, entry.effect)
    const effects: WEngineEffect[] = effectIndices.map((eIdx) => {
      const e = d[eIdx] as { level: number; name: number; effect: number }
      return {
        level: readVal<number>(d, e.level),
        name: norm(readVal(d, e.name)),
        effect: norm(readVal(d, e.effect)),
      }
    })

    return {
      id: String(readVal(d, entry.id)),
      slug: String(readVal(d, entry.slug)),
      name: norm(readVal(d, entry.name)),
      icon: String(readVal(d, entry.icon)),
      rarity,
      specialty,
      exclusiveAgentName,
      baseStat,
      advancedStat,
      effects,
    }
  })
}

// ---- W-Engine Details ----

interface WEngineLevelData {
  level: number
  baseStatGrowth: number
}

interface WEngineStarData {
  star: number
  minLevel: number
  maxLevel: number
  baseStatGrowth: number
  advancedStatGrowth: number
}

interface WEngineDetailAssets {
  splashArt: { url: string; width: number; height: number }
}

interface WEngineDetail {
  id: string
  slug: string
  name: string
  shortComment: string
  longComment: string
  /**
   * 专属代理人（含 id/slug/name），null 表示非专属。
   * 注意：部分新代理人的 slug 可能等于 id（gachabase 数据未完整录入），name 可能为空。
   */
  exclusiveAgent: { id: string; slug: string; name: string } | null
  assets: WEngineDetailAssets
  /** lv0-60 的累计 base ATK 成长量 */
  levels: WEngineLevelData[]
  /** star0-5 的突破加成（base + advanced 均为累计值） */
  stars: WEngineStarData[]
}

function parseWEngineDetail(pageData: unknown[], weId: string): WEngineDetail {
  const d = pageData
  const root = d[0] as { data: number }
  const obj = d[root.data] as Record<string, number>

  const id = String(readVal(d, obj.id))
  const slug = String(readVal(d, obj.slug))
  const name = norm(readVal(d, obj.name))
  const shortComment = norm(readVal<string>(d, obj.short_comment))
  const longComment = norm(readVal<string>(d, obj.long_comment))

  const levelsArr = readVal<number[]>(d, obj.levels)
  const levels: WEngineLevelData[] = levelsArr.map((lIdx) => {
    const lv = d[lIdx] as { level: number; base_stat_growth: number }
    return {
      level: readVal<number>(d, lv.level),
      baseStatGrowth: readVal<number>(d, lv.base_stat_growth),
    }
  })

  const starsArr = readVal<number[]>(d, obj.stars)
  const stars: WEngineStarData[] = starsArr.map((sIdx) => {
    const s = d[sIdx] as {
      star: number
      minimum_level: number
      maximum_level: number
      base_stat_growth: number
      advanced_stat_growth: number
    }
    return {
      star: readVal<number>(d, s.star),
      minLevel: readVal<number>(d, s.minimum_level),
      maxLevel: readVal<number>(d, s.maximum_level),
      baseStatGrowth: readVal<number>(d, s.base_stat_growth),
      advancedStatGrowth: readVal<number>(d, s.advanced_stat_growth),
    }
  })

  // exclusive_agent: null → 非专属；否则解析 {id, slug, name}
  const eaRawData = d[obj.exclusive_agent] as {
    id: number
    slug: number
    name: number
  } | null
  const exclusiveAgent: { id: string; slug: string; name: string } | null =
    eaRawData === null
      ? null
      : {
          id: String(readVal(d, eaRawData.id)),
          slug: String(readVal(d, eaRawData.slug)),
          name: norm(readVal(d, eaRawData.name)),
        }

  // assets: 只取 splash_art（big/medium/small icon 已在 list 页的 icon 字段）
  const assetsRaw = d[obj.assets] as {
    big_icon: number
    medium_icon: number
    small_icon: number
    splash_art: number
  }
  const splashRaw = d[assetsRaw.splash_art] as {
    url: number
    width: number
    height: number
  }
  const assets: WEngineDetailAssets = {
    splashArt: {
      url: String(readVal(d, splashRaw.url)),
      width: readVal<number>(d, splashRaw.width),
      height: readVal<number>(d, splashRaw.height),
    },
  }

  return {
    id: weId || id,
    slug,
    name,
    shortComment,
    longComment,
    exclusiveAgent,
    assets,
    levels,
    stars,
  }
}

async function fetchAllWEngineDetails(
  wEngineList: WEngine[],
  lang: string,
): Promise<WEngineDetail[]> {
  return batchProcess(
    wEngineList,
    async (we) => {
      const url = `${BASE_URL}/w-engines/${we.id}/${we.slug}/__data.json?lang=${lang}`
      const json = await fetchJson<SvelteKitDataJson>(url)
      const pageNode = json.nodes[1]
      if (!pageNode || !Array.isArray(pageNode.data)) {
        throw new Error(`Unexpected detail structure for w-engine ${we.id}`)
      }
      return parseWEngineDetail(pageNode.data, we.id)
    },
    5,
    1000,
  )
}

// ---- Bangboo ----

interface BangbooStat {
  id: string
  name: string
  /** level 1 基础值（已除以 divisor） */
  value: number
  /** 每级增量（已除以 divisor），null 表示无成长 */
  growthPerLevel: number | null
}

interface BangbooSkillStat {
  title: string
  /** 10 个等级的显示值（已将模板 {0} 替换为实际数值） */
  values: string[]
}

interface BangbooSkill {
  typeId: string
  name: string
  description: string
  stats: BangbooSkillStat[]
}

interface BangbooAssets {
  circleIcon: string
  splashArt: { url: string; width: number; height: number }
}

interface BangbooOptimization {
  /** 优化等级 1-6 */
  level: number
  /** 该等级允许的最大角色等级 */
  maxLevel: number
  /**
   * HP/ATK/DEF 基础属性加成（累计值，直接取当前等级的值，divisor=1）。
   * 公式：stat = floor(value + growthPerLevel × (lv−1)) + statBoosts[statId]
   */
  statBoosts: StatBoost[]
  /**
   * CRIT Rate / CRIT DMG 解锁加成（累计值，已除以 divisor=10000）。
   * 与 statBoosts 机制不同：这是突破后新增的固定被动属性。
   */
  statAdditions: StatBoost[]
}

interface Bangboo {
  id: string
  slug: string
  name: string
  /** 3 = A（4★），4 = S（5★） */
  rarity: number
  description: string
  assets: BangbooAssets
  baseStats: BangbooStat[]
  /** 6 个优化等级的突破加成（累计值） */
  optimizations: BangbooOptimization[]
  skills: BangbooSkill[]
}

interface BangbooListEntry {
  id: string
  slug: string
}

function parseBangbooList(html: string): BangbooListEntry[] {
  const json = JSON.parse(html) as SvelteKitDataJson
  const pageNode = json.nodes[1]
  if (!pageNode || !Array.isArray(pageNode.data)) {
    throw new Error("Unexpected __data.json structure")
  }
  const d = pageNode.data

  // 导航：d[0].entries → d[1].data → d[2].entries → entry 索引数组
  const root = d[0] as { entries: number }
  const wrapper = d[root.entries] as { data: number }
  const page = d[wrapper.data] as { entries: number }
  const entryIndices = d[page.entries] as number[]
  return entryIndices.map((i) => {
    const entry = d[i] as Record<string, number>
    return {
      id: String(readVal(d, entry.id)),
      slug: String(readVal(d, entry.slug)),
    }
  })
}

function parseBangbooDetail(pageData: unknown[], bangbooId: string): Bangboo {
  const d = pageData
  const root = d[0] as { data: number }
  const obj = d[root.data] as Record<string, number>

  const id = String(readVal(d, obj.id))
  const slug = String(readVal(d, obj.slug))
  const name = norm(readVal(d, obj.name))

  const rarityObj = d[obj.rarity] as { id: number }
  const rarity = readVal<number>(d, rarityObj.id)

  const description = norm(readVal<string>(d, obj.description))

  // assets: circle_icon（字符串）和 splash_art（对象）
  const assetsRaw = d[obj.assets] as {
    circle_icon: number
    splash_art: number
  }
  const splashRaw = d[assetsRaw.splash_art] as {
    url: number
    width: number
    height: number
  }
  const assets: BangbooAssets = {
    circleIcon: String(readVal(d, assetsRaw.circle_icon)),
    splashArt: {
      url: String(readVal(d, splashRaw.url)),
      width: readVal<number>(d, splashRaw.width),
      height: readVal<number>(d, splashRaw.height),
    },
  }

  // base_stats: 直接导航（growth 为大整数，不能用通用解码器）
  const bsArr = readVal<number[]>(d, obj.base_stats)
  const baseStats: BangbooStat[] = bsArr.map((bsIdx) => {
    const bs = d[bsIdx] as { stat: number; value: number; growth: number }
    const statObj = d[bs.stat] as {
      id: number
      name: number
      divisor: number
    }
    const divisor = readVal<number>(d, statObj.divisor) || 1
    const rawValue = readVal<number>(d, bs.value)
    const rawGrowth =
      bs.growth != null ? (readVal<number | null>(d, bs.growth) ?? null) : null
    return {
      id: String(readVal(d, statObj.id)),
      name: norm(readVal(d, statObj.name)),
      value: rawValue / divisor,
      growthPerLevel: rawGrowth != null ? rawGrowth / 10000 / divisor : null,
    }
  })

  // skills: 从 levels[0] 读取 name/description/stats（values 已覆盖全部 10 级）
  const skillsArr = readVal<number[]>(d, obj.skills)
  const skills: BangbooSkill[] = skillsArr.map((skIdx) => {
    const sk = d[skIdx] as { type: number; levels: number }
    const typeObj = d[sk.type] as { id: number }
    const typeId = String(readVal(d, typeObj.id))

    const levelsArr = readVal<number[]>(d, sk.levels)
    const lv0 = d[levelsArr[0]] as {
      name: number
      description: number
      stats: number
    }
    const skillName = norm(readVal<string>(d, lv0.name))
    const skillDesc = norm(readVal<string>(d, lv0.description))

    const statsArr = readVal<number[]>(d, lv0.stats)
    const stats: BangbooSkillStat[] = statsArr.map((stIdx) => {
      const st = d[stIdx] as { title: number; text: number; values: number }
      const title = norm(readVal<string>(d, st.title))
      const templateText = String(readVal(d, st.text))

      // values[i] → d[ref] = [] 或 [inner_ref]；[] 时取模板文本，否则替换 {0}
      const valRefs = readVal<number[]>(d, st.values)
      const values = valRefs.map((vRef) => {
        const inner = d[vRef]
        if (Array.isArray(inner) && (inner as number[]).length > 0) {
          const innerVal = String(d[(inner as number[])[0]])
          return norm(templateText.replace("{0}", innerVal))
        }
        return norm(templateText)
      })

      return { title, values }
    })

    return { typeId, name: skillName, description: skillDesc, stats }
  })

  // optimizations: 6 个突破等级，每级有 stat_boosts（HP/ATK/DEF）和 stat_additions（CRIT Rate/DMG）
  const optsArr = readVal<number[]>(d, obj.optimizations)
  const optimizations: BangbooOptimization[] = optsArr.map((oIdx) => {
    const o = d[oIdx] as {
      level: number
      maximum_level: number
      stat_boosts: number
      stat_additions: number
    }
    const sbArr = readVal<number[]>(d, o.stat_boosts)
    const statBoosts: StatBoost[] = sbArr.map((sbIdx) => {
      const sb = d[sbIdx] as { stat: number; value: number }
      const statObj = d[sb.stat] as { id: number }
      const statId = String(readVal(d, statObj.id))
      return { statId, value: readVal<number>(d, sb.value) }
    })
    const saArr = readVal<number[]>(d, o.stat_additions)
    const statAdditions: StatBoost[] = saArr.map((saIdx) => {
      const sa = d[saIdx] as { stat: number; value: number }
      const statObj = d[sa.stat] as { id: number; divisor: number }
      const statId = String(readVal(d, statObj.id))
      const divisor = readVal<number>(d, statObj.divisor) || 1
      return { statId, value: readVal<number>(d, sa.value) / divisor }
    })
    return {
      level: readVal<number>(d, o.level),
      maxLevel: readVal<number>(d, o.maximum_level),
      statBoosts,
      statAdditions,
    }
  })

  return {
    id: bangbooId || id,
    slug,
    name,
    rarity,
    description,
    assets,
    baseStats,
    optimizations,
    skills,
  }
}

async function fetchAllBangbooDetails(
  bangbooList: BangbooListEntry[],
  lang: string,
): Promise<Bangboo[]> {
  return batchProcess(
    bangbooList,
    async (b) => {
      const url = `${BASE_URL}/bangboo/${b.id}/${b.slug}/__data.json?lang=${lang}`
      const json = await fetchJson<SvelteKitDataJson>(url)
      const pageNode = json.nodes[1]
      if (!pageNode || !Array.isArray(pageNode.data)) {
        throw new Error(`Unexpected detail structure for bangboo ${b.id}`)
      }
      return parseBangbooDetail(pageNode.data, b.id)
    },
    5,
    1000,
  )
}

// ---- Drive Discs ----

interface DriveDiscSetEffect {
  pieces: number
  bonus: string
}

interface DriveDisc {
  id: string
  slug: string
  name: string
  icon: string
  /** 套装效果简短分类标签 */
  tag: string
  setEffects: DriveDiscSetEffect[]
}

function parseDriveDiscList(html: string): DriveDisc[] {
  const json = JSON.parse(html) as SvelteKitDataJson
  const pageNode = json.nodes[1]
  if (!pageNode || !Array.isArray(pageNode.data)) {
    throw new Error("Unexpected __data.json structure")
  }
  const d = pageNode.data

  // 导航：d[0].entries → d[1].data → d[2].entries → entry 索引数组（与 bangboo 相同）
  const root = d[0] as { entries: number }
  const wrapper = d[root.entries] as { data: number }
  const page = d[wrapper.data] as { entries: number }
  const entryIndices = d[page.entries] as number[]
  const entries = entryIndices.map((i) => d[i] as Record<string, number>)

  return entries.map((entry) => {
    const tag = norm(readVal<string>(d, entry.tag))

    const seIndices = readVal<number[]>(d, entry.set_effect)
    const setEffects: DriveDiscSetEffect[] = seIndices.map((seIdx) => {
      const se = d[seIdx] as { pieces: number; bonus: number }
      const bonusRef = se.bonus
      const bonus = bonusRef >= 0 ? norm(readVal<string>(d, bonusRef)) : ""
      return {
        pieces: readVal<number>(d, se.pieces),
        bonus,
      }
    })

    return {
      id: String(readVal(d, entry.id)),
      slug: String(readVal(d, entry.slug)),
      name: norm(readVal(d, entry.name)),
      icon: String(readVal(d, entry.icon)),
      tag,
      setEffects,
    }
  })
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
    name: `${lang}/gachabase/agents`,
    url: `${BASE_URL}/agents/__data.json?lang=${lang}`,
    extract: (_, html) => parseAgentList(html),
  },
  {
    name: `${lang}/gachabase/agent-details`,
    url: `${BASE_URL}/agents/__data.json?lang=${lang}`,
    extract: async (_, html) =>
      fetchAllAgentDetails(parseAgentList(html), lang),
  },
  {
    name: `${lang}/gachabase/w-engines`,
    url: `${BASE_URL}/w-engines/__data.json?lang=${lang}`,
    extract: (_, html) => parseWEngineList(html),
  },
  {
    name: `${lang}/gachabase/w-engine-details`,
    url: `${BASE_URL}/w-engines/__data.json?lang=${lang}`,
    extract: async (_, html) =>
      fetchAllWEngineDetails(parseWEngineList(html), lang),
  },
  {
    name: `${lang}/gachabase/bangboo`,
    url: `${BASE_URL}/bangboo/__data.json?lang=${lang}`,
    extract: async (_, html) =>
      fetchAllBangbooDetails(parseBangbooList(html), lang),
  },
  {
    name: `${lang}/gachabase/drive-discs`,
    url: `${BASE_URL}/drive-discs/__data.json?lang=${lang}`,
    extract: (_, html) => parseDriveDiscList(html),
  },
])
