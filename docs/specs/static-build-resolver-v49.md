# 静态构筑解析系统 V49

`V48` 收口后，`StaticBuildSkillMatrixRow` 已经具备：

1. `damageSummary`
2. `resolvedBuckets`
3. `diagnostics / diagnosticSummary`
4. `sourceNotes / sourceNoteSummary`
5. `assumptions`
6. `unsupportedEffects`

这意味着行级紧凑消费已经不再强依赖完整 `build`。

但 `ResolveStaticBuildResult.summary` 当前仍只存在于 `row.build.summary`，而不会下沉到：

1. `StaticBuildSkillMatrixRow`
2. compact row contract

因此：

1. 上层如果只想读取单条 row 的公式乘区摘要，仍需请求 `includeDetails`
2. 行级 contract 仍缺少与 main resolver 对称的结构化 `summary`
3. 高层 tool 很难在不透传完整 `build` 的前提下稳定消费每一行的 `assumptionCount / unsupportedEffectCount / formulaMultipliers`

`V49` 只解决一件事：

- 为 `skill matrix row` 增加稳定的 `summary`

## 1. 目标

在不改变现有：

1. `rows[].damageSummary`
2. `rows[].resolvedBuckets`
3. `rows[].diagnosticSummary`
4. `rows[].sourceNoteSummary`
5. `rows[].build`

的前提下，让上层可以直接从：

1. `StaticBuildSkillMatrixRow.summary`

读取这一行对应的 `ResolveStaticBuildResult.summary`。

## 2. 范围

1. `V49.1` scope freeze
2. `V49.2` row-level resolve summary contract
3. `V49.3` compact / high-level alignment
4. `V49.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildSkillMatrixRow` 增加 `summary`
2. 让 compact helper 透传该字段
3. 更新 skill-matrix tests 与文档

显式不做：

1. 不改变现有 `ResolveStaticBuildResult.summary`
2. 不改变现有 `damageSummary / resolvedBuckets / diagnostics / sourceNotes`
3. 不新增新的 matrix row metadata
4. 不修改 `includeDetails` 语义

## 4. 目标 contract

新增到 `StaticBuildSkillMatrixRow`：

1. `summary: StaticBuildResolveSummary`

其值应与 `row.build.summary` 等价，但作为稳定的行级字段直接暴露。

## 5. 验收标准

1. `matrix.rows[i].summary` 可直接读取
2. compact helper 与高层 `resolve-build-skill-matrix` 保持一致
3. 上层不需要再请求 `includeDetails` 才能读取单行的公式乘区摘要和 flag/count
4. `row.summary` 与 `row.build.summary` 在 `includeDetails=true` 时保持等价

## 6. 当前状态

- `V49.1` 已完成：冻结到 skill-matrix row resolve summary contract
- `V49.2` 未开始
- `V49.3` 未开始
- `V49.4` 未开始
