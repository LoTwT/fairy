/** 满足规则 nanoka-drive-disc-reference/1 必需结构的合成输入；不读取真实 raw，不使用生产登记表生成 fixture。 */
export function driveDiscSource() {
  return {
    id: 930001,
    name: "示例驱动盘",
    desc2: "暴击率+8%。",
    desc4: "<color=#FFFFFF>[强化特殊技]</color>命中时，攻击力提升9%，持续6秒。",
    story: "刻录在示例驱动盘里的合成故事。\n第二段保留换行。",
    icon: "UI/Sprite/IconSuit/ExampleIcon.png",
    icon2: "UI/Sprite/IconSuit/ExampleIcon2.png",
  }
}

/** 索引摘要与语言详情是两个独立来源：索引名称与详情名称故意不同，不要求相等。 */
export function driveDiscInput() {
  const zh = driveDiscSource()
  const en = driveDiscSource()
  en.name = "Example Drive Disc"
  en.desc2 = "CRIT Rate +8%."
  en.desc4 =
    "Landing a hit with an <color=#FFFFFF>EX Special Attack</color> increases ATK by 9%."
  en.story =
    "A synthetic story line for the example drive disc.\nSecond paragraph."
  return {
    entityId: "930001",
    detailLocales: ["zh", "en"] as const,
    sourceRecord: {
      icon: "UI/Sprite/IconSuit/ExampleIcon.png",
      zh: { name: "索引示例名称", desc2: zh.desc2, desc4: zh.desc4 },
      en: { name: en.name, desc2: en.desc2, desc4: en.desc4 },
      ja: {
        name: "サンプル例",
        desc2: "会心率+8%。",
        desc4: "合成された説明。",
      },
      ko: { name: "예시 샘플", desc2: "치명타 확률+8%", desc4: "합성 설명." },
    },
    details: { zh, en },
  }
}

/**
 * 多成员合成输入的英文详情名称：按成员 ID 派生，类内唯一且与索引 `sourceRecord.en.name`
 * 及任何单成员 fixture 名称不同，用于捕获发布目录生成取错名称来源。
 */
export function syntheticDriveDiscEnglishName(memberId: string): string {
  return `Example Drive Disc ${memberId}`
}
