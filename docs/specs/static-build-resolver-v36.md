# 静态构筑解析系统 V36

`V35` 收口后，`resolve-build-skill-matrix` 的 row contract 已有：

1. `damageSummary`
2. `resolvedBuckets`
3. `assumptions`
4. `unsupportedEffects`

但行级解释仍缺少两类结构化字段：

1. `diagnostics`
2. `sourceNotes`

这意味着 matrix row 仍然无法像 source view / trigger matrix row 那样，在不展开完整 `build` 的前提下提供结构化解释。

因此，`V36` 只解决一件事：

- 为 `ResolveStaticBuildSkillMatrixRow` 增加稳定的 row-level explanation fields

## 1. 目标

新增 / 收口：

1. 在 `zzz-data` skill matrix row 上新增稳定的 `diagnostics`
2. 在 `zzz-data` skill matrix row 上新增稳定的 `sourceNotes`
3. 让 `resolve-build-skill-matrix` 在不返回完整 `build` 时，也能直接透传这两类结构化解释字段

## 2. V36 范围

1. `V36.1` scope freeze
2. `V36.2` matrix row explanation contract
3. `V36.3` high-level tool alignment
4. `V36.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 skill matrix row 增加稳定的行级 explanation fields
2. 调整高层 tool 直接消费这些 row-level 字段
3. 更新测试与文档中的 row explanation contract 说明

显式不做：

1. 不新增新的 summary / effect summary
2. 不调整 `ResolveStaticBuildResult` 顶层 contract
3. 不新增新的 matrix coverage
4. 不调整 trigger/source-entry/source-view 的 row contract

## 4. contract 方向

`ResolveStaticBuildSkillMatrixRow`

- 新增：
  - `diagnostics`
  - `sourceNotes`

`resolve-build-skill-matrix`

- 改为直接透传底层 row-level `diagnostics / sourceNotes`
- 仅在 `includeDetails = true` 时再暴露完整 `build`

## 5. 验收标准

1. `ResolveStaticBuildSkillMatrixRow` 有稳定 `diagnostics`
2. `ResolveStaticBuildSkillMatrixRow` 有稳定 `sourceNotes`
3. 高层 tool 不需要展开 `row.build` 才能拿到结构化行级解释
4. README / 总规格 / 索引 / 架构入口同步记录 `V36` 已收口

## 6. 当前状态

- `V36.1` 已完成：冻结到 matrix row explanation contract
- `V36.2` 待实现：skill matrix row 已新增 `diagnostics / sourceNotes`
- `V36.3` 待实现：高层 tool 已对齐底层 row-level explanation fields
- `V36.4` 待实现：README / 总规格 / 索引 / 架构入口同步收口
