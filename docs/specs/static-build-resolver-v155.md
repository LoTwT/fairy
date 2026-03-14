# 静态构筑解析系统 V155

## 目标

收紧 `compact skill-matrix` 的 `summary.groups[*]` 默认输出：

1. 默认不再透传组级 raw `assumptions`
2. 默认不再透传组级 raw `unsupportedEffects`
3. 继续保留组级 `assumptionSummary / caveatSummary`
4. 只有 `includeDetails=true` 时才展开组级 raw 明细

## 范围

- `packages/zzz-data/src/build/compact.ts`
- `packages/zzz-data/tests/build/compact.test.ts`
- `packages/zzz-agent/tests/resolve-build-skill-matrix.test.ts`
- `packages/zzz-agent/src/mastra/agents/zzz-agent.ts`
- `packages/zzz-data/README.md`

## 非目标

1. 不改变顶层 `matrix.assumptionSummary / matrix.caveatSummary`
2. 不改变行级 `row.assumptions / row.unsupportedEffects`
3. 不改变非 compact 的原始 `resolveStaticBuildSkillMatrix()` 返回值

## 完成状态

- 已完成：默认 compact `matrix.summary.groups[*]` 不再携带 raw `assumptions / unsupportedEffects`
- 已完成：`includeDetails=true` 时仍可读取组级 raw `assumptions / unsupportedEffects`
- 已完成：测试、README、Agent prompt 与 roadmap 已同步
