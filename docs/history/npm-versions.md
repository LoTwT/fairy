# Published npm versions (pre-reset)

Three packages were published together as a monorepo, sharing the same version
number and git tag at each release:

- [`@randomplay/core`](https://www.npmjs.com/package/@randomplay/core)
- [`@randomplay/data`](https://www.npmjs.com/package/@randomplay/data)
- [`@randomplay/cli`](https://www.npmjs.com/package/@randomplay/cli)

**Highest published version: `0.1.4`.** Per the npm-monotonicity rule
([../../AGENTS.md](../../AGENTS.md)), any future publish on these package names
must be strictly greater than `0.1.4`. Published versions are immutable and are
never deleted, overwritten, or re-published.

| Version | Tag | Commit | Published (npm, UTC) | GitHub Release |
| --- | --- | --- | --- | --- |
| 0.1.4 | `v0.1.4` | `a48e9c57c` | 2026-05-23 | [v0.1.4](https://github.com/LoTwT/fairy/releases/tag/v0.1.4) |
| 0.1.3 | `v0.1.3` | `31153862c` | 2026-05-16 | [v0.1.3](https://github.com/LoTwT/fairy/releases/tag/v0.1.3) |
| 0.1.2 | `v0.1.2` | `def231009` | 2026-05-16 | [v0.1.2](https://github.com/LoTwT/fairy/releases/tag/v0.1.2) |
| 0.1.1 | `v0.1.1` | `64a5e71d0` | 2026-05-16 | [v0.1.1](https://github.com/LoTwT/fairy/releases/tag/v0.1.1) |
| 0.1.0 | `v0.1.0` | `81ab0925a` | 2026-05-15 | [v0.1.0](https://github.com/LoTwT/fairy/releases/tag/v0.1.0) |
| 0.0.4 | `v0.0.4` | `2d00ab0e6` | 2026-05-14 | [v0.0.4](https://github.com/LoTwT/fairy/releases/tag/v0.0.4) |
| 0.0.3 | `v0.0.3` | `93da3dbbf` | 2026-05-14 | [v0.0.3](https://github.com/LoTwT/fairy/releases/tag/v0.0.3) |
| 0.0.2 | `v0.0.2` | `6f291f439` | 2026-05-13 | [v0.0.2](https://github.com/LoTwT/fairy/releases/tag/v0.0.2) |
| 0.0.1 | `v0.0.1` | `35ee8c718` | 2026-05-10 | [v0.0.1](https://github.com/LoTwT/fairy/releases/tag/v0.0.1) |

Publish dates are from the npm registry (`npm view <pkg> time`) for
`@randomplay/core`; the other two packages published within the same minute. The
GitHub Release for each tag is the publish evidence (the release workflow created
the Release on publish success).
