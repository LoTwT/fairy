# 静态构筑解析系统 V23

`V20`、`V21`、`V22` 已分别落地：

- source-specific utility / energy views
- anomaly / disorder trigger-entry matrix
- source view / utility view metadata

当前上层如果想“一次性拿到这个构筑的额外来源条目”，仍要分别调用：

1. `resolveStaticBuildSourceDamageViews()`
2. `resolveStaticBuildSourceUtilityViews()`

这对 UI 和 Agent 都不够直接。

`V23` 的目标是：

- 新增统一的 source-entry collection contract
- 让上层可以一次性拿到当前构筑下的 source damage views / source utility views

## 1. 目标

新增：

- `ResolveStaticBuildSourceEntriesInput`
- `ResolveStaticBuildSourceEntriesResult`
- `StaticBuildSourceEntry`

## 2. V23 范围

本阶段只做：

1. 聚合现有 `source damage view`
2. 聚合现有 `source utility view`
3. 利用 `V22 metadata` 做稳定区分

显式不做：

1. 不把 `trigger-entry matrix` 并进 source-entry collection
2. 不把主公式结算并进 source-entry collection
3. 不新增新的 damage / utility 公式

## 3. contract 草案

### 3.1 entry discrimination

`StaticBuildSourceEntry` 第一版只开放两类：

- `source-damage-view`
- `source-utility-view`

### 3.2 输入边界

`V23` 第一版允许：

- `loadout`
- `panel?`
- `scenario?`
- `effectOverrides?`

规则：

1. 没有 `scenario` 时，只返回 utility entries
2. `scenario.damageType` 为 `anomaly / disorder` 时，可同时返回 damage entries
3. 不把 `normal / sheer` 伪装成 source damage collection

### 3.3 输出边界

第一版输出：

- `loadout`
- `entries`
- `assumptions`

其中每个 `entry` 直接保留原始 source view / utility view payload，并用统一 `entryKind` 区分。

## 4. 实施顺序

1. `V23.1` scope freeze
2. `V23.2` unified source-entry contract
3. `V23.3` high-level tool integration
4. `V23.4` docs closeout

## 5. 验收标准

1. 上层可通过单一 API 拿到当前构筑的 source entries
2. utility-only 场景不需要伪造 `scenario`
3. `anomaly / disorder` 场景下可同时看到独立 damage / utility entries
4. 不破坏现有 `resolveStaticBuildSourceDamageViews()` / `resolveStaticBuildSourceUtilityViews()`
