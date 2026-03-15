# 静态构筑解析系统 V214

## 1. 目标

`V213` 收口后，6 个高层 build tool 仍在手工把同一组 progression 字段重新喂给 `buildToolLoadoutInput`：

1. `agentLevel`
2. `agentMindscape`
3. `coreSkillLevel`
4. `wEngineRefinement`

`V214` 只解决这一件事：

1. 把 resolved `agent / wEngine` 到 `loadout` 的这层组装固定成 shared helper，不改变任何 tool 的输入输出 shape

## 2. 范围

1. `V214.1` scope freeze
2. `V214.2` shared helper / runtime alignment
3. `V214.3` tests / prompt alignment
4. `V214.4` docs closeout

## 3. 非目标

1. 不改变 `loadout` 的字段结构
2. 不改变 `driveDiscSets` helper 或 catalog helper
3. 不改变底层 `zzz-data` runtime
4. 不新增新的 build 计算能力

## 4. 当前状态

- `V214.1` 已完成：冻结到 build-tool resolved loadout helper contracts
- `V214.2` 已完成：6 个高层 build tool 的 progression-aware `loadout` 组装已统一复用 shared helper
- `V214.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V214.4` 已完成：roadmap、索引与架构文档已同步
