# 静态构筑解析系统 V215

## 1. 目标

`V214` 收口后，`resolver / trigger-matrix / source-damage-view / source-entry collection` 这 4 个高层 build tool 仍在各自重复 disorder-aware scenario 组装：

1. `disorder` 分支走 `resolveBuildToolDisorderScenario`
2. 其余分支走 `resolveBuildToolScenario`

`V215` 只解决这一件事：

1. 把 disorder-aware scenario 解析固定成 shared helper，不改变任何 tool 的输入输出 shape

## 2. 范围

1. `V215.1` scope freeze
2. `V215.2` shared helper / runtime alignment
3. `V215.3` tests / prompt alignment
4. `V215.4` docs closeout

## 3. 非目标

1. 不改变 `finalPanel` 组装逻辑
2. 不改变 `damageType` gating helper
3. 不改变底层 `zzz-data` runtime
4. 不新增新的 build 计算能力

## 4. 当前状态

- `V215.1` 已完成：冻结到 build-tool resolved scenario helper contracts
- `V215.2` 已完成：4 个高层 build tool 的 disorder-aware `scenario` 组装已统一复用 shared helper
- `V215.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V215.4` 已完成：roadmap、索引与架构文档已同步
