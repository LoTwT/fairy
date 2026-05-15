# @randomplay/data

Source ingestion and cleaned data package for Fairy.

Current state:

- source descriptors and metadata helpers are implemented;
- raw source archives are retained under the repo-level `data/source/`;
- buhflipexplode, Mihoyo Deadly Assault, and nanoka live source snapshots have
  offline verification scripts;
- D-20 source registry gates live under `source-registry.json` and are verified
  by `verify:source-registry`;
- Phase 3 nanoka drift reports live under `cleaned/audit/nanoka-drift-report/`
  and are verified by `verify:source-migration`;
- Phase 4 nanoka runtime data lives under `cleaned/runtime/game-data.json` and
  is verified by `verify:nanoka-runtime`;
- V1.2.1 Bangboo batch audit lives under
  `cleaned/audit/nanoka-bangboo-batch-audit.json` and verifies all 39
  approved-live nanoka 2.8 Bangboos;
- V1.2.x character batch audit lives under
  `cleaned/audit/nanoka-character-batch-audit.json` and verifies all 53
  approved-live nanoka 2.8 Agents;
- V1.2.x W-Engine batch audit lives under
  `cleaned/audit/nanoka-wengine-batch-audit.json` and verifies all 89
  approved-live nanoka 2.8 W-Engines;
- V1.2.x Drive Disc batch audit lives under
  `cleaned/audit/nanoka-drive-disc-batch-audit.json` and verifies all 26
  approved-live nanoka 2.8 Drive Disc sets;
- V1.2.x Enemy batch audit lives under
  `cleaned/audit/nanoka-enemy-batch-audit.json` and verifies all 269
  approved-live nanoka 2.8 Enemies;
- V1.2.x current Deadly Assault batch audit lives under
  `cleaned/audit/nanoka-da-current-batch-audit.json` and verifies all 38
  approved-live nanoka 2.8 DA periods;
- V1.2.x historical Deadly Assault batch audit lives under
  `cleaned/audit/nanoka-da-historical-batch-audit.json` and verifies 505
  manifest-available non-current DA period rows in `historicalDAPeriods`;
- V1.2.x full-data batch discovery lives under
  `cleaned/audit/nanoka-full-data-batch-discovery.json` and locks the domain
  counts, exclusions, historical DA boundary, and implementation PR sequence;
- V1 golden source candidates, manual acceptance records, and the replay report
  are generated under repo-level `data/cleaned/`;
- `pnpm --filter @randomplay/data sync-cleaned` mirrors repo-level cleaned JSON into
  package-local `packages/data/cleaned/` for npm packaging;
- package exports include TypeScript source/types plus package-local cleaned
  JSON, and exclude raw source archives.

Do not add hand-written formal game data to this package. Formal rows must be
derived from source documents and preserve source metadata.

## 数据来源声明 / Data Sources

This package bundles cleaned ZZZ game-data artifacts for local damage
calculation. V0.1.0 runtime data is derived from approved-live nanoka source
snapshots (`manifest.zzz.live`) and preserves source metadata for audit. The
post-release V1.2.1/V1.2.x batches add the full approved-live nanoka 2.8
Bangboo, Agent, W-Engine, Drive Disc set, Enemy, and current Deadly Assault
period catalogs, plus historical Deadly Assault periods in the dedicated
non-current `historicalDAPeriods` bucket, without changing the package version.

Source details are recorded in `source-registry.json` and the bundled cleaned
JSON artifacts. Excel, Mihoyo D-17, and buhflipexplode D-12 snapshots remain
archived audit references in the repository; they are not runtime sources and
are not included as raw payloads in the npm package.

This is not an official HoYoverse / miHoYo package. Game data, text, and images
belong to their respective rights holders. If this package infringes your
rights, contact the maintainers through a GitHub issue and we will respond
within 24-72 hours.

Useful source checks:

- `pnpm --filter @randomplay/data verify:buhflipexplode-da`
- `pnpm --filter @randomplay/data verify:excel`
- `pnpm --filter @randomplay/data verify:golden-v1`
- `pnpm --filter @randomplay/data verify:mihoyo-da`
- `pnpm --filter @randomplay/data verify:nanoka`
- `pnpm --filter @randomplay/data verify:nanoka-da-history`
- `pnpm --filter @randomplay/data verify:nanoka-runtime`
- `pnpm --filter @randomplay/data verify:source-registry`
- `pnpm --filter @randomplay/data verify:source-migration`
