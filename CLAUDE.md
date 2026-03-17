# zzz-data

Zenless Zone Zero 数据抓取与 xlsx 读取仓库，当前保留 `packages/zzz-data/source.xlsx`、`packages/zzz-data/scripts/crawl` 与 `packages/zzz-data/scripts/generate`；`packages/zzz-data/data/` 当前被刻意清空，作为后续重构的最简起点。

进入仓库后，按下面顺序读取共享文档：

1. [docs/index.md](./docs/index.md)
2. [docs/ai-guide.md](./docs/ai-guide.md)

## Claude Code 入口说明

- `CLAUDE.md` 只保留 Claude Code 入口约定，项目知识以 `docs/` 为准
- `AGENTS.md` 是 Codex App 入口文件，与本文件共享同一套 `docs/` 内容
- Claude Code 的本地权限与运行设置位于 `./.claude/settings.local.json`
- 如需新增仓库共享 skill，放在 `.agents/`；`.claude/` 用于 Claude Code 本地设置；不要在两边重复维护项目知识
