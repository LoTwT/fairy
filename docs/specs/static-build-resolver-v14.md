# 静态构筑解析系统 V14

## 1. 背景

`V9` 与 `V10` 已把第一批不应并入主 anomaly / disorder 公式的来源迁到 `source-specific damage view`：

- `爱丽丝 [极性强击]`
- `雅 [霜灼·破]`
- `柏妮思 [燃点]/[余烬]`
- `爱芮 [异放]`

但当前仍有一类来源停留在 `research-only` / source-specific assumptions：

- `霰落星殿`
- `混沌重金属 4件`

它们的共同点是：

1. 不应直接并回主 anomaly / disorder 公式
2. 若要表达，优先走独立 source view，而不是继续扩 snapshot contract
3. 当前缺的是“是否值得以非代理人来源形式进入 source view”

因此，`V14` 的目标不是扩大主 resolver，也不是继续加 diagnostics，而是评估并补齐**非代理人来源**的 `source-specific damage view`。

## 2. 目标

`V14` 只做一件事：

1. 为适合独立表达的非代理人来源，新增 `source-specific damage view`

目标：

1. 让部分 `research-only` 来源从“只能写 note”提升到“可独立结算的 view”
2. 保持主 resolver / matrix / source view 三条路径边界清晰
3. 不为此新增新的 snapshot public key

## 3. 不做什么

`V14` 明确不做：

1. 不改 `resolveStaticBuildDamage` 主公式
2. 不扩 anomaly / disorder skill matrix
3. 不把随机分支或真动态过程硬塞进 source view
4. 不为了少写 assumptions 而新增新的 public key

## 4. 范围

`V14` 分四步推进：

1. `V14.1` scope freeze
2. `V14.2` non-agent source inventory
3. `V14.3` source view coverage
4. `V14.4` closeout

## 5. 候选来源

### 5.1 优先候选

- `霰落星殿`
- `混沌重金属 4件`

这两项都已经在现有 source note 中明确写明：

- 如果未来要表达，对应优先走 `source-specific damage view`
- 不继续扩现有 snapshot contract

### 5.2 暂不纳入 V14

- `轰鸣座驾`
  - 随机三选一分支仍属于真动态过程
  - 即使要继续提高精度，也应优先由 `finalPanel` / `resolvedSnapshot` 吸收已确定分支，而不是进入 source view
- `自由蓝调 4件`
  - 当前仍属于积蓄过程效果
  - 不适合在静态 source view 中单独结算

## 6. 设计约束

`V14` 若进入实现，必须满足：

1. source view 条目允许 `sourceType = "w-engine"` 或 `sourceType = "drive-disc"`
2. 条目仍保持：
   - `supported`
   - `requirements`
   - `damage`
   - `diagnostics`
   - `sourceNotes`
3. 不要求主 resolver 返回这些额外条目
4. `zzz-agent` 仍通过 `resolve-build-source-damage-views` 消费，而不是改主计算路径

## 7. 验收标准

`V14` 完成后，至少满足：

1. 至少一个当前 `research-only` 的非代理人来源，被提升为可独立消费的 source view
2. 仍不适合静态表达的来源继续保留为 `research-only`
3. 不新增 public key
4. `README`、总设计、architecture、roadmap 同步更新

## 8. 当前状态

- `V14.1` 已完成：scope freeze
- `V14.2` 已完成：候选 inventory 已确认
- `V14.3` 已完成：当前 contract 下未新增新的非代理人 source view，候选继续按 `research-only / source note` 收口
- `V14.4` 已完成：在当前 contract 下收口

## 9. Inventory 结论

| Source           | 当前结论             | 原因                                                                                                  |
| ---------------- | -------------------- | ----------------------------------------------------------------------------------------------------- |
| `霰落星殿`       | 保持 `research-only` | 暴击伤害被动不直接映射到当前 anomaly / disorder 主公式，也没有稳定的独立 source-specific 额外结算快照 |
| `混沌重金属 4件` | 保持 `research-only` | 叠层依赖侵蚀额外伤害触发链与层数过程，当前没有稳定的静态 source view 输入                             |
| `轰鸣座驾`       | 保持 `source note`   | 随机三选一分支仍属于真动态过程；确定分支后应优先折算到 `finalPanel` / `resolvedSnapshot`              |
| `自由蓝调 4件`   | 保持 `source note`   | 属性异常积蓄抗性降低属于积蓄过程效果，不适合独立结算 view                                             |

## 10. 结论

`V14` 的结论不是“新增更多 view”，而是：

1. 当前 contract 下，还没有足够稳定的非代理人 source-specific damage view 候选
2. `霰落星殿`、`混沌重金属 4件` 继续保留为 `research-only`
3. `轰鸣座驾`、`自由蓝调 4件` 继续保留为 source note，不进入 source view
4. 若未来要推进这些来源，前提不是继续扩 view，而是先获得更稳定的显式快照输入
