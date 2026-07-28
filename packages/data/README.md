# @randomplay/data

Fairy 的版本化游戏数据包。

Nanoka 是当前已登记的数据来源。在 Fairy 源码工作区内，可以把已支持实体的原始 JSON 抓取到被 Git 忽略的本地缓存。缓存不是权威快照，不提供离线完整性验证，也不进入 npm 包。当前公开导出仍保持为空。

## 本地抓取

在 Fairy 仓库根目录运行：

```bash
pnpm --filter @randomplay/data fetch:nanoka
```

该命令只用于源码工作区，`@randomplay/data` 不导出 npm CLI。完整参数、缓存语义和验证边界见 [Nanoka 共享来源规范](https://github.com/LoTwT/fairy/blob/main/docs/specs/nanoka/source.md)。

## 约束

- 本包拥有原始来源、清洗结果和发布数据。
- 本包不依赖 `@randomplay/core`。
- 从数据记录到计算输入的转换由后续集成层负责。
