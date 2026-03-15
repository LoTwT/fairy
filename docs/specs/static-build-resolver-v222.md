# 静态构筑解析系统 V222

## 1. 目标

`V221` 收口后，`resolve-build-source-utility-views.ts` 仍保留两条本地 coverage 分支：

1. 未提供音擎时的 support-scope 响应
2. 当前音擎无 utility coverage 时的 uncovered 响应

`V222` 只解决这一件事：

1. 把 `source-utility-view` 的 missing / uncovered coverage 决策固定成 shared helper，不改变任何 tool 的输入输出 shape

## 2. 范围

1. `V222.1` scope freeze
2. `V222.2` shared helper / runtime alignment
3. `V222.3` tests / prompt alignment
4. `V222.4` docs closeout

## 3. 非目标

1. 不改变 `source-utility-view` 的成功返回字段
2. 不改变 support-scope / uncovered message 文案
3. 不改变底层 `zzz-data` runtime

## 4. 当前状态

- `V222.1` 已完成：冻结到 source-utility coverage response helper contracts
- `V222.2` 已完成：`source-utility-view` 的 missing / uncovered 分支已统一复用 shared helper
- `V222.3` 已完成：现有高层回归测试与新增 missing-w-engine 回归已覆盖
- `V222.4` 已完成：roadmap、索引与架构文档已同步
