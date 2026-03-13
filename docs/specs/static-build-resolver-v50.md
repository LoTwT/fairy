# 静态构筑解析系统 V50

`V49` 收口后，`StaticBuildSkillMatrixRow` 已能直接暴露：

1. `summary`
2. `diagnosticSummary`
3. `sourceNoteSummary`

但 `StaticBuildSourceDamageViewEntry` 当前仍只有：

1. `damage`
2. `requirementSummary`
3. `diagnosticSummary`
4. `sourceNoteSummary`
5. `build?`

也就是说，source-damage-view entry 仍需要在 `includeDetails` 下才可读取 `build.summary`。

`V50` 只解决一件事：

- 为 `source-damage-view entry` 增加稳定 `summary`

## 1. 目标

在不改变现有：

1. `entry.damage`
2. `entry.requirementSummary`
3. `entry.diagnosticSummary`
4. `entry.sourceNoteSummary`
5. `entry.build`

的前提下，让上层可以直接从：

1. `StaticBuildSourceDamageViewEntry.summary`

读取该条 source-specific damage view 对应的 `ResolveStaticBuildResult.summary`。

## 2. 范围

1. `V50.1` scope freeze
2. `V50.2` entry-level resolve summary contract
3. `V50.3` compact / high-level alignment
4. `V50.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildSourceDamageViewEntry` 增加 `summary`
2. 让 compact helper 透传该字段
3. 更新 source-damage-view tests 与文档

显式不做：

1. 不改变 `ResolveStaticBuildResult.summary`
2. 不改变现有 `damage / requirementSummary / diagnosticSummary / sourceNoteSummary`
3. 不新增新的 source-view metadata
4. 不修改 `includeDetails` 语义

## 4. 目标 contract

新增到 `StaticBuildSourceDamageViewEntry`：

1. `summary?: StaticBuildResolveSummary`

当 entry `supported=true` 且存在 `build` / `damage` 时，`summary` 应稳定暴露；unsupported entry 允许保持为空。

## 5. 验收标准

1. `views.entries[i].summary` 可直接读取
2. compact helper 与高层 `resolve-build-source-damage-views` 保持一致
3. 上层不需要再请求 `includeDetails` 才能读取单条 entry 的公式乘区摘要和 flag/count
4. `entry.summary` 与 `entry.build.summary` 在 `includeDetails=true` 时保持等价

## 6. 当前状态

- `V50.1` 已完成：冻结到 source-damage-view entry resolve summary contract
- `V50.2` 已完成：`StaticBuildSourceDamageViewEntry` 现在稳定暴露 `summary`
- `V50.3` 已完成：compact helper 与高层 `resolve-build-source-damage-views` 已透传 `entry.summary`
- `V50.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
