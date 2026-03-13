# 静态构筑解析系统 V26

`V25` 已完成第二批 utility / resource view，并把 `时光切片` 接入：

- `resolveStaticBuildSourceUtilityViews()`
- `resolveStaticBuildSourceEntries()`

到这个阶段，两条 source 侧主线已经会合：

1. source-specific damage views
2. source-specific utility / resource views

当前上层消费的主要问题不再是“有没有 entry”，而是“如何稳定消费 entry 集合”：

1. `resolveStaticBuildSourceEntries()` 目前只返回裸 `entries[]`
2. UI / Agent 仍要自己按 `entryKind` 分组
3. 上层仍要自己统计：
   - source damage / source utility 数量
   - supported / unsupported 数量
   - utility-only / mixed collection 的当前形态

因此，`V26` 的目标不是再扩新的 source coverage，而是把 unified source-entry collection 提升成更稳定的消费 contract。

## 1. 目标

新增 / 收口：

1. 为 `resolveStaticBuildSourceEntries()` 增加 collection-level summary
2. 固定 source-entry collection 的排序规则
3. 为上层提供稳定 group summary，减少手工分组和计数
4. 保持现有 entry payload 不变，不引入新的 damage / utility 公式

## 2. V26 范围

1. `V26.1` scope freeze
2. `V26.2` collection summary contract
3. `V26.3` high-level tool alignment
4. `V26.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 扩 `ResolveStaticBuildSourceEntriesResult`
2. 固定 `entries[]` 的排序语义
3. 提供 collection-level group / count summary
4. 让高层 tool 与 Agent 可以直接消费 summary

显式不做：

1. 不新增新的 source damage view
2. 不新增新的 source utility view
3. 不把 trigger-entry matrix 并进 source-entry collection
4. 不新增新的 snapshot key
5. 不把 source entries 并回主 damage resolver

## 4. contract 方向

`V26` 第一批只做 unified source-entry collection 的消费语义增强：

1. `ResolveStaticBuildSourceEntriesResult`
   - 保留：
     - `loadout`
     - `entries`
     - `assumptions`
   - 新增：
     - `summary`

2. `summary`
   - 至少包含：
     - `entryCount`
     - `sourceDamageViewCount`
     - `sourceUtilityViewCount`
     - `supportedCount`
     - `unsupportedCount`
     - `isUtilityOnly`
     - `groups`

3. `groups`
   - 第一批只按 `entryKind` 固定两组：
     - `source-damage-view`
     - `source-utility-view`
   - 每组至少包含：
     - `key`
     - `label`
     - `count`
     - `supportedCount`
     - `unsupportedCount`

4. `entries[]`
   - 保持现有 item shape
   - 只补稳定排序，不新增 collection 专用 metadata

## 5. 排序规则

`V26` 固定以下排序语义：

1. `utility-only` collection
   - 只返回 `source-utility-view`
   - 保持稳定顺序：先 `sourceType/sourceId`，再按 entry 本身稳定键排序

2. `mixed collection`
   - `source-damage-view` 在前
   - `source-utility-view` 在后
   - 组内继续按稳定键排序

## 6. 验收标准

1. `resolveStaticBuildSourceEntries()` 返回稳定 `summary`
2. UI / Agent 不需要再自己统计 source damage / source utility 数量
3. `utility-only` 与 `mixed collection` 可直接从 result.summary 判定
4. 现有 entry shape 与 source-entry tool 行为不破坏
5. 不新增新的公式 bucket 或 snapshot key

## 7. 当前状态

- `V26.1` 已完成：冻结到 unified source-entry collection summary
- `V26.2` 已完成：`ResolveStaticBuildSourceEntriesResult` 已新增 `summary`，并固定 utility-only / mixed collection 的排序语义
- `V26.3` 已完成：高层 tool 与 Agent prompt 已改为优先消费 `collection.summary`
- `V26.4` 未开始
