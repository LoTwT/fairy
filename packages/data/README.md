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
- V1 golden source candidates, manual acceptance records, and the replay report
  are generated under repo-level `data/cleaned/`;
- `pnpm --filter @randomplay/data sync-cleaned` mirrors repo-level cleaned JSON into
  package-local `packages/data/cleaned/` for npm packaging;
- package exports include TypeScript source/types plus package-local cleaned
  JSON, and exclude raw source archives.

Do not add hand-written formal game data to this package. Formal rows must be
derived from source documents and preserve source metadata.

Useful source checks:

- `pnpm --filter @randomplay/data verify:buhflipexplode-da`
- `pnpm --filter @randomplay/data verify:excel`
- `pnpm --filter @randomplay/data verify:golden-v1`
- `pnpm --filter @randomplay/data verify:mihoyo-da`
- `pnpm --filter @randomplay/data verify:nanoka`
- `pnpm --filter @randomplay/data verify:source-registry`
- `pnpm --filter @randomplay/data verify:source-migration`
