# 静态构筑解析系统 V224

## 1. 目标

`V223` 收口后，`resolve-build-source-entries.ts` 仍保留一块本地 `utilityOnly` support-scope 分支：

1. agent catalog 在 `utilityOnly` / mixed 路径间切换
2. w-engine 支持范围在 `utilityOnly` / mixed 路径间切换
3. compatible w-engine 回调在 `utilityOnly` / mixed 路径间切换

`V224` 只解决这一件事：

1. 把 `source-entry collection` 的 `utilityOnly` loadout support 选择固定成 shared helper，不改变任何 tool 的输入输出 shape

## 2. 范围

1. `V224.1` scope freeze
2. `V224.2` shared helper / runtime alignment
3. `V224.3` tests / prompt alignment
4. `V224.4` docs closeout

## 3. 非目标

1. 不改变 `source-entry collection` 的成功返回字段
2. 不改变 utility-only / mixed support-scope 语义
3. 不改变底层 `zzz-data` runtime

## 4. 当前状态

- `V224.1` 已完成：冻结到 source-entry utility-only loadout support helper contracts
- `V224.2` 已完成：`source-entry collection` 的 `utilityOnly` catalog / w-engine support 选择已统一复用 shared helper
- `V224.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V224.4` 已完成：roadmap、索引与架构文档已同步
