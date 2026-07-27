# Nanoka 共享来源规范

## 状态

- 状态：已实现并验证
- 实现范围：版本发现与选择、HTTP、条件请求、本地快照、离线校验、原子发布、版本锁和终端进度
- 验证状态：自动化检查通过，实际在线抓取流程已由用户确认
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

实体在该目录中的具体文件布局由实体规范定义。所有远端 JSON 应保存为响应原始字节，不应先经过 `JSON.parse` 和重新格式化后再写入。

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

每个版本快照必须包含 `fetch-manifest.json`，并使用显式 schema 标识：

```json
{
  "schemaVersion": "nanoka-fetch-manifest/v1"
}
```

清单顶层至少记录：

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
- `assets`；
- `summary`。

每个 asset 至少记录：

- `assetId`：跨多次运行保持稳定的唯一标识；
- `kind`；
- 实体需要时记录 `language` 和实体 ID；
- `url`；
- `localPath`：相对版本快照根目录的 POSIX 风格安全相对路径；
- `httpStatus`；
- `result`：`fetched` 或 `not-modified`；
- `etag`；
- `lastModified`；
- `contentType`；
- `cacheControl`；
- `bytes`；
- `sha256`；
- `contentFetchedAt`；
- `lastCheckedAt`。

实体规范定义可选实体 ID 的字段名、asset kind、稳定 asset ID、语言范围和 `summary` 计数字段。未来实体扩展不得静默改变既有字段的语义；需要不兼容变更时应升级 `schemaVersion`。

缺失的可选 HTTP 响应头应记录为 `null`，不能用空字符串混淆“缺失”和“存在但为空”。

哈希规则：

- SHA-256 必须基于实际保存的原始响应字节；
- `bytes` 必须是同一字节序列的长度；
- 离线验证必须重新读取文件并计算字节数和 SHA-256；
- 任何不一致都应视为快照被修改或清单过期。

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

抓取过程中不得直接逐个覆盖正式快照目录。流程必须为：

1. 在目标版本目录旁创建 staging 目录；
2. 抓取新内容，或复制经验证的 304 旧内容；
3. 完成实体最低结构和一致性校验；
4. 计算并写入抓取清单；
5. 离线重验 staging 中全部文件的字节数和 SHA-256；
6. 全部成功后替换目标版本目录；
7. 任一步骤失败时不得破坏旧快照；清理 staging 和释放版本锁之前，必须等待本次运行启动的全部并发任务停止。

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

实现使用：

```text
packages/data/
├── source-registry.json
├── scripts/
│   ├── nanoka-source.ts
│   └── nanoka/
│       ├── policy.ts
│       ├── http.ts
│       ├── characters.ts
│       └── snapshot.ts
└── raw/
```

共享职责：

- `source-registry.json`：来源 ID、URL、allowlist、语言、请求策略、User-Agent、robots/content-signal、本地缓存和再分发政策的单一事实来源；
- `nanoka-source.ts`：CLI 参数、交互选择、fetch/verify 调用、进度与结果输出、退出码；
- `policy.ts`：配置与 manifest 校验、版本选择、安全版本号、大小写冲突、URL allowlist、host/path traversal 和未知路径拒绝；
- `http.ts`：原生 fetch、超时、节流、有限重试、手动重定向、条件请求、原始字节和 HTTP 元数据；
- `snapshot.ts`：staging、原始字节、SHA-256、抓取清单、离线验证、原子替换和失败恢复。

实体模块职责由实体规范定义。抓取基础设施属于数据包维护工具，不从 `packages/data/src/index.ts` 导出。

## 11. 命令契约

当前提供：

```bash
pnpm --filter @randomplay/data fetch:nanoka
pnpm --filter @randomplay/data fetch:nanoka --channel latest
pnpm --filter @randomplay/data fetch:nanoka --version <version>
pnpm --filter @randomplay/data verify:nanoka
pnpm --filter @randomplay/data verify:nanoka --version <version>
```

### `fetch:nanoka`

- 访问外部网络并写入 ignored raw cache；
- TTY 且无版本参数时先获取 manifest，再提示选择版本；
- 版本选择前不抓取实体资源，也不创建正式快照；
- 每次无参数运行都重新询问；非 TTY 默认使用 live；
- 显式 channel/version 参数跳过交互提示；
- 输出 manifest 获取、已选版本、快照准备、实体与资源数量、处理进度、离线校验和发布阶段；
- 进度事件由抓取流程以结构化回调提供，终端文案由 CLI 层负责，基础模块不直接依赖 `console`；
- 成功后输出版本、实体数量、资源数、总字节数、缓存复用数和漂移数；
- 成功退出码为 0，参数、版本、抓取或校验失败时非 0。

具体实体进度粒度由实体规范定义。

### `verify:nanoka`

- 不访问网络且不修改快照；
- 校验来源配置、路径、文件存在性、字节数、SHA-256 和实体一致性；
- 清单中的 `localPath` 必须先完成安全相对路径、containment 和预期路径校验；
- 单个文件或版本的错误不得中止其他可独立检查；
- `--version` 只校验指定版本，无参数时校验全部本地快照；
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

- 交互和非交互版本策略、channel/version 参数与无效 manifest；
- URL allowlist、host、路径穿越、未知语言和未知实体目录；
- 200、304、普通 4xx、有限重试、Retry-After、超时、重定向、空响应、非法 JSON 和响应大小上限；
- 原始字节 SHA-256 与字节数；
- 304 缓存完整性验证及一次无条件重抓；
- staging 失败不替换旧快照，完整成功后原子发布；
- 锁的完整发布、并发拒绝、残留锁人工处理和 owner token 校验；
- 并发任务失败后的停止领取与 settle；
- 漂移报告、残留 artifact、损坏清单及逐版本错误隔离；
- raw cache、脚本和来源配置不进入 npm tarball；
- `@randomplay/data` 不增加 core 依赖，公开 API 保持不变。

测试使用 mock fetch、临时目录和最小 fixture。除显式端到端验证外，测试套件不得访问真实 Nanoka 站点。

实体特有的测试与验收条件由实体规范补充。
