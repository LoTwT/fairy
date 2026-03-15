# 静态构筑解析系统 V220

## 1. 目标

`V219` 收口后，`resolve-build-trigger-matrix.ts` 与 `resolve-build-source-damage-views.ts` 仍重复 anomaly/disorder-only 的前置上下文：

1. `damageType` gating
2. loadout context 解析
3. disorder-aware scenario 解析

`V220` 只解决这一件事：

1. 把 anomaly/disorder-only tool 的前置上下文固定成 shared helper，不改变任何 tool 的输入输出 shape

## 2. 范围

1. `V220.1` scope freeze
2. `V220.2` shared helper / runtime alignment
3. `V220.3` tests / prompt alignment
4. `V220.4` docs closeout

## 3. 非目标

1. 不改变 `trigger-matrix` 与 `source-damage-view` 的返回字段
2. 不改变 source-view uncovered response 语义
3. 不改变底层 `zzz-data` runtime

## 4. 当前状态

- `V220.1` 已完成：冻结到 triggered-damage context helper contracts
- `V220.2` 已完成：`trigger-matrix / source-damage-view` 的 anomaly/disorder 前置上下文已统一复用 shared helper
- `V220.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V220.4` 已完成：roadmap、索引与架构文档已同步
