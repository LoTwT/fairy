# End-to-End Verification Plan

## Status

Placeholder.

## Goal

Verify that the repository works as one coherent toolkit across data ingestion, normalized data, mapping, core calculation, and CLI output.

## Scope

- Cross-package fixture selection
- Raw data to normalized catalog checks
- Normalized catalog to core input checks
- Core evaluation trace checks
- CLI scenario execution checks
- Build, typecheck, lint, test, and artifact verification
- Release-readiness criteria

## Deliverables

- End-to-end fixture set
- CLI smoke tests using real package boundaries
- Cross-package regression tests
- Artifact verification checklist
- Release readiness checklist

## Notes

This plan is the final integration gate after package-local implementation plans pass. It should not introduce new package responsibilities; it only verifies that approved contracts compose correctly.
