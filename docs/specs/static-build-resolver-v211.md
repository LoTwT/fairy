# 静态构筑解析系统 V211

## 1. 目标

`V210` 收口后，`zzz-agent` 高层 build tools 里剩余最明显的重复逻辑集中在 anomaly / disorder 的 `scenario` 归一化：

1. `attribute` 的高层标准化
2. `disorder.anomalyType` 的识别与报错

`V211` 只解决这一件事：

1. 把上述 `scenario` 归一化固定成 shared helper，不改变任何 tool 的输入输出 shape

## 2. 范围

1. `V211.1` scope freeze
2. `V211.2` shared helper / runtime alignment
3. `V211.3` tests / prompt alignment
4. `V211.4` docs closeout

## 3. 非目标

1. 不改变任何 tool 的输入输出字段名
2. 不改变 unsupported damage-type / anomaly-type 的字段结构
3. 不改变底层 `zzz-data` runtime
4. 不新增新的 build 计算能力

## 4. 当前状态

- `V211.1` 已完成：冻结到 build-tool scenario helper contracts
- `V211.2` 已完成：高层 build tool 的 `attribute / disorder.anomalyType` 归一化已统一复用 shared helper
- `V211.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V211.4` 已完成：roadmap、索引与架构文档已同步
