# V265 build enemy scalar contracts

`V264` 收口后，`attackerLevel / defenderBaseDefense / defenderResistance / defenseBonus / defenseReduction / resistanceReduction / ignoreResistance / vulnerabilityBonus / damageReduction / stunVulnerability / nonStunVulnerability / specialMultiplier` 这组 enemy 标量仍在 `types.ts` 与 `resolve-build-schemas.ts` 多处重复出现为裸 `number`。

`V265` 只解决一件事：

1. 为这组 enemy 标量补显式公开 type，并让 build-layer 与高层 schema 统一复用，不改变任何运行时行为

## 265.1 分阶段

1. `V265.1` scope freeze
2. `V265.2` scalar alias alignment
3. `V265.3` schema alignment
4. `V265.4` tests / runtime alignment
5. `V265.5` docs closeout

## 265.2 非目标

1. 不改变 enemy 字段集合
2. 不改变 defense / resistance / vulnerability 计算逻辑
3. 不扩展 skillMultiplier / damageMultiplier 的 scalar contract

## 265.3 当前状态

- `V265.1` 已完成：冻结到 enemy scalar contract
- `V265.2` 已完成：`types.ts` 已新增显式 enemy scalar alias
- `V265.3` 已完成：`resolve-build-schemas.ts` 与 `build/index.ts` 已统一复用这些 scalar type
- `V265.4` 已完成：现有 build / agent 测试与 runtime 校验已覆盖
- `V265.5` 已完成：roadmap、索引与架构文档已同步
