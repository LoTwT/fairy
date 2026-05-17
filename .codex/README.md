# fairy AI plugin · Codex usage notes

V1.2.3 supports Codex as a compatibility surface, not a second full plugin
runtime. Codex agents should use the same canonical skill contracts defined
under `.claude-plugin/plugins/fairy/`.

## Skill Contracts

- `.claude-plugin/plugins/fairy/plugin.json`
- `.claude-plugin/plugins/fairy/skills/fairy-vision/SKILL.md`
- `.claude-plugin/plugins/fairy/skills/fairy-snapshot/SKILL.md`
- `.claude-plugin/plugins/fairy/skills/fairy-calc/SKILL.md`
- `.claude-plugin/plugins/fairy/skills/fairy-explain/SKILL.md`

## Usage Rules

1. Use `fairy-vision` when a multimodal-capable host receives one supported
   community-tool build screenshot and needs a reviewable `BattleSnapshot`
   draft plus extraction evidence. If image input is unavailable or source
   confidence is low, fall back to text input through `fairy-snapshot`.
2. Use `fairy-snapshot` when a user describes a ZZZ build and needs a
   reviewable `BattleSnapshot` draft.
3. Use `fairy-calc` after user review/confirm or when the user already provides
   a `BattleSnapshot`.
4. Use `fairy-explain` only for existing `CalcResult` JSON.
5. Never calculate damage in model reasoning. Run `fairy calc` through the CLI.
6. Do not expose internal skill handoff language in user-facing copy.
7. Do not use Cursor-specific configuration in V1.2.3.

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
- `docs/product/decisions/D-22-ai-plugin-v1.2.3-vision.md`
