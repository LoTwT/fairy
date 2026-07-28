# Nanoka 共享来源规范

## 状态

- 状态：轻量本地抓取缓存已实现
- 当前范围：版本发现与选择、安全 HTTP 请求、实体索引发现、`zh/en` 详情抓取和原始字节缓存
- 明确不包含：权威快照、运行时数据模型、字段级语义验证、跨实体验证、离线重放和跨机器分发
- 适用包：`@randomplay/data`
- 数据来源：Nanoka ZZZ 静态数据
- 实体入口：[Nanoka 数据源规范索引](index.md)

## 1. 来源

Nanoka 前端直接使用 `static.nanoka.cc` 提供的版本化 JSON：

- 版本入口：`https://static.nanoka.cc/manifest.json`
- 数据根路径：`https://static.nanoka.cc/zzz/{version}/`

这些文件无需登录或 API key，但不是上游承诺长期兼容的正式 API。本项目当前只将其作为可重新获取的公开来源，不把本地副本视为权威制品。

## 2. 目标

共享抓取器负责：

1. 从上游 manifest 发现可用版本。
2. 默认选择正式服版本，并允许选择 `latest` 或明确版本。
3. 只访问固定 HTTPS host 和已登记资源路径。
4. 对超时、并发、请求频率、重试、单响应大小及单次抓取规模设置上限。
5. 从实体索引动态发现详情 ID。
6. 将成功获取的原始响应字节写入可删除的本地缓存。
7. 保持 `@randomplay/data` 公开 API 为空，不将缓存打入 npm 包。

## 3. 非目标

当前不实现：

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
│   ├── nanoka-source.ts
│   └── nanoka/
│       ├── policy.ts
│       ├── http.ts
│       └── fetch.ts
└── raw/nanoka/                # ignored local cache
```

- `source-registry.json`：URL、allowlist、语言、请求和单次抓取限制。
- `policy.ts`：登记实体、配置、manifest、版本、URL 和路径策略。
- `http.ts`：节流、并发、超时、有限重试、响应字节读取。
- `fetch.ts`：通用索引发现、详情抓取和本地缓存写入。
- `nanoka-source.ts`：CLI、交互选择、进度和结果输出。

## 11. CLI

```bash
pnpm --filter @randomplay/data fetch:nanoka
pnpm --filter @randomplay/data fetch:nanoka --channel latest
pnpm --filter @randomplay/data fetch:nanoka --version <version>
pnpm --filter @randomplay/data fetch:nanoka --entity <entity>
```

当前不存在 `verify:nanoka`。CLI 成功只表示本次请求范围内的资源已获取并通过第 8 节的轻量检查，不表示本地目录是一份完整或可复现快照。

## 12. 包边界与再分发

- `@randomplay/data` 不依赖 `@randomplay/core`；
- `packages/data/src/index.ts` 保持空公开 API；
- npm 包只发布 `dist`；
- raw 缓存不进入 Git 或 npm；
- 若未来需要提交、上传或再分发数据，必须重新评审上游政策、存储成本和制品契约。

## 13. 验证范围

自动化测试覆盖：

- manifest 和版本选择；
- URL allowlist 与路径安全；
- HTTP 并发、节流、超时、重试、重定向和响应大小；
- 通用索引发现与基础 JSON/object 检查；
- 单次抓取记录、资源和字节预算；
- 原始字节写入及实体索引延后写入；
- raw 缓存不进入 npm tarball；
- `@randomplay/data` 公开 API 保持不变。

不测试或承诺已列入第 3 节的非目标。
