# 静态构筑解析系统 V29

`V26` 到 `V28` 已经把 unified source-entry collection、trigger-entry matrix、source damage / utility views 收口成稳定的 `summary` contract。

当前还留在“裸结果对象”的主入口只剩两个：

1. `resolveStaticBuildDamage()`
2. `resolveStaticBuildSkillMatrix()`

其中优先级更高的是 `resolveStaticBuildDamage()`：

1. 它是单场景静态结算的主入口
2. 高层 Agent 仍需要同时从
   - `resolvedPanel`
   - `resolvedBuckets`
   - `damage.expected.breakdown`
   - `diagnostics`
   - `sourceNotes`
   - `unsupportedEffects`
     中自行提炼展示摘要
3. 当前还没有像 `collection.summary` / `matrix.summary` / `views.summary` 那样的稳定上层消费 contract

因此，`V29` 只解决一件事：

- 为 `ResolveStaticBuildResult` 增加稳定 `summary`

## 1. 目标

新增 / 收口：

1. 为 `resolveStaticBuildDamage()` 增加稳定 `summary`
2. 固定单次结果的公式乘区摘要语义
3. 固定 diagnostics / sourceNotes / unsupportedEffects 的 summary 统计语义
4. 让高层 tool 与 Agent 优先消费 `build.summary`

## 2. V29 范围

1. `V29.1` scope freeze
2. `V29.2` resolver summary contract
3. `V29.3` high-level tool alignment
4. `V29.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 扩 `ResolveStaticBuildResult`
2. 为单次结算提供稳定 summary
3. 固定 summary 中的 diagnostics / sourceNote 分组语义
4. 让高层 tool / Agent 优先消费 `build.summary`

显式不做：

1. 不新增新的计算 bucket
2. 不调整主伤害公式
3. 不新增新的 snapshot key
4. 不处理 skill matrix summary，下沉到下一阶段处理

## 4. contract 方向

`ResolveStaticBuildResult`

- 保留：
  - `profile`
  - `mode`
  - `manualBaseMode`
  - `loadout`
  - `resolvedPanel`
  - `resolvedBuckets`
  - `damageParams`
  - `damage`
  - `trace`
  - `diagnostics`
  - `sourceNotes`
  - `assumptions`
  - `unsupportedEffects`
- 新增：
  - `summary`

`summary` 第一批至少包含：

1. 基础主属性摘要
   - `baseDamageStat`
   - `baseDamageValue`
2. 单次结果总伤摘要
   - `expectedTotal`
   - `critTotal`
   - `noCritTotal`
3. 公式乘区摘要
   - `formulaMultipliers`
4. 结果收口摘要
   - `assumptionCount`
   - `diagnosticCount`
   - `sourceNoteCount`
   - `unsupportedEffectCount`
   - `hasDiagnostics`
   - `hasSourceNotes`
   - `hasUnsupportedEffects`
5. 稳定分组
   - `diagnosticGroups`
   - `sourceNoteGroups`

## 5. 分组规则

`V29` 固定以下分组语义：

1. `diagnosticGroups`
   - 按 `kind` 分组
   - 第一批固定：
     - `defaulted-input`
     - `coverage-gap`
     - `unsupported-effect`
     - `fallback`
2. `sourceNoteGroups`
   - 按 `status` 分组
   - 第一批固定：
     - `missing-input`
     - `resolved`
     - `process-only`
     - `research-only`

## 6. 验收标准

1. `resolveStaticBuildDamage()` 返回稳定 `summary`
2. 高层 tool / Agent 不需要再自己统计 diagnostics / sourceNotes / unsupportedEffects
3. Agent 可直接基于 `build.summary.formulaMultipliers` 生成单场景乘区摘要
4. 不破坏现有 `ResolveStaticBuildResult` payload

## 7. 当前状态

- `V29.1` 已完成：冻结到单次 resolver summary contract
- `V29.2` 已完成：`ResolveStaticBuildResult` 已返回稳定 `summary`
- `V29.3` 已完成：高层 tool / Agent 已对齐 `build.summary`
- `V29.4` 待实现：README / 总规格 / 索引 / 架构入口同步收口
