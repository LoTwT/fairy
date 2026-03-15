# 静态构筑解析系统 V217

## 1. 目标

`V216` 收口后，6 个高层 build tool 仍在重复同一段标准 setup：

1. 解析 `agent`
2. 计算 compatible `w-engine` 集合
3. 解析 `w-engine`
4. 解析 `drive-discs`
5. 组装 progression-aware `loadout`

`V217` 只解决这一件事：

1. 把这段标准 loadout context 组装固定成 shared helper，不改变任何 tool 的输入输出 shape

## 2. 范围

1. `V217.1` scope freeze
2. `V217.2` shared helper / runtime alignment
3. `V217.3` tests / prompt alignment
4. `V217.4` docs closeout

## 3. 非目标

1. 不改变 source-entry collection 的 coverage-gap 语义
2. 不改变 source-utility-view 的 missing-wEngine 语义
3. 不改变底层 `zzz-data` runtime
4. 不新增新的 build 计算能力

## 4. 当前状态

- `V217.1` 已完成：冻结到 build-tool loadout context helper contracts
- `V217.2` 已完成：6 个高层 build tool 的标准 loadout setup 已统一复用 shared helper
- `V217.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V217.4` 已完成：roadmap、索引与架构文档已同步
