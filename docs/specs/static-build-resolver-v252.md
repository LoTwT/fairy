# V252 build drive-disc set input contracts

`V251` 收口后，`zzz-data` 的 build-layer source view helper 里仍通过 `ResolveStaticBuildInput["loadout"]["driveDiscSets"]` 与 `ResolveStaticBuildSourceUtilityViewsInput["loadout"]["driveDiscSets"]` 直接耦合到上层输入 shape。

`V252` 只解决一件事：

1. 为 build-layer 定义显式的 `StaticBuildDriveDiscSetsInput` type，并让 source-damage-view / source-utility-view helper 统一复用它，不改变任何公开函数的输入输出 shape

## 252.1 分阶段

1. `V252.1` scope freeze
2. `V252.2` drive-disc input alignment
3. `V252.3` tests / runtime alignment
4. `V252.4` docs closeout

## 252.2 非目标

1. 不改变 `StaticBuildDriveDiscSetInput` 的字段定义
2. 不改变 source view helper 的控制流
3. 不改变任何公开函数的成功/失败 shape

## 252.3 当前状态

- `V252.1` 已完成：冻结到 build-layer 驱动盘集合输入 contract
- `V252.2` 已完成：显式 `StaticBuildDriveDiscSetsInput` 已固定到 build types，并在 source-damage-view / source-utility-view helper 中统一复用
- `V252.3` 已完成：现有测试与 runtime 校验已覆盖
- `V252.4` 已完成：roadmap、索引与架构文档已同步
