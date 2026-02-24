# zzz-data

Zenless Zone Zero 游戏数据包，从 `source.xlsx` 生成 JSON 数据，公开 TypeScript 类型手动维护。

需要了解项目细节时，先查阅 [docs/index.md](./docs/index.md)。

## 关键命令

```bash
# 子包命令（在 packages/zzz-data 下）
pnpm run generate   # 从 source.xlsx 生成 data/xlsx/*.json（当前冻结，xlsx 数据源暂不可用）
pnpm run crawl      # 爬虫脚本，爬取网页数据生成 data/crawl/*.json
pnpm run test       # vitest 运行测试
pnpm run build      # tsdown 编译，输出 dist/
pnpm run release    # build + pnpm publish

# 根目录命令
pnpm run lint --fix # eslint 检查并自动修复
pnpm run prettier   # prettier 格式化
```

## 工作流

修改或生成代码后：

1. 在子包下跑测试：`pnpm run test`
2. 在项目根目录跑 lint 和格式化：`pnpm run lint --fix && pnpm run prettier`

## 维护 CLAUDE.md

当以下内容发生变更时，必须同步更新本文件及 docs/ 下对应文档：

- 新增/删除/重命名脚本、目录或关键文件 → 更新 [architecture.md](./docs/architecture.md)
- 新增/修改 package.json scripts → 更新「关键命令」
- 新增/删除 devDependencies → 更新 [dependencies.md](./docs/dependencies.md)
- 修改命名规范或新增术语约定 → 更新 [naming.md](./docs/naming.md)
- 新增/修改 `src/index.ts` 公开类型 → 更新 [architecture.md](./docs/architecture.md)
- 修改工作流步骤 → 更新「工作流」
