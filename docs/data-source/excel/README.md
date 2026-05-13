# Excel Workbook Source

Status: S5-2b source-shape audit baseline
Owner: @TechLead
Related task: task #40

`data/source/excel/data.xlsx` is the lo-user-provided workbook source for
base-game data. The workbook is retained in git as raw/source archive and is not
published in the `@randomplay/data` package.

## Current Audit

- Workbook: `data/source/excel/data.xlsx`
- Workbook version marker: `2.6.0_R14028417`
- Workbook hash:
  `9f42ecf734f45908c18bedf7ae937479f9f1563e4b3314a50d76cb99233a260b`
- Sheet count: 31
- Audit artifact: `data/source/excel/workbook-audit.json`

The audit records sheet visibility, ranges, range row/column counts, non-empty
row counts, first header row, and V1 scope classification. It does not publish
cleaned game data and does not infer typed modifiers from text.

The V1 replay baseline uses a narrower generated artifact:

- `data/cleaned/audit/v1-agent-source-candidates.json`
- `data/cleaned/audit/nicole.acceptance.json`
- `data/cleaned/audit/yanagi.acceptance.json`

That artifact extracts only Yixuan / Nicole / Yanagi identity rows and
calculation-relevant source text candidates needed by the DD-002 19-anchor
golden scope. The acceptance artifacts record lo-user-approved G22/G23 mappings.
The replay harness reads minimal Excel enemy rows only when V1.x golden anchors
require them (currently Greta for G18, 匪祸侵蚀体·凶心疯汉 for G19, and
恶名·哈提 for G20). It does not
publish trusted typed modifiers without deterministic template support or manual
acceptance.

## V1 Candidate Sheets

V1 main scope is Deadly Assault. Excel remains the base-game source and fallback,
but V1 does not require full `cleaned/enemies`.

Candidate sheets for the narrowed V1 reader:

| Group | Sheets |
|---|---|
| agents | `代理人属性`, `代理人技能数据`, `代理人技能描述`, `代理人核心技描述`, `代理人强化`, `代理人觉醒`, `代理人影画描述`, `代理人晋升属性` |
| W-Engines | `音擎属性`, `音擎描述`, hidden `音擎升级表` |
| Drive Discs | `驱动盘描述`, hidden `驱动盘升级表` |

Deferred in V1 unless a golden anchor requires a minimal subset:

| Group | Sheets |
|---|---|
| enemies | `敌人属性` |
| Bangboo | `邦布属性`, `邦布技能` |

Historical/archive-only:

- `敌人属性（1.3版本）`

## Parser Policy

The workbook audit uses `xlsx` as a repository devDependency. It is only used for
source verification and generation scripts. It must not become a runtime
dependency of the published `@randomplay/data` package.

Useful commands:

- `pnpm --filter @randomplay/data audit:excel`
- `pnpm --filter @randomplay/data audit:golden-v1`
- `pnpm --filter @randomplay/data verify:excel`
- `pnpm --filter @randomplay/data verify:golden-v1`

The verify gate checks:

- workbook SHA-256 matches `data/source/source-manifest.json`;
- workbook version marker remains `2.6.0_R14028417`;
- workbook has 31 sheets;
- all V1 candidate sheets are present;
- `workbook-audit.json` is not stale against the current workbook and parser.
