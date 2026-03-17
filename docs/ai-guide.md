# AI 协作指南

本文档是 `Codex App` 与 `Claude Code` 共享的项目说明。当前仓库保留 ZZZ 原始数据抓取脚本，以及从 `packages/zzz-data/.sources/source.xlsx` 读取并生成 `data/xlsx` 的脚本；`.sources/source.xlsx` 是手动下载的本地输入，不纳入版本管理，`.sources/source.xlsx.metadata.json` 记录最近一次成功处理的哈希与时间。项目知识、命令、工作流统一维护在 `docs/`，根目录的 `AGENTS.md` 与 `CLAUDE.md` 只保留各自工具的入口约定。

## 关键命令

```bash
# zzz-data 子包命令（在 packages/zzz-data 下）
pnpm run generate              # 读取 .sources/source.xlsx，更新 metadata，并重新生成 data/xlsx/*.json 与 scripts/generate/types/*
pnpm run crawl                 # 运行全部抓取任务，重新生成 data/raw/**/*.json
pnpm run crawl:gachabase      # 只抓 gachabase 数据
pnpm run crawl:buhflipexplode # 只抓 buhflipexplode 数据
pnpm run crawl:mihoyo-wiki    # 只抓米游社百科危局强袭战数据

# 根目录命令
pnpm run generate              # 透传 zzz-data 的 xlsx 读取、metadata 更新与快照生成
pnpm run crawl                 # 透传 zzz-data 全量抓取
pnpm run crawl:gachabase      # 透传 zzz-data gachabase 抓取
pnpm run crawl:buhflipexplode # 透传 zzz-data buhflipexplode 抓取
pnpm run crawl:mihoyo-wiki    # 透传 zzz-data mihoyo-wiki 抓取
pnpm run lint --fix           # eslint 检查并自动修复
pnpm run prettier             # prettier 格式化
```

## 工作流

修改抓取脚本、xlsx 读取脚本或文档后，按下面顺序处理：

1. 先检查本次改动是否改变了目录结构、命令或运行说明；如有变化，先更新文档
2. `pnpm run lint --fix && pnpm run prettier`
3. 如果修改了抓取逻辑，运行对应的抓取命令；如果修改了 xlsx 读取逻辑，先确认最新下载的 `.sources/source.xlsx` 已就位，再运行 `pnpm run generate`；脚本会在成功后更新 `.sources/source.xlsx.metadata.json`，并重新生成 `packages/zzz-data/data/xlsx/` 与 `scripts/generate/types/` 下的产物；如果这轮不适合实际执行，在结论中明确说明未运行

## 文档维护规则

以下内容是 `Codex App` 与 `Claude Code` 的共享维护规则。

### 共享文档

- 新增或调整面向 AI 的共享说明时，更新 `docs/ai-guide.md`
- 新增文档或修改文档职责时，更新 `docs/index.md`
- 新增/删除/重命名脚本、目录或关键文件时，更新 `docs/architecture.md`
- 新增/删除依赖时，更新 `docs/dependencies.md`
- 修改抓取目标、xlsx 读取逻辑、输出目录或命令时，更新 `packages/zzz-data/README.md`
- 修改工作流步骤时，更新本文档中的「工作流」

### 工具专属入口

- 新增/调整 Codex 入口约定时，更新 `AGENTS.md`
- 新增/调整 Claude Code 入口约定时，更新 `CLAUDE.md`
- 新增/删除共享 skill 或修改其使用方式时，同时检查 `AGENTS.md`、`CLAUDE.md` 与 `.agents/skills/`
- 新增 Claude Code 本地权限或运行约定时，更新 `.claude/settings.local.json`，并在 `CLAUDE.md` 说明
