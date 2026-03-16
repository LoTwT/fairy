# 静态构筑解析系统 V370：agent schema snapshot scalar contracts

## 背景

在 `resolve-build-schemas.ts` 里，snapshot 相关输入仍直接暴露匿名 `boolean` / `number`，包括：

- dynamic/state flags
- snapshot counts
- damage ratio / delta / multiplier factor
- `enemy.isStunned`
- `extraAbilityActive`

这些字段跨越 schema、scenario、resolver 多层，应当统一挂到显式 alias 上。

## 目标

`V370` 只解决一件事：

- 把 `resolve-build-schemas.ts` 中 snapshot 与场景布尔/数值输入补成显式公开 alias。

## 范围

1. `BuildToolEnemyStunnedFlag`
2. `BuildToolDynamicSnapshotFlag`
3. `BuildToolStateSnapshotFlag`
4. `BuildToolDynamicSnapshotCount`
5. `BuildToolSnapshotRatio`
6. `BuildToolResolvedSnapshotDeltaValue`
7. `BuildToolResolvedSnapshotMultiplierFactorValue`
8. `BuildToolScenarioExtraAbilityFlag`
9. `BuildToolEnemyInput`
10. `BuildToolDynamicSnapshotInput`
11. `BuildToolStateSnapshotInput`
12. `BuildToolResolvedSnapshotInput`

## 非目标

1. 不改 snapshot 字段语义
2. 不改 zod default / min 校验
3. 不改 resolver 的 snapshot 计算逻辑

## 完成标准

1. `resolve-build-schemas.ts` 的公开 snapshot 与场景布尔/数值输入不再直接暴露匿名 `boolean` / `number`
2. snapshot alias 可被后续 scenario / tool helper 复用
3. 全量校验通过
