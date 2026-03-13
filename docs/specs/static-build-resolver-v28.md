# 静态构筑解析系统 V28

`V26` 已把 unified source-entry collection 提升成稳定的 collection summary contract，`V27` 又把 trigger-entry matrix 提升成了稳定的 matrix summary contract。

到这个阶段，剩下还停留在裸 `entries[]` 的只剩两类 source-view 结果：

1. `resolveStaticBuildSourceDamageViews()`
2. `resolveStaticBuildSourceUtilityViews()`

它们当前都存在同类消费缺口：

1. 底层只返回 `entries[]`
2. 高层 tool / UI 仍要自己判断：
   - 当前是否只有 supported entries
   - 当前是否存在 unsupported entries
   - 当前来源是 standalone / delta，或 trigger / rate 的哪一组
3. Agent 仍需要按 `entry.metadata` 和 `supported` 自己重组展示摘要

因此，`V28` 的目标不是新增 source-view coverage，而是把 source-specific damage / utility views 提升成和 `source-entry collection`、`trigger-entry matrix` 同级别的可消费 contract。

## 1. 目标

新增 / 收口：

1. 为 `resolveStaticBuildSourceDamageViews()` 增加稳定 `summary`
2. 为 `resolveStaticBuildSourceUtilityViews()` 增加稳定 `summary`
3. 固定两类 source-view `entries[]` 的排序与分组语义
4. 让高层 tool 与 Agent 直接消费 `views.summary`

## 2. V28 范围

1. `V28.1` scope freeze
2. `V28.2` source-damage-view summary contract
3. `V28.3` source-utility-view summary contract
4. `V28.4` high-level tool alignment
5. `V28.5` docs closeout

## 3. 设计边界

本阶段只做：

1. 扩 `ResolveStaticBuildSourceDamageViewsResult`
2. 扩 `ResolveStaticBuildSourceUtilityViewsResult`
3. 固定 `entries[]` 排序语义
4. 为上层提供稳定 group / count summary

显式不做：

1. 不新增 anomaly / disorder source damage views
2. 不新增 utility / resource view coverage
3. 不把 source views 重新并回 `source-entry collection`
4. 不新增新的 snapshot key

## 4. contract 方向

### 4.1 source damage views

`ResolveStaticBuildSourceDamageViewsResult`

- 保留：
  - `mode`
  - `manualBaseMode`
  - `loadout`
  - `entries`
  - `assumptions`
- 新增：
  - `summary`

`summary` 至少包含：

- `entryCount`
- `standaloneCount`
- `deltaCount`
- `supportedCount`
- `unsupportedCount`
- `groups`

`groups` 第一批固定两组：

- `standalone`
- `delta`

### 4.2 source utility views

`ResolveStaticBuildSourceUtilityViewsResult`

- 保留：
  - `loadout`
  - `entries`
  - `assumptions`
- 新增：
  - `summary`

`summary` 至少包含：

- `entryCount`
- `triggerCount`
- `rateCount`
- `supportedCount`
- `unsupportedCount`
- `groups`

`groups` 第一批固定两组：

- `trigger`
- `rate`

## 5. 排序规则

`V28` 固定以下排序语义：

1. source damage views
   - `standalone` 在前
   - `delta` 在后
   - 组内按 `entry.metadata.stableKey` 排序
2. source utility views
   - `trigger` 在前
   - `rate` 在后
   - 组内按 `entry.metadata.stableKey` 排序

## 6. 验收标准

1. `resolveStaticBuildSourceDamageViews()` 返回稳定 `summary`
2. `resolveStaticBuildSourceUtilityViews()` 返回稳定 `summary`
3. UI / Agent 不需要再自己统计 standalone / delta / trigger / rate 数量
4. 现有 entry payload 不破坏
5. 不新增新的 coverage 和 snapshot key

## 7. 当前状态

- `V28.1` 已完成：冻结到 source-view summary contract
- `V28.2` 已完成：`resolveStaticBuildSourceDamageViews()` 已返回稳定 `summary`
- `V28.3` 已完成：`resolveStaticBuildSourceUtilityViews()` 已返回稳定 `summary`
- `V28.4` 已完成：高层 tool / Agent 已直接消费 `views.summary`
- `V28.5` 已完成：README / 总规格 / 索引 / 架构入口已同步收口
