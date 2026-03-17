# Monorepo 依赖说明

本文档记录当前 monorepo 保留的依赖范围，覆盖：

1. 根目录 `devDependencies`
2. `packages/zzz-data` 的 `devDependencies`

## 根目录

- `@ayingott/eslint-config` — ESLint 共享配置
- `@ayingott/prettier-config` — Prettier 共享配置
- `eslint` — 根目录 lint 命令
- `lint-staged` — pre-commit 仅检查暂存文件
- `pnpm` — 锁定 workspace 包管理器版本
- `prettier` — 根目录格式化命令
- `simple-git-hooks` — 注册 `pre-commit` hook

## packages/zzz-data

- `@types/node` — Node.js 类型，供抓取脚本与 generate 脚本使用
- `cheerio` — HTML 解析，处理静态页面与百科富文本
- `exceljs` — 读取 `.sources/source.xlsx`
- `playwright` — 浏览器自动化，处理 JS 渲染页面抓取
- `tsx` — 直接运行 TypeScript 抓取脚本与 generate 脚本
