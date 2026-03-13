# 静态构筑解析系统 V27

`V21` 已引入 anomaly / disorder 的 `trigger-entry matrix`，`V26` 又把 unified source-entry collection 提升成了稳定 summary contract。

到这个阶段，`trigger-entry matrix` 的结构和 `source-entry collection` 出现了同类问题：

1. 底层仍只返回裸 `rows[]`
2. 高层 tool 仍在手工统计：
   - `mainFormulaCount`
   - `sourceViewCount`
   - `unsupportedCount`
3. UI / Agent 仍需要自行判断：
   - 当前是否只有主公式
   - 当前是否存在 source-view 行
   - 当前行应该如何分组和排序

因此，`V27` 的目标不是新增 anomaly / disorder coverage，而是把 `trigger-entry matrix` 提升成和 `source-entry collection` 同级别的可消费 contract。

## 1. 目标

新增 / 收口：

1. 为 `resolveStaticBuildTriggerMatrix()` 增加 matrix-level summary
2. 固定 trigger-entry rows 的排序与分组语义
3. 让高层 tool 与 Agent 直接消费 matrix summary
4. 保持现有 row payload 不变，不新增新的 damage / source formula

## 2. V27 范围

1. `V27.1` scope freeze
2. `V27.2` trigger-matrix summary contract
3. `V27.3` high-level tool alignment
4. `V27.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 扩 `ResolveStaticBuildTriggerMatrixResult`
2. 固定 `rows[]` 排序语义
3. 提供 collection-level group / count summary
4. 让高层 tool 与 Agent 优先消费 `matrix.summary`

显式不做：

1. 不新增 anomaly / disorder source views
2. 不把 utility entries 并进 trigger-entry matrix
3. 不把 trigger-entry matrix 伪装成 skill matrix
4. 不新增新的 snapshot key

## 4. contract 方向

`V27` 第一批只做 trigger-entry matrix 的消费语义增强：

1. `ResolveStaticBuildTriggerMatrixResult`
   - 保留：
     - `profile`
     - `mode`
     - `manualBaseMode`
     - `loadout`
     - `rows`
     - `assumptions`
   - 新增：
     - `summary`

2. `summary`
   - 至少包含：
     - `rowCount`
     - `mainFormulaCount`
     - `sourceViewCount`
     - `supportedCount`
     - `unsupportedCount`
     - `hasSourceViews`
     - `groups`

3. `groups`
   - 第一批固定两组：
     - `main-formula`
     - `source-view`
   - 每组至少包含：
     - `key`
     - `label`
     - `count`
     - `supportedCount`
     - `unsupportedCount`

4. `rows[]`
   - 保持现有 item shape
   - 只补稳定排序，不新增 collection 专用 metadata

## 5. 排序规则

`V27` 固定以下排序语义：

1. `main-formula` 始终在前
2. `source-view` 始终在后
3. `source-view` 组内按 `metadata.stableKey` 排序

## 6. 验收标准

1. `resolveStaticBuildTriggerMatrix()` 返回稳定 `summary`
2. UI / Agent 不需要再自己统计主公式 / source-view 数量
3. 当前是否存在 source-view 行可直接从 `summary.hasSourceViews` 判定
4. 现有 row shape 与 trigger-matrix tool 行为不破坏
5. 不新增新的公式 bucket 或 snapshot key

## 7. 当前状态

- `V27.1` 已完成：冻结到 trigger-entry matrix summary
- `V27.2` 已完成：`resolveStaticBuildTriggerMatrix()` 已返回稳定 `summary`
- `V27.3` 已完成：高层 tool / Agent 已直接消费 `matrix.summary`
- `V27.4` 已完成：文档入口与 README 已同步收口
