# 静态构筑解析系统 V18

## 1. 背景

`V17` 已经把当前 contract 下能稳定表达的通用驱动盘高价值来源补到自然停点。

到这个阶段，剩余最明显的 coverage gap 已经不再是：

1. 通用音擎
2. 通用驱动盘
3. anomaly / disorder 主线 contract

而是最后一批 legacy 强攻签名：

1. `可琳`
2. `比利`
3. `安东`
4. `家政员`
5. `仿制星徽引擎`
6. `旋钻机-赤轴`

这些来源的共同点是：

1. 来自早期强攻代理人与旧专属音擎
2. 效果描述里带有姿态、距离、持续斩击、额外结算或触发窗口
3. 其中一部分能在当前 static build contract 下做 partial coverage
4. 另一部分仍应保留为 source note，而不是继续扩 contract

因此，`V18` 的目标不是新增 key，而是把最后一批 legacy 强攻签名按当前 contract 的表达能力分层收口。

## 2. 目标

`V18` 只做一件事：

1. 收口最后一批 legacy 强攻代理人 / 专属音擎的高价值可静态表达来源

目标：

1. 继续减少 attack 路径中遗留的 coverage gap
2. 保持单代理人静态 damage contract，不新增新的 snapshot key
3. 把姿态、距离、持续命中、额外结算次数等明显过程型来源继续固定为 source note
4. 让 `V18` 结束后，supported attack signatures 只剩显式 out-of-scope 的旧通用音擎

## 3. 不做什么

`V18` 明确不做：

1. 不新增 public input key
2. 不为距离、姿态、持续命中、额外结算次数新增新的 snapshot contract
3. 不改 `resolveStaticBuildDamage` 主公式
4. 不扩 anomaly / disorder skill matrix
5. 不把明显依赖真动态过程的 legacy 机制硬塞进当前 static build contract

## 4. 范围

`V18` 分四步推进：

1. `V18.1` scope freeze
2. `V18.2` legacy attack signature inventory
3. `V18.3` partial coverage + source-note batches
4. `V18.4` closeout

## 5. 设计方向

`V18` 优先纳入满足以下条件的来源：

1. 效果作用于装备者自身
2. 数值可稳定映射到现有 `bonusDamageSum / critRate / critDamage / attackPercent / ignoreDefense / ignoreResistance`
3. 条件可由现有 `skillTag` / `combatTags` / `enemy.isStunned` / `mode` 表达

`V18` 默认保留为 source note 的来源：

1. 姿态切换，例如比利蹲姿射击
2. 距离判断，例如仿制星徽引擎 6 米外命中
3. 持续斩击或连续命中窗口，例如可琳电锯持续斩击
4. 真动态的额外结算或追击次数
5. 强依赖流程触发链的状态窗口

## 6. 验收标准

`V18` 完成后，至少满足：

1. `可琳 / 比利 / 安东` 三名 legacy 强攻代理人已不再落入 generic coverage gap
2. `家政员 / 仿制星徽引擎 / 旋钻机-赤轴` 三把旧专属音擎已不再落入 generic coverage gap
3. 可静态表达的部分已做 curated / partial coverage
4. 不适合静态表达的部分已通过 source note 明确归因
5. 不新增新的 public key

## 7. 当前状态

- `V18.1` 已完成：冻结到最后一批 legacy 强攻签名收口，不继续扩大 contract
- `V18.2` 已完成：legacy attack signature inventory 与批次已冻结
- `V18.3` 已完成 `Batch A`：`可琳 / 家政员`
- `V18.4` 未开始

## 8. Inventory

当前剩余的 legacy 强攻签名按来源分成两组。

### 8.1 代理人

- `可琳`
- `比利`
- `安东`

### 8.2 专属音擎

- `家政员`
- `仿制星徽引擎`
- `旋钻机-赤轴`

### 8.3 显式不纳入

- `「月相」-朔`
- `「电磁暴」-叁式`

它们已经在 `V16` 被固定为显式 out-of-scope，本阶段不再重新讨论。

## 9. 批次规划

### Batch A（已完成）

- `可琳`
- `家政员`

### Batch B

- `比利`
- `仿制星徽引擎`
- `安东`
- `旋钻机-赤轴`

## 10. 当前结论

`V18` 当前结论：

1. 不为 legacy attack signatures 新增新的 snapshot key
2. `可琳` 的失衡目标增伤、`家政员` 的满层物理增伤这类当前 contract 可表达项已经做成 partial coverage
3. `比利` 蹲姿、`仿制星徽引擎` 距离判断、`安东` 额外感电结算、`旋钻机-赤轴` 触发窗口等来源继续保留为 source note
4. `V18` 的目标是收口最后一批 legacy attack signature，而不是继续扩大 attack 主线公式
