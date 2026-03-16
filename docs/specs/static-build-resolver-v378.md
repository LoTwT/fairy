# 静态构筑解析系统 V378：w-engine lookup helper contracts

## 背景

`packages/zzz-agent/src/mastra/tools/zzz/lookup-w-engine.ts` 里仍保留一组匿名 helper contract：

- query 名称与 locale 文本
- `calculatedATK: number | undefined`
- `calculatedSecondaryStat: { name: string; value: number } | undefined`
- `activeEffect` 的内联 shape
- `wEngine: Record<string, unknown>`

这让音擎 lookup 层相比 agent/game-mode 已经收口的 helper contract 仍留有一段局部匿名 map / effect shape。

## 目标

`V378` 只解决一件事：

- 把 `lookup-w-engine.ts` 的 calculated stat、active effect 与 trimmed result 统一改成显式 alias / interface。

## 范围

1. `LookupWEngineQueryName`
2. `LookupWEngineLocale`
3. `LookupWEngineCalculatedAttack`
4. `LookupWEngineCalculatedSecondaryStatName`
5. `LookupWEngineCalculatedSecondaryStatValue`
6. `LookupWEngineCalculatedSecondaryStat`
7. `LookupWEngineEffectLevel`
8. `LookupWEngineEffectName`
9. `LookupWEngineEffectText`
10. `LookupWEngineActiveEffect`
11. `LookupWEngineTrimmedValue`
12. `LookupWEngineTrimmedResult`

## 非目标

1. 不改音擎查询逻辑
2. 不改 ATK / 副属性计算逻辑
3. 不改返回字段语义

## 完成标准

1. `lookup-w-engine.ts` 不再暴露匿名 calculated-stat、effect 或 trimmed-result helper contract
2. 现有 lookup 测试、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
