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

## S4 / S5 当前重点

1. 落地 `@fairy/cli` JSON-only 命令壳，覆盖 `calc` / `compare` / `scan` / `explain` / `migrate`。
2. CLI 通过 `@fairy/core` 固定格式入口输出三档伤害、逐乘区 trace 与中英 diagnostic。
3. 推进 `@fairy/data` Excel reader 与爬虫接入，保留 source metadata 并清洗为 GameData schema。
4. 将 23 个 golden fixture schema-ready 锚点接入真实数据复算，作为 V1 发布 gate。

## 关键文档

- 命名策略：[architecture/naming-policy.md](architecture/naming-policy.md)
- Monorepo 开发指南：[architecture/monorepo-development.md](architecture/monorepo-development.md)
- Pending 术语表：[data-contract/pending-term-resolution-table.md](data-contract/pending-term-resolution-table.md)
