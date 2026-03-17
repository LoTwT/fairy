# 文档索引

当前仓库保留两条维护链路：`packages/zzz-data/scripts/crawl` 对应的原始数据抓取，以及 `packages/zzz-data/scripts/generate` 对应的 `.sources/source.xlsx -> data/xlsx` 读取与快照生成。`packages/zzz-data/.sources/source.xlsx` 是手动下载的本地输入，不纳入版本管理；`.sources/source.xlsx.metadata.json` 记录最近一次成功处理的哈希与时间。

- [AI 协作指南](./ai-guide.md) — Codex App 与 Claude Code 共享的项目说明、命令、工作流与文档维护规则
- [架构说明](./architecture.md) — 当前目录结构、抓取链路与数据落盘方式
- [依赖说明](./dependencies.md) — 当前保留的根目录与 `packages/zzz-data` 依赖
- [zzz-data README](../packages/zzz-data/README.md) — 抓取目标、xlsx 读取命令与数据目录说明
