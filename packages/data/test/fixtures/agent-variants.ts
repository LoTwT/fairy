/**
 * Nanoka 3.1 的结构变体摘录，数值与原文取自本地全量验证产物。
 * 每个常量只展示对应字段，不能作为完整代理人记录；由包 typecheck 和整合测试共同检查。
 * strategy 的空对象、档案提取后的空壳、缺失资源和非空数组分别保留。
 */
import type {
  AgentData,
  AgentDetails,
  SkillParameterRow,
  SourceParameter,
} from "../../src/integration/agent-types.ts"

/** 1011、1051、1381 的公共资源字段：依次覆盖缺 live2D、完整资源、仅有 interKnotIcon 的个人资料资源。 */
export const agentResourceVariants = [
  {
    id: 1011,
    codeName: "Anby",
    partnerInfo: {
      iconPath:
        "UI/Sprite/A1DynamicLoad/IconRoleCircle/UnPacker/IconRoleCircle01.png",
      interKnotIcon:
        "UI/Sprite/A1DynamicLoad/InterKnot/UnPacker/IconInterknotAvatar/IconInterKnotRole0001.png",
      roleIcon: "IconRole/UnPacker/IconRole01",
    },
  },
  {
    id: 1051,
    codeName: "Yidhari",
    live2D: "UISpine_Yidhari",
    partnerInfo: {
      iconPath:
        "UI/Sprite/A1DynamicLoad/IconRoleCircle/UnPacker/IconRoleCircle52.png",
      interKnotIcon:
        "UI/Sprite/A1DynamicLoad/InterKnot/UnPacker/IconInterknotAvatar/IconInterKnotRole0052.png",
      roleIcon: "IconRole/UnPacker/IconRole52",
    },
  },
  {
    id: 1381,
    codeName: "Soldier 0 - Anby",
    live2D: "UISpineSPAnbi",
    partnerInfo: {
      interKnotIcon:
        "UI/Sprite/A1DynamicLoad/InterKnot/UnPacker/IconInterknotAvatar/IconInterKnotRole0040.png",
    },
  },
] satisfies Pick<AgentData, "id" | "codeName" | "live2D" | "partnerInfo">[]

/** 1381 中文：来源 partner_info 仅有 inter_knot_icon，提取共享字段后留下的空壳，并非来源原本为空。 */
export const emptyPartnerInfo = {} satisfies AgentDetails["partnerInfo"]

/** 1371、1471、1511：按已配置 zh/en 顺序取中文详情原值；英文不同拼写保留在 raw。 */
export const codeNameVariants = [
  {
    id: 1371,
    codeName: "Yixuan",
  },
  {
    id: 1471,
    codeName: "BanYue",
  },
  {
    id: 1511,
    codeName: "NangongYu",
  },
] satisfies Pick<AgentData, "id" | "codeName">[]

/** 1131 中文策略数组与 1551 的原始空对象；不将 {} 转成 []。 */
export const strategyVariants = [
  [
    "04",
    "<IconMap:Icon_GeneralBuff_Ice>冰属性，泛用型速切辅助",
    "提供全队角色攻击增益",
  ],
  {},
] satisfies AgentDetails["strategy"][]

/** 1011 的空对象与 1091 中文特殊属性描述；name/title/desc/icon 是字段，不是分类 ID。 */
export const specialElementVariants = [
  {},
  {
    desc: "<color=#98EFF0>烈霜属性</color>会基于<color=#98EFF0>冰属性</color>结算伤害与增益效果，造成<color=#98EFF0>烈霜伤害</color>的同时，会对敌人累积<color=#98EFF0>烈霜异常积蓄值</color>，随之将触发<color=#98EFF0>[冻结]</color>并施加<color=#98EFF0>[霜寒]</color>效果；\n<color=#98EFF0>[冻结]</color>效果能够在一段时间内，使目标无法行动；\n<color=#98EFF0>[碎冰]</color>效果会在<color=#98EFF0>[冻结]</color>效果结束时触发，打断敌人的行动并造成<color=#98EFF0>烈霜伤害</color>；\n<color=#98EFF0>[霜寒]</color>效果能够在一段时间内，使目标承受的暴击伤害提升。",
    icon: "UI/Sprite/A1DynamicLoad/IconGeneralBuff/Packer/IconFrost.png",
    name: "烈霜",
    title: "烈霜属性",
  },
] satisfies AgentDetails["specialElementType"][]

/** 1011 与 1021 的顶层 potential：保留空数组与来源数值编码数组。 */
export const potentialVariants = [
  [],
  [102100, 102101, 102102, 102103, 102104, 102105],
] satisfies AgentData["potential"][]

/** 1011 的空 potentialDetail 与 1021 中文 102100 条目；levelShowName、abilityList、potentialMaterials、itemId 只转换拼写。 */
export const potentialDetailVariants = [
  {},
  {
    "102100": {
      abilityList: [11021401, 11021601, 11021701],
      desc: "",
      id: 102100,
      image: "Nekomiya",
      level: 1,
      levelShowName: "猫的报恩 I",
      name: "",
      potentialMaterials: [
        {
          itemId: 20102,
          number: 1,
        },
      ],
    },
  },
] satisfies AgentDetails["potentialDetail"][]

/** 1011、1051、1121 首条 passive/level 的 extraProperty：空表及 111、121、131 原始 key，target/value 不作换算。 */
export const extraPropertyVariants = [
  {},
  {
    "111": {
      target: 123,
      value: 1000,
    },
    "121": {
      target: 123,
      value: 3000,
    },
  },
  {
    "131": {
      target: 121,
      value: 4000,
    },
  },
] satisfies AgentDetails["passive"]["level"][string]["extraProperty"][]

/** 空数组、各已观察长度以及含 0 的 attackData；未推断元素用途。 */
export const attackDataVariants = [
  // 1011 /skill/assist/description/3/param/0/param/1011012/attackData
  [],
  // 1021 /skill/assist/description/3/param/0/param/1021013/attackData
  [7873],
  // 1261 /skill/assist/description/4/param/0/param/1261019/attackData
  [158334, 0],
  // 1461 /skill/assist/description/3/param/0/param/1461016/attackData
  [77000, 17500, 192500],
  // 1021 /skill/assist/description/4/param/0/param/1021014/attackData
  [0],
] satisfies SourceParameter["attackData"][]

/** 1581 中文 /skill/assist/description/7/param/2：仅含来源文本模板的展示行，缺少行内 param；不求值 CAL 或补数值表。 */
export const textOnlyParameterRow = {
  desc: "{CAL:200+AvatarSkillLevel(6)*10,1,2}%",
  name: "耀变倍率",
  potential: [],
} satisfies SkillParameterRow
