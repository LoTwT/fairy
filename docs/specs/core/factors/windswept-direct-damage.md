# 风化直接攻击伤害乘区

`windsweptDirectDamageFactor`（`factorId: "windswept_direct_damage"`）计算
`1 + baseCoefficient + Σ coefficientIncreases`。这是具名机制，不是任意 special 倍率入口。
纯 Factor 不判断角色身份、敌人状态或攻击标签；适用性由[静态契约](../static-calculation.md#当前目标风化与直接攻击)验证。

## 输入与组合

`WindsweptDirectDamageFactorInput` 必须提供 `baseCoefficient: number` 和
`coefficientIncreases: readonly number[]`。二者均为 ratio 数值，基础系数不包含数组中的增量。
无增量显式给 `[]`；每项及基础系数必须有限、非负，缺项、稀疏数组及求和／最终结果溢出拒绝。
接受显式零和非 0.10 基础系数；不默认 10%、不钳制、不自动换算百分数。
数值 0.18 本身不能证明调用方误把合计系数当成基础值，调用方负责避免重复包含已选增量。

已有普通、贯穿、锐化纯伤害公式的必需输入和计算范围保持不变。静态入口在原公式结果上组合本 Factor，
分别缩放 nonCritical 和 critical，分别检查有限性（即使 CR=0 也检查暴击分支），再按原暴击语义计算
expected。两分支均返回独立的 `factors.*.windsweptDirectDamage`，不改写普通易伤、增伤或暴击乘区。
已知不适用时用恒等倍率且不调用本 Factor；旧请求不声明状态时保持原结果与归因形状。

## 来源与证据强度

1. Nanoka 正式 3.2 [中文](https://static.nanoka.cc/zzz/3.2/zh/character/1621.json)与
   [英文](https://static.nanoka.cc/zzz/3.2/en/character/1621.json)
   `/passive/level/1621501—1621507/desc/1` 第三条确认 Roxy 的 **8%**、另一名强攻／命破／锋御资格、
   队伍施加的风化、风及当前浸染属性直接攻击范围。原始响应 SHA-256 分别为
   `299637ab8aaafbe41003819f8e58f9248cbacf3537f7d5b55332e249ddc2e93c`、
   `0692d88153c3cad37fb4e34c5446820763b8628490aba54294dc031b3ddf1334`；
   integrated 两语言的固定摘要及 14 个指针由[补充规则](../../../../packages/data/scripts/static-effects/roxy-additional.ts)登记。
2. 阿冰（wang730465）的[第一手机制报告](https://forum.gamer.com.tw/C.php?bsn=74860&snA=6498)
   提取文本 663—668 行给出 `100%+风化系数`，自述实测与减易伤乘算，并限定对应属性直伤，称 Roxy 可提升该系数。
   冻结 HTML SHA-256 为 `17d5f46419a3fec9356a0a81624db1dab2dbc47a0c75bd1ae64f6588a939088e`。
   这支持独立乘区及系数加法；文中“目前测到的均为10%”不足以证明所有来源永久固定为 10%。
3. 将确定的文本 8% 与该机制报告结合，**实现推论**为 Roxy 向本乘区提供 `+0.08`。
   `0.10+0.08=0.18` 是有来源支持的模型；本轮未进行游戏内伤害实测，也不把两计算器一致当独立游戏证据。
   多 Roxy 覆盖次序、普通独立附伤的游戏直接攻击标签仍未证实，由静态契约明确限制。

固定 ZZZ-HP `0a6c2d872babf36c017db92981ef2fa659fc6c56` 同块 special18 经过泛 special 路径，
目标源码 `da6a8c08bcc447c49da2bbb657891ded6dfa11d6` 使用 18% 且忽略属性限制，均不能直接导入。
网站 `/api/meta` 归档摘要 `422765b5ba2d09135042fe1e96949b0c71a099ff4dd0587ddd2c2cd3fb989e20`
只证实相关元数据记录一致，没有部署 SHA，不能由此确认部署求值器与 GitHub 版本一致。
完整 note、调用链、固定文件摘要和原文在 C4 审查证据包中归档；正式数据仍沿用 Nanoka 3.2 与原冻结 effects 来源。

## 独立数值验收

`D0=1000×2×1.5×1×0.5×0.8×1.3×1.5=2340`；基础 0.10 时为 2574，
Roxy 合资格时为 2761.2，而再次乘 1.08 会错误得到 2779.92。
普通易伤独立改为 0.8 时，D0=1440，基础风化为 1584，Roxy 后为 1699.2。
基础系数为零时关闭／启用 Roxy 为 2340／2527.2；基础 0.20 时为 2808／2995.2（接口合成例，不声称游戏基础值）。

真实加农转子独立项 ATK1000、倍率2、声明 CR0.25、CD0.5、其他乘区为1：
分类 false 为 N2000/C3000/E2250；true 且基础0.10 为 N2200/C3300/E2475；
合资格 Roxy 为 N2360/C3540/E2655。分类缺失必须拒绝，以上 true 是调用方的条件模型。
