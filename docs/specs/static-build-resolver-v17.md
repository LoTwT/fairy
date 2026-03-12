# 静态构筑解析系统 V17

## 1. 背景

`V16` 已经把通用音擎中能稳定映射到当前 static build contract 的高价值来源补成了 curated coverage。

当前剩下最明显的 coverage 缺口不再是音擎，而是通用驱动盘：

1. 当前公开驱动盘共 `26` 套
2. `build resolver` 只对其中 `9` 套提供了 curated coverage
3. 剩余 `17` 套里，仍有一批可以直接映射到现有 bucket / combat tag / state 条件
4. 另一批则主要是全队增益、后台来源、护盾/失衡/回能或明显的过程型机制，不适合塞进当前单代理人静态 damage contract

因此，`V17` 的目标不是继续加新公式或新 key，而是把**通用驱动盘**按当前 contract 能力补成下一批 curated coverage。

## 2. 目标

`V17` 只做一件事：

1. 为当前 static build contract 能稳定表达的通用驱动盘补 curated coverage

目标：

1. 继续减少“当前未收录 curated 驱动盘效果”的 assumptions
2. 保持 `resolveStaticBuildDamage` 的单代理人静态快照边界
3. 不为了 teamwide / off-carrier / 资源过程效果新增新的 public key
4. 不把明显的团队来源硬塞进当前单代理人 loadout

## 3. 不做什么

`V17` 明确不做：

1. 不改 `resolveStaticBuildDamage` 主公式
2. 不扩 anomaly / disorder skill matrix
3. 不把“队伍中任意角色触发”的团队驱动盘效果默认算到当前代理人身上
4. 不新增新的 team snapshot / teammate loadout contract
5. 不把护盾值、失衡值、回能、后台自动回复等过程型来源硬塞进当前 damage contract

## 4. 范围

`V17` 分四步推进：

1. `V17.1` scope freeze
2. `V17.2` generic drive-disc inventory
3. `V17.3` curated coverage batches
4. `V17.4` closeout

## 5. 设计方向

`V17` 优先纳入满足以下条件的驱动盘：

1. 效果直接作用于装备者自身
2. 能稳定映射到现有 bucket / multiplier
3. 触发条件可由现有 `skillTag` / `combatTags` / `enemy.isStunned` / `full-buff` 表达

`V17` 默认排除：

1. 明显依赖“队伍中任意角色”的 teamwide 增益
2. 明显依赖后台角色或非装备者触发
3. 只影响失衡值、护盾值、减伤、回能、层数衰减等非 damage 主 contract 的来源

## 6. 验收标准

`V17` 完成后，至少满足：

1. 当前 contract 能稳定表达的通用驱动盘，不再默认落入 generic coverage-gap
2. teamwide / off-carrier / 过程型驱动盘继续通过 assumptions / sourceNotes 明示
3. 不新增新的 resolver 输入 key
4. 不引入隐式队友或隐式战斗过程默认值

## 7. 当前状态

- `V17.1` 已完成：冻结到通用驱动盘 curated coverage，不继续扩大 contract
- `V17.2` 已完成：通用驱动盘 inventory 与批次已冻结
- `V17.3` 未开始
- `V17.4` 未开始

## 8. Inventory

当前公开驱动盘共 `26` 套，build resolver 里已做 curated coverage 的有 `9` 套：

- `啄木鸟电音`
- `河豚电音`
- `自由蓝调`
- `混沌爵士`
- `混沌重金属`
- `炎狱重金属`
- `雷暴重金属`
- `极地重金属`
- `云岿如我`

剩余 `17` 套中，按当前 contract 的可表达性分成三类。

### 8.1 第一优先级（当前 contract 可直接表达）

- `拂晓生花`
- `流光咏叹`
- `獠牙重金属`
- `如影相随`
- `折枝剑歌`

这些来源满足：

1. 作用于装备者自身
2. 可以直接映射到现有 `bonusDamageSum / critRate / critDamage / attackPercent / anomalyProficiency`
3. 触发条件可由现有 `skillTag` / `combatTags` / `enemy.isStunned` / `finalPanel.anomalyMastery` 表达

### 8.2 第二优先级（允许 partial coverage）

- `沧浪行歌`
- `囚徒手记`

这批的共同点是：

1. 至少有一部分稳定效果可先并入当前公式
2. 仍可能保留 source-specific 条件或 process-only 说明
3. 实现时允许“先展开稳定部分 + 保留 assumptions / sourceNotes”

### 8.3 显式不纳入当前单代理人 damage contract

- `雪兔梦游仙境`
- `月光骑士颂`
- `法厄同之歌`
- `山大王`
- `震星迪斯科`
- `原始朋克`
- `灵魂摇滚`
- `摇摆爵士`
- `激素朋克`
- `静听嘉音`

原因：

1. 主要是全队增益、非装备者触发、后台来源
2. 或主要影响护盾值、失衡值、减伤、回能
3. 若强行纳入，会引入隐式队友或隐式战斗过程默认值

## 9. 批次规划

### Batch A

- `拂晓生花`
- `流光咏叹`
- `獠牙重金属`
- `如影相随`
- `折枝剑歌`

### Batch B

- `沧浪行歌`
- `囚徒手记`

### Batch C

- 只在 `Batch A / Batch B` 做完后，再评估是否需要补 source-note 收口
