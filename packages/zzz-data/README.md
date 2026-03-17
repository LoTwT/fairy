# zzz-data

Zenless Zone Zero 原始数据抓取脚本与 xlsx 读取脚本。

## 保留范围

当前包保留以下核心内容：

- `.sources/source.xlsx`：手动下载的本地 xlsx 数据源（gitignored）
- `.sources/source.xlsx.metadata.json`：最近一次成功处理的 `sha256` 与 `processedAt`
- `scripts/generate/`：xlsx 读取与快照生成脚本
- `scripts/crawl/`：抓取脚本
- `data/xlsx/`：由 `generate` 同步生成的快照 JSON
- `data/raw/`：由 `crawl` 按需重新生成
- `package.json` / `tsconfig.json`：最小运行配置

已删除 `merge`、`src/`、`tests/`、`dist/`、对外发布 API 与构筑解析相关内容。

## 数据源

- `gachabase`：`en`、`zh-CN`
- `buhflipexplode`：`en`
- `mihoyo-wiki`：`zh-CN` 危局强袭战

## 命令

```bash
pnpm run generate
pnpm run crawl
pnpm run crawl:gachabase
pnpm run crawl:buhflipexplode
pnpm run crawl:mihoyo-wiki
```

运行 `pnpm run generate` 前，请先将手动下载的最新 xlsx 放到 `.sources/source.xlsx`。脚本会在成功后更新 `.sources/source.xlsx.metadata.json`，并重新生成 `data/xlsx/*.json` 与 `scripts/generate/types/*`。

## 输出目录

`pnpm run generate` 会读取 `.sources/source.xlsx`，更新 `.sources/source.xlsx.metadata.json`，并同步 `data/xlsx/` 与 `scripts/generate/types/`。

抓取结果统一写入 `data/raw/`：

```text
data/raw/
├── en/
│   ├── buhflipexplode/
│   └── gachabase/
└── zh-CN/
    ├── gachabase/
    └── mihoyo-wiki/
```

`scripts/crawl/index.ts` 会按任务名直接生成 `data/raw/<task-name>.json`，所以新增抓取任务时，任务名本身就是输出相对路径。

`.sources/source.xlsx` 不纳入版本管理；仓库只跟踪它的 metadata 与导出的文本快照。
