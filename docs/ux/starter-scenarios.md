# Starter Scenarios — UX v0.3 重定向稿 A

作者：@UX  日期：2026-05-05  状态：v0.4（v0.1.1 patch 修正 + JSON 字段同步 TL-3 schema）

> Starter scenarios = AI plugin / CLI 用户首次接入时的"开箱即用"参考用例。每个 scenario 包含：
> - 自然语言描述（zh + en 双语）
> - 最小 BattleSnapshot JSON skeleton
> - 期望 CalcResult 摘要（含 trace 关键字段）
>
> 命名 / 字段以 glossary v0.3.2 + naming-policy.md 为准。Pending 项保留 sourceAliases 兼容。
> 用途：AI plugin 让 LLM 引用作为 prompt context；CLI 用户复制后改自己面板；QA 黄金集对账参考。

---

## Scenario S1 · 仪玄单挑秽息司祭（命破贯穿 vs 秽盾经典叙事）

### 自然语言描述

**zh（默认）**：
> 仪玄（命破特性）单人挑战秽息司祭（首领，秽盾开启）。释放强化特殊技"符法千重-破"（伤害倍率 1200% / 失衡倍率 374.1%）。本场景演示**贯穿伤害公式跳过防御区**+**秽盾导致防御 +80% / 减伤 25%** 综合下，命破贯穿对常规伤害的优势倍率（攻略 5.3 给出约 3.16x 锚点）。

**en**：
> Yixuan (Rupture specialty) solo against Corruption Priest (Boss, Corrupted Shield active). Triggers her EX Special "Sigil Shroud — Break" (damage ratio 1200% / daze ratio 374.1%). This scenario demonstrates how Sheer Damage bypasses Defense Zone, combined with Corrupted Shield's +80% defense / 25% damage reduction, illustrating the ~3.16x advantage of Rupture/Sheer Damage over regular damage (Strategy 5.3 anchor).

### 最小 BattleSnapshot

```jsonc
{
  "schemaVersion": "v1",
  "ruleSetVersion": "rules-v0.1-attached-2026-05-04",
  "dataVersion": "data-v0.1.0",
  "sourceVersion": "ZZZ-2.x",
  "gameVersion": "2.x",

  "team": [
    {
      "agentId": "yixuan",
      "level": 60,
      "agentSpecialty": "rupture",
      "attribute": "auricInk",
      "skillLevels": { "basic": 9, "dodge": 9, "special": 12, "chain": 9, "core": 6 },
      "wEngine": { "id": "qingmingLongShe", "level": 60, "phase": 5 },
      "driveDiscs": [/* 6 件，slot I–VI */],
      "mindscapeCinema": { "level": 0 },
      "panel": {
        "attack": 3000,
        "maxHp": 18305,
        "defense": 718,
        "critRate": 0.554,
        "critDamage": 2.004,
        "penetrationRate": 0,
        "flatPenetration": 0,
        "anomalyProficiency": 117,
        "anomalyMastery": 92,
        "impact": 93,
        "sheerForce": 2423
      }
    }
  ],

  "fieldProvenance": { "team[0].panel": { "provenance": "panel" } },
  "activeActor": { "agentId": "yixuan" },
  "attackSegments": [
    {
      "id": "seg-1",
      "actorId": "yixuan",
      "skillId": "yixuan.exSpecial.sigilShroudBreak",
      "levelKey": "lv12",
      "multiplier": 12.0,
      "baseDazeMultiplier": 3.741,
      "damageType": "sheer",
      "attribute": "auricInk",
      "tags": ["exSpecial", "heavyHit"],
      "distanceDecay": 1.0
    }
  ],

  "enemy": {
    "enemyId": "corruptionPriest",
    "level": 80,
    "rank": "boss",
    "states": ["corruptedDomain"],
    "corruptedShield": { "active": true },
    "anomalyTriggerCounts": { "burn": 0, "frozen": 0, "assault": 0, "corruption": 0, "shock": 0 }
  },

  "modifiers": [],
  "manualEvents": []
}
```

### 期望 CalcResult 摘要

```jsonc
{
  "damageType": "sheer",
  "expectedDamage": "≈ X (具体值由 core 计算)",
  "critDamageMax": "≈ X * (1 + critDamage)",
  "nonCritDamage": "≈ X / (1 + critRate * critDamage)",
  "trace": {
    "baseDamageZone": "= sheerForce 2423 * multiplier 12.0",
    "damageBonusZone": "1.0 (无外援)",
    "critZone": "暴击时 1 + 200.4% = 3.004 / 期望 1 + 0.554*2.004 = 2.110",
    "defenseZone": "已跳过 (sheer 伤害)",
    "resistanceZone": "1 - (-0.2) = 1.2 (玄墨按以太结算; 司祭以太 0.4 抗性? — 待 data 验证)",
    "vulnerabilityZone": "1 + 25% 秽盾减伤 reverse = 0.75",
    "dazeVulnerabilityZone": "1.0 (敌人未失衡)",
    "sheerDamageBonusZone": "1.0 (无 sheer 增伤增益)",
    "specialZone": "1.0",
    "warnings": [],
    "narrativeHint": "贯穿伤害对秽盾首领约 3.16x 常规伤害（攻略 5.3）"
  }
}
```

### 黄金锚点关联

- Strategy 1.4 临界增伤区 199.17% / 268.61% / 161.67%（穿透 vs 增伤选择）
- Strategy 5.3 贯穿对秽盾约 3.16x 常规
- 60 级 vs 60+ 首领默认防御区 = 0.4545
- 有秽盾时 ≈ 0.3165

---

## Scenario S2 · 月城柳单代理人电异常 → 紊乱（异常积蓄 + 紊乱基础）

### 自然语言描述

**zh**：
> 月城柳（异常特性，电属性）打庞培（首领，电抗 0.4 特例）。攻击命中累积感电异常积蓄；当感电触发后，玩家用其他属性代理人覆盖，触发**紊乱**结算。本场景演示**异常伤害**与**紊乱伤害**两条独立公式路径，并体现"虚拟代理人"加权（单代理人场景下为月城柳本人）。

> errata v0.1.1：v0.1 误用"雅"作为 yanagi 中文名；雅 = 星见雅（Yao），月城柳 = Yanagi，两人不同。已修正。

**en**：
> Yanagi (Anomaly specialty, Electric attribute) attacks Pompey (Boss, special Electric resistance 0.4). Attacks accumulate Shock anomaly buildup; once Shock triggers, the player overrides with another attribute agent to trigger **Disorder** settlement. This scenario demonstrates the two independent damage paths of **Anomaly Damage** and **Disorder Damage**, and illustrates the "Virtual Agent" weighting (which equals Yanagi herself in single-agent scenarios).

### 最小 BattleSnapshot（关键字段）

```jsonc
{
  "team": [
    {
      "agentId": "yanagi",
      "agentSpecialty": "anomaly",
      "attribute": "electric",
      "panel": {
        "attack": 2400,
        "anomalyProficiency": 600,
        "anomalyMastery": 450,
        "critRate": 0.30,
        "critDamage": 1.50
      }
    }
  ],
  "fieldProvenance": { "team[0].panel": { "provenance": "panel" } },
  "activeActor": { "agentId": "yanagi" },
  "attackSegments": [
    {
      "id": "seg-1",
      "actorId": "yanagi",
      "skillId": "yanagi.exSpecial",
      "multiplier": 5.0,
      "damageType": "anomaly",
      "attribute": "electric",
      "tags": ["exSpecial"]
    }
  ],
  "enemy": {
    "enemyId": "pompey",
    "rank": "boss",
    "states": [],
    "anomalyTriggerCounts": { "shock": 0 }
    // pompey 的 electric resistance: 0.4 (特例，攻略 1.5；data 包提供敌人抗性表)
  }
}
```

### 期望 CalcResult 摘要

```jsonc
{
  "damageType": "anomaly",
  "trace": {
    "anomalyType": "shock",
    "virtualAgent": {
      "level": 60,
      "attack": 2400,
      "anomalyProficiency": 600,
      "buildupContributionRatio": 1.0
    },
    "anomalyProficiencyZone": "= 600/100 = 6.0 (异常伤害公式 PART 03.3.1，使用精通侧)",
    "damageLevelZone": "trunc(1 + 1/59*(60-1), 4) = 2.0",
    "anomalyDamageBonusZone": "1.0",
    "warnings": ["Pompey has special electric resistance 0.4"]
  }
}
```

---

## Scenario S3 · 三人队伍（仪玄 + 妮可 + 莱卡恩）队友增益叠加

### 自然语言描述

**zh**：
> 仪玄（命破，前台）+ 妮可（支援，提供 40% 减防）+ 莱卡恩（**击破**，额外能力提供"攻击失衡敌人时失衡易伤倍率 +35%"）。展示 V1 队伍 1~3 代理人 + activeActor 锚点 + typed modifier `appliesTo` 传播逻辑。仪玄释放强化特殊技时，妮可的减防与莱卡恩的失衡易伤都作用于此次结算。

> errata v0.1.1：v0.1 误把莱卡恩 specialty 写为"强攻"；正确为"击破"（agentSpecialty: `stun`）。莱卡恩的额外能力效果引用攻略 1.7：队伍属性/阵营条件触发时，攻击失衡敌人 → 目标失衡易伤倍率 +35%。已修正。

**en**：
> Yixuan (Rupture, frontline) + Nicole (Support, provides 40% defense reduction) + Lycaon (**Stun**, provides daze vulnerability buff). Demonstrates V1 team of 1–3 agents + activeActor anchor + typed modifier `appliesTo` propagation. When Yixuan triggers her EX Special, both Nicole's defense reduction and Lycaon's daze vulnerability bonus apply to the calculation.

### 最小 BattleSnapshot（关键字段）

```jsonc
{
  "team": [
    { "agentId": "yixuan", "agentSpecialty": "rupture", /* ...面板 */ },
    { "agentId": "nicole", "agentSpecialty": "support", /* ...面板 */ },
    { "agentId": "lycaon", "agentSpecialty": "stun", /* ...面板 */ }
  ],
  "activeActor": { "agentId": "yixuan" },
  "attackSegments": [
    { "id": "seg-1", "actorId": "yixuan", "skillId": "yixuan.exSpecial", "multiplier": 12.0, "damageType": "sheer", "attribute": "auricInk", "tags": ["exSpecial"] }
  ],
  "modifiers": [
    {
      "id": "support-defense-reduction",         // illustrative — 实际 handlerId / source 由 S3 锁
      "handlerId": "defense-reduction",
      "params": { "value": 0.40 },
      "appliesTo": { "kind": "enemy" },
      "source": { "sourceId": "nicole.exSpecial" },
      "active": true
    },
    {
      "id": "stun-daze-vulnerability",           // illustrative
      "handlerId": "daze-vulnerability-bonus",
      "params": { "value": 0.35 },
      "appliesTo": { "kind": "enemy" }, "when": { "dazed": true },
      "source": { "sourceId": "lycaon.additionalAbility" },
      "active": true
    }
  ],
  "enemy": {
    "enemyId": "corruptionPriest",
    "states": ["dazed"],
    "corruptedShield": { "active": false }
  }
}
```

### 期望 CalcResult 摘要（关注队友增益生效与否）

```jsonc
{
  "damageType": "sheer",
  "trace": {
    "appliedModifiers": [
      { "id": "nicole-cunning-pursuit", "applied": true, "effect": "defenseReduction +40%" },
      { "id": "lycaon-additional-ability", "applied": true, "effect": "dazeVulnerabilityZone +35%", "reason": "enemy.dazed = true 满足 when 条件" }
    ],
    "skippedModifiers": [],
    "narrativeHint": "队伍 3 人，全部增益生效"
  }
}
```

---

## Starter Scenarios 组织约定

- 文件名（v0.3 时）：`scenarios/<id>.json`（snapshot 数据）+ `scenarios/<id>.md`（自然语言 + 期望 CalcResult 摘要）
- 双语：本文档 zh / en 描述对应 prompt template 4 档（tiny / brief / verbose / debug）的 verbose 档自动生成
- AI plugin 引用：plugin manifest 加载本目录所有 scenarios 作为示例库
- QA 黄金集映射：每个 scenario 对应 v2.0 §5.7 中的至少 1 个对账锚点

## v0.3 → v0.4 待补 scenarios

- 异常多代理人共享积蓄（虚拟代理人加权多代理人场景）
- 部位破坏 / 秽盾净除手动事件
- 收益曲线扫描（V1 不做 CLI scan 命令则可省略）
- 距离衰减区（远程代理人）

待 TL-3 schema 出来后字段名最终对齐，scenarios JSON 同步更新。
