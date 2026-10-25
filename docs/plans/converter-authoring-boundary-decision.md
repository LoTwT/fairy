# 转换器与作者层边界决策

- 状态：已定案（2026-10-25）。
- 基线：`origin/main @ f7cc871f`（#318、#319 已合并）。
- 规范入口：[ZZZ-HP 静态增益数据接入 · 转换器与作者层边界](../specs/data/zzz-hp-static-effects.md#转换器与作者层边界)。
- 范围：只记录边界与后续工作方式；不改代码、正式 effects 制品、`integrated`、
  `dist`、`snapshotId`、publication/manifests 或公开 exports。

## 1. 问题

authoring 已覆盖 99 条规则、89 个选项和全部 68 条 integrated 补充记录。需要明确它是
正式制品的第二事实来源，还是 converter 之上的独立断言层。这个选择决定是否继续把
剩余规则与 33 条 out-of-scope 补充记录迁入 authoring，也决定 0.5.0 之后的维护方向。

## 2. 证据

| 事实                           |                                数值 | 依据                                                        |
| ------------------------------ | ----------------------------------: | ----------------------------------------------------------- |
| 正式规则 / 选项 / 变体         |                   931 / 986 / 1,467 | `packages/data/definitions/effects/static*.json`            |
| authoring 覆盖                 |    99 / 931 条规则、89 / 986 个选项 | `authoring:verify`                                          |
| authoring 记录 / option groups |                             99 / 89 | `packages/data/scripts/static-effects/authoring/records.ts` |
| integrated 补充记录            |                    68 / 68 已作者化 | `static-coverage.json`                                      |
| out-of-scope 补充记录          |              33 条，全部带 `reason` | `static-coverage.json`                                      |
| authoring 记录文件规模         |                        约 21,816 行 | `authoring/*records.ts`                                     |
| converter 核心文件规模         |                        约 15,602 行 | `convert.ts`、`supplements.ts`、`semantics.ts`              |
| authoring 是否发布             | 否，仅 scripts；npm 包只发布 `dist` | `packages/data/package.json`                                |

生成路径的事实：

- [`generate-static-effects.ts`](../../packages/data/scripts/generate-static-effects.ts)
  始终先运行 converter，再由 authoring 按 `key` / `optionId` / `supplementId`
  原位替换选中断言；二者语义不等价时拒绝生成。
- `authoring:verify` 比较的是 authoring 编译结果与已提交制品。converter 与 authoring
  的一致性只在重新生成时校验，且依赖固定的外部 ZZZ-HP 输入。
- 33 条 out-of-scope 的 `reason` 目前无法由作者层表达；迁入它们只会复制一段说明文字，
  不会生成可执行规则。
- 当前 authoring 已用更大的记录面覆盖约 10% 规则，继续扩大转录面的收益主要是
  重复维护，而不是新的消费能力。

## 3. 备选方案

| 方案                                       | 判断     | 理由                                                                                                   |
| ------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------ |
| converter 退出，authoring 成为唯一来源     | 不采用   | 需要迁移剩余 832 条规则、897 个选项与 33 条 out-of-scope，并重建来源证据、生成入口、回滚路径与消费验证 |
| 保持 converter，authoring 继续全量扩张     | 不采用   | 覆盖收益递减；作者层与转换器同步修改，增加双份维护和漂移面                                             |
| 保持 converter，authoring 冻结为独立断言层 | **采用** | 保留现有高风险条目的独立保护，不承担全量迁移成本，也不改变 0.5.0 的发布路径                            |
| 保持 converter，只迁 33 条 out-of-scope    | 不采用   | 只复制 `reason` 文本，不增加执行语义，也不减少 converter 职责                                          |

## 4. 决策

1. **converter 是正式 effects 三制品的唯一事实来源。** `convert.ts`、`supplements.ts`、
   `semantics.ts` 与相关机制登记继续维护全部规则、选项、变体与补充记录。
2. **authoring 是独立断言层，不是第二份主数据。** 它只覆盖已经证明需要具名保护的高风险条目，
   当前范围冻结在 99 条记录 / 89 个 option groups / 68 条 integrated 补充记录。
3. **停止按覆盖率扩张 authoring。** 新增作者记录必须说明它保护的具名不变量、漂移时的失败方式
   与对应负例；没有这些收益时只改 converter。
4. **33 条 out-of-scope 不迁入 authoring。** 不为了 101/101 的数字增加 `reason` 表达能力。
5. **authoring 不进入公开契约。** 脚本、类型与记录都不进入 npm `files`、exports 或
   core/data 运行时。
6. **P4-3 继续后置。** 目录根部 `mechanisms` envelope 仍等待第 5 个具名机制或第二个消费者。
7. **发布路径不变。** 0.5.0 仍按 converter + authoring 等价验证发布；本决策不改变制品、
   版本或计算契约。

规范表述见 [ZZZ-HP 静态增益数据接入 · 转换器与作者层边界](../specs/data/zzz-hp-static-effects.md#转换器与作者层边界)。

## 5. 后果

- 后续数据修正默认只改 converter 与其证据；不会再为每个新选项补一份 authoring 转录。
- `authoring:verify` 继续作为 CI 门禁，防止已断言条目漂移。
- 33 条 out-of-scope、剩余 832 条规则与 897 个选项继续由 converter 维护。
- 若将来确实需要 authoring 独立发布，必须先完成全量迁移设计，不能在当前覆盖面上直接切换。
- 当前工作重心可以转向 0.5.0 发布准备、converter 正确性与消费者能力，而不是继续扩大转录面。

## 6. 重新评估触发条件

出现以下任一情况时，重新开启“converter 是否退出”的决策：

1. 连续两个数据批次需要在不修改 converter 的前提下发布规则，例如固定来源不可用、许可限制
   或紧急修正。
2. converter 无法表达已确认的必要机制，而 authoring 已能表达，且连续两个批次受阻。
3. 出现第二个消费者，要求 authoring 记录作为可编辑输入或公开数据源。
4. 发布流程因 authoring 与 converter 漂移反复失败，双份维护成本超过全量迁移成本。

重新开启时必须同时给出全量规则迁移、来源证据归属、回滚路径与发布验证方案；不接受只迁移
一部分后把两个来源同时当作事实来源。

## 7. 明确不做

- 不迁移 33 条 out-of-scope 补充记录。
- 不为 authoring 增加 `reason` / `boundary` 表达。
- 不把 authoring 脚本加入 npm 包或公开 exports。
- 不改变三制品、`snapshotId`、publication/manifests 或计算契约。
- 不以此决策重启 P4-3、P4-5 或 Phase 3。

## 8. 验证

| 检查                 | 结果                                                  |
| -------------------- | ----------------------------------------------------- |
| 文档索引             | 已加入本决策记录                                      |
| 格式                 | `oxfmt --check` 通过                                  |
| 代码与制品           | 未修改                                                |
| 数据管理状态         | `phase: idle`；`indexSha256 d68ad1d8…` 与实际索引一致 |
| `pnpm check:quality` | 通过                                                  |
