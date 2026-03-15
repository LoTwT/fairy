# 静态构筑解析系统 V210

## 1. 目标

`V209` 收口后，`zzz-agent` 的 6 个高层 build tool 里仍保留最后一批明显重复的 catalog 解析逻辑：

1. 手工解析 `agent`
2. 手工解析 `wEngine`
3. 手工校验 `wEngine` 与 `agent.specialty` 兼容性

`V210` 只解决这一件事：

1. 把上述 agent / w-engine 解析固定成 shared helper，不改变任何 tool 的输入输出 shape

## 2. 范围

1. `V210.1` scope freeze
2. `V210.2` shared helper / runtime alignment
3. `V210.3` tests / prompt alignment
4. `V210.4` docs closeout

## 3. 非目标

1. 不改变任何 tool 的输入输出字段名
2. 不改变 unsupported / incompatible message 的字段结构
3. 不改变底层 `zzz-data` runtime
4. 不新增新的 build 计算能力

## 4. 当前状态

- `V210.1` 已完成：冻结到 build-tool agent / w-engine helper contracts
- `V210.2` 已完成：6 个高层 build tool 的 agent / w-engine 解析已统一复用 shared helper
- `V210.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V210.4` 已完成：roadmap、索引与架构文档已同步
