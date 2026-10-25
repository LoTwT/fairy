# Phase 2 P2-4b-lite：首条真实补充记录迁移

状态：已合并 #301（squash merge `0d94fadd`）。基线为 `origin/main@9a53591b`（P2-4a 与 `optionId` follow-up 已合并），迁移分支为 `data/phase2-miyabi-supplement-authoring`。本批只把 1 条真实 `supplementalRecords` 从 converter 基线迁入作者层，证明 P2-4a 的端到端替换路径可用；不扩大作者层覆盖，不改 converter，也不改任何正式制品。

## 范围

- 只在 `miyabi-frostburn-main` 记录上声明 `supplementalRecords`，声明值逐字段复制当前 `packages/data/definitions/effects/static-coverage.json` 的真实条目。
- `miyabi-frostburn-m4` 不重复声明同一 `supplementId`；该补充记录的 `effectIds` 已同时覆盖核心被动独立结算与影画 4 增伤两条规则。
- 不修改 `packages/data/scripts/static-effects/convert.ts`、`packages/data/definitions/effects/*`、`packages/data/integrated/*`、`packages/data/dist/*`、`snapshotId`、publication/manifests、公开 exports 或 core/shared 运行时。
- 不迁移其余 67 条 integrated 补充记录，也不迁移 33 条带 `reason` 的 out-of-scope 记录。

## 唯一记录

[`records.ts`](../../../packages/data/scripts/static-effects/authoring/records.ts) 的 `MIYABI_FROSTBURN_SUPPLEMENT` 与 `miyabi-frostburn-main` 声明：

```json
{
  "supplementId": "nanoka:agents:miyabi:frostburn-break-damage",
  "source": "nanoka-integrated@3.3.12+19634983 agents/1091 /passive/level/1091501—1091507/desc/0 + /talent/4/desc",
  "kind": "option",
  "optionId": "nanoka:agents:miyabi:frostburn-break-damage",
  "effectIds": [
    "agent:1091:nanoka:frostburn-break-damage:mindscape:0",
    "agent:1091:nanoka:m4-rupture-frostburn-break-bonus:mindscape:4"
  ],
  "supportedRanks": "核心 1—7；影画 0—6",
  "computationTarget": "catalog option on the mapped agent entity",
  "status": "integrated"
}
```

作者记录只声明一次；编译按 `supplementId` 原位替换，沿用基线条目的键序。`optionId` 与所属记录的 `ids.optionId` 相同，满足 P2-4a 的归属校验。

## 预期与字节结果

作者值与正式基线逐字段一致，因此替换后三制品应与 converter 基线逐字节相同。`authoring:verify` 实测：

```text
Migrated authoring records: 19 records
Compiled: rules: 19, options: 17, coverage positions: 15, skill targets: 2, supplemental records: 1
Semantic comparison: PASS (0 differences)
Byte comparison: PASS
```

| 文件                   | SHA-256                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `static.json`          | `3a30bd0e5e5bc8fc2087163da1fc5e857cbca71ccc1bf2bf8c3b2777193ce823` |
| `static-catalog.json`  | `c8455d57b00a0329da50841e4d1a0bcc7e35bc28fd2b4319520dba01ab1c670c` |
| `static-coverage.json` | `6cb0457f6a3456a23b82439d064f092825949a8fa71be0500aea025cd6ce2c5b` |

`snapshotId` 保持 `sha256:02398d0fc76b4eed4bd7aaccd1370f8c161b5331266a0442c1f54ee67668f03c`。`git diff --stat origin/main -- packages/data/definitions packages/data/integrated packages/data/dist` 无输出，正式制品、publication/manifests 与公开 exports 均未变化。

## 测试调整

- [`static-effects-authoring-migration.test.ts`](../../../packages/data/test/static-effects-authoring-migration.test.ts)：`supplementalRecordIds` 现为该 `supplementId`，摘要为 `supplemental records: 1`；“未选中条目不变”改为排除已声明补充记录后逐条比较，其余 100 条保持基线值。
- [`static-effects-authoring-supplemental.test.ts`](../../../packages/data/test/static-effects-authoring-supplemental.test.ts)：新增真实记录用例，断言 19 条作者记录恰好声明 1 条补充记录、挂在 `miyabi-frostburn-main` 上，并与基线条目逐字段及键序一致；“未声明时不变”用例改为先从克隆记录移除声明再断言。
- 定向套件 3 个文件、44 个用例通过（18 试点 + 13 迁移 + 13 补充记录）；除“未声明时不变”用例预期计数为 0 外，未发现其他硬编码 `supplemental records: 0` 或 `supplementalRecordIds: []` 断言。

## 验证结果

| 命令                                                                                                   | 实际结果                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data authoring:verify`                                                      | 19 records；19 rules、17 options、15 coverage positions、2 skill targets、**supplemental records: 1**；0 differences；字节一致。                         |
| 定向 `static-effects-authoring*` 测试                                                                  | 3 个文件、44 个测试通过。                                                                                                                                |
| `pnpm --filter @randomplay/data typecheck`                                                             | 通过。                                                                                                                                                   |
| `pnpm --filter @randomplay/data check:source`                                                          | 108 个测试文件、4,710 个测试通过。首次运行有 1 个无关的 `panel-attributes-publication` integration 用例 30 秒超时；单独重跑与第二次全量均通过。          |
| `pnpm --filter @randomplay/core check:source`                                                          | 98 个测试文件通过、3 个跳过；5,684 个测试通过、24 个跳过。clean worktree 先执行 `pnpm --filter @randomplay/core build` 生成 spec 类型导入所需的 `dist`。 |
| `pnpm check:quality`                                                                                   | 通过；oxlint 0 errors（既有 127 warnings），oxfmt 与 spec 类型检查通过。                                                                                 |
| `pnpm --filter @randomplay/data verify:pack`                                                           | 2 个打包测试通过。                                                                                                                                       |
| `git diff --stat origin/main -- packages/data/definitions packages/data/integrated packages/data/dist` | 无输出。                                                                                                                                                 |

## 数据管理

worktree 没有 `packages/data/.integrated.fairy-state`，属于静态工作区，不创建管理记录。主工作区 `/Users/caoyujie/codes/fairy` 执行 `pnpm --filter @randomplay/data verify:nanoka:current integrated`，返回 `verified: true`；`state.json` 为 `phase: idle`，`current.indexSha256` 为 `d68ad1d80b203b9633f2cd6d176e4051c15c52f2ea3c0d71a2d2310c8b1a1b6d`，与 `integrated/index.json` 的实际 SHA-256 一致。正式制品未变，因此未改写管理记录。

## 未迁移范围与限制

- 正式 `supplementalRecords` 共 101 条：68 条 `integrated`、33 条 `out-of-scope`。当前 17 个作者选项只与 1 条 integrated 记录按 `optionId` 对应，本批只迁移这一条；其余 67 条 integrated 仍由 converter 生成。
- 33 条 out-of-scope 记录都携带 `reason`，作者层当前不表达该字段，因此不能被替换；`boundary` 在正式读取类型中允许缺省 `optionId` / `supportedRanks`，但作者形状仍要求二者必填。`replaceSupplementalRecords` 遇到无法表达的字段会明确拒绝，不会静默丢弃。
- 补充记录只能挂在同一 `optionId` 的作者记录上；没有对应作者选项的补充记录无法声明。`effectIds` 只校验存在性，不校验是否属于同一选项或与规则状态一致。
- 本批不扩大 19 条作者记录、不新增作者类型或机制；扩大覆盖需要先为记录所属选项补作者记录，并单独设计 `reason` / `boundary` 的作者化表达。

## 明确不改

`packages/data/scripts/static-effects/convert.ts`、`packages/data/definitions/effects/*`、`packages/data/integrated/*`、`packages/data/dist/*`、`snapshotId`、publication/manifests、公开 exports 与 core/shared 运行时均保持原样。正式生成仍先由 converter 产生基线，再由作者层按 `supplementId` 原位替换；本批替换值与基线逐字段一致，所以三制品字节不变。

## 后续状态

[P2-4c](phase2-supplement-authoring-batch.md) 已把另外 23 条已有作者选项的 `integrated`
补充记录迁入作者层；[P2-4d](phase2-w-engine-supplement-authoring.md) 又把 16 条音擎
选项纳入作者层，[P2-4e](phase2-agent-supplement-authoring.md) 又纳入 10 条单变体
代理人/驱动盘选项，[P2-4f](phase2-multi-variant-supplement-authoring.md) 又纳入 5 个
多 variant 选项，[P2-4g](phase2-roxy-supplement-authoring.md) 又纳入 8 条洛克茜
单规则选项，[P2-4h](phase2-multi-rule-supplement-authoring.md) 又纳入洛克茜初始
回能转化，[P2-4i](phase2-special-operation-supplement-authoring.md) 又补齐最后
4 条专用结算。**integrated 补充记录已达到 68/68 全部作者化**；33 条 out-of-scope
记录仍由 converter 维护。本页的“67 条剩余”与“1 条已迁移”保留 P2-4b-lite 当时事实。
