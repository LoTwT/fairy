# 技能倍率、动作目录与等级选择

`@randomplay/data` 提供 Nanoka 3.1 全部 58 名角色的独立动作目录、伤害与失衡成长曲线、
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
- `unavailable`：保留已知曲线与具体原因，例如混合属性尚未分配、特殊结算或潜能条件待核实。

安比前三段普攻为物理、第四段为电；雅前两段普攻为物理，后三段保留 `frost`；仪玄保留
`auric-ink`，蕾米埃尔保留 `lumiflux`。特殊属性不在数据阶段折成角色默认属性或抗性属性。

照的最终裁决、连携和支援突击附加生命项读取 **普攻等级**，要求显式输入 `chargeSeconds`（0—5）。
每秒倍率是 `0.12 + 0.01 × basicLevel`，只对终结一击加入一次，不能按攻击次数重复添加。

`granularity: "individual"` 表示已确认的一次伤害，`repeat` 表示该次伤害重复次数；`aggregate`
表示完整合计，`repeat: 1` 不代表已确认只有一次命中。当前逐次实测确认的是妮可强化普攻第一段。
其余合计只适用于属性、增益和其他乘区在各次命中间一致的情况；需要逐次额外加伤等场景时，调用方
必须设置 `requireIndividualHits: true`，未确认拆分便返回具体限制。来源 `attackData` 不用于猜测命中数。

已知独立伤害分别向上取整再求和；聚合计算允许合理取整误差，不提前取整倍率，也不以误差容忍度
掩盖不同属性或增益适用造成的机制差异。当前没有强加一个未经实测确定的全局误差阈值。

## 静态效果衔接

动作提供显式 `skillTargetIds`，绑定已发布效果目录的目标身份。例如落雷对应
`zzz-hp:skill:anby-basic-ms47yaat`。生成器验证目标存在且归属正确；不通过来源数字 ID 猜测目标。
耀嘉音和弦的追加震音按来源说明归为强化特殊技；朱鸢强化霰弹、苍角强化攻击等只绑定对应分支。
只覆盖招式一部分的目标不能绑定到合计行，例如安东支援突击的电钻/打桩、派派终结技的下砸；
这些限制随动作返回。需要分别应用其增益时，必须请求独立命中，当前会拒绝未确认的拆分。
核心或影画另外触发的伤害（例如余烬、破甲凶弹）不因选择常规动作而自动追加。
调用 `calculateStaticDamageFromCatalog` 时，将这些目标与解析后的类别、属性、基础项一起提供。
支援突击使用 `assist-follow-up`，在目录匹配中属于支援，但不是 `EntryAction`；不能触发第二次入场。

追加攻击身份可与普攻、特殊技或连携分类并存，通过 `skillTags` 的 `zzz-hp:follow-up` 明确提供，
不要求动作已经被某个具名效果目标引用。雨果支援或闪避反击后的派生射击按来源说明使用普攻伤害分类，
倍率仍读取各自的支援或闪避培养等级。

合计段不得直接套用逐次附加伤害；调用方须按上述限制选择场景。buff、减防、层数与其他静态事实
继续由调用方提供，不因选择强化子弹动作就自动模拟核心触发。动作解析器不组装完整面板或运行战斗时间线。

## 覆盖、证据与生成

本版共 1,256 条：962 条伤害计算、161 条仅失衡、4 条耀变、129 条待补。
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
