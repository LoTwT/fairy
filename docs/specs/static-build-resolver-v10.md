# 静态构筑解析系统 V10

## 1. 背景

`V9` 已把第一批不应并入主 anomaly / disorder 公式的独立额外结算，迁移到 `source-specific damage view`。

当前剩余来源里，仍有一类满足下面特征：

1. 已经能通过现有 snapshot contract 显式提供动态值
2. 可以通过“含快照结果 - 去除快照结果”的差值表达独立贡献
3. 不需要再扩主公式，也不需要引入 anomaly / disorder matrix

`V10` 只处理这类来源。

## 2. 目标

1. 继续扩 `source-specific damage view`
2. 仅处理当前 contract 下能稳定静态表达的 delta source
3. 保持主 resolver / matrix / source view 三条路径的边界清晰

## 3. 范围

第一批固定为：

1. `爱芮` `[异放]`

research-only，暂不进入实现：

1. `霰落星殿` 额外伤害来源
2. `混沌重金属 4件` 面向侵蚀额外伤害的层数来源

## 4. 不做

- 不新增 anomaly / disorder matrix
- 不扩主 resolver 的 anomaly / disorder 公式
- 不为 `霰落星殿` / `混沌重金属 4件` 臆造新的 snapshot key
- 不做时间轴、触发间隔、后台行为模拟

## 5. 执行顺序

1. `V10.1` scope freeze
2. `V10.2` Aria source view coverage
3. `V10.3` closeout / note routing

当前状态：

- `V10.1` 已完成
- `V10.2` 已完成：`爱芮 [异放]` 已进入 `source-specific damage view`
- `V10.3` 已完成：`霰落星殿` / `混沌重金属 4件` 已固定为 research-only，不再继续扩当前 contract

## 6. 设计要点

### 6.1 Aria `[异放]`

输出形式：

- 独立 `source-specific damage view`
- `resolutionMode = "delta"`

依赖：

- `scenario.dynamicSnapshot.values.ariaExflowDamageRatio`
- 若目标处于失衡：
  - `scenario.dynamicSnapshot.values.ariaStunnedDamageRatio`

结算方式：

- `with snapshot`
- `without snapshot`
- 取两者差值，作为 `[异放]` 独立条目的静态贡献

### 6.2 Research-only 来源

`霰落星殿` 与 `混沌重金属 4件` 当前仍缺少稳定的 source-specific 快照输入，继续保留为 research-only note：

- 不进入当前实现
- 不扩新的 public contract
- 等未来出现稳定 snapshot 或统一 source-value contract 后再重开 scope

## 7. 验收标准

1. `爱芮 [异放]` 可通过独立 source view 暴露，不再只留在 assumptions 中口头解释
2. source view 继续不并入主 anomaly / disorder 公式
3. `README` / roadmap / 总设计文档明确记录：
   - `爱芮 [异放]` 已支持
   - `霰落星殿` / `混沌重金属 4件` 仍是 research-only

## 8. 当前结论

`V10` 已在当前 contract 下收口：

- `爱芮 [异放]` 已通过独立 delta view 暴露
- `霰落星殿` / `混沌重金属 4件` 继续保留为 research-only
- 若未来要继续推进这两类来源，应先定义稳定的 source-value / source-state 快照，再开新 scope
