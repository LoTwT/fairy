# 静态构筑解析系统 V221

## 1. 目标

`V220` 收口后，`resolve-build-source-entries.ts` 仍保留最后一块局部 uncovered-response 决策：

1. utility-only / non-utility 的空结果分支
2. `wEngine` 是否存在时的 coverage-gap 分支
3. source-view agent / utility w-engine 支持范围的组装

`V221` 只解决这一件事：

1. 把 `source-entry collection` 的空结果 / coverage-gap 决策固定成 shared helper，不改变任何 tool 的输入输出 shape

## 2. 范围

1. `V221.1` scope freeze
2. `V221.2` shared helper / runtime alignment
3. `V221.3` tests / prompt alignment
4. `V221.4` docs closeout

## 3. 非目标

1. 不改变 `source-entry collection` 的成功返回字段
2. 不改变 utility-only / coverage-gap message 文案
3. 不改变底层 `zzz-data` runtime

## 4. 当前状态

- `V221.1` 已完成：冻结到 source-entry uncovered response helper contracts
- `V221.2` 已完成：`source-entry collection` 的 utility-only / coverage-gap 空结果分支已统一复用 shared helper
- `V221.3` 已完成：现有高层回归测试与新增 coverage-gap 回归已覆盖
- `V221.4` 已完成：roadmap、索引与架构文档已同步
