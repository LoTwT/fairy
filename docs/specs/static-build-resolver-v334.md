# 静态构筑解析系统 V334：assumption and unsupported-effect set contracts

## 1. 目标

`V334` 只解决一件事：

- 把 `skill-matrix` 与 `trigger-matrix` 中 assumptions / unsupported-effects 去重时仍直接使用的 `Set<string>` 统一收成显式公开 contract。

## 2. 范围

1. `StaticBuildAssumptionSet`
2. `StaticBuildUnsupportedEffectSet`
3. `summarizeSkillMatrix()`
4. `resolveStaticBuildSkillMatrix()`
5. `resolveStaticBuildTriggerMatrix()`
6. `build/index.ts` 对应 type export

## 3. 非目标

1. 不修改 assumptions 或 unsupported-effects 的文案
2. 不改变任何 summary 聚合逻辑
3. 不处理 `source-entry` 等其他普通数组复制

## 4. 完成标准

1. `matrix.ts` 中相关去重集合不再直接使用裸 `Set<string>`
2. `trigger-matrix.ts` 中 assumptions 去重集合不再直接使用裸 `Set<string>`
3. 新增 set alias 已从 `build/index.ts` 导出
4. lint、test、agent build 全部通过
