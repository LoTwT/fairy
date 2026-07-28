# Nanoka 共享来源规范

## 状态

- 状态：共享来源基线和多实体 v2 契约已实现并验证
- 当前实现范围：版本发现与选择、HTTP、条件请求、严格 v1/v2 清单、实体注册表、多实体组合快照、定向实体重跑、分层离线校验、原子发布、版本锁和终端进度
- 下一实现范围：阶段七第 10 项长期契约收尾与临时计划清理
- 验证状态：自动化检查和三版本八实体完整在线抓取、离线校验均通过；七实体 epoch 已冻结，当前正常发布使用八实体 epoch；End Game 综合验收已完成
- 适用包：`@randomplay/data`
- 数据来源：Nanoka ZZZ 静态数据
- 实体规范入口：[Nanoka 数据源规范索引](index.md)

## 1. 背景

Nanoka 的 ZZZ 数据无需解析网页 HTML。站点前端直接使用 `static.nanoka.cc` 提供的版本化 JSON 文件：

- 数据版本入口：`https://static.nanoka.cc/manifest.json`
- 版本化数据根路径：`https://static.nanoka.cc/zzz/{version}/`

这些文件无需登录或 API key，支持 `ETag`、`Last-Modified` 和条件请求。它们适合作为抓取来源，但属于公开静态发行物，而不是由上游承诺长期兼容的正式 API。因此，本项目必须保留原始响应、抓取元数据和完整性证据，并对结构变化明确失败或报告。

本文定义所有 Nanoka 实体共享的来源、传输、快照和验证契约。实体端点、资源发现、最低结构与特有一致性规则由对应实体规范定义。

## 2. 目标

共享抓取基础设施必须：

1. 从上游 manifest 发现可用数据版本。
2. 默认选择正式服版本，同时允许交互选择已公开但尚未正式上线的版本。
3. 将远端原始响应保存为本地、可复用的版本化快照。
4. 为每个响应记录 HTTP 元数据、字节数和 SHA-256。
5. 支持条件请求和离线完整性验证。
6. 保证失败的抓取不会破坏已有完整快照。
7. 为后续实体复用来源政策、HTTP、快照和验证机制。
8. 保持 `@randomplay/data` 当前的包职责和公开 API 边界。

## 3. 共享非目标

当前共享基础设施不包含：

- HTML 页面抓取或浏览器自动化；
- 图片及其他静态资源下载；
- 对上游字段进行清洗、重命名或裁剪；
- 将数据转换为 `@randomplay/core` 的计算输入；
- 将原始数据或清洗数据发布到 npm；
- 定时任务或 CI 在线抓取；
- 自动遍历和下载所有历史版本。

各实体尚未支持的语言和资源类型由实体规范声明，不在共享规范中推断。

## 4. 数据版本 manifest

```text
GET https://static.nanoka.cc/manifest.json
```

抓取器至少依赖以下结构：

```json
{
  "zzz": {
    "live": "3.0",
    "latest": "3.1.12+17625891",
    "available": ["3.0", "3.1.5+17516165", "3.1.12+17625891"]
  }
}
```

字段含义：

- `live`：当前正式服版本；
- `latest`：上游当前最新数据版本，可能尚未正式上线；
- `available`：可以通过版本化 URL 获取的版本集合。

抓取器不得依赖示例中的具体版本值。

## 5. 版本选择

### 5.1 运行命令时的交互选择

直接运行以下命令时：

```bash
pnpm --filter @randomplay/data fetch:nanoka
```

如果标准输入和输出连接到交互式终端，命令必须在开始抓取任何版本数据之前执行以下流程：

1. 只获取 manifest，用于发现版本；
2. 在当前终端中展示 `zzz.available` 中的全部版本；
3. 标注每个版本的 `live`、`latest` 状态；
4. 等待用户在本次命令运行中选择目标版本；
5. 用户确认后，才开始抓取该版本的实体资源。

交互界面至少应提供编号选择，例如：

```text
请选择要抓取的 Nanoka ZZZ 数据版本：

  1. 3.0                  live（默认）
  2. 3.1.5+17516165
  3. 3.1.12+17625891     latest

输入序号或版本号，直接回车使用 3.0：
```

交互行为必须满足：

- 每次无版本参数运行命令时都重新读取 manifest 并询问用户，而不是沿用上次选择；
- 用户可以输入列表序号，也可以输入列表中完整的版本号；
- 直接回车选择 `live`；
- 输入不合法时说明原因并重新询问，不得静默改用其他版本；
- 在用户确认前，除 manifest 外不得发起该版本的数据请求，也不得创建正式快照；
- 用户取消输入（例如 `Ctrl+C`）时正常中止，不写入不完整快照；
- 允许选择任意位于 `available` 中的版本，包括未正式发布版本；
- 当 `live` 与 `latest` 相同时，应在同一个选项上同时显示两个标记，而不是生成重复选项。

这里的“交互式选择”特指运行抓取命令时在终端内选择本次要抓取的版本，不是通过修改配置文件、预先保存偏好或运行另一个配置命令来选择版本。

### 5.2 非交互模式

CLI 支持：

```text
--channel live
--channel latest
--version <available-version>
```

规则如下：

- 非交互终端中未提供参数时使用 `live`；
- `--channel` 和 `--version` 互斥；
- `--version` 的值必须存在于当前 manifest 的 `available` 中；
- 不允许通过参数传入任意基础 URL；
- manifest 缺少所需字段或选择的版本不可用时必须明确失败；
- 不允许从 `latest` 静默回退到 `live`，反之亦然。

## 6. 本地快照边界

版本快照统一保存到：

```text
packages/data/raw/nanoka/{version}/
```

一个版本目录是一份多实体组合快照，也是锁、staging、验证、失败保护和原子发布的最小边界。实体是抓取选择和验证模块的边界，不是独立发布边界。

已登记实体的一般资源布局为：

```text
{entity}.json
{language}/{entity}/{entityId}.json
```

只有代码实体注册表和正式实体规范共同声明的实体才能使用该模板；路径相似不表示字段结构、内部关系或验证规则相同。实体规范可以在共享安全路径规则内定义额外资源布局。

所有远端 JSON 应保存为响应原始字节，不应先经过 `JSON.parse` 和重新格式化后再写入。

根 `.gitignore` 中精确忽略：

```gitignore
packages/data/raw/
```

约束如下：

- 原始快照默认只保存在本地；
- 只忽略 `packages/data/raw/`，避免来源配置和抓取脚本被误排除；
- 原始快照不进入 Git；
- 原始快照不进入 npm 包；
- `packages/data/package.json` 当前只发布 `dist`；
- `packages/data/src/index.ts` 保持空公开 API。

后续若决定提交原始数据、上传 artifact 或发布清洗结果，必须另行评审存储和再分发政策。

## 7. 抓取清单通用规则

每个版本快照只包含一份版本级 `fetch-manifest.json`。该清单登记整个版本目录中的全部实体资产、全局计数和验证结果；不得为各实体建立相互独立的正式清单。

### 7.1 schema 兼容策略

现有 Agents 快照使用：

```json
{
  "schemaVersion": "nanoka-fetch-manifest/v1"
}
```

`v1` 冻结为 Agents 历史格式。读取器和离线验证必须继续严格支持其既有 asset kind、`characterId`、扁平 summary 和完整 `zh/en` Character 覆盖语义，不得将它放宽为多实体格式。

多实体快照使用：

```json
{
  "schemaVersion": "nanoka-fetch-manifest/v2"
}
```

实现必须读取和验证 `v1`、`v2`，但新增抓取成功发布时只写 `v2`。`verify:nanoka` 不迁移或改写旧快照；`v1` 到 `v2` 的转换只允许发生在一次完整 staging 校验成功后的原子发布中，失败时旧 `v1` 快照保持不变。未知 schema 必须明确拒绝。

### 7.2 v2 顶层字段

`v2` 顶层至少记录：

- `schemaVersion`；
- `sourceId`；
- `game`；
- `snapshotVersion`；
- `selectedBy`：`live`、`latest`、`version` 或 `interactive`；
- `observedLiveVersion`；
- `observedLatestVersion`；
- `observedAvailableVersions`；
- `startedAt`；
- `completedAt`；
- `userAgent`；
- `languages`；
- `entities`；
- `fetchScope`；
- `assets`；
- `summary`；
- `validation`。

`entities` 是发布后快照实际包含且声明完整的实体集合，必须非空、不重复，并按代码实体注册表的稳定顺序排列。正常新发布的快照必须包含当前实现并启用的全部实体；旧 `v1` 快照在内存中的实体集合视为仅包含 `character`。

随着实体注册表扩展，历史 `v2` 快照可以使用代码中显式冻结登记的历史实体集合 epoch。当前冻结的历史 epoch 为 `character, equipment`、`character, equipment, weapon`、`character, equipment, weapon, bangboo`、`character, equipment, weapon, bangboo, monster`、`character, equipment, weapon, bangboo, monster, shiyu` 和 `character, equipment, weapon, bangboo, monster, shiyu, simul`。历史 epoch 必须是曾由本工具发布的完整实体集合，不得接受当前注册表的任意子集；清单声明、资产集合、summary 和 validation 必须按其引入时的契约严格闭合。七实体 epoch 已由 item 7 冻结，未包含 item 8 才引入的五个共享 validator 记录，不得用八实体要求追溯拒绝或改写。正常新发布必须包含当前八个启用实体，即在七实体 epoch 基础上加入 `boss`。定向新增实体时，可以从包含全部未选实体的合法历史 epoch 构建当前完整 staging，并且只有完整 staging 验证成功后才升级磁盘快照。

`fetchScope` 记录本轮网络更新范围，而不是降低快照完整度：

```json
{
  "mode": "selected",
  "requestedEntities": ["equipment"]
}
```

- `mode` 为 `all` 或 `selected`；
- `all` 时 `requestedEntities` 必须等于 `entities`；
- `selected` 时 `requestedEntities` 必须是 `entities` 的非空真子集；去重后的请求集合等于全部启用实体时统一规范化为 `all`；
- 未选实体必须来自经过完整验证的旧快照，且旧快照必须包含全部未选的当前启用实体；缺少任一实体时拒绝定向重跑并提示执行全量抓取；
- 上游 manifest 每轮都参与处理，不列入 `requestedEntities`。

顶层 `startedAt` 和 `completedAt` 描述本次组合快照构建与发布，不表示所有 carried-forward 资产都在该时间重新访问过网络；单个资产的实际获取和检查时间只以其自身时间字段为准。

### 7.3 v2 asset

`v2` 的通用 asset kind 为：

```text
upstream-manifest
entity-index
entity-detail
```

每个 asset 至少记录：

- `assetId`：跨多次运行保持稳定的全局唯一标识；
- `kind`；
- 实体资产的 `entity`；
- 详情资产的 `language` 和 `entityId`；
- `url`；
- `localPath`：相对版本快照根目录的 POSIX 风格安全相对路径；
- `httpStatus`；
- `result`：`fetched`、`not-modified` 或 `carried-forward`；
- `etag`；
- `lastModified`；
- `contentType`；
- `cacheControl`；
- `bytes`；
- `sha256`；
- `contentFetchedAt`；
- `lastCheckedAt`。

字段组合和稳定 ID 必须满足：

| kind                | 必需实体字段                          | 稳定 `assetId`                                 | `localPath`                           |
| ------------------- | ------------------------------------- | ---------------------------------------------- | ------------------------------------- |
| `upstream-manifest` | 不含 `entity`、`language`、`entityId` | `upstream-manifest`                            | `manifest.json`                       |
| `entity-index`      | `entity`                              | `entity-index:{entity}`                        | `{entity}.json`                       |
| `entity-detail`     | `entity`、`language`、`entityId`      | `entity-detail:{entity}:{language}:{entityId}` | `{language}/{entity}/{entityId}.json` |

实体名必须来自代码注册表；`entityId` 的资源路径规则由对应实体规范确认，不能因为现有实体使用规范十进制 ID 就推断所有未来内部业务 ID 都相同。

`carried-forward` 表示定向重跑时该资产未发出 HTTP 请求，而是从旧快照复制到新 staging：

- 只允许出现在 `selected` 模式中未被请求的实体资产；
- 上游 manifest 和被请求实体的资产不得标记为 `carried-forward`；
- 复制前必须重新验证旧清单、预期路径、文件存在性、字节数和 SHA-256；
- 保留旧 `contentFetchedAt`、`lastCheckedAt` 和 HTTP 元数据；
- `carried-forward` 与实际收到 HTTP 304 的 `not-modified` 必须分别统计和报告。

缺失的可选 HTTP 响应头应记录为 `null`，不能用空字符串混淆“缺失”和“存在但为空”。

### 7.4 v2 summary

`summary` 使用全局计数和按实体分组的计数：

```json
{
  "entityTypeCount": 2,
  "assetCount": 11,
  "totalBytes": 48291,
  "entities": {
    "character": {
      "recordCount": 2,
      "detailCountByLanguage": { "zh": 2, "en": 2 },
      "assetCount": 5,
      "totalBytes": 30120
    },
    "equipment": {
      "recordCount": 2,
      "detailCountByLanguage": { "zh": 2, "en": 2 },
      "assetCount": 5,
      "totalBytes": 17991
    }
  }
}
```

计数规则：

- `entityTypeCount` 等于 `entities.length`；
- `recordCount` 来自实体索引动态发现的资源 ID 数量；
- `detailCountByLanguage` 记录该实体每种受支持语言的详情数量；
- 实体级 `assetCount` 包含该实体的一份索引和全部详情，不含上游 manifest；
- 实体级 `totalBytes` 是该实体全部资产的字节总和；
- 全局 `assetCount` 等于 `assets.length`，包含上游 manifest；
- 全局 `totalBytes` 是全部登记资产的字节总和，包含上游 manifest；
- 所有计数和字节数必须从最终合并资产集合重新计算，不得在旧 summary 上做未经重验的增量相加。

`v2` 不保留 `characterCount`、`zhDetailCount` 等实体专用顶层别名。旧 `v1` reader 在内存中将这些字段映射到 Character 实体 summary，以保持既有 Agents 验证和 CLI 行为。

### 7.5 v2 validation

`validation` 使用以下结构：

```json
{
  "entities": {
    "character": "passed",
    "equipment": "passed"
  },
  "crossEntityReferences": [
    {
      "checkId": "shiyu-monster-reference/v1",
      "fromEntity": "shiyu",
      "toEntity": "monster",
      "status": "passed",
      "checkedReferenceCount": 84,
      "unresolvedReferenceCount": 0,
      "reason": null
    }
  ]
}
```

`validation.entities` 必须恰好覆盖 `entities`，每个值只能是 `passed`。失败结果不得写入已发布清单；任何实体失败都必须阻止发布。

`validation.crossEntityReferences` 是数组，记录由实体或领域规范登记的跨实体检查，并满足：

- `checkId` 是稳定、全局唯一的 validator 标识；
- 记录按 validator 注册表的稳定顺序排列；
- 当前工具认识且在该快照的实体 epoch 中已经引入的每个 validator 必须恰好登记一条记录，不得遗漏或重复；
- validator 可以在晚于其来源实体的 epoch 引入；历史 manifest 只按当时已引入的 validator 集合验证，不追溯补写；
- `fromEntity` 和 `toEntity` 必须与 `checkId` 注册定义一致；
- 未登记、未知或字段不一致的检查明确失败。

状态语义：

- `passed`：来源和目标实体存在，检查已执行，`checkedReferenceCount` 为非负整数，`unresolvedReferenceCount` 必须为 0，`reason` 必须为 `null`；
- `not-run`：来源实体存在但目标实体不在可验证快照中，两个计数必须为 0，并提供非空 `reason`；
- `not-applicable`：来源实体不存在或该版本没有适用结构，两个计数必须为 0，并提供非空 `reason`；
- `failed` 不得进入已发布 manifest，只能作为 staging 校验错误报告。

正常新发布中，如果当前支持的来源实体依赖当前支持的目标实体，`not-run` 必须阻止发布。共享清单只表达检查身份、实体边界、状态和计数；`zone`、`modes`、node、battle、Monster 内部结构等规则保留在实体或领域规范中。

### 7.6 哈希和登记闭合

哈希规则：

- SHA-256 必须基于实际保存的原始响应字节；
- `bytes` 必须是同一字节序列的长度；
- 离线验证必须重新读取文件并计算字节数和 SHA-256；
- 任何不一致都应视为快照被修改或清单过期。

`assetId` 和 `localPath` 必须分别全局唯一。版本目录中的实际受管文件必须恰好等于 `fetch-manifest.json` 加全部 `assets[].localPath`；缺失文件和未登记文件都必须失败。

## 8. HTTP 与缓存策略

### 8.1 基本请求策略

实现使用 Node 24 原生 `fetch`，不为普通 JSON 请求增加 HTTP 客户端依赖。

来源配置维护：

- 最大并发：2；
- 请求启动最小间隔：250 ms；
- 单请求超时：30 秒；
- 最大尝试次数：3（含首次请求）；
- 可重试状态：`429`、`502`、`503`、`504`；
- 普通 `4xx` 不重试；
- 指数退避初始延迟和最大延迟；
- 单个成功响应的最大字节数。

优先遵守 `Retry-After`，但等待时间同样受配置上限约束；超限时不得等待或继续重试，应通过统一的“重试耗尽”错误路径失败，错误包含 URL、最后状态和尝试次数。无 `Retry-After` 时使用有上限的指数退避。

所有时间计算，包括 HTTP-date 形式的 `Retry-After`，必须使用 HTTP 客户端的同一时钟来源，以支持确定性测试。响应大小可以使用 `Content-Length` 提前拒绝，但仍须在流式读取时累计实际字节并执行硬上限，不能只信任响应头。

所有请求使用 `redirect: "manual"`，不自动跟随跳转。收到 3xx 响应时按失败处理，记录状态码与 `Location`，不把重定向目标当作可抓取资源。

这些值应由单一来源配置维护，不应散落在多个模块中。

### 8.2 User-Agent

必须使用清晰、诚实的项目 User-Agent，例如：

```text
fairy-data-source/0.2 (+https://github.com/LoTwT/fairy)
```

不得伪装成浏览器，也不得使用上游 robots 明确禁止的 bot 名称。

### 8.3 内容检查

成功响应至少应满足：

- HTTP 状态为 2xx；
- 响应体非空；
- 响应体可以被严格解析为 JSON；
- 解析结果满足对应实体资源的最低结构要求。

`Content-Type` 记录到抓取清单，但不作为独立判定条件，以严格解析结果为准。HTTP 200 但返回 HTML、挑战页或错误文档时必须失败，不能写入完整快照。

### 8.4 条件请求

已有快照和抓取清单存在时，应优先发送：

- `If-None-Match`；
- `If-Modified-Since`。

清单中对应值为 `null` 时跳过对应请求头，不得发送空值。`etag` 必须按响应原样记录，并在 `If-None-Match` 中原样回发。

收到 `304 Not Modified` 时：

- 复用已有原始文件前，必须校验旧清单的 `localPath` 是快照根目录内的安全 POSIX 相对路径，并与资源预期路径一致；
- 重新验证已有文件的字节数和 SHA-256；
- 文件缺失或完整性验证失败时，撤销该资源的条件请求头并执行一次无条件重抓；
- 无条件重抓仍失败时，本次抓取失败且不得替换已有快照；
- 保留原 `contentFetchedAt`，更新 `lastCheckedAt`；
- `etag`、`lastModified`、`contentType`、`cacheControl` 保留首次抓取时记录的值，304 响应头不回写清单；
- 将资源 `result` 记录为 `not-modified`。

### 8.5 同版本内容漂移

版本化 URL 不应被无条件假定为不可变。如果同一版本、同一 URL 返回不同内容：

- 必须比较 ETag、字节数和 SHA-256；
- 命令输出必须明确列出发生漂移的资源；
- 实体摘要数量变化及拒绝阈值由实体规范定义；
- 新快照只有在所有资源抓取和验证成功后才能整体替换旧快照；
- 后续清洗流程必须能够根据 SHA-256 判断输入是否变化。

完整成功的重抓可以更新本地缓存，但不得静默处理漂移。

## 9. 原子写入、版本锁与失败恢复

抓取过程中不得直接逐个覆盖正式快照目录。全量抓取和定向实体重跑都必须使用同一个版本级锁，并构建完整版本 staging。

全量抓取流程必须为：

1. 在目标版本目录旁创建空 staging 目录；
2. 抓取全部当前支持实体，或复用经验证的 304 旧内容；
3. 完成各实体最低结构和一致性校验；
4. 计算并写入完整版本抓取清单；
5. 对 staging 执行文件完整性、实体内部和适用跨实体关系验证；
6. 全部成功后替换目标版本目录；
7. 任一步骤失败时不得破坏旧快照；清理 staging 和释放版本锁之前，必须等待本次运行启动的全部并发任务停止。

定向实体重跑必须为：

1. 取得版本级锁并恢复可恢复的 staging/backup 残留；
2. 按其原始 schema 完整验证旧 `v1` 或 `v2` 快照；
3. 如果旧快照包含当前工具不认识的实体，明确失败，不得盲目保留或静默删除；
4. 确认旧快照包含全部未选的当前启用实体；缺少任一实体时拒绝定向重跑并提示执行全量抓取；
5. 创建空 staging；
6. 只按旧清单复制未选实体已登记且重新通过路径、字节数和哈希验证的资产，不得递归复制旧目录，也不得使用随后可能被写入的共享硬链接；
7. 完全排除所选实体的旧资产，并根据新索引重建该实体的完整资产集合，避免保留已被上游删除的详情；
8. 重新获取并登记上游 manifest；
9. 从最终资产集合重新生成 `v2` 清单和 summary；
10. 对完整 staging 重新执行所有实体内部验证和适用的跨实体关系验证；
11. 全部成功后整目录交换。

目标版本不存在时，只有请求实体集合等于当前全部支持实体时才能创建新快照；不得从空目录发布一份任意局部快照。

同一版本的抓取、恢复和交换必须由单持有者版本锁串行化：

- 其他进程能够观察到锁路径时，锁的完整所有权信息必须已经发布；不得暴露空锁或半写入锁；
- 每个锁包含不可预测的 owner token；正常释放前必须确认当前锁路径仍属于该 owner；所有权不一致时拒绝删除并明确失败；
- 抓取器不得根据 PID、锁年龄或锁内容自动删除已有锁；发现任何已有锁时都必须停止该版本的抓取或恢复，并提示用户确认没有对应进程运行后手动删除残留锁；
- 因崩溃、强制终止或异常关机遗留的锁由用户显式检查和清理；
- 并发任务首次失败后不得继续领取新任务；外层必须等待所有已启动任务 settle 后再清理和释放锁。

POSIX 上无法用单个 rename 原子替换非空目录，发布使用可恢复的三段式交换：

1. 将旧版本目录 rename 为同级 backup 目录；
2. 将 staging 目录 rename 为正式版本目录；该 rename 成功后视为已经提交；
3. 删除 backup；删除失败时必须报告“发布成功但 backup 清理失败”。

如果第 2 步失败，必须将 backup 回滚为正式目录。第 2 步成功后，不得再以普通失败语义掩盖已经更新的正式目录状态。

命令发现 staging、backup 或 lock 残留时：

- `fetch:nanoka` 只在目标版本不存在任何锁时取得新锁，并在持锁后完成 staging/backup 清理或回滚；发现锁残留时明确失败并提示人工处理；
- `verify:nanoka` 保持只读，不执行 rename 或删除，并将残留 artifact、只有 backup 而没有正式目录、无法确认所有权的 lock 报告为失败；
- 一个版本的非法目录名、损坏清单或残留状态不得阻止其他版本被检查；
- manifest 缓存候选扫描应逐目录隔离失败。

## 10. 来源配置与模块边界

当前实现使用 `policy.ts`、`http.ts`、`entities.ts`、各实体模块和 `snapshot.ts`，结构为：

```text
packages/data/
├── source-registry.json
├── scripts/
│   ├── nanoka-source.ts
│   └── nanoka/
│       ├── policy.ts
│       ├── http.ts
│       ├── entities.ts
│       ├── characters.ts
│       ├── equipment.ts
│       ├── weapon.ts
│       ├── bangboo.ts
│       ├── monster.ts
│       ├── shiyu.ts
│       ├── simul.ts
│       ├── boss.ts
│       └── snapshot.ts
└── raw/
```

实现后的共享职责：

- `source-registry.json`：来源 ID、URL、host/path 根 allowlist、语言、请求策略、User-Agent、robots/content-signal、本地缓存和再分发政策的单一事实来源；
- `nanoka-source.ts`：CLI 参数、交互选择、fetch/verify 调用、进度与结果输出、退出码；
- `policy.ts`：配置与上游 manifest 校验、版本选择、安全版本号、大小写冲突、注册实体 URL、host/path traversal 和未知路径拒绝；
- `http.ts`：原生 fetch、超时、节流、有限重试、手动重定向、条件请求、原始字节和 HTTP 元数据；
- `entities.ts`：代码实际支持实体的有序注册表、实体 adapter 接口和跨实体 validator 注册；
- 各实体模块：资源发现、资源 ID 排序、最低结构、实体内部一致性和实体级 summary；
- `snapshot.ts`：v1/v2 清单解析与适配、组合 staging、原始字节、SHA-256、分层离线验证、原子替换和失败恢复。

来源配置不等同于实现能力。仅在 `source-registry.json` 出现路径或实体名称不能启用实体；实体必须同时具有代码 adapter 和正式实体规范。实体 adapter 不得把 End Game 的 `zone`、`modes` 或图结构等特有模型提升为所有实体的共享要求。

## 11. 命令契约

当前和多实体实现完成后提供：

```bash
pnpm --filter @randomplay/data fetch:nanoka
pnpm --filter @randomplay/data fetch:nanoka --channel latest
pnpm --filter @randomplay/data fetch:nanoka --version <version>
pnpm --filter @randomplay/data fetch:nanoka --entity <entity>
pnpm --filter @randomplay/data verify:nanoka
pnpm --filter @randomplay/data verify:nanoka --version <version>
```

`--entity` 是已实现的 v2 命令扩展。

### `fetch:nanoka`

- 访问外部网络并写入 ignored raw cache；
- TTY 且无版本参数时先获取 manifest，再提示选择版本；
- 版本选择前不抓取实体资源，也不创建正式快照；
- 每次无参数运行都重新询问；非 TTY 默认使用 live；
- 显式 channel/version 参数跳过交互提示；
- 未提供 `--entity` 时抓取代码注册表中当前实现并启用的全部实体；
- `--entity` 可以重复，使用上游实体名；重复值去重，未知、未实现和大小写不匹配的值明确失败；
- 实体执行顺序使用代码注册表的稳定顺序，不依赖参数顺序；
- 提供 `--entity` 时只重新获取所选实体，但最终仍基于完整旧快照构建并发布包含全部支持实体的版本级组合快照；
- 目标版本不存在时，局部实体选择明确失败并提示执行全量抓取；
- `--entity character` 是多实体实现后的 Agents-only 定向重跑方式；
- 输出 manifest 获取、已选版本、本轮更新实体、沿用实体、快照准备、各实体资源数量、处理进度、分层离线校验和发布阶段；
- 进度事件由抓取流程以实体无关的结构化回调提供，终端文案由 CLI 层负责，基础模块不直接依赖 `console`；
- 每个实体的详情进度使用有界频率输出且最终数量必须输出，不为每个文件单独刷屏；
- 成功后输出版本、快照实体和各实体记录数、资源数、总字节数、HTTP 304 数、carried-forward 数和漂移数；
- 成功退出码为 0，参数、版本、抓取或校验失败时非 0。

具体实体显示名称和必要的额外进度信息由实体 adapter 与实体规范定义。

### `verify:nanoka`

- 不访问网络且不修改、迁移或重写快照；
- 同时支持严格的历史 `v1` Agents 快照和 `v2` 多实体快照；
- 校验来源配置、schema、实体集合、asset 字段组合、安全路径、文件存在性、字节数、SHA-256、JSON、登记闭合、summary、实体内部一致性和适用跨实体关系；
- 验证按清单与路径、文件完整性、实体内部、跨实体关系分层执行，并尽可能累计不依赖损坏字段的独立错误；
- 清单中的 `localPath` 必须先完成安全相对路径、containment 和预期路径校验；
- 单个文件或版本的错误不得中止其他可独立检查；
- `--version` 只校验指定版本，无参数时校验全部本地快照；
- 不提供 `--entity`，避免局部成功掩盖版本目录中的其他实体错误；
- 指定版本不存在时明确失败；任一校验失败时退出码非 0 并列出错误；
- 只有存在明确的受管 fixture 或快照策略后才接入默认 `check`。

默认测试和 `pnpm check` 不得依赖 Nanoka 在线可用。

## 12. 包架构边界

必须继续遵守 `packages/data/README.md`：

- `@randomplay/data` 拥有原始来源、清洗结果和发布数据；
- `@randomplay/data` 不依赖 `@randomplay/core`；
- 从数据记录到计算输入的转换由后续集成层负责；
- 不导入 core 类型或 schema；
- 不建立未经验证的公共 npm 数据 API；
- 只对抓取和完整性所需的最低上游结构建模；
- 保留所有未识别的上游字段。

## 13. 合规与使用边界

上游 robots.txt 的具体观测值以 `source-registry.json` 为单一事实来源。截至 2026-07-26：

```text
search=yes
use=reference
ai-train=no
```

本项目应：

- 将数据用于项目功能的数据参考和后续结构化处理；
- 不将抓取内容用于 AI 模型训练；
- 使用低频、可识别的抓取客户端；
- 不绕过登录、访问控制、挑战或明确的抓取限制；
- 在提交原始数据、公开镜像或再分发完整文本前另行评审授权与许可边界。

如果上游 robots、访问政策或可用性变化，应暂停在线同步并重新评审；现有本地快照仍可用于离线验证。

## 14. 共享测试要求

自动化测试至少覆盖：

- 交互和非交互版本策略、channel/version/entity 参数与无效上游 manifest；
- 注册实体 URL allowlist、host、路径穿越、未知语言和未知实体目录；
- 200、304、普通 4xx、有限重试、Retry-After、超时、重定向、空响应、非法 JSON 和响应大小上限；
- 原始字节 SHA-256 与字节数；
- 304 缓存完整性验证及一次无条件重抓；
- 严格 `v1` 验证、`v2` 解析、未知 schema 拒绝和同一 verify 运行中的 v1/v2 混合版本；
- `v1` 到 `v2` 只在成功发布时迁移，迁移失败时旧 v1 文件和清单不变；
- v2 asset 字段组合、全局 asset ID/localPath 唯一性、实体集合、fetch scope、summary 和 validation 可离线重算；
- 默认全实体抓取、定向实体重跑、无旧快照时局部抓取拒绝和未知实体拒绝；
- 未选实体不发 HTTP 请求，只复制旧清单登记且重新通过路径、字节数和哈希验证的资产；
- 选中实体整体重建，旧索引已删除的详情不会残留；
- `not-modified` 与 `carried-forward` 的元数据、时间和统计语义；
- 旧快照含未登记文件、缺失文件、篡改文件或当前工具不认识的实体时拒绝合并；
- staging 失败和跨实体关系失败不替换旧快照，完整成功后原子发布；
- 不同实体的同版本抓取仍由同一版本锁互斥；
- 锁的完整发布、并发拒绝、残留锁人工处理和 owner token 校验；
- 并发任务失败后的停止领取与 settle；
- 漂移报告、残留 artifact、损坏清单及逐版本错误隔离；
- 实体无关进度、每实体有界输出、最终进度、沿用实体报告和成功摘要；
- raw cache、脚本和来源配置不进入 npm tarball；
- `@randomplay/data` 不增加 core 依赖，公开 API 保持不变。

测试使用 mock fetch、临时目录和最小 fixture。除显式端到端验证外，测试套件不得访问真实 Nanoka 站点。

实体特有的测试与验收条件由实体规范补充。
