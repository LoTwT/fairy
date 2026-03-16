# 静态构筑解析系统 V477

## 目标

`V477` 只解决一件事：

- 把 `zzz-agent` `resolve-build-schemas.ts` 中 `effectOverrides[]` 的匿名对象 contract 收口为显式 interface 与共享 schema。

## 范围

1. `BuildToolEffectOverrideInput`
2. `effectOverrideSchema`
3. `resolveBuildInputSchema.effectOverrides`
4. `resolveBuildSourceEntriesInputSchema.effectOverrides`
5. `resolveBuildSkillMatrixInputSchema.effectOverrides`

## 非目标

1. 不改 `effectOverrides` 的字段集合、默认值或校验规则
2. 不改 resolver 或 tool 行为
3. 不改 `effectOverrides` 的序列化结构

## 当前状态

- `V477.1` 已完成：范围冻结到 `effectOverrides[]` 的共享 contract
- `V477.2` 已完成：相关字段已统一复用显式 interface 与共享 schema
