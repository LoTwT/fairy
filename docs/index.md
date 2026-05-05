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

1. 以危局强袭战（Deadly Assault）为 V1 cleaned-data 主场景，优先产出 `@fairy/data/cleaned/deadly-assault`。
2. 保留 Excel 与 raw crawler source archive，但 V1 不要求全量清洗 Excel enemy；Excel enemy 作为后备 / V1.x 扩展源。
3. 米游社用于危局强袭战中文详情正文、3 个可选 buff、3 个 boss 房间机制文本、zh/en source-text 对照；buhflipexplode 用于 DA period / boss slot / buff / multiplier overlay 和英文源文本。
4. V1 golden fixture 真数据复算收窄到 20 个锚点；部位破坏与非 DA enemy 失衡恢复锚点推迟到 V1.x。

## 关键文档

- 命名策略：[architecture/naming-policy.md](architecture/naming-policy.md)
- Monorepo 开发指南：[architecture/monorepo-development.md](architecture/monorepo-development.md)
- Pending 术语表：[data-contract/pending-term-resolution-table.md](data-contract/pending-term-resolution-table.md)
- Cleaned schema spec：[data-contract/cleaned-schema-spec.md](data-contract/cleaned-schema-spec.md)
- Source metadata contract：[data-source/source-metadata-contract.md](data-source/source-metadata-contract.md)
- Robots / ToS check：[data-source/robots-tos-check.md](data-source/robots-tos-check.md)
- 米游社危局强袭战 source snapshot：[data-source/mihoyo/](data-source/mihoyo/)
- buhflipexplode 危局强袭战 source snapshot：[data-source/buhflipexplode/](data-source/buhflipexplode/)
