# 静态构筑解析系统 V337：skill-matrix template contracts

## 1. 目标

`V337` 只解决一件事：

- 把 `matrix.ts` 中 skill-matrix template / source-stat helper 仍直接使用的本地 interface 与裸 `string/number` 参数统一收成显式公开 contract。

## 2. 范围

1. `StaticBuildAgentDetailsSkillTypeId`
2. `StaticBuildSkillMatrixTemplate`
3. `StaticBuildGenericSkillStatItem`
4. `getAgentDetails()`
5. `getSkillMultiplier()`
6. `inferGenericActionName()`
7. `inferGenericGroup()`
8. `inferGenericSkillTag()`
9. `buildGeneratedSkillMatrixTemplates()`
10. `build/index.ts` 对应 type export

## 3. 非目标

1. 不改变 skill-matrix 生成逻辑
2. 不调整 generic template 的标签推导规则
3. 不修改最终矩阵输出字段

## 4. 完成标准

1. `matrix.ts` 不再声明本地 `SkillMatrixTemplate / GenericSkillStatItem`
2. 上述 helper 的核心输入不再使用裸 `string/number`
3. lint、test、agent build 全部通过
