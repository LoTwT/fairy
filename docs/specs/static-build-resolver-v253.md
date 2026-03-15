# V253 build-tool source-entry context contracts

`V252` 收口后，`zzz-agent` 的 source-entry helper 仍通过 `ResolveStaticBuildSourceEntriesInput["scenario"]` 与 `ResolveStaticBuildSourceEntriesInput["panel"]` 直接耦合到 `zzz-data` 的完整输入对象 shape。

`V253` 只解决一件事：

1. 为高层 build tool 的 source-entry context / execution helper 改用显式公开的 `StaticBuildScenarioInput` 与 `StaticBuildFinalPanelInput` type，不改变任何运行时行为或返回 shape

## 253.1 分阶段

1. `V253.1` scope freeze
2. `V253.2` source-entry context alignment
3. `V253.3` tests / runtime alignment
4. `V253.4` docs closeout

## 253.2 非目标

1. 不改变 `resolveBuildToolSourceEntriesContext()` 的控制流
2. 不改变 source-entry tool 的 success / reject 返回 shape
3. 不为 `source-entry` 新增额外 schema 或 runtime 校验

## 253.3 当前状态

- `V253.1` 已完成：冻结到高层 build tool source-entry context contract
- `V253.2` 已完成：`resolve-build-source-entry-context.ts` 与 `resolve-build-execution.ts` 已统一改用显式 `StaticBuildScenarioInput` / `StaticBuildFinalPanelInput`
- `V253.3` 已完成：现有高层测试与 runtime 校验已覆盖
- `V253.4` 已完成：roadmap、索引与架构文档已同步
