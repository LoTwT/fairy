# 技能来源 991bb0e 升级与动作核对

日期：2026-10-26

状态：已实施，技能规则版本 `agent-actions/3`。

## 背景

静态 effects 已在 revision 53 切换到 ZZZ-HP `991bb0e`，技能动作仍固定在上一个技能来源
`0df40c5b`。991bb0e 的 `/skills` 新增 137 条来源技能，其中大部分是按职业/异常分支
自动展开的 `disorder`、`anomalyRelease` 与 `-main` 行；真正需要与现有动作目录核对的
是三条额外结算行：

- `sk-yanagi-nk-1221016-额外附加`（终结技：雷影天华·额外附加）
- `sk-yanagi-nk-1221022-额外附加`（强化特殊技：月华流转·额外附加）
- `sk-lucia-nk-1451011-合唱-额外`（强化特殊技：死神协奏曲·破晓·[合唱]额外）

另有一个孤立子类 `1011-basic-mvhir0y7`（安比普通攻击），没有被任何动作目标引用。

## 裁定

- 技能证据切到 `991bb0e`，更新六个固定资源的 SHA-256。
- 三条额外结算行回填到既有动作的 `upstreamSkillId`：
  - `action:agent:1221:action:0018` → `sk-yanagi-nk-1221016-额外附加`
  - `action:agent:1221:action:0024` → `sk-yanagi-nk-1221022-额外附加`
  - `action:agent:1451:action:0025` → `sk-lucia-nk-1451011-合唱-额外`
- 三条动作仍保持 `unavailable`，原因仍是特殊机制/未支持表达式；本批只补来源身份，
  不把额外结算当作普通攻击力伤害。
- Burnice 的[余烬]/[余烬-特殊]是[燃油特调]状态触发与额外段，Nanoka 没有独立动作行；
  不生成新的可选动作，也不自动追加到普攻或支援动作。
- 三见闻（1631）与菲欧妮（1641）的 20 条动作继续保留既有 `upstreamSkillId: null`；
  991bb0e 虽然已包含这些来源行，全量 provenance 回填留待后续批次，避免本批扩大身份迁移。
- `1011-basic-mvhir0y7` 没有动作引用，不引入；孤立子类不因为没有引用而制造虚假动作。

## 制品变化

- 动作数保持 `1,348`：1,166 damage、174 daze-only、4 luminize、4 unavailable。
- `rulesVersion` 从 `agent-actions/2` 升到 `agent-actions/3`；来源差异条目从 167 降到 163。
- 只有 `packages/data/definitions/skills/agents/1221.json`、
  `agents/1451.json` 与 `skills/manifest.json` 改变；其余 60 名成员动作字节不变。
- manifest 证据提交与六个资源摘要更新为 `991bb0e`。
- 单元素参考夹具的 89 个 pointer 随新来源索引更新，倍率值未变。
- 计算数据快照随技能 manifest 改变，所有 calculator 参考夹具的 `snapshotId` 同步更新。

## 验证

```sh
pnpm --filter @randomplay/data generate:agent-actions /path/to/ZZZ-HP-991bb0e /tmp/actions
pnpm --filter @randomplay/data test
pnpm --filter @randomplay/core test
pnpm check
pnpm --filter @randomplay/data verify:artifact-dependencies
pnpm --filter @randomplay/data audit:data-identity
pnpm --filter @randomplay/data verify:nanoka:current integrated
```

实际结果：生成器覆盖仍为 62/1,348/1,166/174/4/4/1；data 与 core 测试、`pnpm check` 全部通过。
`authoring:verify` 通过；制品依赖检查为 730 个节点、915 条边、0 个违规；身份审计
`outcome: matched`、`newProblems: []`。`verify:nanoka:current integrated` 返回 `verified: true`，
`state.json` 摘要仍为 `f4310abb…`、`maintenance.json` 为 `fe19c577…`，`lock.sqlite` 为空且未留下
事务 journal。计算数据快照更新为
`sha256:7a4206e5e1e1d1f1dfb7318d3ddc967754caf3d89011eab4ab9aab0e7d121198`。

新增测试：

- 三条额外结算动作的 `upstreamSkillId` 已回填且仍为 `unavailable`。
- Burnice 不生成[余烬]来源动作；安比动作目录不引用孤立子类 `1011-basic-mvhir0y7`。

## 数据管理

本批只改 Git 跟踪的技能动作制品、来源证据、测试与文档，不改 Nanoka 整合规则、
来源版本或 `packages/data/integrated`。主工作区仍需执行
`pnpm --filter @randomplay/data verify:nanoka:current integrated` 并按
[来源数据整合规范](../specs/data/integration.md#数据管理状态的同步维护)复核管理状态。

## 回退

- 回退本批即恢复技能证据 `0df40c5b`、三条动作的 `upstreamSkillId: null` 与
  `agent-actions/2`；动作、manifest、单元素夹具和文档一并回退。
- 若生成器拒绝来源摘要或 registry 身份，先核对固定提交与资源文件，不要放宽摘要检查。
