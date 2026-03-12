# 静态构筑解析系统 V8 范围

`V7` 收口后，异常 / 紊乱剩余 assumptions 的问题已经不再是“缺少一个新的 override bucket”，而是“还没有把剩余来源明确归到正确的 contract”。

当前剩余 assumptions 混杂了几类完全不同的东西：

- `finalPanel` 快照
- `dynamicSnapshot` 次数 / 倍率快照
- `stateSnapshot` 来源特定状态与结算倍率
- `resolvedSnapshot` 最终 bucket 增量 / 最终倍率 factor
- 真动态过程：时间轴、资源消耗、后台自动释放、随机分支

如果继续在没有归属规则的情况下逐条处理，会很快出现两个问题：

1. 同类来源被塞进不同 contract，后续很难维护
2. `resolvedSnapshot` / `dynamicSnapshot` 被继续拿来做兜底，contract 边界重新变脏

因此，`V8` 的目标不是直接扩新伤害类型，而是：

- 先把剩余 assumptions 归类到正确 contract
- 只在存在明确共性的前提下，新增最小 contract
- 把不适合静态表达的来源明确留在 assumptions，不再硬塞

## 当前进度

- `V8.1` contract freeze：已完成
- `V8.2` assumption inventory：已完成第一批
- `V8.3` minimal contract additions：当前结论为暂不进入
- `V8.4` source migration / closeout：已完成第一批 note refinement

## 1. 为什么需要 V8

`V4`、`V5`、`V6`、`V7` 分别补齐了：

- progression-aware context
- source-aware dynamic snapshot
- source-state snapshot
- resolved snapshot overrides

这些 contract 已经足够覆盖大部分“静态但需要显式快照”的高价值来源。

因此，当前剩余 assumptions 的核心问题不是“公式不够多”，而是：

- 还没有统一判断一个来源应该落到哪种 contract
- 少数来源可能确实还缺一个新的共享输入位
- 另一部分来源本质上就是动态过程，不该继续塞进静态 resolver

`V8` 用来把这件事收口。

## 2. V8 目标

`V8` 只做两件事：

1. 为 anomaly / disorder 剩余 assumptions 建立明确的 contract 归属规则
2. 仅在满足共性和静态快照语义时，新增最小 public contract

`V8` 不追求：

- 一次性清空所有 assumptions
- 引入时间轴 / 资源过程模拟
- 为单一来源发明新的专用 key

## 3. Contract 归属规则

后续每一条 anomaly / disorder 剩余 assumptions，都必须先归到下面 5 类之一：

1. `finalPanel`
   - 最终面板快照
   - 例如：异常掌控、能量回复、最终穿透等

2. `dynamicSnapshot`
   - 当前这次结算已经确定的次数 / 倍率 / 额外条目值
   - 例如：额外结算次数、额外倍率、额外命中条目的本轮快照

3. `stateSnapshot`
   - 来源特定状态是否成立，以及该状态对应的 source-specific 结算倍率

4. `resolvedSnapshot`
   - 上层已经算好的最终 bucket 增量或最终倍率 factor
   - 只在该值已经是“结算结果”而不是“中间过程”时使用

5. 真动态过程
   - 时间轴、资源消耗、后台自动释放、随机三选一、独立异常槽积蓄过程
   - 这类项保留为 assumptions，不强行并入当前静态 resolver

## 4. V8 明确不做

`V8` 不做：

- anomaly / disorder skill matrix
- 新 damage type
- 团队循环 / 时间轴 / 资源过程模拟
- 为单个来源增加一次性专用 contract
- 第二份 anomaly / disorder cleaned 发布层

## 5. 新增 contract 的准入条件

只有同时满足下面条件，`V8` 才允许新增 public contract：

1. 至少有两个独立来源共享同一类缺失值
2. 该值可以被用户显式提供为静态快照
3. 该值不是时间轴或触发链过程变量
4. 该值无法稳定归到现有 `finalPanel` / `dynamicSnapshot` / `stateSnapshot` / `resolvedSnapshot`
5. 新 key 的命名能表达通用语义，而不是绑定单个来源

如果不满足以上条件，则：

- 优先继续使用现有 contract
- 或明确保留在 assumptions

## 6. V8 分阶段

### 6.1 `V8.1` contract freeze

冻结：

- contract 归属规则
- 新增 contract 的准入条件
- 第一批 inventory 范围

这一阶段只改：

- 规格文档
- roadmap
- 文档索引

### 6.2 `V8.2` assumption inventory

把当前 anomaly / disorder 剩余 assumptions 按归属规则分为：

- `finalPanel`
- `dynamicSnapshot`
- `stateSnapshot`
- `resolvedSnapshot`
- 真动态过程

第一批重点来源：

- `柏妮思`
- `雅`
- `奥菲丝&「鬼火」`
- `轰鸣座驾`
- 其余仍写着“请手动调整 damageMultiplier / finalPanel / snapshot”的 anomaly 来源

产出：

- 一张 inventory 清单
- 每个来源的 contract 归属
- 是否需要新增 key 的判断

当前结论：

- 第一批 inventory 已完成
- 当前没有发现“至少两个独立来源共享、且无法落到现有 contract”的新静态快照值
- 因此 `V8.3` 先不进入实现，后续只在 inventory 结论变化时重新开启

### 6.3 `V8.3` minimal contract additions

仅在 `V8.2` 证明确有共性时才做：

- 新 public types
- resolver wiring
- tool schema 扩展

若 inventory 证明无需新增 contract，则这一阶段显式跳过。

### 6.4 `V8.4` source migration / closeout

把 `V8.2` / `V8.3` 确认可迁移的来源逐批迁出 assumptions。

收口标准：

- 该批来源已经进入正确 contract
- source-specific assumptions 明显收紧
- 文档已更新为新的来源归属

## 7. 第一批判断基线

当前 `V8` 的默认判断是：

- `柏妮思` 的 `[余烬]` 额外结算次数 / 额外倍率：继续归 `dynamicSnapshot`
- `雅` 的独立烈霜异常槽与 `[霜灼·破]`：继续归 `stateSnapshot` 或保留动态 assumptions，不强塞 `resolvedSnapshot`
- `奥菲丝&「鬼火」` 的后台自动释放与 `[蓄炎]` 循环：真动态过程
- `轰鸣座驾` 的随机三选一增益：若不能拆成稳定快照输入，则继续保留 assumptions

这意味着 `V8` 的第一目标是把“该进哪里”说清楚，而不是默认新增 key。

## 8. `V8.2` 第一批 inventory 结果

第一批 inventory 覆盖了当前 anomaly / disorder 剩余 assumptions 中最容易继续漂移的来源。

### 8.1 `finalPanel`

适合继续落到 `finalPanel` 的来源：

- `爱丽丝` 的异常掌控 -> 异常精通换算
- `爱芮` 的异常掌控 -> 异常暴击率换算
- `十方锻星` 的异常掌控快照

这类来源的共同特征是：

- 最终会表现为稳定面板值
- 不依赖本轮额外触发次数
- 已有 `finalPanel` contract 能表达

### 8.2 `dynamicSnapshot`

适合继续落到 `dynamicSnapshot` 的来源：

- `柏妮思` 的 `[燃点]/[余烬]` 额外结算状态 / 次数 / 倍率
- `爱芮` 的 `[异放]` 额外倍率、失衡额外倍率
- `薇薇安` 的 `[异放]` 比例与追击伤害，若后续要静态快照化，应优先评估是否能复用现有 `dynamicSnapshot`

这类来源的共同特征是：

- 本轮已经确定
- 但不是最终 bucket，而是过程中的次数或倍率

### 8.3 `stateSnapshot`

适合继续落到 `stateSnapshot` 的来源：

- `爱丽丝` 的 `[极性强击]`
- `雅` 的 `[霜灼·破]`

这类来源的共同特征是：

- 需要先判断来源特定状态是否成立
- 状态成立后，还需要一个 source-specific 结算倍率

### 8.4 `resolvedSnapshot`

第一批 inventory 的结论是：

- `resolvedSnapshot` 继续新增来源的必要性已经很低
- 当前高价值 clean migration 已基本完成：
  - `柏妮思 M6`
  - `格莉丝 M2`
  - `简`
  - `派派`
  - `时流贤者`
  - `柳 M2`
  - `薇薇安 M2`
- 目前没有发现新的高共性来源，需要再为 `resolvedSnapshot` 增加 public key

### 8.5 真动态过程

当前明确不应继续塞进静态 snapshot contract 的来源：

- `奥菲丝&「鬼火」` 的后台自动释放与 `[蓄炎]` 循环
- `奥菲丝&「鬼火」M6` 的追加激光伤害
- `灼心摇壶` 的后场能量自动回复
- `轰鸣座驾` 的随机三选一增益
- `雅` 的独立烈霜异常槽
- `简 M6` 的额外攻击

这些项要么依赖时间轴，要么依赖随机分支，要么依赖独立槽位过程，不属于当前静态 resolver 的 contract 范围。

## 9. `V8.3` 当前判断

当前结论：

- `V8.3 minimal contract additions` 暂不进入
- 原因不是没有剩余 assumptions，而是这些 assumptions 目前都能明确归到：
  - 现有 contract
  - 或真动态过程
- 在没有出现新的“共享静态快照值”之前，不新增 public key

## 10. `V8.4` 收口进度

第一批收口没有新增 contract，而是先把 source-specific assumptions 改写为更明确的 contract 归属说明。

当前已收口的高风险来源：

- `奥菲丝&「鬼火」`：后台自动释放、`[蓄炎]` 循环、喧响值回复、M6 追加激光
- `柳`：`[月相]` 架势切换、`[洞悉]` 层数获取 / 消耗
- `简 M6`
- `薇薇安`：`[异放]` 比例 / 追击伤害、`[护羽]/[飞羽]` 消耗与回复
- `雅`：独立烈霜异常槽
- `灼心摇壶`
- `轰鸣座驾`
- `十方锻星`

这批收口后的目标是：

- 人和上层 Agent 不再把这些来源误判成“应该继续加一个新的 snapshot key”
- 先明确它们属于：
  - 现有 contract
  - 或真动态过程

第二批收口继续覆盖：

- `柏妮思`：`[燃点]/[余烬]` 状态 / 次数 / 倍率、潜能觉醒中的 `[余烬]` 间隔降低、影画 1 的 `[余烬]` 倍率 / 积蓄值提升
- `爱丽丝 M6`
- `爱芮`：`[异放]` 额外倍率、失衡额外倍率
- `自由蓝调 4件`

这批收口后的目标是：

- 把仍可能被误解成“应该继续加 resolvedSnapshot”的来源，重新明确为：
  - `dynamicSnapshot`
  - `finalPanel`
  - 真动态过程

第三批收口继续覆盖：

- `格莉丝 M2`
- `简`
- `派派`
- `薇薇安 M2`
- `爱丽丝` 的 `[极性强击]`
- `雅` 的 `[霜灼·破]`
- `混沌重金属 4件`

这批收口后的目标是：

- 把仍可能被误解成“应该给 resolvedSnapshot / stateSnapshot 再扩一个新 key”的来源，重新明确为：
  - 现有 `stateSnapshot`
  - 现有 `resolvedSnapshot`
  - 或 source-specific damage view

## 11. 验收标准

`V8` 完成后，至少满足：

1. anomaly / disorder 剩余 assumptions 都有明确 contract 归属
2. 不再出现“为了迁移而把来源硬塞进不合适的 snapshot”的情况
3. 若新增 contract，必须满足共性准入条件并配套测试
4. 若某类来源应保留为动态过程，文档中要明确写明原因
5. `README` / roadmap / 总 specs / index / architecture 对当前阶段保持一致
