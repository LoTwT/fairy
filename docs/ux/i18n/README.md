# UX i18n 资源说明

Owner: @UX
Status: v0.1（伴随 UX-S4-1 落地：Product 决策选 A，CLI ERR-CLI-* 全套双语化）
Inputs: D-02-rev / D-11 / Product CLI ERR-CLI-* 决策（A，2026-05-05）

## 资源文件

- `messages.zh.json`：中文（默认 `--lang zh`）
- `messages.en.json`：英文（`--lang en` 切换）

两个文件 key 集与 placeholder 集**严格一致**；新增 / 修改 key 必须同步更新两侧 + `_meta.totalEntries`。

## i18n 范围（V1）

V1 双语覆盖 **core engine 业务侧 diagnostic** + **CLI shell / argument validation 错误**（Product 决策 A，2026-05-05），共 **33 条**。

### 双语条目分组

| 系列 | 数量 | 含义 | 引入版本 |
|---|---|---|---|
| `ERR-RNG-*` | 9 | 乘区数值越界 | v0.3 |
| `ERR-DAT-*` | 4 | 内置 / data 包数据缺失 | v0.3 |
| `ERR-SRC-001` | 1 | 无来源 modifier（user / temporary contributor） | v0.3 / v0.4 重写 |
| `ERR-VER-*` | 4 | 版本不匹配双路径（重算 / 只读 / 二次确认）含 4 个 `original*` | v0.3 / v0.4 |
| `ERR-EVENT-*` | 4 | 真实伤害手动事件（partBreak / corruptedShieldCleanse 等） | v0.4 |
| `ERR-UI-*` | 3 | 空结果 / 加载 / unsupported feature | v0.3 / v0.4 |
| `ERR-OCR-000` | 1 | 不识别截图 | v0.3 |
| `ERR-CALC-PENDING-*` | 2 | anomaly / disorder PR #10 阶段 schema 骨架占位（TL-S3-4 实装后实际不再 emit，但保留资源） | UX-S3-1 |
| **`ERR-CLI-*`** | **5** | **CLI argument / schema 错误**（A 决策双语化） | **UX-S4-1** |

合计 33 条。

### Placeholder 约定（v0.4 + UX-S4-1）

| Key | Placeholders |
|---|---|
| `ERR-RNG-001` | `{raw}` |
| `ERR-RNG-002` / `ERR-RNG-003` | `{clamped}` |
| `ERR-DAT-003` | `{agentId}` |
| `ERR-EVENT-001` / `ERR-EVENT-004` | `{eventId}` / `{kind}` |
| `ERR-EVENT-003` | `{eventId}` / `{partId}` / `{enemyId}` |
| `ERR-VER-001~004` | `{originalRuleSetVersion}` / `{originalDataVersion}` / `{originalSourceVersion}` / `{originalGameVersion}` / `{currentRuleSetVersion}` |
| `ERR-SRC-001` | `{path}` |
| **`ERR-CLI-ARG`** | **`{message}`** |
| **`ERR-CLI-CMD`** | **`{command}`** |
| **`ERR-CLI-JSON`** | **`{input}`** |
| **`ERR-CLI-SCHEMA`** | （无 placeholder；schema 详情保持在 JSON `error.details` 字段） |
| **`ERR-CLI-UNCAUGHT`** | **`{message}`** |

ERR-CLI-* placeholder 由 TL（task #33 [TL-S4-follow]）锁定，本文件以此为权威；后续若新增 ERR-CLI-* 系列条目，TL/UX 协作锁 placeholder 后再增。

## 文件维护规则

1. **添加新 key**：必须同时改 zh + en + `_meta.totalEntries`
2. **修改文案**：保持 placeholder 集一致（同一 key 在两语言下用相同的 `{x}`）
3. **删除 key**：标 deprecated 而非直接删（防止存量 build.json / fixture 引用）
4. **PR 验证**：`jq empty messages.zh.json messages.en.json` + `diff <(jq -r 'keys[]' messages.zh.json | sort) <(jq -r 'keys[]' messages.en.json | sort)` 必须空

## 引用方

- `@fairy/core`：`Diagnostic.key` + `Diagnostic.messageParams`，core **不**输出本地化字符串
- `@fairy/cli`：
  - 业务 diagnostic：`renderDiagnostic(diagnostic, messages)` 按 `--lang` 加载对应 catalog 渲染
  - CLI shell 错误（ERR-CLI-*）：cliError 保留稳定 `code` + 通过 catalog 渲染本地化 `message`；catalog 缺 key 时用英文 fallback 常量表（task #33 [TL-S4-follow]）
- AI plugin / Web UI（V1.1+）：从 catalog 反序列化 + 模板填充，遵循 prompt-templates.md 4 档输出粒度

## 决策与历史

- 2026-05-05：Product 初始决策 B（CLI 错误英文 only），后基于"P1 玩家高频场景（snapshot.json schema 错）"反馈撤回，最终决策 A（CLI 错误也双语化）
- v0.4 / UX-S3-1 / UX-S4-1 累积，资源在 main 分支按 PR 流入
