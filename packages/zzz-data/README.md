# zzz-data

Zenless Zone Zero 数据源同步脚本与 xlsx 读取脚本。

## 保留范围

当前包保留以下核心内容：

- `.sources/source.xlsx`：手动下载的本地 xlsx 数据源（gitignored）
- `.sources/source.xlsx.metadata.json`：最近一次成功处理的 `sha256` 与 `processedAt`
- `scripts/sources/`：统一的数据源同步脚本
- `scripts/sources/xlsx/types/`：由 `sync:xlsx` 生成的内部类型产物
- `data/source/`：按 source / locale 组织的数据源输出快照
- `package.json` / `tsconfig.json`：最小运行配置

已删除 `merge`、`src/`、`tests/`、`dist/`、对外发布 API 与构筑解析相关内容。

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
```

运行 `pnpm run sync:xlsx` 前，请先将手动下载的最新 xlsx 放到 `.sources/source.xlsx`。脚本会在成功后更新 `.sources/source.xlsx.metadata.json`，并重新生成 `data/source/xlsx/zh-CN/*.json` 与 `scripts/sources/xlsx/types/*`。`pnpm run sync` 会依次执行 `xlsx`、`gachabase`、`buhflipexplode`、`mihoyo-wiki` 四个数据源同步。

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
其中 `buhflipexplode` 同步完成后，还会额外读取 `deadly-assault.json`、`enemies.json` 与 `buffs.json`，按 `Deadly Assault` 页面当前 `da.js` 规则复算出页面展示用的 `deadly-assault-page-data.json`，并落到 `data/source/buhflipexplode/en/`。

`.sources/source.xlsx` 不纳入版本管理；仓库只跟踪它的 metadata 与导出的文本快照。
