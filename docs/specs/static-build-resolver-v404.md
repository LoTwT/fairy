# 静态构筑解析系统 V404：buhflipexplode side slot list contracts

## 背景

`packages/zzz-data/src/buhflipexplode/index.ts` 的 `SD/TS node.sides` 仍直接暴露匿名 nullable 数组类型。

## 目标

`V404` 只解决一件事：

- 把 `buhflipexplode` 的 side slot 集合统一复用显式 list alias。

## 范围

1. `SDSideSlot`
2. `SDSideSlotList`
3. `TSSideSlot`
4. `TSSideSlotList`
5. `SDNode.sides`
6. `TSNode.sides`

## 非目标

1. 不改任何 raw/published JSON shape
2. 不改 `wave list` contract
3. 不改 `node / versions` 上层容器

## 完成标准

1. `buhflipexplode/index.ts` 不再直接暴露 nullable `side[]`
2. `SD/TS` side slot 集合统一复用显式 alias
3. 现有测试与构建保持通过
