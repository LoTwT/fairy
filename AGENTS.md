# zzz-data

Zenless Zone Zero 游戏数据包，从 `source.xlsx` 生成 JSON 数据，公开 TypeScript 类型手动维护。

进入仓库后，按下面顺序读取共享文档：

1. [docs/index.md](./docs/index.md)
2. [docs/ai-guide.md](./docs/ai-guide.md)

## Codex App 入口说明

- `AGENTS.md` 只保留 Codex 入口约定，项目知识以 `docs/` 为准
- `CLAUDE.md` 是 Claude Code 入口文件，与本文件共享同一套 `docs/` 内容
- 修改 `packages/zzz-agent` 前，先阅读共享的 Mastra skill：`./.agents/skills/mastra/SKILL.md`
- `.agents/` 用于存放仓库共享 skills，`.claude/` 用于 Claude Code 本地设置；不要在两边重复维护项目知识
