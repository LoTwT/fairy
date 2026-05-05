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

## S5 当前重点

1. 推进 `@fairy/data` Excel reader 与爬虫接入，保留 source metadata 并清洗为 GameData schema。
2. 先完成不阻塞 Excel 的 schema discovery、importer/crawler adapter skeleton、source metadata contract、robots/ToS 记录。
3. 等 lo-user Excel 到位后接入实际 reader / cleaning，并补齐 golden 所需数据。
4. 将 23 个 golden fixture schema-ready 锚点接入真实数据复算，作为 V1 发布 gate。

## 关键文档

- 命名策略：[architecture/naming-policy.md](architecture/naming-policy.md)
- Monorepo 开发指南：[architecture/monorepo-development.md](architecture/monorepo-development.md)
- Pending 术语表：[data-contract/pending-term-resolution-table.md](data-contract/pending-term-resolution-table.md)
- Source metadata contract：[data-source/source-metadata-contract.md](data-source/source-metadata-contract.md)
- Robots / ToS check：[data-source/robots-tos-check.md](data-source/robots-tos-check.md)
