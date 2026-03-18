# 架构说明

## 仓库级 AI 协作文件

当前仓库统一通过 `scripts/sources/` 管理四个数据源同步：`xlsx` 负责 `.sources/source.xlsx -> data/xlsx` 与 `scripts/sources/xlsx/types` 的快照生成，`gachabase`、`buhflipexplode`、`mihoyo-wiki` 负责远端原始数据抓取与派生快照更新。`packages/zzz-data/.sources/source.xlsx` 是手动下载的本地 xlsx 输入，不纳入版本管理；`.sources/source.xlsx.metadata.json` 记录最近一次成功处理的哈希与时间。运行入口、输出目录和数据源说明以 `packages/zzz-data/README.md` 与 `packages/zzz-data/scripts/sources/` 为准。

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
│   ├── xlsx/                    # sync:xlsx 生成的快照 JSON
│   └── raw/                     # 远端数据源同步生成的原始抓取数据
├── scripts/
│   └── sources/
│       ├── index.ts             # 主入口：按 source 名称调度 sync
│       ├── shared.ts            # fetch / playwright / batching / SvelteKit data 解码工具
│       ├── xlsx/
│       │   ├── index.ts         # 读取 .sources/source.xlsx，更新 metadata，并写入 data/xlsx/
│       │   ├── config.ts        # worksheet 到字段映射的 source of truth
│       │   └── types/           # 由 sync:xlsx 同步产出的内部类型
│       ├── gachabase.ts         # gachabase 列表页与详情页抓取
│       ├── buhflipexplode.ts    # buhflipexplode JSON 端点抓取
│       ├── buhflipexplode-deadly-assault.ts # Deadly Assault 页面派生规则
│       └── mihoyo-wiki.ts       # 米游社百科危局强袭战抓取
├── README.md                    # 抓取与 xlsx 读取说明
├── package.json                 # sync 命令与依赖
└── tsconfig.json                # 覆盖 sources 脚本的 TypeScript 配置
```

## 远端数据源同步链路

`scripts/sources/index.ts` 在运行远端数据源同步时，会聚合三个来源的任务列表，逐个抓取并将结果写到 `data/raw/<task-name>.json`：

1. `gachabase.ts`
   - 抓取 `https://zzz.gachabase.net`
   - 覆盖 `en` / `zh-CN`
   - 负责代理人、音擎、邦布、驱动盘列表与详情页原始结构抽取
2. `buhflipexplode.ts`
   - 抓取 `https://www.buhflipexplode.org`
   - 当前只保留 `en`
   - 直接消费其公开 JSON 端点
   - 抓取完成后，会基于 `deadly-assault.json`、`enemies.json` 与 `buffs.json` 复算 `Deadly Assault` 页面展示数值，并额外产出 `data/raw/en/buhflipexplode/deadly-assault-page-data.json`
3. `mihoyo-wiki.ts`
   - 抓取米游社百科危局强袭战条目
   - 当前只保留 `zh-CN`
   - 通过列表接口 + 详情接口拼装百科原始条目

执行远端同步时，`scripts/sources/index.ts` 会先将本次任务集合写入临时目录；只有全部任务成功后，才替换对应的 `data/raw/<lang>/<source>/` 目录。这样既能清理任务重命名或删减后的旧文件，也不会在中途失败时丢掉上一份可用快照。

## xlsx 读取链路

`scripts/sources/xlsx/index.ts` 会读取 `.sources/source.xlsx`，按 `scripts/sources/xlsx/config.ts` 中的 worksheet 配置导出，并在成功后更新 `.sources/source.xlsx.metadata.json`：

- `data/xlsx/*.json`：每个工作表对应的快照 JSON
- `scripts/sources/xlsx/types/*`：按 worksheet 结构同步生成的内部类型

## 当前边界

- 已删除 `merge`、`src/`、`tests/`、`dist/`、发布相关配置和所有对外 API / 计算能力
- 当前仓库不再维护公开 TypeScript API、构筑解析、伤害计算、cleaned helper 或 npm 发布产物
- 如需扩展当前仓库，只在 `scripts/sources` 内新增或调整数据源同步逻辑，并保持 `.sources/source.xlsx` / `.sources/source.xlsx.metadata.json` / `data/xlsx` / `data/raw` / `scripts/sources/xlsx/types` 这几类输入输出约定一致
