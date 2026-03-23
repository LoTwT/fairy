# 架构说明

## 仓库级 AI 协作文件

当前仓库统一通过 `scripts/sources/` 管理四个数据源同步：`xlsx` 负责 `.sources/source.xlsx -> data/source/xlsx/zh-CN` 与 `scripts/sources/xlsx/types` 的快照生成，`gachabase`、`buhflipexplode`、`mihoyo-wiki` 负责远端 source 数据抓取与派生快照更新。同时，`packages/zzz-data/src/calculator/` 提供可发布的纯函数伤害计算核心，规格文档位于 `docs/specs/damage-core.md`；战斗相关共享属性键与数值语义由 `docs/specs/shared-combat-types.md` 定义；静态伤害计算上游的通用战斗语义结构由 `docs/specs/combat-semantics.md` 定义，当前以 `effects` 为真源、`panel / extras` 为结算视图；处理后 `enemy` 数据结构的目标规格位于 `docs/specs/enemy-data.md`。`packages/zzz-data/.sources/source.xlsx` 是手动下载的本地 xlsx 输入，不纳入版本管理；`.sources/source.xlsx.metadata.json` 记录最近一次成功处理的哈希与时间。运行入口、输出目录和数据源说明以 `packages/zzz-data/README.md`、`packages/zzz-data/scripts/sources/` 与 `docs/specs/` 为准。

```
.
├── docs/
│   ├── index.md           # 文档索引
│   ├── ai-guide.md        # Codex App 与 Claude Code 共享说明
│   ├── dependencies.md    # 当前依赖说明
│   └── specs/
│       ├── damage-core.md # 伤害计算核心规格
│       ├── shared-combat-types.md # 战斗相关共享属性键与数值语义
│       ├── combat-semantics.md # 静态伤害计算的通用语义与最终输入结构规格
│       └── enemy-data.md  # enemy 处理后数据结构规格
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
│   ├── source/                  # 按 source / locale 组织的输出快照
│   └── enemy/                   # 按 enemy-data 规格生成的处理后 enemy 数据
├── src/
│   ├── calculator/
│   │   ├── display.ts           # 展示用取整 helper
│   │   ├── factors.ts           # 各乘区纯函数
│   │   ├── index.ts             # calculator 导出
│   │   ├── resolved.ts          # 常规 / sheer resolved core
│   │   └── types.ts             # 对外公开的 calculator 类型
│   └── index.ts                 # npm 入口
├── tests/
│   ├── calculator/
│   │   ├── display.test.ts      # 展示 helper 测试
│   │   ├── factors.test.ts      # 乘区 helper 测试
│   │   └── resolved.test.ts     # resolved core 测试
│   └── sources/
│       └── buhflipexplode-official.test.ts # buhflipexplode 正式服过滤测试
├── scripts/
│   ├── sources/
│   │   ├── index.ts             # 主入口：按 source 名称调度 sync
│   │   ├── shared.ts            # fetch / playwright / batching / SvelteKit data 解码工具
│   │   ├── xlsx/
│   │   │   ├── index.ts         # 读取 .sources/source.xlsx，更新 metadata，并写入 data/source/xlsx/zh-CN/
│   │   │   ├── config.ts        # worksheet 到字段映射的 source of truth
│   │   │   └── types/           # 由 sync:xlsx 同步产出的内部类型
│   │   ├── gachabase.ts         # gachabase 列表页与详情页抓取
│   │   ├── buhflipexplode.ts    # buhflipexplode JSON 端点抓取
│   │   ├── buhflipexplode-official.ts # buhflipexplode 正式服过滤规则
│   │   ├── buhflipexplode-deadly-assault.ts # Deadly Assault 页面派生规则
│   │   └── mihoyo-wiki.ts       # 米游社百科危局强袭战抓取
│   └── data/
│       └── enemy.ts             # 生成 data/enemy/
├── README.md                    # 抓取、xlsx 读取与 calculator 说明
├── package.json                 # sync/build/test 命令与依赖
└── tsconfig.json                # 覆盖 src / tests / scripts/sources 的 TypeScript 配置
```

## 远端数据源同步链路

`scripts/sources/index.ts` 在运行远端数据源同步时，会聚合三个来源的任务列表，逐个抓取并将结果写到 `data/source/<source>/<locale>/<name>.json`：

1. `gachabase.ts`
   - 抓取 `https://zzz.gachabase.net`
   - 覆盖 `en` / `zh-CN`
   - 负责代理人、音擎、邦布、驱动盘列表与详情页原始结构抽取
2. `buhflipexplode.ts`
   - 抓取 `https://www.buhflipexplode.org`
   - 当前只保留 `en`
   - 直接消费其公开 JSON 端点
   - 抓取完成后，`scripts/sources/index.ts` 会先按官网页面的正式服阈值裁掉 beta / leaks 版本，并基于剩余正式服历史回收 `enemies.json` 与 `buffs.json` 的引用范围
   - 过滤完成后，会基于 `deadly-assault.json`、`enemies.json` 与 `buffs.json` 复算 `Deadly Assault` 页面展示数值，并额外产出 `data/source/buhflipexplode/en/deadly-assault-page-data.json`
3. `mihoyo-wiki.ts`
   - 抓取米游社百科危局强袭战条目
   - 当前只保留 `zh-CN`
   - 通过列表接口 + 详情接口拼装百科原始条目

执行远端同步时，`scripts/sources/index.ts` 会先将本次任务集合写入临时目录；只有全部任务成功后，才替换对应的 `data/source/<source>/<locale>/` 目录。这样既能清理任务重命名或删减后的旧文件，也不会在中途失败时丢掉上一份可用快照。

## xlsx 读取链路

`scripts/sources/xlsx/index.ts` 会读取 `.sources/source.xlsx`，按 `scripts/sources/xlsx/config.ts` 中的 worksheet 配置导出，并在成功后更新 `.sources/source.xlsx.metadata.json`：

- `data/source/xlsx/zh-CN/*.json`：每个工作表对应的快照 JSON
- `scripts/sources/xlsx/types/*`：按 worksheet 结构同步生成的内部类型

## 处理后数据生成

当前只有一条处理后数据生成链路：

1. `scripts/data/enemy.ts`
   - 读取 `data/source/buhflipexplode/en/deadly-assault-page-data.json`
   - 读取 `data/source/buhflipexplode/en/enemies.json`
   - 读取 `data/source/mihoyo-wiki/zh-CN/deadly-assault.json`
   - 只生成 `Deadly Assault` 范围内出现过的 enemy
   - 输出到 `data/enemy/index.json`、`data/enemy/profile/<locale>/` 与 `data/enemy/mechanics/`

## 计算核心边界

`docs/specs/damage-core.md` 定义了当前恢复的纯函数伤害计算核心边界：

- 只覆盖常规伤害与 `sheer` 贯穿伤害
- 只提供 `resolved core`、`factor helpers`、`display helpers`
- 不读取 `data/source/`，不解析 source 原文本，不做高层 resolver
- 后续如需扩展异常、紊乱、失衡值、异常积蓄等能力，先更新 spec，再扩展 `src/calculator/` 与 `tests/calculator/`

## 当前边界

- `packages/zzz-data` 当前同时承担两类职责：
  - `scripts/sources/` 负责数据源同步
  - `src/calculator/` 负责可发布的纯函数伤害计算核心
- `scripts/data/` 当前负责处理后数据生成；`data/enemy/` 结构以 `docs/specs/enemy-data.md` 为 source of truth
- 静态伤害计算上游的通用语义与最终输入结构以 `docs/specs/combat-semantics.md` 为 source of truth
- 当前仓库仍然不维护高层构筑解析、source 文本乘区抽取、cleaned helper 或场景级 resolver
- 如需扩展当前仓库：
  - 调整数据源同步时，保持 `.sources/source.xlsx` / `.sources/source.xlsx.metadata.json` / `data/source` / `scripts/sources/xlsx/types` 这几类输入输出约定一致
  - 调整计算能力时，以 `docs/specs/damage-core.md` 为 source of truth
  - 调整静态快照计算的通用语义结构时，以 `docs/specs/combat-semantics.md` 为 source of truth
  - 调整处理后 enemy 数据结构时，以 `docs/specs/enemy-data.md` 为 source of truth
