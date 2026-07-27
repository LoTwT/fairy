# Nanoka Agents 数据规范

## 状态

- 状态：已实现并验证
- 实体：Agents
- 上游名称：`character`
- 语言：简体中文（`zh`）和英文（`en`）
- 验证状态：自动化检查通过，实际在线抓取流程已由用户确认
- 共享契约：[Nanoka 共享来源规范](source.md)

本文只定义 Agents 特有的端点、资源发现、最低结构、一致性、测试和验收要求。版本选择、HTTP、缓存、快照清单、原子发布、版本锁、CLI、包边界和合规要求统一遵循共享来源规范。

## 1. 目标

Agents 首期实现必须：

1. 获取指定版本的 Agent 摘要数据。
2. 从摘要动态发现全部 Agent ID。
3. 获取每个 Agent 的中文和英文详情。
4. 保留摘要与详情的远端原始字节。
5. 验证摘要、详情和抓取清单之间的一致性。
6. 为后续数据清洗保留所有未识别的上游字段。

## 2. 非目标

Agents 首期不包含：

- W-Engines（`weapon`）；
- Bangboos（`bangboo`）；
- Drive Discs（`equipment`）；
- Monsters（`monster`）；
- End Game，以及其中的 Shiyu（`shiyu`）、Boss（`boss`）和 Simul（`simul`）子域；
- 日文或韩文数据；
- 对 Agent 字段进行术语映射、清洗、重命名或裁剪；
- 将 Agent 详情直接转换为 `@randomplay/core` 的计算输入。

其他实体开始实施前应创建独立实体规范，不得因为路径模板相似而假定字段结构或实体关系相同。

## 3. 上游端点

### 3.1 Agent 摘要

```text
GET https://static.nanoka.cc/zzz/{version}/character.json
```

预期顶层为以十进制 Agent ID 为 key 的对象：

```json
{
  "1011": {
    "code": "Anby",
    "en": "Anby",
    "zh": "安比"
  }
}
```

上游可能增加、删除或修改字段。首期只把顶层 ID 映射结构作为抓取契约，不完整建模摘要记录。

### 3.2 Agent 详情

```text
GET https://static.nanoka.cc/zzz/{version}/{lang}/character/{id}.json
```

首期语言：

```text
zh
en
```

示例：

```text
https://static.nanoka.cc/zzz/3.0/zh/character/1011.json
https://static.nanoka.cc/zzz/3.0/en/character/1011.json
```

Agent ID 必须从 `character.json` 的 key 动态发现，不维护硬编码 ID 列表。

## 4. 抓取范围与一致性

指定版本的一次完整 Agents 实体抓取包括：

1. 一份 `character.json` 摘要；
2. 摘要中每个 ID 对应的一份中文详情；
3. 摘要中每个 ID 对应的一份英文详情。

共享来源规范定义上游 manifest、版本级 `fetch-manifest.json` 和多实体组合快照。无 `--entity` 的共享抓取命令处理全部当前支持实体；`--entity character` 用于仅重新获取 Agents，但最终仍发布完整版本级组合快照。

结果必须满足：

- 摘要顶层是非空普通对象；空对象即使是合法 JSON，也视为上游异常，不得发布或替换已有快照；
- 每个摘要 key 是规范十进制 ID，只含数字且无前导零（`0` 本身除外），匹配 `/^(0|[1-9]\d*)$/`；
- 每个摘要 value 是普通对象；
- Agent ID 按数值升序稳定排序；
- 每个摘要 ID 恰好对应一份 `zh` 详情和一份 `en` 详情；
- 详情目录和清单中不得出现摘要不存在的 ID；
- 详情中的 `id` 字段如果存在，必须是安全整数，且十进制字符串等于 URL 和摘要 ID；
- 任意必需资源缺失时，本次快照不得标记为完整；
- 同版本摘要记录数变化必须作为漂移证据明确报告；首期除空摘要外不设置 Agent 数量骤减拒绝阈值，非空数量变化不单独阻止完整快照发布，由后续清洗或维护流程决定是否接受。

中文和英文详情不要求具有完全相同的字段集合，因为上游可能存在语言特定字段或回退逻辑。

## 5. 本地文件布局

Agents 资源保存为：

```text
packages/data/raw/nanoka/{version}/
├── manifest.json
├── character.json
├── fetch-manifest.json
├── zh/
│   └── character/
│       └── {id}.json
└── en/
    └── character/
        └── {id}.json
```

本地目录与上游语言优先路径保持一致。远端 JSON 按共享来源规范保存原始响应字节。

## 6. Agents 抓取清单

历史 Agents 快照使用冻结的 `nanoka-fetch-manifest/v1`，顶层额外记录：

- `languages`：`zh`、`en`；
- `summary.characterCount`；
- `summary.zhDetailCount`；
- `summary.enDetailCount`；
- `summary.assetCount`；
- `summary.totalBytes`。

`v1` Agents kind 与稳定 asset ID 为：

| kind                | 稳定 asset ID                                                                |
| ------------------- | ---------------------------------------------------------------------------- |
| `upstream-manifest` | `upstream-manifest`                                                          |
| `character-index`   | `character-index`                                                            |
| `character-detail`  | `character-detail:{language}:{characterId}`，例如 `character-detail:zh:1011` |

新抓取使用共享来源规范定义的 `nanoka-fetch-manifest/v2`。Agents 对应关系为：

- 实体：`character`；
- 摘要 kind：`entity-index`；
- 详情 kind：`entity-detail`；
- 摘要 asset ID：`entity-index:character`；
- 详情 asset ID：`entity-detail:character:{language}:{characterId}`；
- 实体资源 ID：`entityId`；
- 计数：`summary.entities.character.recordCount` 和 `detailCountByLanguage`。

本地路径在两个 schema 中均保持：

- manifest：`manifest.json`；
- 摘要：`character.json`；
- 详情：`{language}/character/{characterId}.json`。

离线验证必须继续严格支持旧 `v1` Agents 快照。读取适配器可以在内存中将旧字段映射为 v2 通用语义，但不得修改磁盘；新抓取只在完整 staging 成功发布时写出 v2。每个 asset 的通用 HTTP、字节数、SHA-256、时间及 carried-forward 规则遵循共享来源规范。

## 7. Agents 模块职责

当前 `packages/data/scripts/nanoka/characters.ts` 负责：

- 校验 `character.json` 的最低结构；
- 从摘要动态发现 Agent ID，并按数值升序排序；
- 为 zh/en 构造详情资源；
- 校验详情 ID 与摘要 ID 的对应关系。

`character` adapter 还提供 Agents 实体级 summary 和内部一致性验证，并由共享实体注册表登记。共享 `policy.ts` 只接受注册实体的索引和详情路径；共享 `snapshot.ts` 负责版本级组合 staging、v1/v2 清单、分层离线验证和发布。Agents 特有字段规则不得移入共享层。

## 8. 命令与进度

Agents 复用共享命令。当前实现支持：

```bash
pnpm --filter @randomplay/data fetch:nanoka
pnpm --filter @randomplay/data fetch:nanoka --channel latest
pnpm --filter @randomplay/data fetch:nanoka --version <version>
pnpm --filter @randomplay/data fetch:nanoka --entity character
pnpm --filter @randomplay/data verify:nanoka
pnpm --filter @randomplay/data verify:nanoka --version <version>
```

`--entity character` 用于 Agents-only 定向重跑。无 `--entity` 的 fetch 处理全部当前支持实体；verify 始终校验整个版本组合快照，不提供 Agents-only 模式。

抓取期间：

- 发现摘要后输出 Agent 数量和 zh/en 详情总数；
- 每完成 10 份详情输出一次进度；
- 全部详情完成时始终输出最终数量；
- 不为每个详情资源单独输出一行；
- 成功摘要输出 Agent 数量、总资源数、总字节数、缓存复用数和漂移数。

进度事件由抓取流程以结构化回调提供，具体终端文案由 CLI 层负责。

## 9. Agents 测试矩阵

### 9.1 资源发现和内容

- 从摘要 key 稳定生成按数值升序排序的 Agent ID；
- 拒绝空 `character.json`，且重抓空摘要不得替换已有快照；
- 为每个 ID 生成 zh/en 两项详情资源；
- 拒绝非法十进制 ID；
- 拒绝详情 ID 与路径不一致；
- 检测缺失中文详情；
- 检测缺失英文详情；
- 检测摘要中不存在的多余详情；
- 不要求 zh/en 详情具有完全相同的字段集合。

### 9.2 快照和进度

- 摘要和详情均按原始字节保存；
- v1 扁平 summary 和 v2 `summary.entities.character` 均与磁盘一致；
- 旧 v1 Agents fixture 和实际快照在 v2 reader 引入后继续通过严格验证；
- v1 到 v2 迁移只发生在成功发布中，迁移失败时旧快照保持不变；
- v2 通用 asset 的 `entity`、`entityId`、kind、asset ID、URL 和路径保持一致；
- 定向重跑其他实体时，Agents 资产经完整性验证后 carried-forward，原始字节和实际 HTTP 检查时间保持不变；
- 定向重跑 Agents 时，旧索引已移除的 Agent 详情不会残留；
- 同版本内容变化产生明确漂移报告；摘要变化报告记录数变化，空摘要无条件拒绝；
- 详情进度每 10 份输出一次并始终输出最终完成数量；
- 缓存复用、失败保护、锁、原子发布和离线验证满足共享来源规范。

### 9.3 包边界

- Agents raw cache 不进入 Git 或 npm tarball；
- `characters.ts` 和其他维护脚本不进入 npm tarball；
- `@randomplay/data` 不增加对 `@randomplay/core` 的依赖；
- `packages/data/src/index.ts` 保持空公开导出；
- 现有 tarball 消费端测试继续通过。

测试使用 mock fetch、临时目录和最小 fixture，不依赖真实 Nanoka 站点。

## 10. 验收标准

Agents 首期实现只有同时满足以下条件才算完成：

1. 版本选择和网络行为符合共享来源规范；
2. 选择确认前不抓取摘要或详情，也不创建正式快照；
3. 抓取期间能够看到 Agent 发现、详情处理、离线校验和发布进度，详情不会逐文件刷屏；
4. 指定版本的 `character.json` 和全部 zh/en 详情成功保存；
5. Agent ID 完全从摘要发现，没有硬编码 ID 清单；
6. 快照包含完整、可离线重算的 fetch manifest；
7. 二次抓取能够利用条件请求或已有缓存；
8. 网络失败、用户取消或校验失败不会损坏已有快照；
9. 离线 verify 能检测文件缺失、内容篡改、摘要/详情不一致和交换残留，并尽可能列出全部独立失败项；
10. 空摘要、锁所有权竞态、失败后仍运行的并发任务或不安全的持久化路径不能破坏或替换已有完整快照；
11. raw cache 被 Git 忽略且不进入 npm 包；
12. typecheck、单元测试、package verify 和仓库检查通过；
13. `@randomplay/data` 的公共 API 和 core 依赖边界不变；
14. 用户检查实际抓取目录、终端进度和清单后确认流程符合后续清洗需要。

当前实现和实际抓取已经满足以上条件。

## 11. 后续实体

后续实体和 End Game 子域在 [Nanoka 数据源规范索引](index.md) 中登记。每个实体或子域实施前必须新增对应规范，明确：

- 摘要和详情端点；
- ID 发现规则；
- 语言范围；
- 最低结构断言；
- 特有的一致性问题；
- 是否存在版本相关的可选端点；
- 对共享 fetch-manifest schema 的扩展方式。

不得因为路径模板相似，就假定不同实体或 End Game 子域拥有相同字段结构或相同的一对一实体关系。
