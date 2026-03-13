# 静态构筑解析系统 V33

`V32` 收口后，`zzz-data` 与高层 tool 的主结果 contract 已基本对齐。

当前剩余的主要 drift 不在底层结果结构，而在 `zzz-agent` 的 `resolve-build-*` 系列高层 tool：

1. unsupported / support-scope 响应仍由各个 tool 各自拼装
2. `supportedAgents / supportedWEngines / supportedDriveDiscs / candidates` 的组装逻辑重复
3. `resolve-build-skill-matrix` 仍本地复制 catalog matching helper，而不是复用 `resolve-build-shared.ts`

因此，`V33` 只解决一件事：

- 统一 `resolve-build-*` 高层 tool 的 support-scope 组装与 catalog helper

## 1. 目标

新增 / 收口：

1. 把高层 tool 的 unsupported / support-scope 结果组装下沉到 `resolve-build-shared.ts`
2. 让 `resolve-build-skill-matrix` 改为直接复用共享 catalog helper
3. 固定 `resolve-build-*` 系列 tool 的 unsupported 响应字段与 message 风格

## 2. V33 范围

1. `V33.1` scope freeze
2. `V33.2` shared support-scope helpers
3. `V33.3` tool migration
4. `V33.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 提取并复用高层 tool 的 support-scope helper
2. 统一高层 tool 的 unsupported / candidates 返回结构
3. 去掉 `resolve-build-skill-matrix` 中重复的 catalog matching helper

显式不做：

1. 不新增 `zzz-data` public key
2. 不调整底层 build/source-view/trigger-matrix/source-entry contract
3. 不新增新的 coverage
4. 不调整 Agent prompt 的输出模板

## 4. contract 方向

高层 tool 继续返回：

- `found`
- `message`
- `supportedAgents`
- `supportedWEngines`
- `supportedDriveDiscs`
- `supportedAnomalyTypes`
- `candidates`

但这些字段的组装方式改为统一 helper 驱动，不再在每个 tool 内手写。

## 5. 验收标准

1. `resolve-build-*` 系列 tool 不再各自手写大段 support-scope 拼装
2. `resolve-build-skill-matrix` 不再本地复制 catalog matching helper
3. 相关测试继续覆盖 unsupported agent / w-engine / drive-disc / anomaly type 路径
4. README / 总规格 / 索引 / 架构入口同步记录 `V33` 已收口

## 6. 当前状态

- `V33.1` 已完成：冻结到 support-scope normalization
- `V33.2` 待实现：提取共享 support-scope helper
- `V33.3` 待实现：迁移 `resolve-build-*` 高层 tool
- `V33.4` 待实现：README / 总规格 / 索引 / 架构入口同步收口
