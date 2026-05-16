# fairy AI plugin · Codex usage notes

V1.2.2 supports Codex as a compatibility surface, not a second full plugin
runtime. Codex agents should use the same canonical skill contracts defined
under `.claude-plugin/plugins/fairy/`.

## Skill Contracts

- `.claude-plugin/plugins/fairy/plugin.json`
- `.claude-plugin/plugins/fairy/skills/fairy-snapshot/SKILL.md`
- `.claude-plugin/plugins/fairy/skills/fairy-calc/SKILL.md`
- `.claude-plugin/plugins/fairy/skills/fairy-explain/SKILL.md`

## Usage Rules

1. Use `fairy-snapshot` when a user describes a ZZZ build and needs a
   reviewable `BattleSnapshot` draft.
2. Use `fairy-calc` after user review/confirm or when the user already provides
   a `BattleSnapshot`.
3. Use `fairy-explain` only for existing `CalcResult` JSON.
4. Never calculate damage in model reasoning. Run `fairy calc` through the CLI.
5. Do not use Cursor-specific configuration in V1.2.2.

## Local Verification

Run the metadata verifier before opening implementation PRs:

```bash
pnpm verify:ai-plugin
```

The implementation and acceptance details live in:

- `docs/ai-plugin/architecture.md`
- `docs/ai-plugin/user-journeys.md`
- `docs/ai-plugin/prompt-templates.md`
- `docs/ai-plugin/acceptance.md`
- `docs/product/decisions/D-21-ai-plugin.md`
