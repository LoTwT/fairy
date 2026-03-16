# 静态构筑解析系统 V490

## 目标

`V490` 只解决一件事：

- 把 `zzz-agent` `resolve-build-schemas.ts` 中 `effectOverride` 的 leaf schema 收口为共享 schema 常量。

## 范围

1. `effectOverrideIdSchema`
2. `effectOverrideEnabledSchema`
3. `effectOverrideStacksSchema`
4. `effectOverrideSchema` 中对应字段

## 非目标

1. 不改任何字段的值域、默认值或校验规则
2. 不改任何对象结构或序列化结构
3. 不改 resolver 或 tool 行为

## 当前状态

- `V490.1` 已完成：范围冻结到 `effectOverride` 的 leaf schema
- `V490.2` 已完成：相关字段已统一复用共享 schema 常量
