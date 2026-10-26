# D6 动作来源身份回填

日期：2026-10-26

状态：已实施，技能规则版本 `agent-actions/4`。

## 背景

D6-1 在技能来源 `0df40c5b` 上补齐赛维里安（1631）与菲欧妮（1641）各 20 条动作时，
该来源还没有这两名角色的技能行，因此全部动作的 `upstreamSkillId` 为 `null`。技能证据随后
升级到 `991bb0e`，来源已登记两人的直伤技能行；本批只补来源身份，不改变任何倍率、元素、
分类或可用性。

## 映射

两条角色的 34 条直伤动作按以下证据逐条对应：

- 来源技能名与动作名一致；普通攻击分段按来源的`·一段`至`·四段`顺序对应。
- 动作 12 级系数与来源 `damagePercentage / 10000`、`damagePercentageGrowth / 10000` 相等。
- 1641 的`焚罪`与`烬火追魂`使用来源的 `-main` 直伤行；同段 `-异放倍率` 行仍作为独立结算限制，
  不并入直接伤害。
- 1631 的`四段极限闪避成功时`对应独立来源行，不与普通四段合并。
- 两条角色各 3 条招架支援仅失衡动作没有直接伤害来源行，保留 `upstreamSkillId: null`，不伪造来源。

映射后新增一条具名来源差异：`action:agent:1641:action:0014` 的来源培养类别为 `chain`，但动作说明
明确“视为[终结技]伤害”，因此动作分类保持 `ultimate`；差异条目从 163 增至 164。

## 制品变化

- `rulesVersion` 从 `agent-actions/3` 升到 `agent-actions/4`。
- 动作数保持 `1,348`：1,166 damage、174 daze-only、4 luminize、4 unavailable。
- 只有 `agents/1631.json`、`agents/1641.json` 与 `skills/manifest.json` 改变。
- 34 条直伤动作获得 `upstreamSkillId`；6 条招架仅失衡仍为 `null`。

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

测试逐条断言 34 个来源 ID 与动作顺序，并断言招架仅失衡动作仍为 `null`。

实际结果：生成器仍输出 62 名成员、1,348 条动作；`pnpm check` 与 data/core 测试通过。
`authoring:verify` 通过；制品依赖检查为 730 个节点、915 条边、0 个违规；身份审计
`outcome: matched`、`newProblems: []`。`verify:nanoka:current integrated` 返回 `verified: true`，
管理状态摘要保持不变（`state.json` `f4310abb…`、`maintenance.json` `fe19c577…`，`lock.sqlite` 为空）。
计算数据快照更新为
`sha256:ccb28367195fe2f2b4183623a3332119fbc742ffc484b40cd9be89be645623ae`。

## 数据管理

本批只改 Git 跟踪的技能动作制品、registry、测试与文档，不改 Nanoka 整合规则、来源版本或
`packages/data/integrated`。完成前仍需按
[来源数据整合规范](../specs/data/integration.md#数据管理状态的同步维护)复核主工作区管理状态。

## 回退

回退本批即恢复 1631/1641 动作的 `upstreamSkillId: null`、`agent-actions/3` 与差异条目 163；
动作数值、来源证据和其他成员不受影响。
