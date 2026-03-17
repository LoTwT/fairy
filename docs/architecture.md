# 架构说明

## 仓库级 AI 协作文件

当前仓库维护两条数据输入链路：原始数据抓取，以及 `.sources/source.xlsx -> data/xlsx` 的快照生成。`packages/zzz-data/.sources/source.xlsx` 是手动下载的本地 xlsx 输入，不纳入版本管理；`.sources/source.xlsx.metadata.json` 记录最近一次成功处理的哈希与时间。运行入口、输出目录和数据源说明以 `packages/zzz-data/README.md`、`packages/zzz-data/scripts/crawl/` 与 `packages/zzz-data/scripts/generate/` 为准。

```
.
├── docs/
│   ├── index.md           # 文档索引
│   ├── ai-guide.md        # Codex App 与 Claude Code 共享说明
│   └── dependencies.md    # 当前依赖说明
├── AGENTS.md              # Codex App 入口文件（薄入口，指向 docs/）
├── CLAUDE.md              # Claude Code 入口文件（薄入口，指向 docs/）
└── .claude/               # Claude Code 本地设置
```

约定：

- 项目知识、命令、工作流统一维护在 `docs/`
- `AGENTS.md` 与 `CLAUDE.md` 只保留工具专属入口约定，避免双份维护
- 如果后续重新引入仓库共享 skill，优先放在 `.agents/skills/`，由两个工具共同引用
- Claude Code 的权限或本地运行设置放在 `.claude/`

## 项目结构

```
packages/zzz-data/
├── .sources/
│   ├── source.xlsx              # 手动下载的本地 xlsx 输入（gitignored）
│   └── source.xlsx.metadata.json # 最近一次成功处理的 sha256 / processedAt
├── data/
│   ├── xlsx/                    # generate 生成的快照 JSON
│   └── raw/                     # crawl 按需生成的原始抓取数据
├── scripts/generate/
│   ├── index.ts                 # 主入口：读取 .sources/source.xlsx，更新 metadata，并写入 data/xlsx/
│   ├── config.ts                # worksheet 到字段映射的 source of truth
│   └── types/                   # 由 generate 脚本同步产出的内部类型
├── scripts/crawl/
│   ├── index.ts                 # 主入口：按任务列表顺序抓取并写入 data/raw/
│   ├── shared.ts                # fetch / playwright / batching / SvelteKit data 解码工具
│   ├── gachabase.ts             # gachabase 列表页与详情页抓取
│   ├── buhflipexplode.ts        # buhflipexplode JSON 端点抓取
│   └── mihoyo-wiki.ts           # 米游社百科危局强袭战抓取
├── README.md                    # 抓取与 xlsx 读取说明
├── package.json                 # crawl / generate 命令与依赖
└── tsconfig.json                # 覆盖 crawl / generate 脚本的 TypeScript 配置
```

## 抓取链路

`scripts/crawl/index.ts` 会聚合三个来源的任务列表，逐个抓取并将结果写到 `data/raw/<task-name>.json`：

1. `gachabase.ts`
   - 抓取 `https://zzz.gachabase.net`
   - 覆盖 `en` / `zh-CN`
   - 负责代理人、音擎、邦布、驱动盘列表与详情页原始结构抽取
2. `buhflipexplode.ts`
   - 抓取 `https://www.buhflipexplode.org`
   - 当前只保留 `en`
   - 直接消费其公开 JSON 端点
3. `mihoyo-wiki.ts`
   - 抓取米游社百科危局强袭战条目
   - 当前只保留 `zh-CN`
   - 通过列表接口 + 详情接口拼装百科原始条目

执行抓取时，`scripts/crawl/index.ts` 会先将本次任务集合写入临时目录；只有全部任务成功后，才替换对应的 `data/raw/<lang>/<source>/` 目录。这样既能清理任务重命名或删减后的旧文件，也不会在中途失败时丢掉上一份可用快照。

## xlsx 读取链路

`scripts/generate/index.ts` 会读取 `.sources/source.xlsx`，按 `scripts/generate/config.ts` 中的 worksheet 配置导出，并在成功后更新 `.sources/source.xlsx.metadata.json`：

- `data/xlsx/*.json`：每个工作表对应的快照 JSON
- `scripts/generate/types/*`：按 worksheet 结构同步生成的内部类型

## 当前边界

- 已删除 `merge`、`src/`、`tests/`、`dist/`、发布相关配置和所有对外 API / 计算能力
- 当前仓库不再维护公开 TypeScript API、构筑解析、伤害计算、cleaned helper 或 npm 发布产物
- 如需扩展当前仓库，只在两条链路内变更：`scripts/crawl` / `data/raw`，以及 `scripts/generate` / `.sources/source.xlsx` / `.sources/source.xlsx.metadata.json` / `data/xlsx`
