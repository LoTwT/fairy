# Fairy Release Workflow

## Scope

This document defines the release flow for the `LoTwT/fairy` repository and the npm packages:

- `@randomplay/core`
- `@randomplay/data`
- `@randomplay/cli`

The repository uses one release version across the root package and all publishable workspace packages. The root package stays private and is not published.

## Version Bump

Use the root release script:

```bash
pnpm release:bump        # patch bump
pnpm release:bump 0.0.1  # explicit first release
```

The script is a thin wrapper around `bumpp@11.1.0`:

- no argument defaults to `patch`
- one argument is passed as the release type or exact version
- version files: root `package.json` plus `packages/core`, `packages/data`, and `packages/cli`
- commit and tag use bumpp defaults: `chore: release vX.Y.Z` and `vX.Y.Z`
- the script must run from `main` with an upstream branch
- `noGitCheck: false` keeps bumpp's working-tree guard enabled
- push is enabled so the tag triggers release CI

## Release Gate

The release workflow is triggered only by `vX.Y.Z` tag pushes. It validates:

- semver tag with leading `v`
- root and publishable package versions match the tag
- release commit subject equals `chore: release vX.Y.Z`
- tagged commit is contained in `origin/main`
- npm CLI satisfies `>= 11.5.1`
- publish allowlist packages exist, are public, and have `publishConfig.access = "public"`
- publish manifests are prepared so internal dependencies use the release version, not `workspace:*`
- npm tarballs produced by `npm pack` contain no `workspace:` protocol dependencies
- already-published packages at the same version have npm `gitHead` equal to the release commit SHA

The job then runs:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm --filter @randomplay/data verify:golden-v1
pnpm --filter @randomplay/data verify:mihoyo-da
pnpm --filter @randomplay/data verify:buhflipexplode-da
pnpm --filter @randomplay/data verify:excel
pnpm --silent fairy:s1 | jq empty
pnpm --silent fairy:s2 | jq empty
pnpm --silent fairy:s3 | jq empty
node scripts/prepare-npm-publish.mjs X.Y.Z
npm pack --json --pack-destination <tmp> # per publish package, inspected by CI
```

## Publish Allowlist

All packages share one version, but publish targets are explicit. The release workflow uses this allowlist:

```json
["packages/core", "packages/data", "packages/cli"]
```

Do not use `pnpm -r publish`. New publish targets must be added to the allowlist with package-specific pack and smoke gates.

## npm Publish

Publish is performed per allowlist package by GitHub Actions through npm Trusted Publishing / OIDC:

```bash
cd <package-directory>
npm publish --access public --no-git-checks
```

The release job has `id-token: write` permission and runs in the protected `npm-publish` environment. Configure npm Trusted Publisher for each package:

- package: `@randomplay/core`, `@randomplay/data`, `@randomplay/cli`
- repository: `LoTwT/fairy`
- workflow: `release.yml`
- environment: `npm-publish`

The first `0.0.1` publish may require manual local publish from the release tag because npm Trusted Publisher setup can require the package to exist first. If manual first publish is used, publish only from the `v0.0.1` tag, run the same local gates, publish the three packages from the tag, and rerun the release workflow afterward; the workflow will verify each npm `gitHead` before continuing.

Manual first publish order:

```bash
git fetch --tags origin
git checkout v0.0.1
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
node scripts/prepare-npm-publish.mjs 0.0.1

cd packages/core && npm publish --access public --no-git-checks
cd ../data && npm publish --access public --no-git-checks
cd ../cli && npm publish --access public --no-git-checks
```

Each package has a `prepublishOnly` script that rebuilds `dist/` before `npm publish`, but the explicit root `pnpm build` keeps the manual path aligned with CI.

## Post-Publish Smoke

After publish, CI installs all three packages from npm in a temporary project, then validates:

- `@randomplay/core` can be imported by plain Node ESM
- `@randomplay/data` can be imported by plain Node ESM
- cleaned JSON subpaths are importable
- the `fairy` bin is installed and emits JSON help
- `fairy calc` can execute the S1 snapshot and return strict JSON

## Rollback

- If a tag or GitHub Release is wrong before npm publish, delete the GitHub Release and tag, fix the release commit, and create a new tag.
- If a version has been published to npm, do not rely on unpublish. Deprecate the bad version and publish the next patch.
- If package contents are wrong, revert the offending PR and release a patch.
- If CI fails before publish, fix the release commit and re-tag only after removing the failed tag.
- Mark the bad GitHub Release as a pre-release and add a note pointing to the corrected patch.

## Changelog

Fairy uses a hand-written root `CHANGELOG.md` for now. Keep it concise and copy the release-relevant section into the GitHub Release page.
