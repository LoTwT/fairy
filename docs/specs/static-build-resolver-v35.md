# 静态构筑解析系统 V35

`V34` 收口后，`resolve-build-skill-matrix` 的主结果里还剩最后一处 `row.build` 直读：

1. 高层 tool 仍从 `row.build.resolvedBuckets` 透传行级 bucket
2. 高层 tool 仍从 `row.build.assumptions` 透传行级 assumptions
3. 高层 tool 仍从 `row.build.unsupportedEffects` 透传行级 unsupportedEffects

这意味着 skill matrix row 的“紧凑可消费字段”还没有完全下沉到底层 public contract。

因此，`V35` 只解决一件事：

- 为 `ResolveStaticBuildSkillMatrixRow` 增加稳定的 row-level compact fields

## 1. 目标

新增 / 收口：

1. 在 `zzz-data` skill matrix row 上新增稳定的 `resolvedBuckets`
2. 在 `zzz-data` skill matrix row 上新增稳定的 `assumptions`
3. 在 `zzz-data` skill matrix row 上新增稳定的 `unsupportedEffects`
4. 让 `resolve-build-skill-matrix` 不再从 `row.build` 抽取这些紧凑字段

## 2. V35 范围

1. `V35.1` scope freeze
2. `V35.2` matrix row compact contract
3. `V35.3` high-level tool alignment
4. `V35.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 skill matrix row 增加稳定的行级 compact fields
2. 调整高层 tool 直接消费这些 row-level 字段
3. 更新测试与文档中的 row compact contract 说明

显式不做：

1. 不调整 `ResolveStaticBuildResult` 顶层 contract
2. 不新增新的 matrix summary / effect summary
3. 不调整 trigger/source-entry/source-view 的 row contract
4. 不新增新的 matrix coverage

## 4. contract 方向

`ResolveStaticBuildSkillMatrixRow`

- 新增：
  - `resolvedBuckets`
  - `assumptions`
  - `unsupportedEffects`

`resolve-build-skill-matrix`

- 改为直接透传底层 row-level compact fields
- 仅在 `includeDetails = true` 时再暴露完整 `build`

## 5. 验收标准

1. `ResolveStaticBuildSkillMatrixRow` 有稳定 `resolvedBuckets`
2. `ResolveStaticBuildSkillMatrixRow` 有稳定 `assumptions`
3. `ResolveStaticBuildSkillMatrixRow` 有稳定 `unsupportedEffects`
4. 高层 tool 不再从 `row.build` 手工抽取这些紧凑字段
5. README / 总规格 / 索引 / 架构入口同步记录 `V35` 已收口

## 6. 当前状态

- `V35.1` 已完成：冻结到 matrix row compact contract
- `V35.2` 待实现：skill matrix row 已新增 compact fields
- `V35.3` 待实现：高层 tool 已对齐底层 row-level compact fields
- `V35.4` 待实现：README / 总规格 / 索引 / 架构入口同步收口
