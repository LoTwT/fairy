# 技能倍率、动作目录与等级选择

`@randomplay/data` 提供 Nanoka 3.2 全部 60 名角色的独立动作目录、伤害与失衡成长曲线、
影画技能等级提升和纯解析函数。完整面板组装、装备及常驻转化由 core 的[静态计算入口](../core/static-calculation.md)提供。
共同类型由 [shared 动作契约](../../../packages/shared/src/skills.ts)维护；data 的 [`src/skills/types.ts`](../../../packages/data/src/skills/types.ts) 重导出这些类型并维护来源清单。

## 公开读取与解析

```ts
import { loadAgentActions, resolveAgentAction } from "@randomplay/data"

const agent = await loadAgentActions("Nicole")
if (!agent) throw new Error("角色未登记")
const result = resolveAgentAction({
  agent,
  actionId: "action:agent:1031:basic-enhanced-1",
  mindscapeRank: 6,
  levels: { basic: { mode: "effective", value: 15 } },
  requireIndividualHits: true,
})
if (!result.ok) {
  console.log(result.issues)
} else if (result.calculation.kind === "damage") {
  console.log(result.calculation.segments)
}
```

`loadAgentActions(AgentName)` 返回 `Promise<AgentActions | undefined>`。名称精确匹配英文详情顶层值，
未知字符串返回 `undefined`，非字符串拒绝为 `TypeError`，加载失败原样拒绝。每次返回深复制对象。
根入口不读取 JSON；一次调用只加载一个角色的 `definitions/skills/agents/{id}.json`，不连带读取
原始数据、其他角色、manifest 或效果目录。Node 与浏览器行为一致。

JSON 子路径为 `@randomplay/data/definitions/skills/agents/{id}.json` 与
`@randomplay/data/definitions/skills/manifest.json`。Node 直接导入使用 JSON import attributes。

`resolveAgentAction` 不读取文件，不推断战斗过程。调用方选择一个 `actionId`，显式提供该动作读取的
技能类别、影画和额外输入。未知动作、缺少输入、无效等级或超限数值抛出错误；来源语义尚未确认时
返回 `{ ok: false, issues }`，不能将其解释为零伤害。解析不隐式选择等级上限或截断输入。

## 等级与身份

五类培养等级是 `basic`、`dodge`、`assist`、`special`、`chain`；连携和终结共用 `chain`。
`skillCategory` 则描述增益适用分类，独立记录。不能根据增益分类反推培养类别。

`resolveAgentSkillLevel({ agent, group, mindscapeRank, level })` 返回训练等级、影画提升与最终等级。
所有输入必须为整数。当前角色的 M3/M5 各提升五类技能两级，来源条款逐角色核验并保留指针。

| 输入模式    | 语义                                   | 范围                               |
| ----------- | -------------------------------------- | ---------------------------------- |
| `trained`   | 玩家实际培养等级，再加已解锁的影画提升 | 1—12                               |
| `effective` | 已含影画的最终等级，原值使用           | M0—2：1—12；M3—4：3—14；M5—6：5—16 |

例如 M5 输入最终等级 12，解析为训练 8、提升 4、最终 12。UI 修改影画后是否保留训练进度并更新显示，
由消费端显式处理；接口不根据填写顺序或数值大小猜测模式。核心 1—7 与这些技能等级独立。

成功解析的动作通过 `resolutionContext` 保留角色身份与解析时的影画档位。修改角色或影画后，调用方须重新解析动作，
再将原样结果交给 core；core 按此上下文检查当前配置，不重新解析技能倍率。

`actionId` 与 `branchId` 是在内部 registry 中固定登记的应用身份。编号不是可重新生成的展示顺序；
来源段落、标签、参数身份、表达式或潜能条件发生变化时，生成器要求重新核对登记，保留或显式迁移身份。
来源参数 ID、`skillList` ID 和显示名称均不能直接充当动作身份。例如安比落雷的展示参数是 `1011005`，
不能与 `skillList` 同号条目关联。

倍率段与父说明名称不同时，由 registry 显式登记同一培养组中的关联说明位置；名称、正文和潜能条件
均进入语义签名与来源追溯，不依赖名称前缀猜测父子关系。

每条倍率行保留一个可选择的动作。相同招式的段数、蓄力档位和状态分支通过 `branchId` 归组，
不自动相加。雅的三种霜月蓄力各自可选，不把三个档位累加成一次招式。

## 倍率、属性与命中

曲线使用计算比例 `base + growth × (effectiveLevel − 1)`。来源万分比除以 10000，保留计算精度。
只解析参数引用、相加、数值乘除和分组的有限线性语法，不执行来源代码或任意 CAL 表达式。
复合行保留完整表达式，不能只取参数表第一项。伤害和失衡分别读取对应字段；失衡行配对同时核对
标签、完整表达式和潜能分支，不仅凭同名或参数 ID 合并。

`damageCoefficient` / 解析后的 `sourceDamageMultiplier` 是来源伤害行合计，供展示和核对。
**实际伤害计算消费 `calculation.segments[].damageItems`**：每项标明缩放属性，不能将攻击与生命等
不同属性的倍率直接相加。`dazeCoefficient` 与 `dazeMultiplier` 独立提供，不混入伤害。

- `damage`：提供属性、普通或贯穿伤害、分段、重复次数及各基础项。命破读取 `sheerForce`。
- `daze-only`：没有伤害行的招架等动作，仅提供失衡倍率。
- `luminize`：只提供该招式的耀变基础倍率。其等级按所属技能培养类别解析，增益分类为 `uncategorized`，
  不因此自动获得普攻或终结直伤增益。虚曜强度等输入交给已有耀变公式。
- `unavailable`：保留已知曲线与具体原因，例如未登记计算约定的属性分配、特殊结算或未知分类。

安比前三段普攻为物理、第四段为电；雅前两段普攻为物理，后三段保留 `frost`；仪玄保留
`auric-ink`，蕾米埃尔保留 `lumiflux`。特殊属性不在数据阶段折成角色默认属性或抗性属性。

照的最终裁决、连携和支援突击附加生命项读取 **普攻等级**，要求显式输入 `chargeSeconds`（0—5）。
每秒倍率是 `0.12 + 0.01 × basicLevel`，只对终结一击加入一次，不能按攻击次数重复添加。

`granularity: "individual"` 表示已确认的一次伤害，`repeat` 表示该次伤害重复次数；`aggregate`
表示完整合计，`repeat: 1` 不代表已确认只有一次命中。当前逐次实测确认的是妮可强化普攻第一段。
通常合计要求属性、增益和其他乘区在各次命中间一致；下述固定来源约定另行明确其适用边界。需要逐次额外加伤等场景时，调用方
必须设置 `requireIndividualHits: true`，未确认拆分便返回具体限制。来源 `attackData` 不用于猜测命中数。

已知独立伤害分别向上取整再求和；聚合计算允许合理取整误差，不提前取整倍率，也不以误差容忍度
掩盖不同属性或增益适用造成的机制差异。当前没有强加一个未经实测确定的全局误差阈值。

88 条原先因混合属性描述不可用的动作，现采用固定 ZZZ-HP 的**整条按所标属性计算**约定：
每条倍率行作为一个 `regular`、`aggregate`、`repeat: 1` 的段，完整攻击倍率只计入一次，
并使用登记元素的抗性与增伤。动作的 `limitations` 明确保留该约定；它不证明游戏中的内部属性分配，
也不提供逐次显示取整总值。各条的固定来源位置与原始倍率见
[独立参考夹具](../../../packages/data/test/fixtures/zzz-hp-single-element-actions.json)。
格莉丝垫步射击 `action:agent:1181:action:0007` 则按中英文说明中的明确物理伤害采用 `physical`，
保留与 ZZZ-HP 电属性记录的具名差异，不归入这 88 条约定。

这些动作按核实的技能分类、目标与标签匹配增益，不因父招式的混合描述而新增逐段身份。
莱特强力终结 `action:agent:1161:action:0021` 绑定已有强力终结目标，显式选择 M1 选项时获得 30% 增伤，
相邻普通终结不适用。奥菲丝火刀 `action:agent:1301:action:0011` 绑定已有火刀目标，保留普攻分类，
同时通过目标目录的 `countsAsFollowUp` 匹配追加攻击增益；相邻普通五段不适用。
两者分别对应固定 ZZZ-HP 的 `/skillSubcategories/42`、`/skillSubcategories/51`；
Nanoka 的莱特 `/talent/1/desc` 与奥菲丝 `/passive/level/1301507/desc/0` 提供对应语义。
独立命中请求与逐次附加伤害仍拒绝；安东电钻/打桩、派派下砸等
部分目标的倍率缺口不由该约定解决，也不将其增益应用到整个合计。
露西亲卫队小猪的四条攻击另行按后文的具名面板代算约定开放。

潜能分支动作的伤害倍率与元素按 Nanoka 3.1 冻结行记录：柏妮思的强化特殊技：灼热抛接法
整条按火伤（来源描述同时提及物理与火，按 ZZZ-HP 单属性约定不拆分）；丽娜的晨间清扫与
午夜清扫整条按电伤，木偶攻击使用丽娜自身当前静态面板与显式适用增益，不建立独立 actor、
不继承角色属性、不模拟锁面板；格莉丝涡流集束手雷与脉冲手雷按来源 special 分类；
浅羽悠真残心·散华按其说明“视为终结技伤害”归入 ultimate；零号·安比逐雷按通用 dodge 分类
纳入，不是 dash、dodge-counter 或 follow-up。维琳娜的染色属性动作仍不可用，原因具体化为
缺少可选择的染色元素集合证据。

### 具名约定：露西亲卫队小猪面板代算

`action:agent:1151:action:0011`—`0014`（亲卫队小猪：抄家伙！的棒球棍、拳套、弹弓，
以及亲卫队小猪：回旋挥击！）采用具名的 **ZZZ-HP 露西面板代算约定**，开放为 `basic` 分类、
火属性、`regular`、`aggregate`、`repeat: 1` 的整行倍率：每条倍率只计入一次，不追加攻击标签或
独立目标，不乘三只小猪，不随机选招，也不自动累计触发。

倍率保留 Nanoka 3.1 参数行：棒球棍 `1151023`、拳套 `1151024`、弹弓 `1151025`
（`/skill/basic/description/4/param/0`—`2`，共用描述 `/skill/basic/description/1/desc`）与
回旋挥击 `1151026`（`/skill/basic/description/5/param/0`，描述 `/skill/basic/description/2/desc`）。
1/12/16 级倍率分别为 92.5%/186%/220%、127.5%/255.1%/301.5%、175%/351%/415% 与
250%/500.8%/592%。三种武器与回旋挥击各自独立选择，不把相邻行相加成三段。

固定 ZZZ-HP 技能来源 `0df40c5b` 的资源 `zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json`
（sha256 `34b8dbeef2f710fd27379502d248f850da5a8c19dc6a0a7568ef51fb4c4fe19c`）中
`/skills/489`—`492` 四行均登记 `agentId: "lucy"`、`element: "火"`、`damageType: "direct"`、
`skillTypes: ["basic"]`，`buffAnchorId`、`ownerGroupId` 为 `null`，`settlementMult: 0`、
`baseMultFactor: 100`。动作、来源行与 12 级 `baseMult` 逐一对应如下：

| 动作                                     | 来源行        | 12 级 `baseMult` |
| ---------------------------------------- | ------------- | ---------------- |
| `action:agent:1151:action:0011` 棒球棍   | `/skills/492` | 186              |
| `action:agent:1151:action:0012` 拳套     | `/skills/491` | 255.1            |
| `action:agent:1151:action:0013` 弹弓     | `/skills/490` | 351              |
| `action:agent:1151:action:0014` 回旋挥击 | `/skills/489` | 500.8            |

该来源的实际计算路径中，[伤害页](https://github.com/Nie7bai/ZZZ-HP/blob/0df40c5bc38f8da7ed0f9eed6be87fb8155b8357/zzz-hp/src/composables/useDamageProcessEvents.ts#L106)
以 `requirePanel: true` 求值；[命中解析](https://github.com/Nie7bai/ZZZ-HP/blob/0df40c5bc38f8da7ed0f9eed6be87fb8155b8357/zzz-hp/src/utils/resolvedHit.ts#L75)
只有异常类才要求第二个角色与属性提供者；[最优分配](https://github.com/Nie7bai/ZZZ-HP/blob/0df40c5bc38f8da7ed0f9eed6be87fb8155b8357/zzz-hp/src/utils/optimalAffixAlloc.ts#L807)
取 `ownerAgent.element`、经 `ownerExternal`/`computeFinalPanel` 得到露西面板、抗性取本体槽位，末尾按
`perHit × hit.count` 汇总（[#L1177](https://github.com/Nie7bai/ZZZ-HP/blob/0df40c5bc38f8da7ed0f9eed6be87fb8155b8357/zzz-hp/src/utils/optimalAffixAlloc.ts#L1177)）；
[面板收集](https://github.com/Nie7bai/ZZZ-HP/blob/0df40c5bc38f8da7ed0f9eed6be87fb8155b8357/zzz-hp/src/utils/panelBuffCalc.ts#L1249)
对本体收集 self+team、对队友只收集 team，没有小猪独立属性分支；直伤公式取该面板的攻击力与增伤、
暴击（[基础项](https://github.com/Nie7bai/ZZZ-HP/blob/0df40c5bc38f8da7ed0f9eed6be87fb8155b8357/zzz-hp/src/utils/damageCalc.ts#L378)、
[乘区](https://github.com/Nie7bai/ZZZ-HP/blob/0df40c5bc38f8da7ed0f9eed6be87fb8155b8357/zzz-hp/src/utils/damageCalc.ts#L450)）。
上游[导入器](https://github.com/Nie7bai/ZZZ-HP/blob/0df40c5bc38f8da7ed0f9eed6be87fb8155b8357/zzz-hp-backend/scripts/import-nanoka-skills.mjs#L302)
把行元素固定写为 `agentElement`，这是同一份 Nanoka 物理正文在上游成为火属性的直接原因。
上述计算路径文件在技能来源 `0df40c5b` 与增益来源 `fac62407` 两处字节一致；
固定来源露西 `/agents/57` 没有小猪专属分类或追加攻击规则登记。

**冲突记录**：Nanoka 固定 `agents/1151/details.zh.json`（sha256
`cecf218cd0535701d0059888273a8c74562da6f2f1d76bca4c52425673edc1e2`）的
`/skill/basic/description/1/desc`、`/skill/basic/description/2/desc` 均写“造成物理伤害”，
固定上游行与该计算路径却按火属性结算。本项目接受上游约定登记 `fire`、消费火伤加成与火抗，
这只是来源约定，不证明游戏内真实结算属性，也不作为游戏实测结果。

以下机制未实现，也不以替代公式补算：小猪独立面板或独立属性来源；
小猪继承露西攻击力、冲击力与异常精通；核心被动 1—7 对[加油！]的 140%—200% 强化；
队伍条件满足时小猪继承露西暴击率与暴击伤害；小猪生命周期、三只小猪、随机选招与自动累计触发；
影画六猪雨的 300% 火伤（属于未列入这四条动作的独立事件）。
本次静态计算复用调用方配置的露西及调用方已组装的面板：露西同时为动作所有者、本次伤害实体与
属性提供者，core 以 `input.actorId` 作为倍率属性来源；显式选择的[加油！]两条效果与影画四仍按
[静态增益契约](zzz-hp-static-effects.md#修订-3特殊技等级与显式状态选择)作用一次，不向“小猪”重复追加，
也不自动开启。
`repeat: 1` 不代表已确认内部仅一次命中，`requireIndividualHits` 仍拒绝这些合计动作。

独立期望、火/物正反例、加油与影画四开关、打包消费的回归见
[agent-actions 测试](../../../packages/data/test/agent-actions.test.ts)与
[static-calculation 测试](../../../packages/data/test/static-calculation.test.ts)。

### 具名约定：克拉蕾锐化伤害

克拉蕾（`1611`，锋御）的 25 条伤害动作在 3.2 增量中按 `special-mechanic` / `unknown-category` 暂记为
不可用；接入锐化公式后全部开放，采用具名的 **ZZZ-HP 锐化直伤约定**：每条倍率行作为一个 `sharpen`、
`electric`、`aggregate`、`repeat: 1` 的段，缩放属性为 `defense`，倍率取来源 `baseMult / 100`，
完整攻击倍率只计入一次。普通攻击、闪避反击、支援与特殊技的培养等级照常选择；`requireIndividualHits`
仍拒绝这些合计动作，`repeat: 1` 不代表已确认内部仅一次命中。

证据来自 Nanoka `3.2` 的 `agents/1611/details.zh.json` 与 `details.en.json`（Pointer 逐行对应），
并核对固定 ZZZ-HP 技能来源 `0df40c5b` 的 25 行：全部登记 `agentId: "claret"`、`element: "电"`、
`damageType: "direct"`、`settlementMult: 0`、`baseMultFactor: 100`、`multSource: "nanoka"`。12 级
`baseMult` 抽样对照如下（完整逐行对照见
[agent-actions 测试](../../../packages/data/test/agent-actions.test.ts)）：

| 动作                                             | 来源行                              | 12 级 `baseMult` |
| ------------------------------------------------ | ----------------------------------- | ---------------- |
| `action:agent:1611:action:0019` 终结技           | `sk-claret-nk-1611021-main`         | 4504.8           |
| `action:agent:1611:action:0007` 反制支援         | `sk-claret-nk-1611028-main`         | 2306.9           |
| `action:agent:1611:action:0015` 锻星三段连续斩击 | `sk-claret-nk-1611007-三段连续斩击` | 904.2            |
| `action:agent:1611:action:0027` 毁伤             | `sk-claret-nk-1611013-毁伤`         | 1625.6           |

反制支援：寸铁不让（`action:agent:1611:action:0007`）新增 `counter-assist` 分类（上游记为
`assist`）：在目录匹配中属于支援，不是 `EntryAction`。锻星一段/二段/三段、伏钺、毁伤、连携与终结
按上游 `buffAnchorId` 绑定既有增益目标 `claret-basic-mtskq8rr` / `claret-basic-mtsef46o` /
`claret-basic-mtskqn2n` / `claret-special-mtsecz30` / `claret-chain-mtsefivk` /
`claret-ultimate-mtsefude`；未登记目标的行保持空集合，不猜测受益范围。

锐化伤害公式、锐暴区、`sharpCriticalDamage` 直伤属性与克拉蕾增益的三项具名差异（M1 倍率编码、
残锋自身目标、猩红渴望电属性范围）统一见
[ZZZ-HP 静态增益数据接入修订 9](zzz-hp-static-effects.md#修订-9锐化与锐暴公式及实体接入)，
本节不重复定义。仅失衡的 3 条招架动作（0003—0005）照常返回 `daze-only`，不因锐化接入改变。

### 已知限制：卢西娅合唱末段生命附加伤害

PR4 跳过此项实现，仅记录为已知限制。当前[卢西娅动作定义](../../../packages/data/definitions/skills/agents/1451.json)的行为是：

- `action:agent:1451:action:0024`（强化特殊技：死神协奏曲·破晓）仍可计算已接入的攻击力倍率，
  结果不包含末段的生命值附加伤害，不能作为该招式包含全部机制的完整伤害。
- `action:agent:1451:action:0025`（[合唱]额外伤害倍率）保持 `unavailable`，原因仍为
  `special-mechanic` 与 `unsupported-expression`；解析失败不能视为零贡献，也不能把该行当作独立的普通攻击力伤害。

证据来自 Nanoka 3.1 的 `agents/1451/details.zh.json` 与 `details.en.json`，两种语言的 Pointer 一致：
`/skill/special/description/1/desc` 说明按最大生命值的相应比例额外提升 `[合唱]` 最后一段攻击的伤害；
主动作倍率位于 `/skill/special/description/3/param/0`，引用参数 `1451011`；附加行位于
`/skill/special/description/3/param/4`，表达式为 `{CAL:0.34+AvatarSkillLevel(1)*0.03,100,2}%`，没有技能参数 ID。
中文文件 SHA-256 为 `501102a4740b5b6e8814f180bbd1dc920d7d682ae5b42411d1b75f60277a98ce`，
英文为 `f431cf4a9dbe99d977b672a08d3d83e750ad3eca839c9dad4ea66f84b46381e8`。
原文适用于所有 `[合唱]`，此处以破晓两行定位缺口；其他 `[合唱]` 动作也未因此获得这份附加伤害支持。

固定 ZZZ-HP 技能来源 `0df40c5b` 与增益来源 `fac62407` 均未实现该项。
技能目录 `zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json` 的 `/skills/469` 只记录破晓主倍率，
12 级为 1277.2%；[导入器](https://github.com/Nie7bai/ZZZ-HP/blob/0df40c5bc38f8da7ed0f9eed6be87fb8155b8357/zzz-hp-backend/scripts/import-nanoka-skills.mjs#L159)
跳过没有技能参数 ID 的倍率行，[伤害公式](https://github.com/Nie7bai/ZZZ-HP/blob/0df40c5bc38f8da7ed0f9eed6be87fb8155b8357/zzz-hp/src/utils/damageCalc.ts#L378)
也没有补算这份生命值附加项。固定上游结果不能作为该项伤害的独立期望值。

后续重新处理时，须先取得独立机制资料或受控实测，确认附加项的结算位置、生命值读取时点及适用的
暴击、增伤、防御和抗性等乘区，再明确附加行与主动作的组合及选择契约，避免重复计入。
原文的“最大生命值”与破暗使用的“初始最大生命值”有区别，不能直接套用破暗或照的读取阶段。
需要逐命中、末段差异增益或显示取整结果时，还须补齐末段与内部命中的证据；
整条倍率、`repeat: 1` 与 `attackData` 均不能作为已确认拆分的依据。
本次不变更动作状态、生成制品、manifest 或覆盖统计，也不把上述待确认事项登记为已支持的计算契约。

### 已知限制：月城柳极性紊乱

PR5 按 ZZZ-HP 已有实现范围处理；固定上游未实现完整极性紊乱，本次跳过动作适配，仅记录限制，
不继续独立补证或自行补公式。当前[月城柳动作定义](../../../packages/data/definitions/skills/agents/1221.json)中，
以下两条仍为 `unavailable`，原因均为 `special-mechanic` 与 `unsupported-expression`：

- `action:agent:1221:action:0018`：终结技：雷影天华的额外附加伤害倍率，等级类别为 `chain`。
- `action:agent:1221:action:0024`：强化特殊技：月华流转的额外附加伤害倍率，等级类别为 `special`。

普通终结技 `action:agent:1221:action:0017`、强化特殊技突刺 `action:agent:1221:action:0022` 与
下落攻击 `action:agent:1221:action:0023` 仍只计算已接入的攻击力倍率，不自动追加极性紊乱。
两条附加行只描述柳异常精通对应的系数，不能当普通攻击力倍率、完整极性紊乱或零贡献使用。

证据来自 Nanoka 3.1 的 `agents/1221/details.zh.json` 与 `details.en.json`，两种语言的 Pointer 一致：
`/skill/chain/description/1/desc` 与 `/skill/special/description/1/desc` 分别说明终结落雷和强化特殊技下落
命中已有属性异常的敌人时，造成原紊乱的 15% 加柳异常精通附加伤害，且不清除原异常。
附加倍率行分别为 `/skill/chain/description/3/param/2` 的 `{CAL:5+AvatarSkillLevel(3)*2.25,100,2}%`，
以及 `/skill/special/description/3/param/5` 的 `{CAL:5+AvatarSkillLevel(1)*2.25,100,2}%`，均没有技能参数 ID。
中文文件 SHA-256 为 `fcdad70a359337a79ffeb884e5b17818e03a65f92796557f86511a339c4b4a09`，
英文为 `8d76612586adf147ce31024e5ecf85e9599fe746392d37ea03710996e617c917`。

固定 ZZZ-HP 技能来源 `0df40c5b` 与增益来源 `fac62407` 均未实现这份精通附加结算。
资源 `zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json` 的
`/agents/28/mindscapeBuffs/0/effectBlocks/2/note` 虽写明 15%、3200.0% 异常精通和不清除异常，
但[导入器](https://github.com/Nie7bai/ZZZ-HP/blob/0df40c5bc38f8da7ed0f9eed6be87fb8155b8357/zzz-hp-backend/scripts/import-nanoka-skills.mjs#L159)
跳过没有技能参数 ID 的倍率行；[伤害公式](https://github.com/Nie7bai/ZZZ-HP/blob/fac62407f3d3995f8200a66be0038f292b1455fa/zzz-hp/src/utils/damageCalc.ts#L828)
仍走通用紊乱，没有独立的柳精通附加项。默认路径先对基础倍率应用修正，再加时间补偿，
不能据此认定完整原紊乱的 15% 已正确结算。描述文字和通用倍率配置不能作为完整伤害的独立期望值。
补查上游提交 [`0fcd8a1`](https://github.com/Nie7bai/ZZZ-HP/blob/0fcd8a1fb70cc9dbe5c3423f4015f85ca8faa5ba/zzz-hp/src/utils/damageCalc.ts#L832)
仍未补齐该附加项；此补查不升级项目固定来源。

另保留影画二的来源字段冲突：同一资源的 `/agents/28/mindscapeBuffs/2/effectBlocks/0/effects/1`
（`eff-ms4qkjzo-r424yz`）将每次额外突刺的 15 个百分点登记为 `turbulenceBaseMultFactor`（乱流）。
Nanoka `/talent/2/desc` 明确指向强化特殊技的极性紊乱：比例变为 20%，额外突刺每次增加 15 个百分点，最多两次；
`/talent/6/desc` 将该次数上限提升为四次。此冲突仅登记，既有增益映射与覆盖状态本次不修正，
不能把已有倍率增益条目的接入视为完整极性紊乱已受支持。

后续重启须先有覆盖完整结算的可追溯上游实现和独立预期值，或另行决定补充机制资料与受控实测。
届时须确认 CAL 格式单位与两类技能最终等级、原异常来源与快照、柳精通读取时点、两部分的目标与属性
绑定、适用乘区、剩余时间、取整及影画层数。若开放，目标是一次返回原紊乱比例部分与精通附加部分，
普通直伤仍由主动作独立计算；须明确动作与 effects 的贡献归属，避免重复计入，不能用任意最终伤害数字
绕过来源绑定，也不自动模拟异常清除或战斗流程。上述是重启条件，尚不是公共计算契约。
本次不改变动作状态、增益规则、生成制品、manifest 或覆盖统计。

## 潜能等级与条件身份

`resolveAgentAction` 接受可选的 `potentialLevel`（整数 0—6；省略按未开启的 0 处理）。
只有实际依赖潜能的动作在定义中登记 `potentialLevels` 合法集合：普通分支动作只接受 0，
潜能分支动作只接受 1—6。非法数值、越界值或未解锁档位抛出 `RangeError`，不插值、
不复用最高档，也不用影画等级或战斗层数代替。解析成功时 `resolutionContext` 记录实际
潜能档位；角色潜能改变后调用方必须重新解析，core 会拒绝复用。

零号·安比的连携技与终结技在两条分支都可用，但追加攻击身份只属于潜能 1—6 且调用方
显式提供 `additionalAbilityActive` 时：该事实必填且必须为布尔值，缺失或类型错误抛出
`TypeError`。事实为真时解析结果追加登记的目标与 `zzz-hp:follow-up` 标签，为假或潜能 0
时保持原本的连携/终结分类；解析上下文保存该事实，改变它必须重新解析。队伍条件
（击破或支援角色）由调用方断言，不自动推断。

## 静态效果衔接

动作提供显式 `skillTargetIds`，绑定已发布效果目录的目标身份。例如落雷对应
`zzz-hp:skill:anby-basic-ms47yaat`。生成器验证目标存在且归属正确；不通过来源数字 ID 猜测目标。
耀嘉音和弦的追加震音按来源说明归为强化特殊技；朱鸢强化霰弹、苍角强化攻击等只绑定对应分支。
只覆盖招式一部分的目标不能绑定到合计行，例如安东支援突击的电钻/打桩、派派终结技的下砸；
这些限制随动作返回。需要分别应用其增益时，必须请求独立命中，当前会拒绝未确认的拆分。
核心或影画另外触发的伤害（例如余烬、破甲凶弹）不因选择常规动作而自动追加。
调用 `calculateStaticDamageFromCatalog` 时，将这些目标与解析后的类别、属性、基础项一起提供。
支援突击使用 `assist-follow-up`，在目录匹配中属于支援，但不是 `EntryAction`；不能触发第二次入场。

追加攻击身份可与普攻、特殊技或连携分类并存，通过 `skillTags` 的 `zzz-hp:follow-up` 或已绑定目标的
`countsAsFollowUp` 明确提供，
不要求动作已经被某个具名效果目标引用。雨果支援或闪避反击后的派生射击按来源说明使用普攻伤害分类，
倍率仍读取各自的支援或闪避培养等级。

合计段不得直接套用逐次附加伤害；调用方须按上述限制选择场景。buff、减防、层数与其他静态事实
继续由调用方提供，不因选择强化子弹动作就自动模拟核心触发。动作解析器不组装完整面板或运行战斗时间线。

## 覆盖、证据与生成

本版共 1,308 条：1,126 条伤害计算、168 条仅失衡、4 条耀变、10 条待补；逐次命中已确认的动作仍为 1 条。
待补项按互斥原因分为：3 条特殊机制且表达式未支持、6 条未知分类、1 条未知元素。
混合属性阻塞按上述来源约定处理，不表示已经完成游戏内部命中与属性分配的核实。
全部伤害、失衡和耀变倍率展示行均进入覆盖校验；缺失、新增或重复覆盖会拒绝生成。
能量消耗、回复、治疗等其他参数仍由原始详情提供，不自动归一化为伤害。

ZZZ-HP 固定提交 `0df40c5bc38f8da7ed0f9eed6be87fb8155b8357` 为语义参考，文件摘要在
[`evidence.json`](../../../packages/data/scripts/skills/evidence.json)。具名差异随 manifest 发布，包括角色默认属性
误用于物理招式、只提取复合倍率首项等。运行与普通构建不需要 ZZZ-HP 工作区或网络。

```sh
pnpm --filter @randomplay/data generate:agent-actions <pinnedSourceRoot> <newOutputDirectory>
```

生成器先验证固定来源，持锁验证并复制 integrated，然后基于固定副本转换。候选只写入不存在的目录，
复用现有受保护路径检查和独占安装协议；不自动覆盖正式 definitions。审查候选后安装并提交。

消费准备和构建将技能制品与其他 definitions 一起冻结，并校验来源成员、输入摘要、语义 registry、
效果目标目录摘要、制品文件集合与字节。过期技能定义不阻止获取来源副本，只在消费和发布边界拒绝。
普通构建不抓取、重算或改写 integrated，也不初始化或重置本机管理状态。

游戏实测样本：60 级 6 影妮可，核心 7、普攻最终 15，无音擎和驱动盘；入场已有强化子弹，
对 70 级未失衡杜拉罕首次点按普攻，非暴击显示 `342 + 144 × 3`。按攻击 649.1691、物理抗性 0、
目标防御 921.04 和 40% 减防复算得到相同结果；无减防为 `269 + 113 × 3`。
该样本验证此动作的拆分与静态数值，不宣称测得所有技能的内部命中或事件时序。
