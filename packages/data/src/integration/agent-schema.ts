/** 登记的来源结构路径。共享标记只用于完整值或同一字典 key，不用于猜测相等字段。 */
export type Schema = (
  | {
      /** JSON 原始字符串。 */
      kind: "string"
    }
  | {
      /** JSON 原始数值。 */
      kind: "number"
    }
  | {
      /** 有序数组。 */
      kind: "array"
      /** 元素结构。 */
      item: Schema
    }
  | {
      /** 原 key 字典。 */
      kind: "dictionary"
      /** 条目结构。 */
      item: Schema
      /** 是否要求规范十进制 ID。 */
      ids: boolean
    }
  | {
      /** 已登记结构对象。 */
      kind: "object"
      /** 来源字段 → 结构。 */
      fields: Record<string, Schema>
      /** 是否允许整个来源空对象。 */
      empty: boolean
    }
  | {
      /** 策略仅允许字符串数组或空对象。 */
      kind: "strategy"
    }
) & {
  /** 来源可缺失；缺失不补值。 */
  optional?: boolean
  /** 各语言完整值一致时整块提取。 */
  shared?: boolean
}

const number: Schema = { kind: "number" }
const string: Schema = { kind: "string" }
const array = (item: Schema): Schema => ({ kind: "array", item })
const dictionary = (item: Schema, ids = false): Schema => ({
  kind: "dictionary",
  item,
  ids,
})
const object = (fields: Record<string, Schema>, empty = false): Schema => ({
  kind: "object",
  fields,
  empty,
})
const optional = (schema: Schema): Schema => ({ ...schema, optional: true })
const shared = (schema: Schema): Schema => ({ ...schema, shared: true })
const numbers = array(number)
const strings = array(string)
const materialCounts = dictionary(number)
const stagedMaterials = dictionary(materialCounts)
const propertyText = { name: string, format: string }
const recommendationProperty = object({
  ...propertyText,
  prop: shared(number),
  icon: shared(string),
})
const parameter = object({
  main: number,
  growth: number,
  format: string,
  damage_percentage: number,
  damage_percentage_growth: number,
  stun_ratio: number,
  stun_ratio_growth: number,
  sp_recovery: number,
  sp_recovery_growth: number,
  fever_recovery: number,
  fever_recovery_growth: number,
  attribute_infliction: number,
  sp_consume: number,
  attack_data: numbers,
  rp_recovery: number,
  rp_recovery_growth: number,
  ether_purify: number,
})

/** 仅对本登记表的结构字段使用；字典和未知容器不调用此规则。 */
export function registeredName(sourceName: string): string {
  return sourceName === "live2_d"
    ? "live2D"
    : sourceName.replace(/_([a-z])/gu, (_, letter: string) =>
        letter.toUpperCase(),
      )
}

/** 原始详情的完整结构与共享提取路径；数值合法性另外在 JSON 边界校验。 */
export const agentSchema: Schema = object({
  id: number,
  code_name: string,
  name: string,
  icon: shared(string),
  rarity: shared(number),
  gender: shared(number),
  live2_d: optional(shared(string)),
  weapon_type: dictionary(string, true),
  element_type: dictionary(string, true),
  hit_type: dictionary(string, true),
  camp: dictionary(string, true),
  special_element_type: object(
    { name: string, title: string, desc: string, icon: string },
    true,
  ),
  partner_info: object({
    inter_knot_icon: shared(string),
    icon_path: optional(shared(string)),
    role_icon: optional(shared(string)),
    birthday: optional(string),
    full_name: optional(string),
    gender: optional(string),
    impression_f: optional(string),
    impression_m: optional(string),
    impressions: optional(strings),
    profile_desc: optional(string),
    stature: optional(string),
    unlock_condition: optional(strings),
    trust_lv: optional(dictionary(string)),
  }),
  skin: dictionary(
    object({ image: shared(string), name: string, desc: string }),
  ),
  stats: shared(
    object({
      armor: number,
      armor_growth: number,
      attack: number,
      attack_growth: number,
      avatar_piece_id: number,
      break_stun: number,
      crit: number,
      crit_damage: number,
      crit_dmg_res: number,
      crit_res: number,
      defence: number,
      defence_growth: number,
      element_abnormal_power: number,
      element_mystery: number,
      endurance: number,
      hp_growth: number,
      hp_max: number,
      pen_delta: number,
      pen_rate: number,
      rbl: number,
      rbl_correction_factor: number,
      rbl_probability: number,
      shield: number,
      shield_growth: number,
      sp_bar_point: number,
      sp_recover: number,
      stun: number,
      tags: strings,
      rp_max: number,
      rp_recover: number,
    }),
  ),
  level: shared(
    dictionary(
      object({
        hp_max: number,
        attack: number,
        defence: number,
        level_max: number,
        level_min: number,
        materials: materialCounts,
      }),
    ),
  ),
  level_exp: shared(numbers),
  extra_level: dictionary(
    object({
      max_level: shared(number),
      extra: dictionary(
        object({
          ...propertyText,
          prop: shared(number),
          value: shared(number),
        }),
      ),
    }),
  ),
  skill: dictionary(
    object({
      material: shared(stagedMaterials),
      description: array(
        object({
          name: string,
          desc: optional(string),
          potential: numbers,
          param: optional(
            array(
              object({
                name: string,
                desc: string,
                potential: numbers,
                param: optional(dictionary(parameter, true)),
              }),
            ),
          ),
        }),
      ),
    }),
  ),
  skill_priority: shared(
    array(
      object({
        id: number,
        avatar_id: number,
        first_priority: numbers,
        second_priority: numbers,
        third_priority: numbers,
        potential_levels: numbers,
      }),
    ),
  ),
  skill_list: dictionary(
    object({
      name: string,
      desc: string,
      element_type: shared(number),
      hit_type: shared(number),
      potential: shared(numbers),
    }),
  ),
  passive: object({
    materials: shared(stagedMaterials),
    level: dictionary(
      object({
        id: shared(number),
        level: shared(number),
        name: strings,
        desc: strings,
        extra_property: dictionary(object({ target: number, value: number })),
        potential: numbers,
      }),
    ),
  }),
  talent: dictionary(
    object({
      level: shared(number),
      name: string,
      desc: string,
      desc2: string,
    }),
  ),
  fairy_recommend: object({
    slot4: shared(number),
    slot2: shared(number),
    slot_sub: shared(number),
    part_sub_list: shared(numbers),
    part4: recommendationProperty,
    part5: recommendationProperty,
    part6: recommendationProperty,
    part_sub: recommendationProperty,
  }),
  strategy: { kind: "strategy" },
  potential: shared(numbers),
  potential_detail: dictionary(
    object({
      id: number,
      name: string,
      desc: string,
      image: string,
      level_show_name: string,
      level: number,
      ability_list: numbers,
      potential_materials: array(object({ item_id: number, number })),
    }),
  ),
})
