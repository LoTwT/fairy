# 静态构筑解析系统 V487

## 目标

`V487` 只解决一件事：

- 把 `zzz-agent` `resolve-build-schemas.ts` 中 `stateSnapshot` 的 leaf scalar schema 收口为共享 schema 常量。

## 范围

1. `stateSnapshotAlicePolarityAssaultStateSchema`
2. `stateSnapshotMiyabiFrostburnBreakStateSchema`
3. `stateSnapshotAlicePolarityAssaultDamageRatioSchema`
4. `stateSnapshotMiyabiFrostburnBreakDamageRatioSchema`
5. `stateSnapshotFlagsSchema / ValuesSchema` 中对应字段

## 非目标

1. 不改任何字段的值域、默认值或校验规则
2. 不改任何对象结构或序列化结构
3. 不改 resolver 或 tool 行为

## 当前状态

- `V487.1` 已完成：范围冻结到 `stateSnapshot` 的 leaf scalar schema
- `V487.2` 已完成：相关字段已统一复用共享 schema 常量
