# V259 build-tool preset catalog entry contracts

`V258` 收口后，`resolve-build-presets.ts` 仍用 `(typeof supportedStaticBuild...)[number]` 推导 agent item type。运行时没有问题，但这会让高层 preset contract 继续依赖值数组的 indexed access，而不是公开的 catalog entry type。

`V259` 只解决一件事：

1. 让高层 build-tool preset 统一复用显式 `StaticBuildAgentCatalogEntry` / `StaticBuildUtilityAgentCatalogEntry`，不改变任何 tool 的输入输出 shape

## 259.1 分阶段

1. `V259.1` scope freeze
2. `V259.2` preset catalog type alignment
3. `V259.3` tests / runtime alignment
4. `V259.4` docs closeout

## 259.2 非目标

1. 不改变 supported arrays 的值集合
2. 不改变兼容音擎派生逻辑
3. 不扩展新的 preset 字段

## 259.3 当前状态

- `V259.1` 已完成：冻结到高层 preset 的 catalog entry contract
- `V259.2` 已完成：`resolve-build-presets.ts` 已统一复用显式 catalog entry type
- `V259.3` 已完成：现有 build / agent 测试与 runtime 校验已覆盖
- `V259.4` 已完成：roadmap、索引与架构文档已同步
