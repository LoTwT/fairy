# V258 build-tool progression scalar contracts

`V257` 收口后，`zzz-agent` 的 `resolve-build-loadout.ts` 仍手写了一组 progression 标量与驱动盘件数字面量，和 build-layer 已公开的 `StaticBuildDriveDiscPieces` / `StaticBuildAgentLevel` / `StaticBuildAgentMindscape` / `StaticBuildCoreSkillLevel` / `StaticBuildWEngineRefinement` 没有对齐。

`V258` 只解决一件事：

1. 让高层 build tool 的 loadout helper 统一复用这些已公开的 progression / pieces scalar type，并把它们从 `zzz-data` 正式导出，不改变任何 tool 的输入输出 shape

## 258.1 分阶段

1. `V258.1` scope freeze
2. `V258.2` export alignment
3. `V258.3` loadout helper alignment
4. `V258.4` tests / runtime alignment
5. `V258.5` docs closeout

## 258.2 非目标

1. 不改变 zod schema 校验范围
2. 不改变 loadout 默认值或 fallback
3. 不扩展新的 tool 输入字段

## 258.3 当前状态

- `V258.1` 已完成：冻结到高层 loadout helper 的 progression / pieces scalar contract
- `V258.2` 已完成：`zzz-data` 已正式导出这些 scalar type
- `V258.3` 已完成：`resolve-build-loadout.ts` 已统一复用显式 scalar type
- `V258.4` 已完成：现有 build / agent 测试与 runtime 校验已覆盖
- `V258.5` 已完成：roadmap、索引与架构文档已同步
