# 静态构筑解析系统 V382：canonical term helper contracts

## 背景

`packages/zzz-data/src/terms.ts` 是公开 helper 模块，但内部 canonicalizer 仍直接使用一组裸 helper contract：

- `normalizeTerm(value: string): string`
- `createCanonicalizer<T extends Record<string, readonly string[]>>()`

这让术语标准化层相比已经收口的 helper contract，仍保留一段局部匿名文本 / group-map shape。

## 目标

`V382` 只解决一件事：

- 把 `terms.ts` 的 canonical term helper 输入输出与 group-map 统一改成显式 alias。

## 范围

1. `CanonicalTermText`
2. `NormalizedCanonicalTermText`
3. `CanonicalTermGroupMap`
4. `normalizeTerm()`
5. `createCanonicalizer()`

## 非目标

1. 不改术语映射表
2. 不改公开 `toAgentSpecialty / toAgentAttribute / toAttackType` 语义
3. 不改任何上游数据 contract

## 完成标准

1. `terms.ts` 不再暴露匿名 canonical-term helper contract
2. 现有术语测试、构建与 agent 适配保持通过
3. roadmap、索引与架构文档同步
