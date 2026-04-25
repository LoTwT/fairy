# CLI Implementation Plan

## Status

Placeholder.

## Goal

Implement `@randomplay/fairy-cli` according to the approved command contract.

## Scope

- Command registration and argument parsing
- Scenario file loading
- Data catalog loading
- Mapping-layer invocation
- Core evaluation execution
- Human-readable and machine-readable output rendering
- Error handling and process exit codes
- CLI smoke tests

## Deliverables

- Implemented CLI commands
- Example scenario files
- Output snapshot fixtures
- Tests for command behavior and failure modes
- Build artifact verification for the CLI package

## Notes

This plan depends on [CLI Contract](contract.md), [Scenario Contract](../scenario/contract.md), and [Data-to-Core Mapping Implementation](../data/core-mapping-implementation.md). The CLI must not own data import or formula logic.
