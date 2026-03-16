# 静态构筑解析系统 V461

## 目标

`V461` 只解决一件事：

- 把 `terms.ts` 中 `CanonicalTermGroupMap` 的匿名 `Record<string, readonly CanonicalTermText[]>` 收口为显式 key/list contract。

## 范围

1. `CanonicalTermGroupKey`
2. `CanonicalTermTextList`
3. `CanonicalTermGroupMap`

## 非目标

1. 不改任何术语映射表内容
2. 不改 canonicalize 行为或返回值
3. 不改 `AgentSpecialty / AgentAttribute / AttackType` 的值域

## 当前状态

- `V461.1` 已完成：范围冻结到 `CanonicalTermGroupMap` 的匿名 map/list contract
- `V461.2` 已完成：相关 key/list contract 已统一复用显式 alias
