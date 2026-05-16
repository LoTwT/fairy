# Takedown And Rollback Runbook

Status: V0.1.0 release-prep runbook
Owner: @TechLead
Inputs: D-20 §8, Phase 4 runtime cutover

This runbook handles takedown requests or source-policy incidents affecting
`@randomplay/data` cleaned payloads.

## Scope

- Applies to published `@randomplay/data` runtime cleaned data, bundled cleaned
  audit artifacts, and source metadata.
- Does not change the MIT license for Fairy code packages.
- Does not grant extra rights to upstream game data, text, images, or third-party
  source material.

## Intake

1. Accept requests through a GitHub issue with the `takedown` label.
2. Record receipt time, claimant, affected package/version, affected source id,
   and requested remedy.
3. Acknowledge receipt within 24-72 hours. If the request arrives over a
   weekend or public holiday, acknowledge within 5 business days.

## Triage

Classify the affected material:

| Material | Immediate action |
|---|---|
| Runtime cleaned data derived from an affected source | Prepare package deprecation and emergency removal PR. |
| Bundled cleaned audit artifact | Prepare package deprecation if the artifact ships in npm; otherwise remove from repository in an ordinary PR. |
| Raw source snapshot retained only in git | Remove or quarantine the retained snapshot in an ordinary PR. |
| Documentation-only reference | Remove or rewrite the reference in an ordinary PR. |

## Emergency Response

1. Open a tracking issue and link the request.
2. If an already-published npm version is affected, deprecate each package
   version separately:
   ```bash
   npm deprecate @randomplay/data@<version> "<reason + tracking issue>"
   npm deprecate @randomplay/core@<version> "<reason + tracking issue>"
   npm deprecate @randomplay/cli@<version> "<reason + tracking issue>"
   ```
3. Open an emergency PR that removes or replaces the affected runtime cleaned
   data and updates `packages/data/source-registry.json`.
4. If runtime data must be restored quickly, reactivate an archived baseline only
   through an explicit hotfix PR with Product + lo-user approval.
5. Run the full release-readiness gate before publishing a replacement version.

## Rollback Options

| Option | Use when | Notes |
|---|---|---|
| Deprecate only | Package is published but no code rollback is needed | Fastest public signal; still requires follow-up PR. |
| Emergency source removal | Specific source payload must be removed | Preferred when alternative source coverage exists. |
| Runtime rollback | Nanoka runtime source cannot be used | Requires explicit Product + lo-user approval because archived sources are audit-only after V0.1.0. |
| Patch release | Replacement package is needed | Use the normal release workflow after QA release-readiness checks. |

## Required Record

Every takedown or rollback must update:

- `docs/product/decisions/data-source-rulings.md` or a new linked decision note;
- `packages/data/source-registry.json` source status / notes;
- release notes or changelog for any replacement package;
- the tracking issue with verification evidence and publication outcome.
