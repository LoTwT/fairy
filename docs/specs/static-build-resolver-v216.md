# 静态构筑解析系统 V216

## 1. 目标

`V215` 收口后，`resolve-build-source-entries.ts` 仍保留了一块局部特例上下文组装：

1. `utilityOnly` 判定
2. optional scenario 解析
3. `anomaly / disorder` 需要完整 `finalPanel` 的 gating
4. utility-only 路径下的 partial `finalPanel` 归一化

`V216` 只解决这一件事：

1. 把 source-entry collection 的 scenario/panel 上下文组装固定成 shared helper，不改变任何 tool 的输入输出 shape

## 2. 范围

1. `V216.1` scope freeze
2. `V216.2` shared helper / runtime alignment
3. `V216.3` tests / prompt alignment
4. `V216.4` docs closeout

## 3. 非目标

1. 不改变 source-entry collection 的 coverage-gap 语义
2. 不改变 utility-only 与 mixed 路径的支持范围
3. 不改变底层 `zzz-data` runtime
4. 不新增新的 build 计算能力

## 4. 当前状态

- `V216.1` 已完成：冻结到 source-entry context helper contracts
- `V216.2` 已完成：`resolve-build-source-entries.ts` 的 optional scenario / finalPanel gating 已统一复用 shared helper
- `V216.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V216.4` 已完成：roadmap、索引与架构文档已同步
