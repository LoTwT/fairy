# 静态构筑解析系统 V428

## 目标

`V428` 只解决一件事：

- 把 `lookup-w-engine` 与 `lookup-agent` 中 trimmed-result 的顶层 key contract 统一收口为显式 alias。

## 范围

1. `LookupWEngineTrimmedResultKey`
2. `LookupWEngineTrimmedResult`
3. `LookupAgentTrimmedResultKey`
4. `LookupAgentTrimmedResult`

## 非目标

1. 不改音擎/代理人查询返回字段集合
2. 不改筛选、匹配或属性计算逻辑
3. 不改 `zzz-data` published contract

## 当前状态

- `V428.1` 已完成：范围冻结到 `lookup-w-engine / lookup-agent` trimmed-result key contract
- `V428.2` 已完成：两个 tool 的顶层 trimmed-result key 已统一复用显式 alias
