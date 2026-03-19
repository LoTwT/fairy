# zzz-data

Zenless Zone Zero 数据源同步脚本、xlsx 读取脚本与纯函数伤害计算核心。

## 保留范围

当前包保留以下核心内容：

- `.sources/source.xlsx`：手动下载的本地 xlsx 数据源（gitignored）
- `.sources/source.xlsx.metadata.json`：最近一次成功处理的 `sha256` 与 `processedAt`
- `scripts/sources/`：统一的数据源同步脚本
- `scripts/data/`：处理后数据生成脚本
- `scripts/sources/xlsx/types/`：由 `sync:xlsx` 生成的内部类型产物
- `data/source/`：按 source / locale 组织的数据源输出快照
- `data/enemy/`：按 `enemy-data` 规格生成的处理后敌人数据
- `src/calculator/`：对外发布的纯函数伤害计算核心
- `tests/calculator/`：calculator 测试
- `tests/sources/`：source 同步与过滤测试
- `docs/specs/damage-core.md`：calculator 规格文档
- `docs/specs/enemy-data.md`：`data/enemy/` 结构规格
- `package.json` / `tsconfig.json`：同步、构建、测试与类型检查配置

当前仍未恢复高层构筑解析、source 文本乘区抽取与场景级 resolver。

## 数据源

- `gachabase`：`en`、`zh-CN`
- `buhflipexplode`：`en`
- `mihoyo-wiki`：`zh-CN` 危局强袭战

## 命令

```bash
pnpm run sync
pnpm run sync:xlsx
pnpm run sync:gachabase
pnpm run sync:buhflipexplode
pnpm run sync:mihoyo-wiki
pnpm run generate:enemy
pnpm run build
pnpm run test
pnpm run typecheck
```

运行 `pnpm run sync:xlsx` 前，请先将手动下载的最新 xlsx 放到 `.sources/source.xlsx`。脚本会在成功后更新 `.sources/source.xlsx.metadata.json`，并重新生成 `data/source/xlsx/zh-CN/*.json` 与 `scripts/sources/xlsx/types/*`。`pnpm run sync` 会依次执行 `xlsx`、`gachabase`、`buhflipexplode`、`mihoyo-wiki` 四个数据源同步。`pnpm run generate:enemy` 会基于正式服 `Deadly Assault` source 快照生成 `data/enemy/`。`pnpm run build` 使用 `tsdown` 输出 `dist/` 下的 npm 发布产物，`pnpm run test` 使用 `vitest` 运行纯函数计算核心测试，`pnpm run typecheck` 检查 `src/`、`tests/`、`scripts/sources/` 与 `scripts/data/`。

## 输出目录

`pnpm run sync:xlsx` 会读取 `.sources/source.xlsx`，更新 `.sources/source.xlsx.metadata.json`，并同步 `data/source/xlsx/zh-CN/` 与 `scripts/sources/xlsx/types/`。

所有 source 数据统一写入 `data/source/`：

```text
data/source/
├── xlsx/
│   └── zh-CN/
├── gachabase/
│   ├── en/
│   └── zh-CN/
├── buhflipexplode/
│   └── en/
└── mihoyo-wiki/
    └── zh-CN/
```

`scripts/sources/index.ts` 会按 source 名称调度同步；所有任务统一写到 `data/source/<source>/<locale>/<name>.json`，所以新增 source 任务时，任务名本身也遵循同样的 `source/locale/name` 约定。
每次执行远端同步时，脚本会先把当前任务集合写入临时目录，全部成功后再替换对应来源目录，既能清理历史残留，也能保留上一份可用快照直到本轮同步完成。
其中 `buhflipexplode` 会在写入前先按官网页面当前的正式服阈值裁掉 beta / leaks 版本，再基于剩余正式服历史版本回收 `enemies.json` 与 `buffs.json` 的引用范围。同步完成后，还会额外读取过滤后的 `deadly-assault.json`、`enemies.json` 与 `buffs.json`，按 `Deadly Assault` 页面当前 `da.js` 规则复算出页面展示用的 `deadly-assault-page-data.json`，并落到 `data/source/buhflipexplode/en/`。

处理后 enemy 数据由 `pnpm run generate:enemy` 写入：

```text
data/enemy/
├── index.json
├── profile/
│   ├── en/
│   └── zh-CN/
└── mechanics/
```

字段定义见 [../../docs/specs/enemy-data.md](../../docs/specs/enemy-data.md)。

`.sources/source.xlsx` 不纳入版本管理；仓库只跟踪它的 metadata 与导出的文本快照。

## Calculator API

当前 `src/calculator/` 只公开三层纯函数 API：

- `resolved core`
  - `calcResolvedNormalDamage`
  - `calcResolvedSheerDamage`
- `factor helpers`
  - `calcBaseDamage`
  - `getAttackerLevelBase`
  - `calcBonusMultiplier`
  - `calcCritMultiplier`
  - `calcExpectedCritMultiplier`
  - `calcDefenseMultiplier`
  - `calcResistanceMultiplier`
  - `calcVulnerabilityMultiplier`
  - `calcDazeVulnerabilityMultiplier`
  - `calcSheerBonusMultiplier`
- `display helpers`
  - `ceilDisplayDamage`
  - `sumDisplayedSegments`

当前版本只覆盖常规伤害与 `sheer` 贯穿伤害，详细输入、公式和 clamp 规则见 [../../docs/specs/damage-core.md](../../docs/specs/damage-core.md)。
