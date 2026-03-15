# 静态构筑解析系统 V346：enemy category helper contracts

## 背景

当前公开游戏模式 helper 中，最后一个仍直接暴露裸 `number` 输入的是 [isEnemyCategoryCode()](/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/game-modes.ts)：

- `isEnemyCategoryCode(value: number): value is EnemyCategoryCode`

虽然 [EnemyCategoryCode](/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/game-modes.ts) 已经是公开 union contract，但 helper 输入还没有显式 alias。

## 目标

`V346` 只解决一件事：

- 给 enemy category helper 的输入补显式公开 contract，不改变任何分类语义和运行时判断。

## 范围

1. 新增 `EnemyCategoryCodeInput`
2. `isEnemyCategoryCode(value: EnemyCategoryCodeInput)`
3. 文档同步

## 非目标

1. 不扩展新的敌人分类代码
2. 不改变 `enemyCategoryCodes`
3. 不赋予这些 raw code 新的业务语义名称

## 完成标准

1. `isEnemyCategoryCode()` 不再以裸 `number` 暴露输入
2. 运行时判断保持不变
3. 全量校验通过
