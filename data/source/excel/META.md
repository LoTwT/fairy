# data.xlsx Source Metadata

Status: S5 source input
Owner: @TechLead
Provided by: @lo-user
Received: 2026-05-05T12:16:24+08:00
Slock attachment: `ad475609-e4c6-4213-819b-b214ad0ade65`

## File

| Field | Value |
|---|---|
| Path | `data/source/excel/data.xlsx` |
| Size | `961305` bytes |
| SHA-256 | `9f42ecf734f45908c18bedf7ae937479f9f1563e4b3314a50d76cb99233a260b` |
| Format | Microsoft Excel 2007+ workbook |
| Distribution | Versioned in git as source archive; excluded from npm/package outputs |

## Workbook Sheets

- 首页
- Q&A
- 代理人技能数据
- 代理人属性
- 敌人属性
- 异常条
- 敌人属性调整
- 代理人技能描述
- 代理人核心技描述
- 代理人强化
- 代理人觉醒
- 代理人影画描述
- 代理人晋升属性
- 合作者档案
- 法厄同图鉴
- 敌人强化
- 敌人转阶段
- 音擎属性
- 音擎描述
- 邦布属性
- 邦布技能
- 驱动盘描述
- 物品列表
- 空洞见闻
- 关于打断与抗打断
- 敌人属性（1.3版本）
- 驱动盘升级表 (hidden)
- 绳网等阶升级表 (hidden)
- 代理人升级表 (hidden)
- 邦布升级表 (hidden)
- 音擎升级表 (hidden)

## Usage Rules

- Use this workbook as a source document for `@randomplay/data` cleaning.
- Every cleaned row derived from the workbook must retain `sourceId:
  "lo-user-excel"`, a workbook source version / hash, and a sheet/cell or row
  anchor where available.
- Do not manually type formal data from this file without parser evidence.
- If a sheet/field meaning is unclear, stop and ask @lo-user instead of
  inferring values.
