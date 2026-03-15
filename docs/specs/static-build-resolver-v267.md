# V267 build effect stack and resolved threshold contracts

`V266` 收口后，`stacks / maxStacks / baselineStacks / fullBuffStacks / minimumResolvedCritRate / minimumResolvedAnomalyProficiency` 这组 effect-state 标量仍在 `types.ts` 与 `resolver.ts` 中以裸 `number` 出现。

`V267` 只解决一件事：

1. 为这组 effect-state / resolved-threshold 标量补显式公开 type，并让 build-layer 统一复用，不改变任何运行时行为

## 267.1 分阶段

1. `V267.1` scope freeze
2. `V267.2` type alignment
3. `V267.3` resolver alignment
4. `V267.4` tests / runtime alignment
5. `V267.5` docs closeout

## 267.2 非目标

1. 不改变 effect override / effect definition 字段集合
2. 不改变 stack 结算逻辑
3. 不扩展 dynamic/state threshold 的数值 contract

## 267.3 当前状态

- `V267.1` 已完成：冻结到 effect-state / resolved-threshold contract
- `V267.2` 已完成：`types.ts` 已新增显式 `StaticBuildEffectStacks`
- `V267.3` 已完成：`resolver.ts` 已统一复用 `StaticBuildEffectStacks` / `StaticBuildCritRate` / `StaticBuildResolvedAnomalyProficiency`
- `V267.4` 已完成：现有 build / agent 测试与 runtime 校验已覆盖
- `V267.5` 已完成：roadmap、索引与架构文档已同步
