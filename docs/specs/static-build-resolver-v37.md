# 静态构筑解析系统 V37

`V36` 收口后，`zzz-agent` 的高层 `resolve-build-*` tool 仍保留 3 处薄层 compact 逻辑：

1. `compactMatrix()`
2. `compactTriggerMatrix()`
3. `compactSourceEntries()`

这些逻辑已经不再负责“补 contract 缺口”，而只是：

- 在不暴露完整 `build` 时做轻量投影
- 返回更适合 Agent / UI 消费的紧凑结果

继续把这种逻辑保留在 `zzz-agent`，会让：

- `Codex` / `Claude` 外的其他消费者无法复用
- `zzz-agent` 继续维护一层与 `zzz-data` 平行的轻量投影代码

因此，`V37` 只解决一件事：

- 把高层 compact 逻辑下沉为 `zzz-data` 的可复用 helper exports

## 1. 目标

新增 / 收口：

1. 为 skill matrix 提供 compact helper
2. 为 trigger matrix 提供 compact helper
3. 为 source-entry collection 提供 compact helper
4. 让 `zzz-agent` 直接消费底层 helper，不再维护平行 compact 实现

## 2. V37 范围

1. `V37.1` scope freeze
2. `V37.2` compact helper exports
3. `V37.3` high-level tool alignment
4. `V37.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 新增可复用 compact helper
2. 把 `zzz-agent` 高层 tool 改为直接调用这些 helper
3. 更新测试与文档中的 compact export 说明

显式不做：

1. 不新增新的 build/source/trigger contract key
2. 不调整 damage formula / matrix coverage
3. 不改变 `includeDetails` 语义
4. 不把 compact helper 做成 Agent 私有实现

## 4. contract 方向

`zzz-data`

- 新增：
  - `compactStaticBuildSkillMatrixResult()`
  - `compactStaticBuildTriggerMatrixResult()`
  - `compactStaticBuildSourceEntryCollection()`

`zzz-agent`

- 改为直接调用底层 compact helper
- 不再维护独立的薄层 compact 函数

## 5. 验收标准

1. `zzz-data` 提供可复用 compact helper exports
2. `zzz-agent` 不再保留平行 compact 实现
3. helper 输出与当前高层 tool 对外行为保持兼容
4. README / 总规格 / 索引 / 架构入口同步记录 `V37` 已收口

## 6. 当前状态

- `V37.1` 已完成：冻结到 compact helper exports
- `V37.2` 已完成：`zzz-data` 已新增 compact helper exports
- `V37.3` 已完成：`zzz-agent` 已改为直接消费底层 helper
- `V37.4` 已完成：README / 总规格 / 索引 / 架构入口已同步收口
