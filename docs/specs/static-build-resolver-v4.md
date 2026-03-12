# 静态构筑解析系统 V4 范围

本文档冻结 `Static Build Resolver` 的下一主线范围，目标是把 resolver 从“只理解核心技/精炼 + finalPanel 快照”推进到“能理解高价值 progression context”的阶段。

这里的 progression context 指：

- 代理人影画 / 潜能觉醒等级
- 少量不会自行从战斗过程推导、但用户可以显式提供的成长类快照

V4 的核心不是再扩 damage type，而是让 resolver 能表达更多“构筑阶段就已经确定”的效果。

## 当前进度

当前 V4 已进入第六批覆盖，状态如下：

- `V4.1` contract freeze：已完成
- `V4.2` progression-aware resolver：已完成首轮 runtime 接入
- `V4.3` 高价值来源覆盖：已完成 `柏妮思`、`奥菲丝&「鬼火」`、`爱丽丝`、`薇薇安`、`简`、`柳` 第六批
- `V4.4` assumptions refinement：已完成第六轮细化

当前已实现的 contract：

- `loadout.agentMindscape`
- `finalPanel.energyGenerationRate`
- `condition.minimumMindscape`

当前已接入的高价值 progression-aware 规则：

- `柏妮思`
  - 潜能觉醒「沸点派对」：基于 `energyGenerationRate` 的异常掌控提升
  - 潜能觉醒「沸点派对」：基于 `energyGenerationRate` 的伤害提升
- `奥菲丝&「鬼火」`
  - 核心技「准星聚焦」：基于 `energyGenerationRate` 的额外攻击力
  - 影画 1：`[准星聚焦]` 状态下的额外伤害提升
  - 影画 1：`特殊技 / 强化特殊技` 无视火抗
  - 影画 2：`终结技` 后攻击力提升
  - 影画 4：`强化特殊技 / 终结技` 伤害提升
- `爱丽丝`
  - 影画 1：`[强击]` 后减防
  - 影画 2：物理来源 `disorder` 伤害提升
  - 影画 4：物理异常 / `disorder` 无视抗性
- `薇薇安`
  - 影画 1：`[薇薇安的预言]` 目标异常 / `disorder` 伤害提升
  - 影画 2：以太异常 / `disorder` 无视抗性
- `简`
  - 核心被动：基于已解析异常精通的强击异常暴击率追加
  - 影画 2：`[啮咬]` 目标减防
  - 影画 2：物理强击异常暴击伤害
  - 影画 4：`[强击] / [紊乱]` 后异常伤害提升
- `柳`
  - 影画 1：`[洞悉]` 状态下异常精通提升
  - 影画 4：`[识破]` 目标穿透率提升

当前仍明确 out-of-scope 的相关机制：

- `柏妮思` 的 `[燃点]/[余烬]` 触发链、堆层与节奏缩短
- `奥菲丝&「鬼火」` 的后台自动释放与 `[蓄炎]` 循环
- `简` 的影画 6 `[狂热]` 直入与额外攻击
- `柳` 的 `[月相]` 切换积蓄效率与影画层数获取 / 消耗
- anomaly / disorder skill matrix

## 当前状态

- `V2.1`、`V2.2`、`V3` 已完成
- `resolveStaticBuildDamage` 已支持 `normal / sheer / anomaly / disorder`
- `resolveStaticBuildSkillMatrix` 仍只支持 `normal / sheer`
- 当前 resolver 已支持的 progression context 只有：
  - `coreSkillLevel`
  - `wEngineRefinement`
  - `agentLevel`
  - `finalPanel.anomalyMastery`
  - `loadout.agentMindscape`
  - `finalPanel.energyGenerationRate`

当前仍无法直接表达、但已经明确属于“静态快照而非动态模拟”的高价值来源主要有：

- `柏妮思`：`[余烬]` 额外倍率、堆层穿透率、影画 6 的额外结算
- `奥菲丝&「鬼火」`：后台自动释放、`[蓄炎]` 循环、影画 6 的额外激光伤害
- 其余由影画 / 潜能觉醒解锁、且无需团队时间轴就能静态判断的效果

## 1. V4 目标

V4 只做一条主线：

- 把高价值 progression context 接入 `resolveStaticBuildDamage`

V4 不做：

- 时间轴模拟
- 团队循环模拟
- anomaly / disorder skill matrix
- 全量自动解析所有影画 / 潜能觉醒文本

## 2. V4 范围

### 2.1 输入模式

V4 继续只支持 `finalPanel`，不引入 `derivedPanel`。

### 2.2 伤害类型

V4 不新增 damage type，继续沿用：

- `normal`
- `sheer`
- `anomaly`
- `disorder`

### 2.3 支持对象

V4 的第一目标不是扩代理人数量，而是扩已支持代理人的 progression-aware coverage。

优先覆盖：

1. `柏妮思`
2. `奥菲丝&「鬼火」`
3. 其余存在高价值影画 / 潜能觉醒静态效果、且当前仍主要依赖 assumptions 的来源

## 3. V4 输入 Contract 变化

### 3.1 `loadout`

V4 计划新增：

- `agentMindscape`

约定：

- 范围为 `0..6`
- `0` 表示未解锁影画
- 仅用于 gating 影画 / 潜能觉醒相关的 curated effects
- 不用于推导基础面板

### 3.2 `finalPanel`

V4 计划新增一批 progression 快照字段，但仍坚持“只加能显式输入、且不会强迫进入动态模拟的字段”。

第一批优先考虑：

- `energyGenerationRate`

约定：

- 表示“初始能量自动回复 / 闪能自动累积”快照
- 只作为 value context 使用，不直接进入所有公式 bucket
- 若某来源需要它，但用户未提供，则继续保留 source-specific assumptions

后续候选字段：

- 其余可由用户直接提供、且能稳定映射到静态效果的特殊快照

### 3.3 `scenario`

V4 不改 `scenario` discriminated union。

如果某 progression 相关效果依赖当前状态：

- 仍优先放进 `combatTags`
- 或放进显式 value context

不新增隐式推断逻辑。

## 4. Effect Schema 变化

V4 计划扩展两类表达能力：

### 4.1 progression gating

新增条件表达：

- `minimumMindscape`

用途：

- 让某个 effect 只在指定影画 / 潜能觉醒等级时生效

### 4.2 progression value context

新增 value context 字段：

- `energyGenerationRate`

用途：

- 支持这类公式：
  - 达到阈值后，每超过 `0.1` 点追加若干属性
  - 存在上限封顶

## 5. V4 分阶段

### 5.1 V4.1 contract freeze

冻结：

- `loadout.agentMindscape`
- `finalPanel.energyGenerationRate`
- `minimumMindscape`

这一阶段只改 contract 和文档，不补运行时代码。

### 5.2 V4.2 progression-aware resolver

实现：

- `types.ts`
- `resolver.ts`
- `definitions.ts`

目标：

- 让 resolver 能消费 `agentMindscape` 与 `energyGenerationRate`
- trace / assumptions 能明确说明“缺的是 mindscape 还是快照字段”

### 5.3 V4.3 高价值来源覆盖

第一批优先来源：

1. `柏妮思`
   - 基于初始能量自动回复的异常掌控提升
   - 基于初始能量自动回复的伤害提升
2. `奥菲丝&「鬼火」`
   - 基于初始能量自动回复的攻击力额外提升

原则：

- 只补当前 contract 能稳定表达的部分
- `[燃点]/[余烬]` 触发链、后台自动释放之类仍保持 out-of-scope

### 5.4 V4.4 assumptions refinement

把“未收录 progression 支持”的泛化说明继续细分成：

- 缺少 `agentMindscape`
- 缺少 `energyGenerationRate`
- 当前仍未展开的动态机制

## 6. 明确不做

V4 不做：

1. 全量影画 / 潜能觉醒 coverage
2. 用 raw 文本自动抽取所有 progression 规则
3. 团队共享类影画的完整多角色静态分摊
4. 进入异常 / 紊乱 matrix
5. 基于后台自动释放、自动触发链的准动态模拟

## 7. 验收标准

进入 V4 实现收口前，至少满足：

1. `loadout.agentMindscape` 和 `finalPanel.energyGenerationRate` contract 明确
2. resolver trace / assumptions 能区分“未提供 progression 快照”和“当前机制仍未展开”
3. `柏妮思` 与 `奥菲丝&「鬼火」` 至少各有一条 progression-aware effect 落地
4. 文档入口、README、architecture、roadmap 同步更新
