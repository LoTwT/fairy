# 静态构筑解析系统 V212

## 1. 目标

`V211` 收口后，`trigger-matrix` 与 `source-damage-view` 高层 tool 里还各自保留一段完全重复的 damage-type gating：

1. 只允许 `anomaly / disorder`
2. 否则返回统一的 unsupported damage-type 响应

`V212` 只解决这一件事：

1. 把这段 gating 固定成 shared helper，不改变任何 tool 的输入输出 shape

## 2. 范围

1. `V212.1` scope freeze
2. `V212.2` shared helper / runtime alignment
3. `V212.3` tests / prompt alignment
4. `V212.4` docs closeout

## 3. 非目标

1. 不改变 `anomaly / disorder` 的底层 resolver 语义
2. 不改变 unsupported damage-type 的字段结构
3. 不改变 tool 的其他 catalog / scenario / loadout helper
4. 不新增新的 build 计算能力

## 4. 当前状态

- `V212.1` 已完成：冻结到 build-tool damage-type helper contracts
- `V212.2` 已完成：`trigger-matrix / source-damage-view` 的 damage-type gating 已统一复用 shared helper
- `V212.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V212.4` 已完成：roadmap、索引与架构文档已同步
