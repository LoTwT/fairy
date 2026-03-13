# 静态构筑解析系统 V31

`V30` 已经把 `ResolveStaticBuildSkillMatrixResult.summary` 下沉到 `zzz-data` public contract。

当前还停留在高层 tool 临时聚合逻辑里的 skill matrix 主结果只剩：

- `effectSummary`

也就是：

1. `zzz-data` 底层现在只返回 `rows[] + summary`
2. `zzz-agent` 的 `resolve-build-skill-matrix` 仍需要自行遍历 `row.build.trace`
3. 代理人“增益清单”的稳定来源还不在 `zzz-data` public contract 内

因此，`V31` 只解决一件事：

- 为 `ResolveStaticBuildSkillMatrixResult` 增加稳定 `effectSummary`

## 1. 目标

新增 / 收口：

1. 为 `resolveStaticBuildSkillMatrix()` 增加稳定 `effectSummary`
2. 固定 applied effect 的分组与聚合语义
3. 让高层 tool / Agent 直接消费 `matrix.effectSummary`

## 2. V31 范围

1. `V31.1` scope freeze
2. `V31.2` matrix effect-summary contract
3. `V31.3` high-level tool alignment
4. `V31.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 扩 `ResolveStaticBuildSkillMatrixResult`
2. 固定 skill matrix applied effect summary 的聚合语义
3. 让高层 tool 直接透传底层 `matrix.effectSummary`

显式不做：

1. 不新增 skill matrix coverage
2. 不新增新的 formula summary 字段
3. 不调整 row metadata
4. 不新增新的 snapshot key

## 4. contract 方向

`ResolveStaticBuildSkillMatrixResult`

- 保留：
  - `profile`
  - `mode`
  - `manualBaseMode`
  - `loadout`
  - `summary`
  - `rows`
  - `assumptions`
- 新增：
  - `effectSummary`

`effectSummary` 第一批至少包含：

1. 来源标识
   - `effectId`
   - `sourceName`
   - `label`
2. 展示摘要
   - `bucket`
   - `value`
3. 应用范围摘要
   - `appliedRowCount`
   - `totalRowCount`
   - `appliesToAllRows`
   - `condition`

## 5. 聚合规则

`V31` 固定以下 effect-summary 语义：

1. 只聚合 `trace.status = "applied"` 的 effect
2. 只聚合带 `modifiers` 的 effect
3. 按 `effectId` 分组
4. `bucket` / `value` 去重后按出现顺序拼接
5. `condition` 由 `appliedRowCount / totalRowCount` 稳定生成

## 6. 验收标准

1. `resolveStaticBuildSkillMatrix()` 返回稳定 `effectSummary`
2. 高层 tool 不再自己遍历 `row.build.trace` 聚合增益清单
3. Agent 可直接基于 `matrix.effectSummary` 生成“增益清单”
4. 不破坏现有 `rows[]` 与 `summary` payload

## 7. 当前状态

- `V31.1` 已完成：冻结到 core skill matrix effect-summary contract
- `V31.2` 已完成：`ResolveStaticBuildSkillMatrixResult` 已新增稳定 `effectSummary`
- `V31.3` 已完成：高层 tool 已对齐底层 `matrix.effectSummary`
- `V31.4` 已完成：README / 总规格 / 索引 / 架构入口已同步收口
