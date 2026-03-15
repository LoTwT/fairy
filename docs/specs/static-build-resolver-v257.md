# V257 build progression scalar contracts

`V256` 收口后，build-layer 里仍有几组匿名标量分散在 `types.ts`、`utility-views.ts`、`definitions.ts`：驱动盘件数、代理人等级/影画/核心技、音擎精炼，以及 source-note 输入上的 `damageType / disorderSourceType / pieces / mindscape`。

`V257` 只解决一件事：

1. 为这些 build-layer progression / pieces 标量补显式公开 type，并让 `utility-views.ts` 与 source-note helper 统一复用它们，不改变任何运行时行为

## 257.1 分阶段

1. `V257.1` scope freeze
2. `V257.2` scalar type alignment
3. `V257.3` tests / runtime alignment
4. `V257.4` docs closeout

## 257.2 非目标

1. 不改变 progression 默认值
2. 不改变 source-note 匹配逻辑
3. 不扩展新的 finalPanel / scenario 字段

## 257.3 当前状态

- `V257.1` 已完成：冻结到 build-layer progression / pieces scalar contract
- `V257.2` 已完成：`types.ts`、`utility-views.ts`、`definitions.ts` 已统一复用显式 scalar type
- `V257.3` 已完成：现有 build / agent 测试与 runtime 校验已覆盖
- `V257.4` 已完成：roadmap、索引与架构文档已同步
