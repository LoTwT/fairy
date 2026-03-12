# 异常 / 紊乱 Skill Matrix 立项评估

本文档对应 roadmap `8.2 P1`，用于冻结是否应为 `anomaly / disorder` 引入 skill matrix，以及引入前的前置条件。

## 1. 当前状态

当前 `Static Build Resolver` 的能力边界是：

- `resolveStaticBuildDamage`
  - 已支持 `normal / sheer / anomaly / disorder`
- `resolveStaticBuildSkillMatrix`
  - 仅支持 `normal / sheer`
  - 不支持异常 / 紊乱矩阵

这不是实现缺口，而是刻意保留的 out-of-scope。

## 2. 为什么不能直接复用现有 matrix

`normal / sheer` 的 matrix 行，天然对应“某个技能条目 / 某一段 / 某个体型分支”。

但 `anomaly / disorder` 的核心问题不是“技能打了几段”，而是“在什么异常状态快照下触发了什么结算”：

- 同一个技能可能只负责积蓄，不直接对应异常结算
- 同一个异常结算可能来自多个前置动作
- `disorder` 还依赖原异常来源、剩余时间、目标状态
- 一些条目本质上是触发事件，而不是技能段数

因此直接把现有 skill matrix 套到异常 / 紊乱，会产生两类坏结果：

1. 看起来像技能矩阵，实际行语义已经不是“技能”
2. Agent / UI 被迫再次从 `label` 文本猜“这行到底是触发条目还是技能入口”

## 3. 候选设计比较

### 3.1 方案 A：继续做“技能入口矩阵”

定义：

- 每一行仍绑定到某个技能入口
- 再额外标注该技能可能触发的异常 / 紊乱结算

问题：

- 一对多关系非常重
- 同一技能在不同快照下可能对应完全不同的结算
- 行内必须携带更多隐式状态，matrix 会很快退化成“半个战斗模拟器”

结论：

- 不适合作为 V3 之后的第一实现

### 3.2 方案 B：改做“触发条目矩阵”

定义：

- 每一行表示一次异常 / 紊乱结算入口
- 行语义是“触发快照”，不是“技能段”

优点：

- 更符合异常 / 紊乱本质
- 更容易表达 `disorderSourceType`、`remainingTime`、阈值条件

问题：

- 这已经不是当前 `skill matrix` 的语义
- 上层消费方需要接受“异常矩阵不是技能表，而是触发表”

结论：

- 如果后续明确需要实现，这是更合理的方向

## 4. 当前阻塞点

在不扩大 contract 的前提下，异常 / 紊乱矩阵至少缺这些前置条件：

1. 触发快照上下文不够强

- 当前只有：
  - `damageType`
  - `anomalyType`
  - `remainingTime`
  - `combatTags`
- 还缺更显式的：
  - 异常来源快照
  - 指定阈值是否命中
  - 指定来源层数 / 充能段位
  - 部分代理人的来源专属状态

2. 行级语义尚未冻结

- 需要明确：
  - 这是技能行还是触发行
  - 一行是否允许依赖显式快照输入
  - 一行能否没有唯一技能归属

3. 元数据 contract 不够

- 当前 matrix metadata 已足够支撑 `normal / sheer`
- 但异常 / 紊乱还需要额外元数据，例如：
  - `triggerType`
  - `sourceAnomalyType`
  - `snapshotSource`
  - `requiresStateContext`

## 5. 评估结论

当前结论固定如下：

1. 暂不实现 anomaly / disorder skill matrix
2. 若未来实现，优先选择“触发条目矩阵”，而不是继续伪装成技能段矩阵
3. 在 `8.3 dynamic value context` 明确并落地前，不进入实现阶段

## 6. 重新立项的前置条件

只有同时满足下面 3 条，才重新讨论实现：

1. `dynamic value context` 至少补齐第一批必需字段
2. 行语义确定为“技能入口矩阵”或“触发条目矩阵”之一
3. UI / Agent 对异常矩阵的真实消费场景已经明确

## 7. 当前建议

在现阶段，继续优先做：

1. `8.1 P0` 中仍可在当前 contract 下直接表达的 anomaly / disorder curated coverage
2. `8.3` 的 value context 设计与冻结

而不是直接进入异常 / 紊乱 matrix 实现。
