# 命名规范

本文档描述 `zzz-data` 的术语分层。原则只有一条：

- `data/*.json` 与对应类型优先保留 raw/source-compatible 字段
- 规范导出、跨模块复用、业务逻辑判断统一走 `src/terms.ts`

## Canonical 术语

以下术语是推荐对外使用的规范导出：

| 分类                      | Canonical 值                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `AgentSpecialty`          | `Attack` / `Stun` / `Anomaly` / `Support` / `Defense` / `Rupture`                         |
| `AgentAttribute`          | `Electric` / `Fire` / `Ice` / `Ether` / `Physical` / `Auric Ink` / `Frost` / `Honed Edge` |
| `AttackType`              | `Slash` / `Strike` / `Pierce`                                                             |
| `BaseResistanceAttribute` | `ice` / `fire` / `electric` / `ether` / `physical`                                        |

## Localized Label 与 Canonical 的关系

`data/en/*.json` 与 `data/zh-CN/*.json` 中的同一字段会使用不同语言的 display label。调用方如果需要做筛选、映射、伤害计算，不要直接硬编码字符串，统一调用：

- `toAgentSpecialty()`
- `toAgentAttribute()`
- `toAttackType()`
- `toBaseResistanceAttribute()`
- `getElementMultIndex()`

### 常用映射

| Display Label         | Canonical    | Base Resistance Bucket |
| --------------------- | ------------ | ---------------------- |
| `强攻` / `Attack`     | `Attack`     | —                      |
| `命破` / `Rupture`    | `Rupture`    | —                      |
| `电属性` / `Electric` | `Electric`   | `electric`             |
| `冰属性` / `Ice`      | `Ice`        | `ice`                  |
| `烈霜` / `Frost`      | `Frost`      | `ice`                  |
| `以太` / `Ether`      | `Ether`      | `ether`                |
| `玄墨` / `Auric Ink`  | `Auric Ink`  | `ether`                |
| `物理` / `Physical`   | `Physical`   | `physical`             |
| `凛刃` / `Honed Edge` | `Honed Edge` | `physical`             |
| `斩击` / `Slash`      | `Slash`      | —                      |
| `打击` / `Strike`     | `Strike`     | —                      |
| `穿透` / `Pierce`     | `Pierce`     | —                      |

其中有 3 个字段需要特别区分：

- `玄墨` / `Auric Ink` 是特殊以太属性，不是 `Ether` 的别名；当前敌人抗性与 `elementMult` 仍归入 `ether`
- `凛刃` / `Honed Edge` 是特殊物理属性，不是 `Physical` 的别名；当前敌人抗性与 `elementMult` 仍归入 `physical`
- `烈霜` / `Frost` 是特殊冰属性，不是 `Ice` 的别名；当前敌人抗性与 `elementMult` 仍归入 `ice`

## Raw 字段保留策略

以下字段虽然命名不够理想，但因为它们直接对应上游爬取结果或发布 JSON，所以当前保留 raw 名称，不在数据层强行重命名：

| Raw 字段                   | 位置           | 说明                                           |
| -------------------------- | -------------- | ---------------------------------------------- |
| `exclusiveWeapon`          | `AgentDetails` | 实际语义是代理人的 signature W-Engine          |
| `stunMult` / `stunTime`    | `game-modes`   | raw/source-compatible 的失衡倍率与持续时间字段 |
| `mult` / `altHp` / `hp60k` | `game-modes`   | 上游数据字段，需结合上下文解释                 |
| `versionAnomMult` 等       | `game-modes`   | 上游版本倍率字段，当前仅补注释说明             |

## 通用命名规则

- 失衡相关：优先使用 `daze` 作为规范术语；若 raw/source 已固定为 `stun*`，在 raw 层保留，在文档中说明
- 喧响值：使用 `techniquePoints`，如 `techniquePointsRegen`、`techniquePointsGainRate`
- 闪能：使用 `adrenaline`，如 `adrenalineAccumulation`
- 秽盾：使用 `miasmicShield`，如 `miasmicShieldReduction`
- 能量上限：使用 `energyLimit`（非 `energyCap`）
- 抗性后缀：使用完整的 `Resistance`（非缩写 `Resist`）
- 元素前缀：使用完整拼写 `electric` / `physical`（非缩写 `elec` / `phys`）
