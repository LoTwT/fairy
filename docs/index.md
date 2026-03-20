# 文档索引

当前仓库统一通过 `packages/zzz-data/scripts/sources` 管理四个数据源的同步：`xlsx` 负责 `.sources/source.xlsx -> data/source/xlsx/zh-CN` 与 `scripts/sources/xlsx/types` 产物更新，`gachabase` / `buhflipexplode` / `mihoyo-wiki` 负责远端 source 数据抓取与派生快照生成。`packages/zzz-data` 同时提供可发布的纯函数伤害计算核心，代码位于 `src/calculator/`；处理后 enemy 数据结构的目标规格位于 `docs/specs/enemy-data.md`；面向静态伤害计算的通用战斗语义快照结构由 `docs/specs/combat-semantics.md` 定义。`packages/zzz-data/.sources/source.xlsx` 是手动下载的本地输入，不纳入版本管理；`.sources/source.xlsx.metadata.json` 记录最近一次成功处理的哈希与时间。

- [AI 协作指南](./ai-guide.md) — Codex App 与 Claude Code 共享的项目说明、命令、工作流与文档维护规则
- [架构说明](./architecture.md) — 当前目录结构、抓取链路与数据落盘方式
- [依赖说明](./dependencies.md) — 当前保留的根目录与 `packages/zzz-data` 依赖
- [Damage Core Spec](./specs/damage-core.md) — 纯函数伤害计算核心 V1 的范围、公式、输入与测试约定
- [Combat Semantics Spec](./specs/combat-semantics.md) — 静态快照计算的通用语义结构，定义 panel / snapshot 的边界
- [Enemy Data Spec](./specs/enemy-data.md) — `data/enemy/` 的目录、文件结构与字段约定
- [zzz-data README](../packages/zzz-data/README.md) — 抓取目标、xlsx 读取命令与数据目录说明
