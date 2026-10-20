# 上游测试用例迁移复核

状态：2026-10-20 完成首轮筛选、迁移与验证；改动尚未提交。

本轮从 ZZZ-HP 与 ZZZ Calculator 的既有测试中筛选可迁移场景，并用 Fairy 当前固定快照复跑。
目标是补充回归覆盖，不把另一计算器的实现直接当作游戏真值，也不据此改写 Fairy 生产数据或公式。

## 固定版本与范围

| 项目             | 本次检查版本／位置                                                                    |
| ---------------- | ------------------------------------------------------------------------------------- |
| Fairy            | 起点 `fa934988`；当前审阅分支 `test/upstream-test-backport`，仅修改 core 测试与本文档 |
| ZZZ-HP 本地 HEAD | `7a4f2776bf4a44cb108fcd7f5834f63606ade914`                                            |
| ZZZ-HP 数据快照  | Fairy 仍固定 `fac62407f3d3995f8200a66be0038f292b1455fa`                               |
| ZZZ Calculator   | `da6a8c08bcc447c49da2bbb657891ded6dfa11d6`，只读副本                                  |
| 执行环境         | Node `24.21.0`、pnpm `11.13.1`、Vitest `4.1.10`                                       |

ZZZ-HP 的选定脚本与 ZZZ Calculator 的相关脚本均已实际执行；下游 Fairy 用例只依赖仓库内快照与夹具，不访问上游仓库。

## 已迁移与补充的用例

本轮新增 20 个测试用例，其中扩展 2 个既有表格各 2 行。

| Fairy 文件与用例                                                    | 上游依据                                                                                           | 性质     |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------- |
| `static-catalog.test.ts`：紊乱倍率增量作用于完整准备区              | ZZZ-HP `scripts/test-mult-factor-zone.mjs:90-104`、`:139-159` 与 `src/utils/damageCalc.ts:832-871` | 迁移     |
| `static-damage.test.ts`：异常暴击率超过 100% 时截断为必暴           | ZZZ Calculator `tests/anomaly-crit-modes.test.js:15-31`                                            | 迁移     |
| `static-catalog-data.test.ts`：Sunna 6 影攻击转暴伤曲线             | ZZZ-HP `scripts/test-buff-conversions.mjs:52-64`                                                   | 迁移     |
| `static-catalog-data.test.ts`：Sunna 核心加帷幕最终攻击             | ZZZ-HP `scripts/test-buff-conversions.mjs:66-75`                                                   | 迁移     |
| `static-catalog-data.test.ts`：Cissia 核心加 1 影能量回复转减防曲线 | ZZZ-HP `scripts/test-buff-conversions.mjs:112-125`                                                 | 迁移     |
| `static-catalog-data.test.ts`：血髓秘匣 5 精炼暴击率转增伤及上限    | ZZZ-HP `scripts/test-buff-conversions.mjs:126-139`                                                 | 迁移     |
| `static-catalog-data.test.ts`：简核心加 5 秒紊乱时长                | ZZZ Calculator `tests/jane-damage.test.js:128-129`                                                 | 迁移     |
| `static-catalog-data.test.ts`：柚叶 6 影紊乱基础倍率按层叠加        | ZZZ-HP 固定快照 `agent:1411...mindscape:6` 规则核对                                                | 补充覆盖 |
| `static-catalog-data.test.ts`：克拉蕾 2 影只对电属性忽略抗性        | ZZZ-HP 固定快照 `agent:1611...mindscape:2` 规则核对                                                | 补充覆盖 |

具体断言：

- 紊乱标准倍率：10 秒基础时长、已过 1 秒、额外 `+50%`，断言 `(4.5 + 9 × 0.075) × 1.5 = 7.7625`。
- 异常暴击：暴击率 `1.2` 时有效暴击率截断为 `1`，期望／非暴击与暴击／非暴击均为 `1.5`。
- Sunna：6 影输入 `0/1000/2000/3500/4000`，并校验读取初始攻击而非当前攻击；核心加帷幕基础攻击 1000 时最终攻击 `0→1050`、`3000→1950`、`3500/4000/5000→2100`。
- Cissia：能量回复 `1.3→0.084`、`2.6→0.224`、`3.68/4/10→0.35`。
- 血髓秘匣：`1.013→0.0104`、`2→0.4`；5 精炼转化率 `0.8`、上限 `0.4`。
- 简：紊乱标准倍率从 `5.25` 提升到 `5.625`。
- 柚叶：1 层贡献 `1.05`、最终倍率 `6.3`；3 层贡献 `3.15`、最终倍率 `8.4`；直伤不生效。
- 克拉蕾：电属性抗性区 `1.18`，火属性保持 `1`。

## ZZZ-HP 检查结论

未确认 ZZZ-HP 的产品缺陷。本轮选中的 ZZZ-HP 脚本均通过，包括
`test-defense-zone-clamp`（21）、`test-mult-factor-zone`（25）、`test-formula-align-compare`（25）、
`test-sharpen-crit`（44）、`test-release-mult`（2）、`test-buff-conversions`（129）、
`test-skill-talent-levels` 与 `test-effect-model`（21）。

`test-damage-zone-routing.mjs` 的第 1—5 节通过，第 6 节在干净 checkout 下会因缺少仓库外方案库
fixture 而中止；脚本支持 `ZZZ_SCHEME_FILE` 与 `ZZZ_DEV_ROOT` 覆盖。这是**测试可复现性问题，
不是计算错误或产品缺陷**：CI 若要运行该节，需要显式提供 fixture 或跳过。

本地 ZZZ-HP HEAD 比 Fairy 固定快照新，增益数据存在预期漂移。已核对的具体差异是
Sunna 核心与 Cissia 1 影转换的 `panelSource` 从 `manual` 变为 `external`；Fairy 仍使用固定快照，
本次没有把新数据同步进 Fairy，也没有因此修改规则。

## 未迁移的跨实现差异

以下差异来自 ZZZ Calculator 与 Fairy 的对照，不是 ZZZ-HP 缺陷；没有游戏或官方表裁定前，
不把它们编码为“哪一方正确”的回归断言。

| 项目       | ZZZ Calculator                                                                                  | Fairy 当前行为                     |
| ---------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- |
| 简 1 影    | 异常精通超过 `120` 后按超出部分计算增伤                                                         | 阈值使用 `0`                       |
| 简 2 影    | 防御无视只作用于强击，感电与直伤为 `0`                                                          | 防御无视作用域覆盖直伤、异常与紊乱 |
| 简 4 影    | 只提升属性异常伤害，紊乱倍率保持 `1`                                                            | 存在紊乱增伤                       |
| 橘福福核心 | 每超过 2 点攻击 +0.1%（`floor((攻击 - 2800) / 2) × 0.1%`），基础 20%，如 2850→22.5%、2852→22.6% | 连续 `0.05%/点`                    |

这些项目需要先确定 Fairy 的公开输入契约对应哪一层，再由独立来源或游戏证据裁定。
在此之前，现有测试只覆盖双方都已确认的边界，不把差异伪装成一致性。

另有一项简核心作用域待裁定：规则的 `when` 只按 `hit.damageKind` 判定，
但目录变体的 `applicability.beneficiaryElements` 限定为 `physical`，因此火属性原异常不会获得 `+5 秒`。
Nanoka 原文只描述强击／畏缩，物理异常种类是否都应获得加成仍未裁定；本轮测试只覆盖物理紊乱。

## 验证记录

- 目标文件全量：`static-catalog.test.ts`、`static-catalog-data.test.ts`、`static-damage.test.ts` 共 1,587 项通过。
- Core 类型检查：`pnpm --filter @randomplay/core typecheck` 通过。
- 全仓：`pnpm check` 通过。Core 96 个文件、5,286 项；data 100 个文件、4,733 项；另含两包打包消费验收与质量检查。
- `pnpm format:check` 通过。
- ZZZ Calculator `tests/anomaly-crit-modes.test.js`、`tests/jane-damage.test.js` 直接执行通过。
- 本次只修改 core 测试文件与本文档，未修改生产代码、正式数据、Nanoka `integrated` 或数据管理状态。
- 改动尚未提交，当前位于 `test/upstream-test-backport` 分支。
