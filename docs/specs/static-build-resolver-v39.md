# 静态构筑解析系统 V39

`V38` 收口后，`source-view` / `source-entry` / `skill matrix` 的主结果都已经有稳定的 compact contract。

当前剩下的一处不对称，落在 `trigger-entry matrix`：

1. `trigger row` 只有 `entryKind / damageType / sourceViewId / sourceViewResolutionMode`
2. 对 `source-view` 行来说，还缺少稳定的来源追溯字段
3. 上层如果要把 `trigger row` 与 `source-view` / `source-entry` 对齐，仍需要依赖 `label` 或额外查 `sourceViewId`

`V39` 只解决一件事：

- 为 `trigger-entry matrix row` 增加稳定的来源元数据

## 1. 目标

为 `ResolveStaticBuildTriggerMatrixResult.rows[*].metadata` 增加最小但稳定的来源追溯字段，让上层可以直接知道：

1. 这一行来自主公式还是 source-view
2. 如果来自 source-view，对应的是哪一种 source
3. 这行与 source-view contract 的稳定 key 如何对齐

## 2. 范围

1. `V39.1` scope freeze
2. `V39.2` trigger row source-metadata contract
3. `V39.3` high-level tool / test alignment
4. `V39.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildTriggerMatrixRowMeta` 增加来源追溯字段
2. 主公式行显式标识自己的 template source
3. source-view 行显式透传 source-view 的稳定来源信息
4. 更新测试与文档

显式不做：

1. 不新增新的 trigger matrix summary key
2. 不新增新的 trigger matrix coverage
3. 不调整 trigger row 的 `damage / requirements / assumptions / diagnostics / sourceNotes`
4. 不实现新的 anomaly / disorder matrix 语义
5. 不新增独立 trigger-template catalog public export

## 4. 目标 contract

`StaticBuildTriggerMatrixRowMeta` 新增：

1. `templateSource`
   - `main-formula`
   - `source-view`
2. `sourceType?`
   - `agent`
   - `w-engine`
   - `drive-disc`
3. `sourceId?`
4. `sourceStableKey?`

其中：

- 主公式行只需要 `templateSource = "main-formula"`
- source-view 行需要补齐 `templateSource = "source-view"` 以及来源字段

## 5. 验收标准

1. `trigger row` 可以直接看出是否来自主公式或 source-view
2. source-view 行可直接对齐到原始 `source-view.metadata.stableKey`
3. 上层不需要再通过 `label` 或 `sourceViewId` 反查来源
4. 高层 tool contract 不破坏现有 compact 输出

## 6. 当前状态

- `V39.1` 已完成：冻结到 trigger row source-metadata contract
- `V39.2` 已完成：trigger row 已新增 `templateSource / sourceType / sourceId / sourceStableKey`
- `V39.3` 已完成：高层 tool 无需新增组装逻辑，测试已对齐新 metadata
- `V39.4` 已完成：README / 总规格 / 索引 / 架构入口已同步收口
