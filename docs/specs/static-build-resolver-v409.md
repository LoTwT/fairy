# 静态构筑解析系统 V409

## 1. 目标

`V409` 只解决一件事：

- 把 `buhflipexplode` 的 multiplier table 常量统一复用显式 readonly list alias。

## 2. 范围

1. `BuhflipNodeMultiplierValue`
2. `BuhflipNodeMultiplierTable`
3. `NODE_HP_MULT`
4. `NODE_ENEMY_HP_MULT`
5. `NODE_DEF_MULT`
6. `NODE_DAZE_MULT`

## 3. 非目标

1. 不改任何 multiplier 数值
2. 不改公式 helper
3. 不改 node level 列表常量

## 4. 当前状态

- `V409.1` 已完成：范围冻结到 buhflipexplode multiplier table contract
- `V409.2` 已完成：四个 multiplier table 已统一复用显式 readonly list alias
