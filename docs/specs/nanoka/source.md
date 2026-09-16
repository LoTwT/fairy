# Nanoka 共享来源规范

## 状态

- 状态：轻量本地抓取缓存已实现
- 当前范围：版本发现与选择、安全 HTTP 请求、实体索引发现、`zh/en` 详情抓取和原始字节缓存
- 抓取器明确不包含：权威快照、运行时数据模型、字段级语义验证、跨实体验证、离线重放和跨机器分发
- 独立的[来源整合器](../data/integration.md#当前离线全量新制品构建)已支持明确本地版本的离线全量新制品构建与验证；不改变抓取缓存语义
- 适用包：`@randomplay/data`
- 数据来源：Nanoka ZZZ 静态数据
- 实体入口：[Nanoka 数据源规范索引](index.md)

## 1. 来源

Nanoka 前端直接使用 `static.nanoka.cc` 提供的版本化 JSON：

- 版本入口：`https://static.nanoka.cc/manifest.json`
- 数据根路径：`https://static.nanoka.cc/zzz/{version}/`

这些文件无需登录或 API key，但不是上游承诺长期兼容的正式 API。本项目当前只将其作为可重新获取的公开来源，不把本地副本视为权威制品。

### 已确认的图片地址规则

2026-09-14 核对 [Nanoka 站点](https://zzz.nanoka.cc/)加载的前端图片处理与资源前缀定义。
当时对应的 bundle 标识为 `_app/immutable/chunks/zzz.db75fd6b.js` 和
`_app/immutable/chunks/zzz.e60bf9a8.js`，仅作为历史定位记录；内容哈希随部署变化，不是稳定引用地址。
对于已确认的、以 `.png`
结尾的非空来源图片路径，去掉首尾空白和原目录，将文件扩展名改为 `.webp`，再添加当前站点的固定资源前缀。
以下是该输入范围内的等价拼接规则，不是包的公开 API：

```ts
const fileName = sourcePath.trim().split("/").pop()!
const imageUrl = `https://static.nanoka.cc/assets/zzz/${fileName.replace(/\.png$/i, ".webp")}`
```

例如，来源值 `UI/Sprite/A1DynamicLoad/IconRoleCircle/UnPacker/IconRoleCircle01.png` 对应
[IconRoleCircle01.webp](https://static.nanoka.cc/assets/zzz/IconRoleCircle01.webp)。地址不包含原来的
`UI/Sprite/...` 目录、来源版本号或语言。

同日通过 HTTP HEAD 复核 `IconRoleCircle01.webp`、`IconInterKnotRole0001.webp`、`IconCrit.webp`、
`IconFrost.webp`，四个地址均返回 `200` 和 `Content-Type: image/webp`。这记录的是这些样例在核对时的结果。

raw 与 integrated 继续保留原始资源值；完整 URL 属于消费时派生的访问地址。上述规则不适用于
`live2_d` 等无图片扩展名的动画资源标识：例如 `UISpine_Yidhari`，代理人页面将其用于 `.skel`、`.atlas`
资源并交给 Spine 查看器；当时的代理人前端加载代码位于 `_app/immutable/nodes/9.6a28401a.js`。
记录资源地址不改变第 3 节的抓取范围。

复核时从站点进入代理人页面，在浏览器开发者工具中查看实际加载的脚本，搜索
`static.nanoka.cc`、`/assets/zzz` 及 `.webp`，沿调用关系确认资源前缀、取文件名和替换扩展名的处理；
动画资源另查 `.skel`、`.atlas` 的请求与加载代码。记录核对日期和当次 bundle 标识，并用上述图片样例
检查实际响应。此过程用于复核当前行为，不能凭新部署的代码重建旧 bundle；本仓库未归档旧脚本正文。

## 2. 目标

共享抓取器负责：

1. 从上游 manifest 发现可用版本。
2. 默认选择正式服版本，并允许选择 `latest` 或明确版本。
3. 只访问固定 HTTPS host 和已登记资源路径。
4. 对超时、并发、请求频率、重试、单响应大小及单次抓取规模设置上限。
5. 从实体索引动态发现详情 ID。
6. 将成功获取的原始响应字节写入可删除的本地缓存。
7. 抓取器保持为仓库内部工具，raw 缓存不进入 npm 包；公开 API 与整合快照发布由[数据消费契约](../data/consumption.md)定义。

## 3. 非目标

本节非目标限于共享抓取器；独立的[来源资料整合](../data/integration.md)按自身契约执行结构校验与多语言拆分。抓取器当前不实现：

- 完整、不可变或可审计的数据快照；
- `fetch-manifest.json`、响应哈希、HTTP 元数据归档或 provenance；
- 条件请求、`304` 复用或跨运行内容漂移检测；
- 完整性证明、离线 `verify`、历史 manifest schema 兼容或迁移；
- 多实体组合发布、carried-forward、版本锁、整版本 staging、备份或回滚；
- Zod、JSON Schema 或等价的运行时字段模型；
- 字段级业务语义、跨语言一致性或跨实体引用验证；
- 清洗、重命名、裁剪或转换为 `@randomplay/core` 输入；
- 图片和其他静态资源；
- 定时任务、CI 在线抓取或自动遍历全部历史版本；
- 原始数据或清洗数据的 Git、npm 或制品存储分发。

## 4. 版本 manifest

```text
GET https://static.nanoka.cc/manifest.json
```

抓取器依赖以下最小结构：

```json
{
  "zzz": {
    "live": "3.0",
    "latest": "3.1.12+17625891",
    "available": ["3.0", "3.1.5+17516165", "3.1.12+17625891"]
  }
}
```

规则：

- `live`、`latest` 必须是 `available` 的成员；
- `available` 必须非空、无重复项和 ASCII 大小写冲突；
- 版本号只允许安全 ASCII 字符，长度不超过实现上限；
- 抓取器不得依赖示例中的具体版本值。

## 5. 版本选择

CLI 支持：

```text
--channel live
--channel latest
--version <available-version>
```

`--channel` 和 `--version` 互斥。交互终端中未提供参数时展示 `available` 列表；非交互终端默认使用 `live`。用户确认版本前，除 manifest 外不得抓取版本资源。

## 6. 实体资源

当前登记实体按以下稳定顺序处理：

```text
character
equipment
weapon
bangboo
monster
shiyu
simul
boss
```

每个实体使用：

```text
GET /zzz/{version}/{entity}.json
GET /zzz/{version}/{language}/{entity}/{entityId}.json
```

当前语言为 `zh`、`en`。详情 ID 只从相应索引顶层 key 动态发现，不从 manifest 的新增记录或其他实体推导。

无 `--entity` 时抓取全部登记实体；一个或多个 `--entity` 只更新指定实体。定向抓取不要求本地已有其他实体，也不构建完整组合结果。

## 7. 本地缓存

缓存位于：

```text
packages/data/raw/nanoka/{version}/
├── manifest.json
├── {entity}.json
├── zh/{entity}/{entityId}.json
└── en/{entity}/{entityId}.json
```

缓存语义：

- 文件保留远端响应原始字节；
- `packages/data/raw/` 被 Git 精确忽略；
- 缓存不进入 npm，也不通过项目机制分发；
- 缓存可随时删除，缺失时重新联网抓取；
- 目录可能包含不同运行留下的文件，不声明整目录完整或同批次；
- 抓取器不会生成 `fetch-manifest.json`，也不会扫描缓存证明完整性；
- 每个实体的索引在该索引发现的全部 `zh/en` 详情成功获取并解析后才写入；
- 失败前已经写入的详情可以保留为缓存，但不得据此推断本次实体抓取完成；
- 上游删除的旧详情文件可以留在目录中，消费者只能以当前实体索引为发现边界，不能枚举目录推断资源集合。

缓存路径由经过验证的版本、登记实体、固定语言和规范数字 ID 构造，不接受用户提供的任意路径。

### 本地观察引用

规范引用既有本地缓存时，记录包含版本、语言和实体 ID 的上游相对资源路径
（如 `zzz/3.1/en/character/1291.json`），并使用 JSON Pointer 定位字段或数组成员。资源路径相对于
第 1 节的静态来源，不表示仓库包含该文件，也不承诺上游继续保留该版本或原始内容。

不得把被 Git 忽略的缓存写成仓库文件链接，或使用缓存行号作为可长期复现的证据锚点。重新执行抓取
不保证恢复历史观察；当前版本发现与缓存语义仍分别遵循第 4 节和本节。记录定位信息不改变第 12 节
关于原始数据分发的边界。

## 8. 轻量输入检查

抓取器只执行完成资源发现所必需的检查：

- 响应必须是非空、有效 UTF-8 和有效 JSON；
- manifest 满足第 4 节的最小结构；
- 实体索引必须是非空普通对象；
- 索引 key 必须是规范十进制实体 ID，索引值必须是普通对象；
- 详情 JSON 顶层必须是普通对象。

这些检查不等价于数据模型验证。抓取器不保证字段存在、类型稳定、跨语言相等、引用闭合或业务公式正确。

## 9. HTTP 与资源边界

请求要求：

- 只允许 HTTPS；
- host 固定为 `static.nanoka.cc`；
- 禁止凭据、端口、query、fragment、路径穿越和未知实体路径；
- 重定向不自动跟随；
- 使用固定 User-Agent；
- 限制并发、请求启动间隔、超时、重试次数和退避时间；
- 只重试来源配置列出的暂时性状态；
- `Retry-After` 不得突破最大等待时间；
- 在读取流时执行单响应字节硬上限。

单次抓取还限制：

- 每实体最多发现的记录数；
- 本轮最多抓取的资源数；
- 本轮累计响应字节数。

这些限制用于约束网络和本机资源消耗，不用于证明缓存完整性。

## 10. 模块边界

```text
packages/data/
├── source-registry.json
├── scripts/
│   ├── terminal.ts
│   ├── nanoka-source.ts
│   └── nanoka/
│       ├── policy.ts
│       ├── http.ts
│       └── fetch.ts
└── raw/nanoka/                # ignored local cache
```

- `source-registry.json`：URL、allowlist、语言、请求和单次抓取限制。
- `policy.ts`：登记实体、配置、manifest、版本、URL 和路径策略；导出 `validateSourcePolicy` 供抓取与离线整合复用同一校验，保留配置语言顺序；当前数据恢复可单独校验历史支持语言子集，不放宽新输入的完整语言要求。语言及实体 ID 复用包内 `src/nanoka-identity.ts`，与纯整合模块保持同一来源身份规则。
- `http.ts`：节流、并发、超时、有限重试、响应字节读取。
- `fetch.ts`：通用索引发现、详情抓取和本地缓存写入。
- `nanoka-source.ts`：CLI、交互选择、进度和结果输出。
- `terminal.ts`：抓取、整合、验证入口共用的终端错误转义与长度限制，不依赖抓取 CLI 或 HTTP 客户端。

## 11. CLI

以下命令只供 Fairy 源码工作区使用，应在仓库根目录运行。`@randomplay/data` 不向 npm 消费者导出 CLI。

```bash
pnpm --filter @randomplay/data fetch:nanoka
pnpm --filter @randomplay/data fetch:nanoka --channel latest
pnpm --filter @randomplay/data fetch:nanoka --version <version>
pnpm --filter @randomplay/data fetch:nanoka --entity <entity>
```

当前不存在原始缓存验证命令 `verify:nanoka`；`verify:nanoka:agents` 用于独立整合制品，见[整合规范](../data/integration.md#当前离线全量新制品构建)。抓取 CLI 成功只表示本次请求范围内的资源已获取并通过第 8 节的轻量检查，不表示本地目录是一份完整或可复现快照。

### 终端错误文本

抓取、离线整合与制品验证命令在入口捕获失败，只输出错误 message，不默认展开堆栈或嵌套 cause。
[共享终端模块](../../../packages/data/scripts/terminal.ts) 将 C0/C1 控制字符、DEL、阿拉伯字母标记、方向标记、
行/段分隔符及双向控制字符转为可见的 `\u{xxxx}` 文本。每条错误最多处理前 4096 个 Unicode 码点，
超出时添加 `…`；转义后每个码点最多占 8 个字符。错误保留预算内的资源、实体、语言与字段定位，
只在 stderr 的命令错误行结尾添加真实换行。该限制仅用于终端显示，不修改 raw、制品、维护报告或库的结构化异常。
抓取命令继续使用原错误前缀、进度和成功输出方式；离线命令的 JSON 回执契约由整合规范维护。
stdout 管道关闭等异步输出错误使用同一错误出口，退出码为 1；不回滚已完成的缓存或制品写入。

## 12. 包边界与再分发

- `@randomplay/data` 不依赖 `@randomplay/core`；
- 包根公开 API 与整合快照的 npm 导出遵守[数据消费契约](../data/consumption.md)；
- npm 包只发布 `dist`；
- raw 缓存不进入 Git 或 npm；
- 若未来需要提交、上传或再分发数据，必须重新评审上游政策、存储成本和制品契约。

## 13. 验证范围

自动化测试覆盖：

- manifest 和版本选择；
- URL allowlist 与路径安全；
- HTTP 并发、节流、超时、重试、重定向和响应大小，其中超时测试确认配置值用于生成中止信号，并验证中止错误进入请求失败链路；
- 通用索引发现与基础 JSON/object 检查；
- 单次抓取记录、资源和字节预算，资源数或累计字节超限时不得发布实体索引；
- 原始字节写入及实体索引延后写入；
- raw 缓存不进入 npm tarball；
- 抓取器及 raw 缓存不进入公开 API；包消费验收由[数据消费契约](../data/consumption.md)定义。

不测试或承诺已列入第 3 节的非目标。
