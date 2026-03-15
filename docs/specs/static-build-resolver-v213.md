# 静态构筑解析系统 V213

## 1. 目标

`V212` 收口后，`source-utility-view` 与 `source-entry collection` 高层 tool 里还各自保留一段完全重复的 utility 支持范围派生逻辑：

1. 按 `agent.specialty` 过滤 source-utility 音擎集合
2. 派生同一组 `supportedUtilityWEngines` 名称列表

`V213` 只解决这一件事：

1. 把这段 utility support 逻辑固定成 shared helper，不改变任何 tool 的输入输出 shape

## 2. 范围

1. `V213.1` scope freeze
2. `V213.2` shared helper / runtime alignment
3. `V213.3` tests / prompt alignment
4. `V213.4` docs closeout

## 3. 非目标

1. 不改变 source-utility-view / source-entry 的返回字段
2. 不改变 utility-only 与 mixed coverage-gap 的语义
3. 不改变底层 `zzz-data` runtime
4. 不新增新的 build 计算能力

## 4. 当前状态

- `V213.1` 已完成：冻结到 build-tool utility support helper contracts
- `V213.2` 已完成：`source-utility-view / source-entry` 的 utility support 派生已统一复用 shared helper
- `V213.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V213.4` 已完成：roadmap、索引与架构文档已同步
