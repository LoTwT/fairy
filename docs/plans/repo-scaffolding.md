# Repo Scaffolding Plan

## Status

Ready for implementation.

## Goal

Bootstrap the pnpm + TypeScript monorepo so that `pnpm install`, `pnpm typecheck`, `pnpm build`, and `pnpm test` all pass on a clean checkout across all three packages.

This plan applies to the `refactor` branch as a clean-slate replacement track. It does not attempt to preserve or migrate the current `origin/main` package layout during scaffolding.

## Toolchain

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 24.x | Runtime |
| pnpm | 10.33.0 (via corepack) | Package manager + workspace |
| TypeScript | 6.0.2 | Type-checking |
| tsdown | 0.21.8 | Build (JS + dts) |
| vitest | 4.1.4 | Test runner |
| ESLint | 10.2.0 | Lint + format |
| @antfu/eslint-config | 8.2.0 | Flat config preset (replaces Prettier) |
| jiti | 2.6.1 | Runtime loader for `eslint.config.ts` |
| simple-git-hooks | 2.13.1 | Git hooks |
| lint-staged | 16.4.0 | Run linter on staged files |
| @types/node | 24.12.2 | Node globals for CLI and tests |

Commit the generated `pnpm-lock.yaml` in the scaffolding commit. Do not use `latest`, `^`, or `~` ranges for tooling in this stage.

## Workspace Layout

```
fairy/
├── .github/workflows/ci.yml
├── .gitignore
├── .npmrc
├── package.json          # root, private, scripts + devDeps
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── vitest.config.ts
├── eslint.config.ts
├── packages/
│   ├── data/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsdown.config.ts
│   │   └── src/index.ts
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsdown.config.ts
│   │   └── src/index.ts
│   └── cli/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsdown.config.ts
│       └── src/index.ts
├── tests/
│   └── smoke.test.ts
└── docs/  (existing, unchanged)
```

This `refactor` branch is currently docs-only. The scaffolding commit adds the files above, updates the root config files in this plan, and keeps `docs/` unchanged.

## Branch Cutover Context

`origin/main` currently contains a different monorepo layout, including `packages/server` and `packages/zzz-data`. This scaffolding plan does not reshape that branch in place.

- `refactor` is the clean-slate replacement track for the approved `data` / `core` / `cli` package structure
- `origin/main` remains the rollback and reference branch until later migration work lands
- `packages/server` is explicitly out of scope for this scaffolding plan; no replacement service is delivered here
- `packages/zzz-data` is treated as legacy source material and migration history for later data-focused plans, not as a parallel long-term package in the new layout
- Do not copy legacy runtime code into the scaffold just to preserve structure; later child plans own any deliberate migration

## Root Configuration

### `.gitignore`

```
node_modules/
dist/
*.tsbuildinfo
.DS_Store
*.log
coverage/
```

### `.npmrc`

```
auto-install-peers=true
shell-emulator=true
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
shellEmulator: true
trustPolicy: no-downgrade
```

### Root `package.json`

- `"private": true`, `"type": "module"`
- `"packageManager": "pnpm@10.33.0"` — pin via corepack
- `"engines": { "node": "24.x" }`
- All tooling lives in root devDependencies, pinned to exact versions with no ranges
- Root devDependencies are pinned as:
  - `typescript@6.0.2`
  - `tsdown@0.21.8`
  - `vitest@4.1.4`
  - `eslint@10.2.0`
  - `@antfu/eslint-config@8.2.0`
  - `jiti@2.6.1` so ESLint can load `eslint.config.ts`
  - `simple-git-hooks@2.13.1`
  - `lint-staged@16.4.0`
  - `@types/node@24.12.2` to match the `Node 24.x` runtime line

Scripts:

| Script | Command | Purpose |
|--------|---------|---------|
| `build` | `pnpm -r run build` | Build all packages (topological order) |
| `test` | `vitest run` | Run tests once |
| `test:watch` | `vitest` | Watch mode |
| `lint` | `eslint .` | Lint all files |
| `lint:fix` | `eslint . --fix` | Auto-fix |
| `typecheck` | `pnpm -r run typecheck` | Type-check each package |
| `verify:artifacts` | `node ./tests/verify-artifacts.mjs` | Assert built package exports and CLI shebang |
| `check` | `pnpm lint && pnpm typecheck && pnpm build && pnpm verify:artifacts && pnpm test` | Full validation |
| `prepare` | `simple-git-hooks` | Install git hooks on `pnpm install` |

## Package Manifests

All three packages: `"private": true`, `"type": "module"`, `"version": "0.0.0"`.

All three packages also define:

- `"scripts": { "build": "tsdown", "typecheck": "tsc --noEmit" }`

### `@randomplay/fairy-data` (`packages/data`)

- No workspace dependencies
- Exports: `{ ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } }`
- Build: `tsdown` (config in `tsdown.config.ts`)

### `@randomplay/fairy-core` (`packages/core`)

- No workspace dependencies in the scaffolding phase
- Exports: same pattern as data
- Build: `tsdown` (config in `tsdown.config.ts`)
- Do not add `@randomplay/fairy-data` here until `docs/plans/data-core-integration.md` defines and approves that dependency

### `@randomplay/fairy-cli` (`packages/cli`)

- Dependencies: `@randomplay/fairy-core: "workspace:*"`
- `"bin": { "fairy": "./dist/index.js" }`
- Build: `tsdown` (config in `tsdown.config.ts`, no `dts` — CLI has no type consumers)
- Do not add `@randomplay/fairy-data` here in the scaffolding phase; the package-structure plan keeps `cli` focused on `core`

## tsdown Configuration

Each package has a `tsdown.config.ts`. All output ESM to `dist/`. In this phase, all placeholder sources stay package-local and do not import sibling workspace packages.

### `packages/data/tsdown.config.ts`

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  clean: true,
  dts: true,
  fixedExtension: false,
})
```

### `packages/core/tsdown.config.ts`

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  clean: true,
  dts: true,
  fixedExtension: false,
})
```

### `packages/cli/tsdown.config.ts`

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  clean: true,
  fixedExtension: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
})
```

No `dts` for CLI. Set `fixedExtension: false` so package outputs follow the ESM package layout (`.js` instead of `.mjs`), and inject the shebang through tsdown `banner` instead of relying on source-level preservation.

## TypeScript Configuration

No root tsconfig. Each package owns its full `tsconfig.json`. Each package also has a `typecheck` script: `tsc --noEmit`.

During scaffolding, `src/index.ts` files must not import sibling workspace packages. This keeps `pnpm -r run typecheck` valid before any package has been built. Cross-package imports are introduced only in the child plan that owns that dependency.

### Shared compiler options (repeated per package)

- `target`: ES2024
- `module`: ESNext
- `moduleResolution`: bundler
- `lib`: ["ES2024"]
- `types`: ["node"]
- `strict`: true
- `verbatimModuleSyntax`: true
- `isolatedModules`: true
- `declaration`: true, `declarationMap`: true, `sourceMap`: true
- `noUnusedLocals`: true, `noUnusedParameters`: true
- `skipLibCheck`: true
- `outDir`: dist
- `rootDir`: src
- `include`: ["src"]

## Lint & Format

Single `eslint.config.ts` at root using `@antfu/eslint-config`:

- `type`: lib
- `typescript`: true
- `stylistic`: true (handles formatting — no Prettier needed)
- Ignores `**/dist/**`

## Git Hooks

Configured in root `package.json`:

- `simple-git-hooks`: pre-commit → `pnpm exec lint-staged`
- `lint-staged`: `*.{ts,js,json,md}` → `eslint --fix`

## CI

`.github/workflows/ci.yml` — single job on `ubuntu-latest`:

1. Checkout
2. Setup pnpm (via `pnpm/action-setup@v4`, reads `packageManager` field)
3. Setup Node 24 with pnpm cache
4. `pnpm install --frozen-lockfile`
5. `pnpm typecheck`
6. `pnpm lint`
7. `pnpm build`
8. `pnpm verify:artifacts`
9. `pnpm test`

Triggers: push/PR to `main` and `refactor` branches.

The scaffolding commit must include `pnpm-lock.yaml`; otherwise step 4 fails on a clean CI run.

## Entry Points

Minimal placeholder `src/index.ts` per package to verify the build pipeline:

- **data**: exports a `DATA_VERSION` constant
- **core**: exports a `calculate()` stub and does not import `data` yet
- **cli**: prints a "not yet implemented" message and does not import `core` yet

Add `tests/smoke.test.ts` with one smoke test per package:

- Import package-local source entry points directly
- Assert the placeholder exports and CLI message shape
- Do not rely on `passWithNoTests`

## Verification

After scaffolding, commit `pnpm-lock.yaml` and make sure all of these pass:

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm verify:artifacts
pnpm test
```

Also verify the failure and edge cases that this scaffold is supposed to guard:

- `pnpm-lock.yaml` is committed so `pnpm install --frozen-lockfile` succeeds in CI
- Placeholder `src/index.ts` files do not import sibling workspace packages during the scaffolding phase
- `pnpm verify:artifacts` confirms the built package exports resolve from `dist/` outputs for `data`, `core`, and `cli`
- `pnpm verify:artifacts` confirms the CLI build preserves the `fairy` executable entry point and injected shebang
- Re-running `pnpm build` cleans and recreates each package `dist/` directory without stale outputs

## Notes

- tsdown is the successor to tsup (Rolldown-based). If `--dts` causes issues, fall back to `tsc` for declarations and tsdown for JS only.
- Keep the scaffolding commit focused on repo shape and toolchain verification. Do not wire `data` into `core` or `cli` until the child plans define those contracts.
