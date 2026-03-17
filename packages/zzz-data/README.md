# zzz-data

Zenless Zone Zero 原始数据抓取脚本与 xlsx 读取脚本。

## 保留范围

当前包保留以下核心内容：

- `source.xlsx`：xlsx 数据源
- `scripts/generate/`：xlsx 读取与快照生成脚本
- `scripts/crawl/`：抓取脚本
- `data/`：当前为空；需要时由 `generate` / `crawl` 重新生成
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

## 输出目录

`pnpm run generate` 会把 `source.xlsx` 同步到 `data/xlsx/`，并更新 `scripts/generate/types/`。

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

`data/` 下的文件当前被清空，只是为了给这轮重构保留一个更简洁的起点；后续是否重新纳入版本控制，取决于重构方案。
