# V238 build-tool reject response helpers

`V237` 收口后，`resolve-build-shared.ts` 里仍保留了高层 build tool 的 reject-path response helper：

- `unsupported agent`
- `unsupported w-engine`
- `incompatible w-engine`
- `unsupported drive-disc`

`V238` 只解决一件事：

1. 把上述 reject-path response helper 移到单独共享模块，不改变任何 tool 的输入输出 shape

## 238.1 分阶段

1. `V238.1` scope freeze
2. `V238.2` reject response helper alignment
3. `V238.3` tests / runtime alignment
4. `V238.4` docs closeout

## 238.2 非目标

1. 不改变任何 message 文案
2. 不改变 `resolveBuildToolAgent/WEngine/DriveDiscSets` 的控制流
3. 不改变任何 tool 的输入 schema 与成功/失败 shape

## 238.3 当前状态

- `V238.1` 已完成：冻结到高层 build tool reject-path response helper
- `V238.2` 已完成：相关 reject response helper 已从 `resolve-build-shared.ts` 移到单独共享模块
- `V238.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V238.4` 已完成：roadmap、索引与架构文档已同步
