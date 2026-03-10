# Data Contract Review

本文档是 `zzz-data` 公开数据 contract 与 cleaned/helper layer 改造的执行基线。

## Contract 边界

以下目录视为公开 contract：

- `packages/zzz-data/data/en/*.json`
- `packages/zzz-data/data/zh-CN/*.json`

以下目录仅视为内部实现或历史参考，不作为稳定公开接口：

- `packages/zzz-data/data/raw/**`
- `packages/zzz-data/data/xlsx/**`

## 分层设计

1. Raw/source-compatible layer
   - 对应 `src/gachabase/types.ts`、`src/game-modes.ts`
   - 忠实描述发布 JSON，不改 raw shape
2. Canonical terminology layer
   - 对应 `src/terms.ts`、`src/text.ts`
   - 统一术语、属性桶、富文本语义
3. Cleaned/helper layer
   - 对应 `src/cleaned/**`
   - 不生成第二份 JSON，只提供稳定消费 helper
4. Consumer layer
   - 主要是 `zzz-agent`
   - 直接使用 cleaned/helper layer，而不是自行解释 raw 结构

## 执行阶段

| 阶段    | 状态        | 目标                                                                 |
| ------- | ----------- | -------------------------------------------------------------------- |
| Phase 1 | `completed` | 术语层、rich text 语义、基础 enemy/version helper                    |
| Phase 2 | `completed` | DA / SD / TS cleaned view helper（flatten / normalized text arrays） |
| Phase 3 | `completed` | 完整 damageContext helper、mode/version 选择与搜索 helper            |
| Phase 4 | `completed` | `zzz-agent` 接入 cleaned/helper layer                                |
| Phase 5 | `completed` | 整体 review、文档收口、最终校验                                      |

## Review Checklist

1. 公开 contract 只认 `data/en` / `data/zh-CN`
2. `gachabase` 维持列表 / 详情拆分
3. `game-modes` raw 深层结构继续保留
4. rich text 字段继续保留 raw 值，通过 helper 清洗
5. 特殊属性与基础抗性桶继续分层建模
6. `versionTime` 只视为 display-only period string
7. `Enemy*.type` 先保留 raw code，不命名业务语义
8. cleaned/helper layer 不生成第二份 cleaned JSON

## 阶段 Review 记录

### Phase 1

- 结论：通过
- 范围：
  - `terms.ts`
  - `text.ts`
  - `cleaned/enemy.ts`
  - `cleaned/versions.ts`
- 校验：
  - `lint --fix`
  - `prettier`
  - `tsc --noEmit`
  - `zzz-data test`
  - `zzz-data build`

### Phase 2

- 结论：通过
- 范围：
  - `cleaned/deadly-assault.ts`
  - `cleaned/shiyu-defense.ts`
  - `cleaned/threshold-simulation.ts`
  - `cleaned/types.ts`
- 新增能力：
  - `DA` buff 视图与敌人扁平化 helper
  - `SD` 节点视图、`buffName` / `buffDesc` 数组化、null side 过滤
  - `TS` boss side / regular side 区分视图与敌人扁平化 helper
- 自 review：
  - raw JSON shape 未修改
  - `SD` / `TS` 的 side / wave / enemy 索引均转为 1-based 消费视图
  - `TS` 继续保留 `boss` / `regular` 双 sideRole，不虚构额外业务语义
- 校验：
  - `tsc --noEmit`
  - `zzz-data test`
  - `zzz-data build`

### Phase 3

- 结论：通过
- 范围：
  - `cleaned/encounter.ts`
  - `cleaned/versions.ts`
  - `cleaned/deadly-assault.ts`
  - `cleaned/shiyu-defense.ts`
  - `cleaned/threshold-simulation.ts`
- 新增能力：
  - encounter 级别的敌人选择 helper 与带 encounter 元信息的 damage-context
  - `SD` / `TS` side-level multiplier 透传到 flattened encounter 和 damage-context
  - `SD` / `TS` 难度别名解析、默认模式选择、按 versionKey 定位版本
  - `DA` / `SD` / `TS` 按敌人名称搜索版本 helper
- 自 review：
  - `TS` regular side 的 `sideElementMult` 与单个 enemy `elementMult` 不总一致，因此 cleaned layer 同时保留 `elementMultiplier` 与 `sideElementMultiplier`
  - encounter 选择在模糊匹配命中多个敌人时不再猜测，改为返回候选名列表
  - raw JSON 与 raw 类型字段未修改，仅增强 cleaned 消费接口
- 校验：
  - `tsc --noEmit`
  - `zzz-data test`
  - `zzz-data build`

### Phase 4

- 结论：通过
- 范围：
  - `packages/zzz-agent/src/mastra/tools/zzz/lookup-game-mode.ts`
  - `packages/zzz-agent/tests/lookup-game-mode.test.ts`
- 新增能力：
  - `lookupGameMode` 改为复用 `zzz-data` cleaned helper，移除本地模式解析、版本默认选择与 damage-context 拼装逻辑
  - `TS` 查询支持 `side > 2`
  - 当 `enemyName` 模糊命中多个敌人时，tool 返回候选列表而不是静默选择第一项
- 自 review：
  - Mastra tool 的 `createTool` 形状未改，仅替换内部数据解释层
  - `lookupGameMode` 对 `damageContext` 仍保留现有外部字段名（如 `defenderBaseDefense`、`recommendedDefenderResistance`），避免影响上层 prompt / scorer
  - `TS` regular side 会额外透出 `sideElementMultiplier`，解决 side-level 与 enemy-level multiplier 不一致但此前被丢弃的问题
- 校验：
  - `zzz-agent tsc --noEmit`
  - `zzz-agent test`
  - `zzz-agent build`

### Phase 5

- 结论：通过，无新增 findings
- 整体 review：
  - `zzz-data` 现已形成 raw / canonical / cleaned / consumer 四层分工，raw shape 保持稳定
  - `zzz-agent` 的 `lookupGameMode` 不再维护第二套版本选择、难度解析和 damage-context 逻辑
  - `TS` regular side 的 side-level multiplier 差异已透传到 cleaned layer 与 tool 输出，不再静默丢失
  - 文档已覆盖 contract 边界、cleaned helper 结构、consumer 接线情况与阶段性 review 结果
- 最终校验：
  - `pnpm run lint --fix`
  - `pnpm run prettier`
  - `pnpm run test`
  - `pnpm --filter zzz-data run build`
  - `pnpm --filter zzz-agent run build`
