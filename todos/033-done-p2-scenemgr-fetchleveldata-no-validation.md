---
status: done
priority: p2
issue_id: "033"
tags: [security, validation, data-integrity]
dependencies: []
---

# SceneManager fetchLevelData Has No Validation

## Problem Statement

`SceneManager.fetchLevelData()` fetches level JSON and returns `response.json()` directly without any structural validation. `ClaudeParser.generateLevelData()` calls `validateLevelData()` after parsing, but this code path does not. Malformed data flows unchecked into `LevelBuilder.build()`.

## Findings

- `src/engine/SceneManager.ts:365-376` - `return await response.json()` with no validation
- `src/api/ClaudeParser.ts` - Already has `validateLevelData()` that could be reused

## Proposed Solutions

### Option 1: Add validateLevelData Call

**Approach:** Import and call `validateLevelData()` before returning, matching what ClaudeParser already does.

**Effort:** 15 minutes

**Risk:** Low

## Acceptance Criteria

- [ ] Level data validated before being passed to LevelBuilder
- [ ] Invalid data produces a clear error rather than silent corruption

## Work Log

### 2026-02-27 - Code Review Discovery

**By:** Claude Code (multi-agent review)
