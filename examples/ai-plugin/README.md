# fairy AI plugin examples

This directory is the single source of example prompts and fixtures for the
V1.2.2 AI plugin implementation.

Planned ownership:

- `prompts/`: UX-owned prompt scenarios and few-shot examples.
- `snapshots/`: UX-owned `BattleSnapshot` fixture outputs.
- `expected/`: UX-owned expected structures consumed by QA smoke tests.

QA consumes these files for G3/G4/G5 fixture assertions. Keep examples aligned
with `docs/ai-plugin/prompt-templates.md` and
`docs/ai-plugin/acceptance.md`.
