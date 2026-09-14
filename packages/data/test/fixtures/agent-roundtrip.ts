import { deepStrictEqual } from "node:assert"
import { expect } from "vitest"
import type { IntegratedAgent } from "../../src/integration/integrate-agent.ts"
import type { SourceJson } from "../../src/integration/agent-types.ts"

/** 独立测试侧还原表；不引用生产 schema、改名、拆分、导航或比较函数。 */
const renamedContainers: [string, string[]][] = [
  [
    "",
    [
      "code_name",
      "live2_d",
      "weapon_type",
      "element_type",
      "hit_type",
      "special_element_type",
      "partner_info",
      "level_exp",
      "extra_level",
      "skill_priority",
      "skill_list",
      "fairy_recommend",
      "potential_detail",
    ],
  ],
  [
    "partner_info",
    [
      "inter_knot_icon",
      "icon_path",
      "role_icon",
      "full_name",
      "impression_f",
      "impression_m",
      "profile_desc",
      "unlock_condition",
      "trust_lv",
    ],
  ],
  [
    "stats",
    [
      "armor_growth",
      "attack_growth",
      "avatar_piece_id",
      "break_stun",
      "crit_damage",
      "crit_dmg_res",
      "crit_res",
      "defence_growth",
      "element_abnormal_power",
      "element_mystery",
      "hp_growth",
      "hp_max",
      "pen_delta",
      "pen_rate",
      "rbl_correction_factor",
      "rbl_probability",
      "shield_growth",
      "sp_bar_point",
      "sp_recover",
      "rp_max",
      "rp_recover",
    ],
  ],
  ["level/*", ["hp_max", "level_max", "level_min"]],
  ["extra_level/*", ["max_level"]],
  [
    "skill_priority/*",
    [
      "avatar_id",
      "first_priority",
      "second_priority",
      "third_priority",
      "potential_levels",
    ],
  ],
  ["skill_list/*", ["element_type", "hit_type"]],
  ["passive/level/*", ["extra_property"]],
  ["fairy_recommend", ["slot_sub", "part_sub_list", "part_sub"]],
  [
    "potential_detail/*",
    ["level_show_name", "ability_list", "potential_materials"],
  ],
  ["potential_detail/*/potential_materials/*", ["item_id"]],
  [
    "skill/*/description/*/param/*/param/*",
    [
      "damage_percentage",
      "damage_percentage_growth",
      "stun_ratio",
      "stun_ratio_growth",
      "sp_recovery",
      "sp_recovery_growth",
      "fever_recovery",
      "fever_recovery_growth",
      "attribute_infliction",
      "sp_consume",
      "attack_data",
      "rp_recovery",
      "rp_recovery_growth",
      "ether_purify",
    ],
  ],
]

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function combine(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): Record<string, unknown> {
  const result = structuredClone(left)
  for (const [key, value] of Object.entries(right)) {
    if (Object.hasOwn(result, key)) {
      if (!object(result[key]) || !object(value))
        throw new Error(`还原载荷重叠：${key}`)
      result[key] = combine(result[key], value)
    } else
      Object.defineProperty(result, key, {
        value: structuredClone(value),
        enumerable: true,
        configurable: true,
        writable: true,
      })
  }
  return result
}

function sourceNames(value: unknown, path: string[] = []): unknown {
  if (Array.isArray(value))
    return value.map((item, index) =>
      sourceNames(item, [...path, String(index)]),
    )
  if (!object(value)) return value
  const names =
    renamedContainers.find(([pattern]) => {
      const segments = pattern === "" ? [] : pattern.split("/")
      return (
        segments.length === path.length &&
        segments.every(
          (segment, index) => segment === "*" || segment === path[index],
        )
      )
    })?.[1] ?? []
  const rename = new Map(
    names.map((name) => [
      name === "live2_d"
        ? "live2D"
        : name
            .split("_")
            .map((word, index) =>
              index ? word[0].toUpperCase() + word.slice(1) : word,
            )
            .join(""),
      name,
    ]),
  )
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      const sourceKey = rename.get(key) ?? key
      return [sourceKey, sourceNames(item, [...path, sourceKey])]
    }),
  )
}

export function expectRoundtrip(
  result: IntegratedAgent,
  input: { sourceRecord: unknown; details: Record<string, unknown> },
): void {
  expect(result.sourceRecord).toStrictEqual(input.sourceRecord)
  for (const [locale, source] of Object.entries(input.details)) {
    const details = structuredClone(
      result.details[locale as "zh" | "en"],
    ) as unknown as Record<string, unknown>
    const data = structuredClone(result.data) as unknown as Record<
      string,
      unknown
    >
    expect(details.locale).toBe(locale)
    expect(details.id).toBe(data.id)
    delete details.locale
    delete details.navigation
    delete details.id
    delete data.classificationIds
    const restored = sourceNames(combine(data, details)) as Record<
      string,
      unknown
    >
    const difference = result.maintenance.codeNameDifferences.find(
      (item) => item.locale === locale,
    )
    if (difference) {
      expect(difference.selectedValue).toBe(restored.code_name)
      restored.code_name = difference.value
    }
    deepStrictEqual(restored, source)
  }
}

/** 仅解析现有自有成员，不从继承链补路径；独立验证生产 Pointer 的目标。 */
export function resolvePointer(root: unknown, pointer: string): SourceJson {
  let current = root
  for (const token of pointer.slice(1).split("/")) {
    const key = token.replaceAll("~1", "/").replaceAll("~0", "~")
    expect(current).not.toBeNull()
    expect(Object.hasOwn(current as object, key)).toBe(true)
    current = (current as Record<string, unknown>)[key]
  }
  return current as SourceJson
}
