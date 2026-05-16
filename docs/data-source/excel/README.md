# Excel Workbook Source

Status: retired audit baseline (raw archive removed in V0.1.2)
Owner: @TechLead
Related task: task #40

`git-history:data/source/excel/data.xlsx` is the former lo-user-provided
workbook source for base-game data. The workbook raw archive was physically
removed from the current tree in V0.1.2 after nanoka became the runtime-primary
source; it remains recoverable from git history for audit only and is not
published in the `@randomplay/data` package.

## Current Audit

- Workbook: `git-history:data/source/excel/data.xlsx`
- Workbook version marker: `2.6.0_R14028417`
- Workbook hash:
  `9f42ecf734f45908c18bedf7ae937479f9f1563e4b3314a50d76cb99233a260b`
- Sheet count: 31
- Audit artifact: `git-history:data/source/excel/workbook-audit.json`

The audit records sheet visibility, ranges, range row/column counts, non-empty
row counts, first header row, and V1 scope classification. It does not publish
cleaned game data and does not infer typed modifiers from text.

The V1 replay baseline uses a narrower generated artifact:

- `packages/data/cleaned/audit/v1-agent-source-candidates.json`
- `packages/data/cleaned/audit/nicole.acceptance.json`
- `packages/data/cleaned/audit/yanagi.acceptance.json`

That artifact extracts only Yixuan / Nicole / Yanagi identity rows and
calculation-relevant source text candidates needed by the DD-002 19-anchor
golden scope. The acceptance artifacts record lo-user-approved G22/G23 mappings.
The replay harness now reads the generated golden audit artifacts directly; it
does not require the physical workbook in the current tree. Historical anchors
that were originally sourced from Excel keep git-history source references for
audit traceability.

## V1 Candidate Sheets

V1 main scope is Deadly Assault. After the V0.1.0 nanoka runtime cutover, Excel
is retained as an archived audit reference only and is not a runtime fallback.
The archived workbook still documents historical base-game rows used by earlier
golden evidence.

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

The retired workbook audit used `xlsx` before V0.1.2. The parser scripts and
dependency were removed with the raw archive; runtime and current verification
must use nanoka-backed artifacts instead.

Useful commands:

- `pnpm --filter @randomplay/data audit:golden-v1`
- `pnpm --filter @randomplay/data verify:golden-v1`

The current verify gate checks:

- golden replay artifacts remain release-ready;
- retired Excel source ids stay fail-loud and never become current runtime
  sources;
- npm pack payload excludes raw source files and `.xlsx` files.
