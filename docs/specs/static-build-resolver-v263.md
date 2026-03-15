# V263 build scalar snapshot contracts

`V262` 收口后，`energyGenerationRate / anomalyMastery / resolvedAnomalyProficiency / remainingTime` 这组 scalar 仍在 `types.ts`、`definitions.ts`、`resolver.ts`、`resolve-build-schemas.ts` 多处重复出现为裸 `number`。

`V263` 只解决一件事：

1. 为这组 finalPanel / scenario / resolvedSnapshot 标量补显式公开 type，并让 build-layer 与高层 schema 统一复用，不改变任何运行时行为

## 263.1 分阶段

1. `V263.1` scope freeze
2. `V263.2` scalar alias alignment
3. `V263.3` helper / schema alignment
4. `V263.4` tests / runtime alignment
5. `V263.5` docs closeout

## 263.2 非目标

1. 不改变 finalPanel / scenario 字段集合
2. 不改变 snapshot 计算逻辑
3. 不扩展新的 public snapshot 字段

## 263.3 当前状态

- `V263.1` 已完成：冻结到 finalPanel / scenario / resolvedSnapshot scalar contract
- `V263.2` 已完成：`types.ts` 已新增显式 scalar alias
- `V263.3` 已完成：`definitions.ts`、`resolver.ts`、`resolve-build-schemas.ts` 已统一复用这些 scalar type
- `V263.4` 已完成：现有 build / agent 测试与 runtime 校验已覆盖
- `V263.5` 已完成：roadmap、索引与架构文档已同步
