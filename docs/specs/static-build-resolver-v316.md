# 静态构筑解析系统 V316：skill-matrix metadata numeric contracts

## 目标

`V316` 只解决一件事：

- 为 `build/types.ts` 中 `skill-matrix row metadata` 剩余的裸 `number` 字段补显式公开 type

## 范围

1. `StaticBuildSkillMatrixRowMeta.order`
2. `StaticBuildSkillMatrixRowMeta.sourceSkillTypeId`
3. `StaticBuildSkillMatrixRowMeta.sourceOccurrence`
4. `StaticBuildSkillMatrixRowMeta.segmentIndex`

## 非目标

1. 不修改任何 runtime 行为
2. 不处理 `compact.ts`
3. 不新增新的 metadata 字段

## 结果

- `skill-matrix row metadata` 已统一复用既有显式公开数值 type：
  - `StaticBuildOrder`
  - `StaticBuildSourceSkillTypeId`
  - `StaticBuildSourceOccurrence`
  - `StaticBuildSegmentIndex`
- `build/types.ts` 中这条裸 `number/string` contract 主线已收口
