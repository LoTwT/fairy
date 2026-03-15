# 静态构筑解析系统 V309

## 目标

`V309` 只解决一件事：

- 为剩余公开 `string[]` alias 的元素补显式公开 type

## 范围

1. `StaticBuildSkillQualifierList`
2. `StaticBuildAssumptionList`
3. `StaticBuildUnsupportedEffectList`
4. `StaticBuildCombatTagList`
5. `StaticBuildAliasList`
6. `StaticBuildSourceNoteKeyList`
7. `StaticBuildDiagnosticKeyList`
8. `build/index.ts` 对外导出对应元素 type

## 非目标

1. 不处理 list 的聚合逻辑
2. 不处理 map key/value 语义
3. 不处理 `bucket / formula-multiplier` key

## 结果

完成后：

- 上述公开 list 不再直接暴露匿名 `string[]`
- 对外 `build` 入口能稳定导出对应的 list-element contract
