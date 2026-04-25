# Scenario Contract Plan

## Status

Placeholder.

## Goal

Define the user-supplied calculation scenario shape that combines catalog references, builds, enemy state, battle context, and action selection.

## Scope

- Team and agent build references
- Agent levels, skill levels, equipment choices, and manually supplied stat overrides
- Enemy selection and current enemy state
- Action or skill-event selection
- Battle context, active effects, and ad hoc modifiers
- Trace-detail preferences
- Serialization format for local files and CLI inputs
- Validation and error-reporting expectations

## Deliverables

- Scenario schema
- Minimal valid scenario fixture
- Validation rules for references and battle state
- Error model for missing data, invalid builds, and unsupported mechanics
- Compatibility notes for CLI and data-to-core mapping

## Notes

This plan does not define CLI flags and does not implement formulas. CLI behavior is owned by [CLI Contract](../cli/contract.md), and transformation into `core` inputs is implemented in [Data-to-Core Mapping Implementation](../data/core-mapping-implementation.md).
