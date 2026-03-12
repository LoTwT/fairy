# 静态构筑解析系统 V16

## 1. 背景

`V2` 到 `V15` 已经把强攻 / 命破 / 异常代理人的主 resolver、异常快照 contract、source-specific views、diagnostics 与 sourceNotes guidance 都收口到当前 static build contract。

但现在还有一类非常具体的缺口：

1. 代理人与音擎已经按 `specialty` 解耦
2. 通用、按 `specialty` 兼容的非专属音擎也已经可以传入 resolver
3. 但这类音擎大多仍停留在 generic fallback，只能通过 assumptions / coverage-gap 提示“当前未收录 curated 音擎效果”

这会直接影响：

1. 用户使用非专属音擎时的结果可信度
2. `zzz-agent` 在非专属构筑下的稳定输出质量
3. resolver 对 specialty-compatible build 的完整度

因此，`V16` 的目标不是新增公式或 snapshot key，而是把**通用音擎**逐步补成 curated coverage。

## 2. 目标

`V16` 只做一件事：

1. 为通用、按 `specialty` 兼容的音擎补 curated effect coverage

目标：

1. 继续减少“当前未收录 curated 音擎效果”的 assumptions
2. 保持现有 `agent -> w-engine` 解耦模型不变
3. 不新增新的 build public contract
4. 不把动态过程型机制硬塞进静态公式

## 3. 不做什么

`V16` 明确不做：

1. 不改 `resolveStaticBuildDamage` 主公式
2. 不扩 anomaly / disorder skill matrix
3. 不做通用音擎全文本自动抽取
4. 不为了消除 assumptions 而新增新的 snapshot key

## 4. 范围

`V16` 分四步推进：

1. `V16.1` scope freeze
2. `V16.2` generic w-engine inventory
3. `V16.3` curated coverage batches
4. `V16.4` closeout

## 5. 设计方向

`V16` 只补满足以下条件的通用音擎效果：

1. 能稳定映射到现有 bucket / multiplier
2. 触发条件可由现有 `combatTags` / `damageType` / `skillTag` / 既有 snapshot 表达
3. 不要求引入新的动态资源或时间轴模拟

优先顺序：

1. 当前已有兼容校验、但仍落 assumptions 的高频通用音擎
2. 4 星通用音擎
3. 3 星通用音擎
4. 2 星通用音擎仅在规则简单且复用价值高时纳入

## 6. 验收标准

`V16` 完成后，至少满足：

1. 强攻 / 命破 / 异常三类通用音擎的高频来源不再默认落入 generic coverage-gap
2. specialty-compatible 的非专属音擎场景能返回稳定的 curated buckets
3. 仍不适合静态表达的音擎机制继续通过 assumptions / sourceNotes 明示
4. 不新增新的 resolver 输入 key

## 7. 当前状态

- `V16.1` 已完成：冻结到通用音擎 curated coverage，不继续扩大 contract
- `V16.2` 已完成：通用音擎 inventory 与 batch 划分已冻结
- `V16.3` 已完成 Batch C：通用音擎批次已全部落地
- `V16.4` 已完成：当前 contract 下已收口

## 8. Inventory

### 8.1 优先纳入（当前 contract 可直接表达）

强攻：

- `鎏金花信`
- `星徽引擎`
- `「月相」-晦`
- `「月相」-望`

命破：

- `青漪灵鼎`

异常：

- `「电磁暴」-壹式`
- `「电磁暴」-贰式`

这些来源要么是固定 bucket，要么只依赖当前已有的 `skillTag` / `combatTags` / full-buff 假设，不需要新增 snapshot key。

补充说明：

- `「灰烬」-钴蓝` 已在 Batch A 中完成 source-aware unsupported 收口：当前命破主公式不使用攻击力主乘区，因此它不再落入 generic coverage-gap，但仍会通过 `unsupported-effect diagnostics` 明示“攻击力 buff 不进入当前 sheer 公式”

### 8.2 第二优先级（允许 partial coverage，已完成）

- `加农转子`
- `幻变魔方`

这批的共同点是：

1. 至少有一部分稳定效果可先并入当前公式
2. 仍可能保留额外伤害、层数、目标状态等 process/source note
3. 实现时允许“先展开稳定部分 + 保留 assumptions / sourceNotes”

### 8.3 显式延后或不纳入

当前不进入 damage contract：

- `「月相」-朔`
- `「电磁暴」-叁式`

原因：

1. 这批要么主要依赖战斗过程层数 / 能量消耗 / 触发时机
2. 要么主要影响回能，不直接进入当前 damage contract
3. 若强行纳入，只会重新引入隐式默认值

## 9. 批次规划

### Batch A

- `鎏金花信`
- `星徽引擎`
- `「月相」-晦`
- `「月相」-望`
- `青漪灵鼎`
- `「灰烬」-钴蓝`
- `「电磁暴」-壹式`
- `「电磁暴」-贰式`

### Batch B（已完成）

- `加农转子`
- `幻变魔方`

### Batch C（已完成）

- `强音热望`
- `街头巨星`

## 10. 当前结论

`V16.3 Batch C` 完成后，当前已新增或收口：

- `鎏金花信`
- `星徽引擎`
- `「月相」-晦`
- `「月相」-望`
- `青漪灵鼎`
- `电波漫步`
- `「电磁暴」-壹式`
- `「电磁暴」-贰式`
- `「灰烬」-钴蓝`（source-aware unsupported）
- `加农转子`（稳定攻击力加成已纳入；额外 200% 攻击伤害保持 process-only）
- `幻变魔方`（强化特殊技暴伤与 lowHp 条件增伤已纳入）
- `强音热望`
- `街头巨星`

`V16` 当前结论：

1. 通用强攻 / 命破 / 异常音擎的高价值可静态表达来源已经补到当前 contract
2. `「灰烬」-钴蓝` 保持 source-aware unsupported，不再误报 generic coverage-gap
3. `加农转子` 额外 200% 攻击伤害继续保持 process-only
4. 仍明确不纳入当前 damage contract 的项：
   - `「月相」-朔`
   - `「电磁暴」-叁式`
5. `V16` 到此收口，后续不再继续往本阶段增加新的通用音擎批次
