# 静态构筑解析系统 V466

## 目标

`V466` 只解决一件事：

- 把 `buhflipexplode/index.ts` 中 enemy/version record 的 value contract 收口为显式 alias。

## 范围

1. `BuhflipEnemyRecordValue`
2. `SDVersionRecordValue`
3. `DAVersionRecordValue`
4. `TSVersionRecordValue`
5. 对应 `Record<...>` alias

## 非目标

1. 不改任何 `buhflipexplode` published JSON shape
2. 不改 enemy/version record key
3. 不改任何 helper、multiplier、版本选择逻辑

## 当前状态

- `V466.1` 已完成：范围冻结到 `buhflipexplode` enemy/version record 的 value contract
- `V466.2` 已完成：相关 record value 已统一复用显式 alias
