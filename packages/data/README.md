# @randomplay/data

Fairy 的版本化游戏数据包。

Nanoka 是当前已登记的数据来源，现已支持 Agents、Drive Discs、W-Engines、Bangboos、Monsters 和 Shiyu 的原始多实体快照、条件请求与离线完整性验证。原始数据默认只保存在 ignored 本地缓存中，包的公共导出仍保持为空。

## 约束

- 本包拥有原始来源、清洗结果和发布数据。
- 本包不依赖 `@randomplay/core`。
- 从数据记录到计算输入的转换由后续集成层负责。
