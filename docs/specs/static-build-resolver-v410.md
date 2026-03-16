# 静态构筑解析系统 V410

## 1. 目标

`V410` 只解决一件事：

- 把 `buhflipexplode` 的 node level 常量列表统一复用显式 readonly list alias。

## 2. 范围

1. `BuhflipNodeLevelList`
2. `SD_STABLE_NODE_LVLS`
3. `SD_DISPUTED_NODE_LVLS`
4. `SD_AMBUSH_NODE_LVLS`
5. `SD_PRE25_CRIT_NODE_LVLS`
6. `SD_POST25_CRIT_NODE_LVLS`
7. `TS_EASY_NODE_LVLS`
8. `TS_PRE26_HARD_NODE_LVLS`
9. `TS_POST26_HARD_NODE_LVLS`

## 3. 非目标

1. 不改任何 node level 数值
2. 不改 boundary 常量
3. 不改 multiplier table 或公式 helper

## 4. 当前状态

- `V410.1` 已完成：范围冻结到 buhflipexplode node level list contract
- `V410.2` 已完成：`SD/TS` node level 常量列表已统一复用显式 readonly list alias
