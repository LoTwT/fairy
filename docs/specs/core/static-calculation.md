# 静态计算输入组装

`calculateStaticActionDamage` 接收调用方传入的同版资料、角色配置、已解析动作、有效增益与目标参数，返回局外面板、
逐段伤害、乘区、贡献及限制。公开类型由 [static/types.ts](../../../packages/core/src/static/types.ts)维护；
包划分与发布要求见[包边界与联动发布](../packages.md)。

1. 调用 data 的 `loadStaticCalculationData({ agents, wEngines })` 读取本次所需实体。
2. 调用 data 的 `resolveAgentAction`，显式选择动作、影画和技能等级输入模式；保留其分段、标签与限制。
3. 将资料、解析结果与角色/目标配置传给 core 的 `calculateStaticActionDamage`。core 不负责数据装载。

## 完整计算示例

先按[安装与运行环境](../packages.md#安装与运行环境)安装同版 core/data。将以下代码保存为
`static-calculation.mts`，在安装目录执行 `node static-calculation.mts`。它只使用公开包入口，
无需 raw、Fairy 源码或本地数据生成器。在 Vite 项目中可将同一代码放入 `src/main.ts`。

示例复用[端到端验收](../../plans/static-e2e-acceptance.md)的 `nicole-self` 场景：60 级 6 影妮可、
核心 F、聚宝箱 R3、激素朋克四件与啄木鸟电音二件，普攻最终等级 15。
当前时点明确开启核心减防、激素四件攻击增益和聚宝箱增伤；其余条件增益关闭。
两件套由装备自动计入。副词条 `rolls` 包括初始档，以下每槽合计九档。

```ts
import { loadStaticCalculationData, resolveAgentAction } from "@randomplay/data"
import { calculateStaticActionDamage } from "@randomplay/core"
import type {
  StaticActionCalculationInput,
  StaticActorConfiguration,
  StaticDriveDisc,
} from "@randomplay/core"

type DriveDiscSubstat = NonNullable<StaticDriveDisc["substats"]>[number]

function substat(
  attribute: DriveDiscSubstat["attribute"],
  operation: DriveDiscSubstat["operation"],
  rolls: number,
): DriveDiscSubstat {
  return { attribute, operation, rolls }
}

async function main() {
  const data = await loadStaticCalculationData({
    agents: ["Nicole"],
    wEngines: ["The Vault"],
  })
  const [agent] = data.agents
  const [wEngine] = data.wEngines
  if (!agent || !wEngine) throw new Error("缺少本次配装资料")

  const attackPercentage = substat("attack", "initial-percentage", 3)
  const criticalRate = substat("criticalRate", "ratio-add", 3)
  const criticalDamage = substat("criticalDamage", "ratio-add", 2)
  const actor: StaticActorConfiguration = {
    entityId: "entity:nicole",
    teamId: "team:players",
    agentEntityId: agent.attributes.entityId,
    coreSkillLevel: 7,
    mindscapeRank: 6,
    wEngine: { entityId: wEngine.entityId, refinement: 3, eligible: true },
    panel: { mode: "equipment" },
    driveDiscs: {
      1: {
        setEntityId: "31400",
        mainStat: { attribute: "health" },
        substats: [
          attackPercentage,
          criticalRate,
          criticalDamage,
          substat("penetrationValue", "initial-fixed", 1),
        ],
      },
      2: {
        setEntityId: "31400",
        mainStat: { attribute: "attack" },
        substats: [
          attackPercentage,
          criticalRate,
          criticalDamage,
          substat("health", "initial-fixed", 1),
        ],
      },
      3: {
        setEntityId: "31400",
        mainStat: { attribute: "defense" },
        substats: [
          attackPercentage,
          criticalRate,
          criticalDamage,
          substat("health", "initial-fixed", 1),
        ],
      },
      4: {
        setEntityId: "31400",
        mainStat: { attribute: "criticalDamage" },
        substats: [
          attackPercentage,
          criticalRate,
          substat("attack", "initial-fixed", 2),
          substat("penetrationValue", "initial-fixed", 1),
        ],
      },
      5: {
        setEntityId: "31000",
        mainStat: { attribute: "damageBonus", element: "physical" },
        substats: [
          attackPercentage,
          criticalRate,
          criticalDamage,
          substat("attack", "initial-fixed", 1),
        ],
      },
      6: {
        setEntityId: "31000",
        mainStat: { attribute: "attack" },
        substats: [
          criticalRate,
          substat("criticalDamage", "ratio-add", 3),
          substat("attack", "initial-fixed", 2),
          substat("health", "initial-fixed", 1),
        ],
      },
    },
  }

  const action = resolveAgentAction({
    agent: agent.actions,
    actionId: "action:agent:1031:basic-enhanced-1",
    mindscapeRank: actor.mindscapeRank,
    levels: { basic: { mode: "effective", value: 15 } },
    requireIndividualHits: true,
  })
  if (!action.ok) throw new Error(JSON.stringify(action.issues))

  const input: StaticActionCalculationInput = {
    data,
    actors: [actor],
    actorId: actor.entityId,
    action,
    target: {
      entityId: "entity:target",
      teamId: "team:enemies",
      baseDefense: 921.04,
      resistances: { physical: 0 },
      isStunned: false,
      baseStunDamageMultiplier: 1,
    },
    selections: [
      "agents:nicole:mindscape:0:blk-legacy:legacy-team-reduceDefense",
      "drive-discs:hormone:setPieces:4:blk-legacy:legacy-self-inCombatAtkPercent",
      "w-engines:The_Vault:refinement:blk-legacy:legacy-self-dmgBonus",
    ].map((optionId) => ({ holderId: actor.entityId, optionId, layers: 1 })),
    requireIndividualHits: true,
  }
  const equipment = calculateStaticActionDamage(input)
  if (!equipment.ok) throw new Error(JSON.stringify(equipment.issues))
  if (equipment.value.kind === "daze-only") {
    console.log("此动作只有失衡倍率，不返回伤害", equipment.value.limitations)
    return
  }

  // 同一配装的已结算局外面板，数值来自独立验收参考。
  const settledActor: StaticActorConfiguration = {
    ...actor,
    panel: {
      mode: "out-of-combat",
      stats: {
        health: { unit: "health-points", value: 10681.8433 },
        attack: { unit: "attack-points", value: 2767.361835 },
        defense: { unit: "defense-points", value: 806.6159 },
        impact: { unit: "impact-points", value: 88 },
        anomalyProficiency: { unit: "anomaly-proficiency-points", value: 93 },
        anomalyMastery: { unit: "anomaly-mastery-points", value: 90 },
        energyRegen: { unit: "energy-per-second", value: 2.34 },
        criticalRate: { unit: "ratio", value: 0.562 },
        criticalDamage: { unit: "ratio", value: 1.508 },
        penetrationRatio: { unit: "ratio", value: 0 },
      },
      penetrationValue: 18,
      damageBonuses: { physical: 0.3 },
    },
  }
  const outOfCombat = calculateStaticActionDamage({
    ...input,
    actors: [settledActor],
  })
  if (!outOfCombat.ok) throw new Error(JSON.stringify(outOfCombat.issues))
  if (outOfCombat.value.kind === "daze-only") {
    console.log("此动作不返回伤害", outOfCombat.value.limitations)
    return
  }

  console.log(
    JSON.stringify(
      {
        version: data.version,
        equipment: equipment.value.totals,
        outOfCombat: outOfCombat.value.totals,
        limitations: equipment.value.limitations,
      },
      null,
      2,
    ),
  )
}

void main().catch((error: unknown) => {
  console.error(error)
  throw error
})
```

两条输入路径的结果相同，允许浮点运算顺序产生的末位差异：

| 字段                   |     本例结果 | 含义                         |
| ---------------------- | -----------: | ---------------------------- |
| `nonCritical`          |  6254.484589 | 未取整的非暴击合计           |
| `critical`             | 15686.247349 | 未取整的暴击合计             |
| `expected`             | 11555.135260 | 数学期望，不是游戏显示整数   |
| `displayedNonCritical` |         6256 | 每次非暴击伤害向上取整后求和 |
| `displayedCritical`    |        15687 | 每次暴击伤害向上取整后求和   |

`panels` 是局外面板；本次战斗增益的实际贡献和乘区在 `segments[].damage.evaluation` 与
`segments[].damage.factors` 中。不要把最终战斗面板填入 `out-of-combat` 后再开启同一份战斗增益。
没有暴击结算时 `critical` 为 `null`；没有确认独立命中时，显示取整总值为 `null`。
`daze-only` 仅表明该动作不提供伤害，本接口不在这个分支计算最终失衡值。

加载函数按英文名称选资料，`agentEntityId`、音擎及套装 ID 对应来源实体；`entityId`、`teamId`
由应用分配，区分当前队伍中的持有者。可从动作目录读取 `actionId`，从 `data.catalog.options`
读取选项的 `optionId`、`name`、`conditionDescription` 和各 `variants` 的培养、层数、输入及支持限制。
选择选项表示调用方确认条件当前成立，`holderId` 必须指向对应持有者。

主示例的三个选项无需额外数值输入。若选择攻击转化等选项，还须按适用 variant 的 `inputs` 提供
同名、同单位的读取值，并用公开的 `staticSourceBindingId(holderId, "agent", agentEntityId)`
关联代理人来源；音擎和套装分别使用 `"w-engine"`、`"drive-disc"` 及对应实体 ID。
目录中的 `preset` 只供展示，不会代替实际读取值。包含队友、转化输入与层数变化的完整案例见
[端到端请求组装](../../../packages/data/test/static-e2e.test.ts)。

### 错误处理

加载失败会拒绝 Promise；`resolveAgentAction` 对未知动作、非法等级或缺少必需参数抛出异常，
对已知但不可计算的动作返回 `ok: false`。core 正常校验失败返回 `ok: false, issues`，其中包含错误码、
路径和说明。示例将这两类失败统一交给外层错误处理，不用零伤害掩盖错误。
应用应保留具体诊断，并在读取 `value`、`calculation` 或伤害字段前判断对应分支。

## 面板与来源

`equipment` 模式使用 60 级角色/音擎与 S 级满强化词条。六个槽位必须明确提供，空槽位为 null；
主词条从对应槽位的合法选项选择，副词条 rolls 包括初始档。核心累计属性只选择一行，精炼仅控制效果。
同名音擎按持有者分离，装备适用性由调用方明确提供。

二件套按实际件数自动选中，同一套只生效一次；未选的四件套与其他战斗 buff 不自动开启。
已登记的二件套属性贡献进入局外初始阶段，元素增伤进入对应面板增伤，技能范围增伤保留命中筛选。
本的初始防御转攻击通过同一效果依赖求值器计算；参数来自 data 冻结副本的 extraProperty，不在 core 按姓名硬编码。
命破的贯穿力按已核实的生命/攻击关系生成。

玄墨继承以太、烈霜继承冰的面板增伤与元素条件，关系及来源路径由 data 提供；动作仍保留玄墨/烈霜身份。
手填面板及目标抗性可以提供对应基础元素的值；显式提供特殊元素值时采用该值，不重复叠加基础元素值。

`out-of-combat` 是唯一手填面板模式。stats 已含角色、核心、装备与常驻转换；penetrationValue 为已结算穿透值，
damageBonuses 为已结算元素增伤，包含对应装备和二件套。本次动作使用的元素即便为零也必须显式提供。
技能范围增伤不属于该元素面板数值，仍由二件套规则在匹配动作上应用。
装备身份继续用于效果适用性，但属性与已包含的二件套贡献不再重复添加。

底层 `GeneralStatInput` 可使用 `settledInitialValue` 表达已结算初始值；baseValue 只在实际读取基础阶段或新增初始百分比时需要。
静态组装会从已知培养与装备取得可确认的基础值，不反推当前面板。缺失属性、单位错误、非法档位与版本不匹配返回诊断。
已结算贯穿力只增加新生命/攻击贡献带来的转换增量；不会再次完整叠加原有转换。

## 动作与结果

沿用 PR B 的动作解析与已确认命中数。每个已确认独立命中分别计算；显示伤害分别向上取整后相加，数学期望不显示取整。
动作的 `resolutionContext` 必须与当前角色身份和影画档位一致；缺失或不一致返回 `CONTEXT_MISMATCH`。
更改角色或影画后须重新调用 data 解析动作，不能复用旧配置的解析结果。
aggregate 保留合计结果和限制，显示取整总值为 null；要求逐次计算或有效逐次加伤遇到未确认拆分时返回错误。
仅失衡动作返回 `daze-only`；不可用动作保留原因，不以零伤害代替失败。

耀变需要显式提供既有目录入口的属性来源、快照与参数，其倍率须对应已解析动作。普通动作不会自动推导异常或紊乱结算，
已有底层入口继续可用。目标防御、逐元素抗性与失衡状态必须采用明确的计算单位，不直接把来源原始字段当成计算值。
`target.baseStunDamageMultiplier` 沿用[失衡易伤区](factors/stun-damage.md)的当前状态基础乘数契约：
通常未失衡传 `1`、失衡传 `1.5`；`isStunned` 不会把调用方传入的 `1.5` 自动改成 `1`。

本接口只计算同一静态时点，不增加时间线、自动触发或叠层模拟。输入对象不被修改；配置或时点变化后重新调用。

资料和已核实规则当前使用游戏版本 `3.1`。动作是否可计算以解析结果为准，效果是否支持及缺失原因以
[覆盖报告与限制](../data/zzz-hp-static-effects.md#实际覆盖与使用限制)为准；锐化/锐爆等新公式不在当前范围。
九个完整配装场景的验证边界见[端到端验收](../../plans/static-e2e-acceptance.md)，不推断全部角色、技能或未来资料版本均已验证。
