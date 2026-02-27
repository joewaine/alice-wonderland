---
status: pending
priority: p3
issue_id: "047"
tags: [developer-experience, validation, scripts]
dependencies: ["043"]
---

# Config validation: scripts crash with unhelpful errors on missing config.json

## Problem Statement

Both generation scripts do `JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))` with no try/catch or key validation. Missing or malformed `config.json` produces an unhelpful stack trace. Missing `tripo_api_key` silently passes `undefined` as the Bearer token.

## Findings

- `scripts/generate-garden-models.ts:15-17` — no validation
- `scripts/generate-npc-models.ts:15-17` — same pattern

## Proposed Solutions

### Option 1: Add validation with actionable error messages

**Approach:** Wrap in try/catch. Validate `tripo_api_key` exists and is a non-empty string. Suggest env var fallback: `process.env.TRIPO_API_KEY || config.tripo_api_key`.

**Effort:** 15 minutes

**Risk:** Low

## Acceptance Criteria

- [ ] Missing config.json produces clear error message
- [ ] Missing/empty API key produces clear error message
- [ ] Optionally support `TRIPO_API_KEY` env var
