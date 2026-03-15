# V260 build-tool schema trait contracts

`V259` 收口后，`resolve-build-schemas.ts` 仍保留了一份本地复制的 build trait：`skillTag`、`damageType`，以及三处重复的驱动盘 schema。

`V260` 只解决一件事：

1. 让高层 build-tool schema 统一复用显式 `StaticBuildSkillTag` / `StaticBuildDamageType` / `StaticBuildDriveDiscPieces`，并把驱动盘 schema 收到共享常量里，不改变任何 tool 的输入输出 shape

## 260.1 分阶段

1. `V260.1` scope freeze
2. `V260.2` schema trait alignment
3. `V260.3` shared drive-disc schema alignment
4. `V260.4` tests / runtime alignment
5. `V260.5` docs closeout

## 260.2 非目标

1. 不改变 zod 校验规则
2. 不改变 build-tool scenario 的语义
3. 不扩展新的 input 字段

## 260.3 当前状态

- `V260.1` 已完成：冻结到高层 schema trait contract
- `V260.2` 已完成：`resolve-build-schemas.ts` 已复用显式 `StaticBuildSkillTag` / `StaticBuildDamageType`
- `V260.3` 已完成：驱动盘 schema 已收进共享 `driveDiscSetSchema`
- `V260.4` 已完成：现有 build / agent 测试与 runtime 校验已覆盖
- `V260.5` 已完成：roadmap、索引与架构文档已同步
