# V264 build final panel scalar contracts

`V263` 收口后，`attack / baseAttack / critRate / critDamage / hp / sheerForce / anomalyProficiency / anomalyCritRate / anomalyCritDamage / penetrationRate / penetrationValue` 这组 finalPanel / resolvedPanel 标量仍在 `types.ts` 与 `resolve-build-schemas.ts` 多处重复出现为裸 `number`。

`V264` 只解决一件事：

1. 为这组 final-panel 标量补显式公开 type，并让 build-layer 与高层 schema 统一复用，不改变任何运行时行为

## 264.1 分阶段

1. `V264.1` scope freeze
2. `V264.2` scalar alias alignment
3. `V264.3` schema alignment
4. `V264.4` tests / runtime alignment
5. `V264.5` docs closeout

## 264.2 非目标

1. 不改变 finalPanel / resolvedPanel 字段集合
2. 不改变面板归一化或伤害计算逻辑
3. 不扩展 enemy / damageParams 的标量 contract

## 264.3 当前状态

- `V264.1` 已完成：冻结到 finalPanel / resolvedPanel scalar contract
- `V264.2` 已完成：`types.ts` 已新增显式 final-panel scalar alias
- `V264.3` 已完成：`resolve-build-schemas.ts` 与 `build/index.ts` 已统一复用这些 scalar type
- `V264.4` 已完成：现有 build / agent 测试与 runtime 校验已覆盖
- `V264.5` 已完成：roadmap、索引与架构文档已同步
