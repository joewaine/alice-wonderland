---
status: pending
priority: p2
issue_id: "043"
tags: [duplication, scripts, maintainability]
dependencies: []
---

# Generation scripts: ~100 lines duplicated between NPC and garden scripts

## Problem Statement

`scripts/generate-npc-models.ts` and `scripts/generate-garden-models.ts` share nearly identical `generateModel()`, `sleep()`, and `main()` functions (~100 lines). The only differences are variable names, timeout duration, and output directory. The NPC script also has a bug where it counts already-existing models as "success" instead of "skipped". The garden script has a misleading timeout comment ("15 minutes" vs actual 5 minutes) and a redundant double existence check.

## Findings

- `scripts/generate-npc-models.ts:140-258` — `generateModel`, `sleep`, `main` are copy-paste of garden script
- `scripts/generate-garden-models.ts:163-289` — same functions with trivial differences
- NPC `main()` line 245: counts skipped models as `success` (garden script correctly uses `skipped` counter)
- Garden script line 205: comment says "max 15 minutes" but loop is 150 * 2s = 5 minutes
- Garden script line 171 + 270: double existence check (inner one is dead code)

## Proposed Solutions

### Option 1: Extract shared Tripo client module (Recommended)

**Approach:** Create `scripts/lib/tripo-client.ts` with `submitJob()`, `pollForCompletion()`, `downloadGlb()`, and `sleep()`. Both scripts become thin wrappers that define asset lists and call the shared module.

**Pros:**
- Single place to update API interaction logic
- Fixes NPC success counting bug
- Fixes timeout comment mismatch
- Removes redundant existence check

**Cons:**
- Adds a file

**Effort:** 1 hour

**Risk:** Low

## Acceptance Criteria

- [ ] Shared Tripo client module at `scripts/lib/tripo-client.ts`
- [ ] Both scripts use shared module
- [ ] NPC script correctly counts skipped vs success
- [ ] Timeout comments match actual behavior
- [ ] No redundant existence checks
