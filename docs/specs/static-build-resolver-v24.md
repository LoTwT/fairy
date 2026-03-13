# 静态构筑解析系统 V24

`V23` 已完成统一 source-entry collection：

- `resolveStaticBuildSourceEntries()`
- `resolve-build-source-entries`
- utility-only / mixed collection

当前 anomaly / disorder 的 source view 仍只覆盖：

1. `爱丽丝 [极性强击]`
2. `雅 [霜灼·破]`
3. `柏妮思 [燃点]/[余烬]`
4. `爱芮 [异放]`

而 `薇薇安` 仍保留一条高价值 source note：

- `[异放]` 额外结算比例未展开

这条来源和 `爱芮 [异放]` 的差异是：

- 不依赖用户额外提供快照倍率
- 比例本身可由公开数据、`coreSkillLevel` 与 `finalPanel.anomalyProficiency` 推导

因此 `V24` 的目标是：

- 为“可由现有 contract 直接推导”的第二批 source view 开 coverage
- 第一批只落 `薇薇安 [异放]`

## 1. 目标

新增 / 收口：

1. `薇薇安 [异放]` source-specific damage view
2. `resolveStaticBuildTriggerMatrix()` 第二批覆盖 `薇薇安`
3. `resolveStaticBuildSourceEntries()` 自动聚合 `薇薇安 [异放]`

## 2. V24 范围

1. `V24.1` scope freeze
2. `V24.2` vivian exflow contract
3. `V24.3` trigger/source-entry integration
4. `V24.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 仅扩 `薇薇安 [异放]`
2. 仅使用已有输入：
   - `loadout.coreSkillLevel`
   - `loadout.agentMindscape`
   - `finalPanel.anomalyProficiency`
   - `scenario.damageType`
   - `scenario.anomalyType` / `scenario.attribute`
3. 若 `M2` 带来的 `[异放]` 精通收益提升可稳定折算，则并入同一 source view

显式不做：

1. 不展开 `薇薇安的预言` 追击伤害
2. 不新增新的 `dynamicSnapshot` / `stateSnapshot` / `resolvedSnapshot` key
3. 不把 `薇薇安 [异放]` 并回主 anomaly / disorder 公式

## 4. 验收标准

1. `resolveStaticBuildSourceDamageViews()` 可返回 `薇薇安 [异放]`
2. `resolveStaticBuildTriggerMatrix()` 会把 `薇薇安 [异放]` 作为 `source-view` 行并列返回
3. `resolveStaticBuildSourceEntries()` 可在 disorder 场景下聚合 `薇薇安 [异放]`
4. 若当前输入不足以稳定推导，只保留 source note / diagnostics，不引入新的隐式默认值
