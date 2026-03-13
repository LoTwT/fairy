# 静态构筑解析系统 V51

`V50` 收口后，source-damage-view entry 已具备稳定 `summary`。

但 `StaticBuildTriggerMatrixRow` 当前仍只有：

1. `damage`
2. `requirementSummary`
3. `diagnosticSummary`
4. `sourceNoteSummary`
5. `build?`

也就是说，trigger row 仍需要在 `includeDetails` 下才可读取 `build.summary`。

`V51` 只解决一件事：

- 为 `trigger-matrix row` 增加稳定 `summary`

## 1. 目标

在不改变现有：

1. `row.damage`
2. `row.requirementSummary`
3. `row.diagnosticSummary`
4. `row.sourceNoteSummary`
5. `row.build`

的前提下，让上层可以直接从：

1. `StaticBuildTriggerMatrixRow.summary`

读取该条 trigger row 对应的 `ResolveStaticBuildResult.summary`。

## 2. 范围

1. `V51.1` scope freeze
2. `V51.2` row-level resolve summary contract
3. `V51.3` compact / high-level alignment
4. `V51.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildTriggerMatrixRow` 增加 `summary`
2. 让 compact helper 透传该字段
3. 更新 trigger-matrix tests 与文档

显式不做：

1. 不改变 `ResolveStaticBuildResult.summary`
2. 不改变现有 `damage / requirementSummary / diagnosticSummary / sourceNoteSummary`
3. 不新增新的 trigger-row metadata
4. 不修改 `includeDetails` 语义

## 4. 目标 contract

新增到 `StaticBuildTriggerMatrixRow`：

1. `summary?: StaticBuildResolveSummary`

当 row `supported=true` 且存在 `build` / `damage` 时，`summary` 应稳定暴露；unsupported row 允许保持为空。

## 5. 验收标准

1. `matrix.rows[i].summary` 可直接读取
2. compact helper 与高层 `resolve-build-trigger-matrix` 保持一致
3. 上层不需要再请求 `includeDetails` 才能读取单条 trigger row 的公式乘区摘要和 flag/count
4. `row.summary` 与 `row.build.summary` 在 `includeDetails=true` 时保持等价

## 6. 当前状态

- `V51.1` 已完成：冻结到 trigger-matrix row resolve summary contract
- `V51.2` 未开始
- `V51.3` 未开始
- `V51.4` 未开始
