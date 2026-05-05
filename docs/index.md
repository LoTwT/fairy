# Fairy 文档导航

Fairy 是绝区零 1-3 代理人静态快照伤害计算器。V1 目标是 `@fairy/data`、`@fairy/core`、`@fairy/cli`，Web UI 与 AI plugin 后置。

## 快速入口

- 项目范围与里程碑：[product/v2.0.md](product/v2.0.md)
- 术语权威：[glossary/glossary.md](glossary/glossary.md)
- 数据契约：[data-contract/](data-contract/)
- 架构与工程：[architecture/](architecture/)
- 数据来源：[data-source/](data-source/)
- QA 策略：[qa/](qa/)
- UX 文案与场景：[ux/](ux/)

## S3 当前重点

1. 落地 `@fairy/core` runtime schema、validators 与黄金 fixture 接入。
2. 实现核心公式与逐乘区 trace，包括常规 / 贯穿 / 真实伤害 / 异常 / 紊乱 / 失衡值。
3. 实现 handler registry、Condition DSL 与 source/provenance/版本双路径硬契约。
4. 并行推进 `@fairy/data` scraper 骨架与 monorepo 开发指南。

## 关键文档

- 命名策略：[architecture/naming-policy.md](architecture/naming-policy.md)
- Monorepo 开发指南：[architecture/monorepo-development.md](architecture/monorepo-development.md)
- Pending 术语表：[data-contract/pending-term-resolution-table.md](data-contract/pending-term-resolution-table.md)
