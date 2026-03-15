# 静态构筑解析系统 V230

## 背景

`V229` 收口后，`resolve-build-source-utility-views.ts` 仍保留最后一段本地后处理分支：

1. 缺少音擎时返回 missing-w-engine coverage response
2. `views.entries.length === 0` 时返回 uncovered coverage response
3. 非空时 compact 并返回 success response

这段逻辑和 `V228 / V229` 已收口的 source-family response helper 属于同一层级的 tool contract 收口。

## 目标

`V230` 只解决一件事：

1. 把 `resolve-build-source-utility-views.ts` 的 missing / uncovered / success 后处理固定成 shared helper，不改变任何 tool 的输入输出 shape

## 分阶段

1. `V230.1` scope freeze
2. `V230.2` shared helper / runtime alignment
3. `V230.3` tests / prompt alignment
4. `V230.4` docs closeout

## 非目标

1. 不改变 `resolve-build-source-utility-views` 的输入 schema
2. 不改变成功返回中的 `views` shape
3. 不改变 missing / uncovered coverage 的 message 文案和字段名
4. 不改变底层 `zzz-data` runtime

## 当前状态

- `V230.1` 已完成：冻结到 source-utility-view response helper contracts
- `V230.2` 已完成：`resolve-build-source-utility-views.ts` 的 missing / uncovered / success 后处理已统一复用 shared helper
- `V230.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V230.4` 已完成：roadmap、索引与架构文档已同步
