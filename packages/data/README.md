# @randomplay/data

Fairy 的游戏来源资料与数据整理包。

Nanoka 是当前已登记的数据来源。在 Fairy 源码工作区内，可以把已支持实体的原始 JSON 抓取到被 Git 忽略的本地缓存。缓存不是权威快照，不提供离线完整性验证，也不进入 npm 包。当前公开导出仍保持为空。

[来源数据整合规范](../../docs/specs/data/integration.md) 定义了第一阶段完整代理人资料的字段归属、命名与注释、多语言拆分、来源追溯与文件契约，已完成本地 Nanoka 3.1 全部 58 个代理人的类型覆盖与离线契约验证。现已实现[包内单代理人纯整合函数](src/integration/integrate-agent.ts)及[正式类型](src/integration/agent-types.ts)，对合成输入执行常规类型与保真测试。raw 保留来源版本目录，integrated 计划增量维护一份当前资料；全量文件生成、增量写入和公开 API 尚未实现。

## 本地抓取

在 Fairy 仓库根目录运行：

```bash
pnpm --filter @randomplay/data fetch:nanoka
```

该命令只用于源码工作区，`@randomplay/data` 不导出 npm CLI。完整参数、缓存语义和验证边界见 [Nanoka 共享来源规范](https://github.com/LoTwT/fairy/blob/main/docs/specs/nanoka/source.md)。

## 约束

- 本包拥有原始来源、清洗结果和发布数据。
- 本包不依赖 `@randomplay/core`。
- 整合资料保留来源原文与数值；计算语义需要单独人工讨论和重新建模，再由后续集成层组装计算输入。
