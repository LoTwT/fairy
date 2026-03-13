# 静态构筑解析系统 V42

`V41` 收口后，`source-damage-view entry` 与 `trigger-entry matrix row` 已经具备稳定的：

1. `requirementSummary`
2. `diagnosticSummary`

当前剩下的一处高频上层负担，落在 `sourceNotes[]`：

1. source-view entry 仍只有逐条 source note 数组
2. trigger row 也仍只有逐条 source note 数组
3. 上层若只想知道是否存在 `missing-input / process-only / research-only`，仍需要自己扫描整组数组
4. 若要判断 source note 主要来自哪些 owner，也只能自行统计

`V42` 只解决一件事：

- 为 `source-damage-view` 与 `trigger-entry matrix row` 增加稳定的 source-note summary

## 1. 目标

为 `sourceNotes[]` 补一层结构化摘要，让上层可以直接判断：

1. 当前条目有多少条 source notes
2. 是否存在 `missing-input / process-only / research-only`
3. 哪些 source-note status 出现过
4. source notes 主要来自哪些 owner

## 2. 范围

1. `V42.1` scope freeze
2. `V42.2` source-view source-note-summary contract
3. `V42.3` trigger-row alignment
4. `V42.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildSourceDamageViewEntry` 增加 `sourceNoteSummary`
2. 为 `StaticBuildTriggerMatrixRow` 增加 `sourceNoteSummary`
3. 更新 compact helper、测试与文档

显式不做：

1. 不改变现有 `sourceNotes[]` 原始数组
2. 不新增新的 source-note status
3. 不新增新的 coverage
4. 不改 `ResolveStaticBuildResult.summary` 的既有结构

## 4. 目标 contract

新增通用 source-note summary 结构：

1. `count`
2. `hasSourceNotes`
3. `hasMissingInput`
4. `hasProcessOnly`
5. `hasResearchOnly`
6. `statusGroups[]`
   - `key`
   - `label`
   - `count`
7. `ownerGroups[]`
   - `key`
   - `count`

其中：

- `statusGroups[].key` 复用现有 `StaticBuildSourceNoteStatus`
- `ownerGroups[].key` 复用现有 `StaticBuildSourceNoteOwner`

## 5. 验收标准

1. source-damage-view entry 可直接读取 source-note summary
2. trigger row 可直接读取 source-note summary
3. 上层不需要再为了统计 source-note status / owner 而手工遍历数组
4. 现有 `sourceNotes[]` 与 compact helper contract 保持兼容

## 6. 当前状态

- `V42.1` 已完成：冻结到 source-note-summary contract
- `V42.2` 已完成：source-damage-view entry 已新增稳定 `sourceNoteSummary`
- `V42.3` 已完成：trigger row 与 compact helper 已对齐 `sourceNoteSummary`
- `V42.4` 已完成：README / architecture / roadmap 已同步收口
