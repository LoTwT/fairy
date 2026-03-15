# V231 build-tool catalog presets

`V230` 收口后，`zzz-agent` 的 6 个高层 build tools 仍重复拼装同类 catalog preset：

1. `supportedAgents`
2. `supportedWEngines`
3. `supportedDriveDiscs`
4. `getCompatibleWEngines`
5. source-family tool 的 utility/source-view 支持集合

`V231` 只解决一件事：

1. 把这些高层 tool 的 catalog preset 固定到单独共享模块，不改变任何 tool 的输入输出 shape

## 231.1 分阶段

1. `V231.1` scope freeze
2. `V231.2` shared preset alignment
3. `V231.3` tests / runtime alignment
4. `V231.4` docs closeout

## 231.2 非目标

1. 不改变任何 tool 的输入 schema
2. 不改变任何 tool 的成功/失败 response shape
3. 不改变底层 `zzz-data` catalog / compatibility runtime
4. 不把 tool description 或 prompt 常量也并入 preset

## 231.3 当前状态

- `V231.1` 已完成：冻结到高层 build tool catalog presets
- `V231.2` 已完成：`resolve-build-*.ts` 的重复 catalog preset 已统一复用 shared 模块
- `V231.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V231.4` 已完成：roadmap、索引与架构文档已同步
