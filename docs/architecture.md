# 架构说明

## 项目结构

```
packages/zzz-data/
├── source.xlsx              # 数据源（16 个工作表）
├── scripts/generate/         # 生成脚本
│   ├── index.ts             # 主入口（读 xlsx → 写 data/xlsx/*.json）
│   ├── config.ts            # worksheetConfigs 字段映射（source of truth）
│   └── types/               # xlsx 结构的内部类型（由 generate 脚本产出，仅作历史参考，不对外暴露）
├── scripts/crawl/            # 爬虫脚本
│   └── index.ts             # 爬虫主入口（playwright + cheerio）
├── tests/generate.test.ts   # 结构一致性测试（xlsx ↔ config ↔ JSON）
├── data/xlsx/*.json         # 生成的 JSON 数据（16 个文件）
├── data/crawl/*.json        # 爬虫输出的 JSON 数据
└── src/index.ts             # 公开类型入口（手动维护，与数据源无关）
```

## 生成脚本设计

> **⚠ 冻结状态**：`scripts/generate/` 当前不再修改。xlsx 数据源暂时不可用，脚本与产物保留供参考。`scripts/generate/types/` 中的字段定义、JSDoc 注释、类型结构可作为重建公开类型的参考依据。

- `worksheetConfigs` 数组定义了 16 个工作表的完整字段映射（中文列头 → 英文字段名 + 类型）
- 三阶段执行：读取所有工作表 → 注入派生字段 → 写 JSON 文件
- **derivedFields 机制**：部分表（agent-skill、agent-cinema、agent-skill-desc）只有代理人名称没有 ID，通过 `derivedFields` 从 agent-stat 跨表注入 `agentId`
- **内部类型**：generate 脚本将 xlsx 列结构写入 `scripts/generate/types/`，仅供内部参考，不对外暴露
- **公开类型**：`src/index.ts` 手动维护，与数据源无关，后续随爬虫数据结构确定后重建
