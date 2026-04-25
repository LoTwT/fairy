# Data-to-Core Mapping Implementation Plan

## Status

Placeholder.

## Goal

Implement the approved mapping from normalized `@randomplay/fairy-data` records and scenario inputs into `@randomplay/fairy-core` snapshots, events, modifiers, and evaluation calls.

## Scope

- Catalog lookup helpers
- Agent, Bangboo, enemy, skill, and equipment mapping
- Scenario build and battle-state resolution
- Modifier construction and tag propagation
- Action event segment construction
- Mapping validation and diagnostic errors
- Cross-package integration tests

## Deliverables

- Implemented mapping functions in the approved owning package
- Fixture scenarios that produce valid `core` inputs
- Tests covering successful mapping and invalid references
- Compatibility checks between data schema versions and core input expectations
- Documentation for consumers that call the mapping layer directly

## Notes

This plan depends on [Data-to-Core Mapping](core-mapping.md), [Data Package Implementation](implementation.md), and [Scenario Contract](../scenario/contract.md). It must not change core formula semantics.
