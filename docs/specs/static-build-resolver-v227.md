# 静态构筑解析系统 V227

## 背景

`V226` 收口后，`resolve-build-source-utility-views.ts` 仍保留一段本地 execution context 拼装：

1. `loadout` 解析
2. `sourceUtilitySupport` 派生

这条路径已经在 `source-entry collection` 中统一复用了 shared helper，本 tool 仍是最后一条单独维护 `utility support` 上下文的 source-family 主入口。

## 目标

`V227` 只解决一件事：

1. 把 `resolve-build-source-utility-views.ts` 的 `loadout + sourceUtilitySupport` 拼装固定成 shared helper，不改变任何 tool 的输入输出 shape

## 分阶段

1. `V227.1` scope freeze
2. `V227.2` shared helper / runtime alignment
3. `V227.3` tests / prompt alignment
4. `V227.4` docs closeout

## 非目标

1. 不改变 `resolve-build-source-utility-views` 的输入 schema
2. 不改变成功返回中的 `views` shape
3. 不改变 missing / uncovered coverage 的 message 文案
4. 不改变底层 `zzz-data` runtime

## 当前状态

- `V227.1` 已完成：冻结到 source-utility execution context helper contracts
- `V227.2` 已完成：`resolve-build-source-utility-views.ts` 的 `loadout + sourceUtilitySupport` 已统一复用 shared helper
- `V227.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V227.4` 已完成：roadmap、索引与架构文档已同步
