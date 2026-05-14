# Contributing

## Commit Messages

This repository uses Conventional Commits. Squash-merge PR titles should be the
release-note-quality commit message.

Use the commit type that reflects release-visible value, not only the file paths
changed:

- Use `feat:` for user-visible product or API additions.
- Use `fix:` for user-visible bug fixes.
- Use `docs:` for documentation-only changes.
- Use `ci:` for CI and release workflow changes.
- Use `test:` for ordinary test coverage, regression tests, and fixture-only
  maintenance that should not appear in release notes.
- Use `feat(golden):` for golden-anchor or release-readiness contract additions.

Golden anchors are project-visible contract additions: they change the published
golden replay coverage and release-readiness evidence. Even when the diff is
mostly fixtures or replay data, use `feat(golden): add G* ...` so the change is
included in `CHANGELOG.md` and GitHub Release notes.

Historical V0.0.3 anchor commits that landed before this convention are mapped in
`cliff.toml`; future golden-anchor PRs should use `feat(golden):`.
