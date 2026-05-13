# Fairy 文档导航

Fairy 是绝区零 1-3 代理人静态快照伤害计算器。V1 目标是 `@randomplay/data`、`@randomplay/core`、`@randomplay/cli`，Web UI 与 AI plugin 后置。

## 快速入口

- V1 dogfooding 上手：[getting-started.md](getting-started.md)
- 项目范围与里程碑：[product/v2.0.md](product/v2.0.md)
- 术语权威：[glossary/glossary.md](glossary/glossary.md)
- 数据契约：[data-contract/](data-contract/)
- 架构与工程：[architecture/](architecture/)
- 数据来源：[data-source/](data-source/)
- 发布流程：[release/README.md](release/README.md)
- QA 策略：[qa/](qa/)
- UX 文案与场景：[ux/](ux/)

## V1 release gate 当前重点

1. lo-user 单人 dogfooding 已给出 4/5，B-Calc blocker 当前为 0；V1 仍未经过广泛社区 dogfooding。
2. V1 golden fixture 真数据复算最初收窄到 19 个锚点；V1.x Track B 已补 G18 部位破坏真实伤害与 G13 异常阈值规则组合，G19/G20 失衡恢复时间仍推迟到后续 V1.x。
3. `data/cleaned/audit/v1-agent-source-candidates.json`、`data/cleaned/audit/*.acceptance.json` 与 `data/cleaned/golden/v1-replay-report.json` 已生成；21 个 executable 锚点全部跑通，`releaseReady=true`，G19/G20 仍作为 V1.x deferred 可见。
4. `fairy calc` 默认 `--view brief`，输出 summary-first 的 non-crit / crit lanes；完整 trace 通过 `--view verbose` 查看。
5. 安比 dogfooding fixture `examples/snapshots/dogfood-anby-core-f-basic16-dullahan-9528.json` 已进入 `packages/cli/src/examples.test.ts`，因此由根命令 `pnpm test` 固定覆盖。
6. v0.0.1 已发布；后续 release 流程跟随 canonical v3 runbook（见
   [release/README.md](release/README.md)），由 tag-triggered OIDC CI 发布。

## 关键文档

- 命名策略：[architecture/naming-policy.md](architecture/naming-policy.md)
- Monorepo 开发指南：[architecture/monorepo-development.md](architecture/monorepo-development.md)
- Pending 术语表：[data-contract/pending-term-resolution-table.md](data-contract/pending-term-resolution-table.md)
- Cleaned schema spec：[data-contract/cleaned-schema-spec.md](data-contract/cleaned-schema-spec.md)
- Source metadata contract：[data-source/source-metadata-contract.md](data-source/source-metadata-contract.md)
- Robots / ToS check：[data-source/robots-tos-check.md](data-source/robots-tos-check.md)
- Excel workbook source audit：[data-source/excel/](data-source/excel/)
- 米游社危局强袭战 source snapshot：[data-source/mihoyo/](data-source/mihoyo/)
- buhflipexplode 危局强袭战 source snapshot：[data-source/buhflipexplode/](data-source/buhflipexplode/)
- V1 golden source coverage：[qa/golden-source-coverage.md](qa/golden-source-coverage.md)
- Release workflow：[release/README.md](release/README.md)
- Starter scenarios narrative：[ux/starter-scenarios.md](ux/starter-scenarios.md)
