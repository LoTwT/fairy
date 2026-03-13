# 静态构筑解析系统 V19

## 1. 背景

`V18` 已把最后一批 legacy 强攻签名按当前 contract 做完收口。

在此之后，已支持来源里只剩两把旧通用音擎还没有进入 curated coverage 或 source note：

1. `「月相」-朔`
2. `「电磁暴」-叁式`

这两把音擎的共同点很明确：

1. 都是旧通用音擎
2. 效果只提供能量回复
3. 依赖发动窗口或队伍异常触发
4. 不直接进入当前 static damage 主公式

因此，`V19` 的目标不是新增 bucket，也不是把能量系统硬塞进伤害公式，而是把这两把音擎收口成 source-aware coverage。

## 2. 目标

`V19` 只做一件事：

1. 把最后两个仍会落入 generic coverage-gap 的旧通用音擎，固定成 source note / source-aware unsupported

目标：

1. 消除已支持来源中最后两个 generic coverage-gap
2. 不新增 public input key
3. 不把能量回复机制并入当前 static damage 主公式
4. 明确这两把音擎属于 process-only / utility source，而不是 damage bucket source

## 3. 不做什么

`V19` 明确不做：

1. 不新增 energy snapshot / energy timeline contract
2. 不把能量回复折算成伤害乘区
3. 不改 `resolveStaticBuildDamage` 主公式
4. 不扩 skill matrix
5. 不重新打开 `V16` 已明确结束的通用音擎主线

## 4. 范围

`V19` 分四步推进：

1. `V19.1` scope freeze
2. `V19.2` utility engine inventory
3. `V19.3` source-note closeout
4. `V19.4` closeout

## 5. Inventory

### 5.1 本阶段唯一目标

- `「月相」-朔`
- `「电磁暴」-叁式`

### 5.2 归类原则

它们都归为：

1. `w-engine`
2. `process-only utility source`
3. 不进入 `bonusDamageSum / critRate / critDamage / attackPercent / ignoreDefense / ignoreResistance`

## 6. 设计方向

`V19` 采用统一收口方式：

1. 为这两把音擎补 `source note`
2. 明确说明它们只影响能量回复或触发窗口
3. 让 resolver 不再对它们报 generic coverage-gap
4. 保持结果主要基于 `finalPanel`、敌人参数与已支持的 damage source

## 7. 验收标准

`V19` 完成后，至少满足：

1. `「月相」-朔` 不再落入 generic coverage-gap
2. `「电磁暴」-叁式` 不再落入 generic coverage-gap
3. 两者都通过 `sourceNotes` / `assumptions` 明确说明“当前只作为 process-only utility source 记录”
4. 不新增新的 public key

## 8. 当前状态

- `V19.1` 已完成：冻结到最后两个 utility-only 旧通用音擎，不继续扩大 contract
- `V19.2` 已完成：inventory 已冻结
- `V19.3` 已完成：`「月相」-朔 / 「电磁暴」-叁式` 已固定为 process-only source note
- `V19.4` 未开始

## 9. 当前结论

`V19` 当前结论：

1. 这不是新的 damage coverage 批次，而是最后两个 utility-only generic engine 的收口
2. 最合理的表达仍是 source note，而不是新增能量相关 public contract
3. `V19.3` 完成后，这两把音擎已不再落入 generic coverage-gap
