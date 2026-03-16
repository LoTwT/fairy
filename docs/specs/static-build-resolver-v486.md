# 静态构筑解析系统 V486

## 目标

`V486` 只解决一件事：

- 把 `zzz-agent` `resolve-build-schemas.ts` 中 `dynamicSnapshot` 的 leaf scalar schema 收口为共享 schema 常量。

## 范围

1. `dynamicSnapshotAriaDreamtimeSchema`
2. `dynamicSnapshotBurniceEmberStateSchema`
3. `dynamicSnapshotBurniceEmberExtraTriggersSchema`
4. `dynamicSnapshotAriaExflowDamageRatioSchema`
5. `dynamicSnapshotAriaStunnedDamageRatioSchema`
6. `dynamicSnapshotBurniceEmberDamageRatioSchema`
7. `dynamicSnapshotFlagsSchema / CountsSchema / ValuesSchema` 中对应字段

## 非目标

1. 不改任何字段的值域、默认值或校验规则
2. 不改任何对象结构或序列化结构
3. 不改 resolver 或 tool 行为

## 当前状态

- `V486.1` 已完成：范围冻结到 `dynamicSnapshot` 的 leaf scalar schema
- `V486.2` 已完成：相关字段已统一复用共享 schema 常量
