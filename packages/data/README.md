# @fairy/data

Source ingestion and cleaned data package for Fairy.

Current state:

- source descriptors and metadata helpers are implemented;
- raw source archives are retained under the repo-level `data/source/`;
- buhflipexplode and Mihoyo Deadly Assault source snapshots have offline
  verification scripts;
- cleaned JSON will be generated under repo-level `data/cleaned/` by later S5
  tasks;
- `pnpm --filter @fairy/data sync-cleaned` mirrors repo-level cleaned JSON into
  package-local `packages/data/cleaned/` for npm packaging;
- package exports include TypeScript source/types plus package-local cleaned
  JSON, and exclude raw source archives.

Do not add hand-written formal game data to this package. Formal rows must be
derived from source documents and preserve source metadata.

Useful source checks:

- `pnpm --filter @fairy/data verify:buhflipexplode-da`
- `pnpm --filter @fairy/data verify:excel`
- `pnpm --filter @fairy/data verify:mihoyo-da`
