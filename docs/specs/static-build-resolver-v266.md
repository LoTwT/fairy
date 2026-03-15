# V266 build scenario multiplier input contracts

`V265` 收口后，`skillMultiplier / damageMultiplier` 这组场景倍率输入仍在 `types.ts` 与 `resolve-build-schemas.ts` 多处重复出现为裸 `number | string` union。

`V266` 只解决一件事：

1. 为这组 scenario multiplier 输入补显式公开 type，并让 build-layer 与高层 schema 统一复用，不改变任何运行时行为

## 266.1 分阶段

1. `V266.1` scope freeze
2. `V266.2` alias alignment
3. `V266.3` schema alignment
4. `V266.4` tests / runtime alignment
5. `V266.5` docs closeout

## 266.2 非目标

1. 不改变 scenario 字段集合
2. 不改变 multiplier 解析逻辑
3. 不扩展 dynamic/state/resolved snapshot 的 multiplier contract

## 266.3 当前状态

- `V266.1` 已完成：冻结到 scenario multiplier input contract
- `V266.2` 已完成：`types.ts` 已新增显式 multiplier input alias
- `V266.3` 已完成：`resolve-build-schemas.ts` 与 `build/index.ts` 已统一复用这些 type
- `V266.4` 已完成：现有 build / agent 测试与 runtime 校验已覆盖
- `V266.5` 已完成：roadmap、索引与架构文档已同步
