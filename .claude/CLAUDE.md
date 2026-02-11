# zzz-data

Zenless Zone Zero 游戏数据包，从 `source.xlsx` 生成 JSON 数据和 TypeScript 类型。

## 关键命令

```bash
# 子包命令（在 packages/zzz-data 下）
pnpm run generate   # 从 source.xlsx 生成 data/xlsx/*.json + src/types/*.ts + src/index.ts
pnpm run test       # vitest 运行测试
pnpm run build      # tsdown 编译，输出 dist/

# 根目录命令
pnpm run lint --fix # eslint 检查并自动修复
pnpm run prettier   # prettier 格式化
```

## 项目结构

```
packages/zzz-data/
├── source.xlsx              # 数据源（16 个工作表）
├── scripts/generate/         # 生成脚本
│   ├── index.ts             # 主入口（读 xlsx → 写 JSON/类型）
│   └── config.ts            # worksheetConfigs 字段映射（source of truth）
├── tests/generate.test.ts   # 结构一致性测试（xlsx ↔ config ↔ JSON）
├── data/xlsx/*.json         # 生成的 JSON 数据（16 个文件）
├── src/types/*.ts           # 生成的 TS 接口（按分组：agent/enemy/anomaly/w-engine/bangboo/drive-disc）
└── src/index.ts             # barrel: export type * from "./types"
```

## 生成脚本设计

- `worksheetConfigs` 数组定义了 16 个工作表的完整字段映射（中文列头 → 英文字段名 + 类型）
- 三阶段执行：读取所有工作表 → 注入派生字段 → 写文件
- **derivedFields 机制**：部分表（agent-skill、agent-cinema、agent-skill-desc）只有代理人名称没有 ID，通过 `derivedFields` 从 agent-stat 跨表注入 `agentId`
- **JSDoc 注释**：生成的 TS 接口每个字段带 `/** 中文列头 */` 注释，interface 带 `/** 工作表名 */` 注释，派生字段带 `/** 派生字段，从 xxx 注入 */`。注释会保留到 `dist/index.d.mts`，发包后消费者可在 IDE 中看到

## 依赖说明

- `exceljs` — 读取 xlsx
- `tsx` — 运行 TS 脚本
- `tsdown` — 构建输出 dist/
- `vitest` — 测试
- `@types/node` — Node.js 类型（供 scripts/ 和 tests/ 使用）

## 工作流

修改或生成代码后：

1. 在子包下跑测试：`pnpm run test`
2. 在项目根目录跑 lint 和格式化：`pnpm run lint --fix && pnpm run prettier`

## 维护 CLAUDE.md

当以下内容发生变更时，必须同步更新本文件：

- 新增/删除/重命名脚本、目录或关键文件 → 更新「项目结构」
- 新增/修改 package.json scripts → 更新「关键命令」
- 新增/删除 devDependencies → 更新「依赖说明」
- 修改命名规范或新增术语约定 → 更新「命名规范」
- 修改生成脚本的设计（如新增 pass、新机制） → 更新「生成脚本设计」
- 修改工作流步骤 → 更新「工作流」

## 命名规范

- 失衡相关：使用 `daze`（官方英文术语），如 `dazeMultiplier`、`dazeMax`、`canDaze`
- 喧响值：使用 `techniquePoints`，如 `techniquePointsRegen`、`techniquePointsGainRate`
- 闪能：使用 `adrenaline`，如 `adrenalineAccumulation`
- 秽盾：使用 `miasmicShield`，如 `miasmicShieldReduction`
- 能量上限：使用 `energyLimit`（非 energyCap）
- 抗性后缀：使用完整的 `Resistance`（非缩写 Resist）
- 元素前缀：使用完整拼写 `electric`/`physical`（非缩写 elec/phys）
