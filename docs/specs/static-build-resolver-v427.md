# 静态构筑解析系统 V427

## 目标

`V427` 只解决一件事：

- 把 `lookup-bangboo` 中 trimmed-result 的顶层 key contract 统一收口为显式 alias。

## 范围

1. `LookupBangbooTrimmedResultKey`
2. `LookupBangbooTrimmedResult`

## 非目标

1. 不改 `lookup-bangboo` 的返回字段集合
2. 不改邦布查询、筛选或属性计算逻辑
3. 不改 `zzz-data` published contract

## 当前状态

- `V427.1` 已完成：范围冻结到 `lookup-bangboo` trimmed-result key contract
- `V427.2` 已完成：顶层 trimmed-result key 已统一复用显式 alias
