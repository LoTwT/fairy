# V240 build-tool loadout helpers

`V239` 收口后，`resolve-build-shared.ts` 里仍混合了 execution-context helper 与高层 build tool 的 loadout 解析逻辑。

`V240` 只解决一件事：

1. 把高层 build tool 的 loadout helper、support helper 与 loadout-context resolver 移到单独共享模块，不改变任何 tool 的输入输出 shape

## 240.1 分阶段

1. `V240.1` scope freeze
2. `V240.2` loadout helper alignment
3. `V240.3` tests / runtime alignment
4. `V240.4` docs closeout

## 240.2 非目标

1. 不改变 `resolveBuildToolAgent/WEngine/DriveDiscSets` 的控制流
2. 不改变任何 loadout 字段名、默认值或兼容性规则
3. 不改变任何 tool 的成功/失败 shape

## 240.3 当前状态

- `V240.1` 已完成：冻结到高层 build tool loadout helper / support helper / loadout-context resolver
- `V240.2` 已完成：相关逻辑已从 `resolve-build-shared.ts` 移到单独共享模块
- `V240.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V240.4` 已完成：roadmap、索引与架构文档已同步
