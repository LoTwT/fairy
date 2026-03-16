# 静态构筑解析系统 V491

## 目标

`V491` 只解决一件事：

- 把 `zzz-agent` `resolve-build-schemas.ts` 中 `combatTags` 的元素 schema 收口为共享 schema 常量。

## 范围

1. `combatTagSchema`
2. `combatTagListSchema`

## 非目标

1. 不改任何字段的值域、默认值或校验规则
2. 不改任何对象结构或序列化结构
3. 不改 resolver 或 tool 行为

## 当前状态

- `V491.1` 已完成：范围冻结到 `combatTags` 的元素 schema
- `V491.2` 已完成：`combatTagListSchema` 已统一复用共享元素 schema 常量
