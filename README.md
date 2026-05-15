# Fairy

Fairy is a Zenless Zone Zero static snapshot damage calculator.

V1 focuses on a TypeScript monorepo with three packages:

- `@randomplay/data`: official-release data ingestion, cleaning, and queryable game data.
- `@randomplay/core`: pure calculation functions and traceable multiplier breakdowns.
- `@randomplay/cli`: JSON-only command-line access to `@randomplay/core`.

Start with [docs/index.md](docs/index.md).

## V1 Release Gate Status

V1 has passed lo-user single-person dogfooding with an overall 4/5 score and
zero unresolved B-Calc blockers. It has not gone through broad community
dogfooding yet.

Use [docs/getting-started.md](docs/getting-started.md) for the repo-local
dogfooding flow and executable examples.

`fairy calc` defaults to `--view brief`, which returns summary-first non-crit
and crit lanes. The dogfooding Anby fixture is covered by the `@randomplay/cli` test
suite and remains part of the fixed `pnpm test` verification chain.

## Development

Fairy uses pnpm workspaces. See [docs/architecture/monorepo-development.md](docs/architecture/monorepo-development.md) for package boundaries, dependency rules, verification commands, and PR workflow.

## 数据来源声明 / Data Sources

`@randomplay/data` 汇总和清洗了来自 nanoka 等公开来源的 ZZZ 游戏内数值规则数据，用于本地伤害计算用途。V0.1.0 runtime 数据派生自正式服已发布内容，并锁定 `manifest.zzz.live` 对应的 nanoka 版本；当前 main 已累积全邦布与全角色 batch import，尚未额外发包。

来源详情见 [data/source-registry.json](data/source-registry.json)。Runtime cleaned 数据保留 `sourceId`、`sourceVersion`、`sourceAnchor` 等追溯字段；Excel、米游社 D-17、buhflipexplode D-12 raw snapshots 仅作为 archived audit reference 保留，不再作为 runtime source。

本项目不是 HoYoverse / miHoYo 官方项目。游戏数据、文本与图像等权利归其各自权利人所有。如有侵权，请通过 GitHub issue 联系维护者删除；我们会在收到请求后 24-72 小时内响应。
