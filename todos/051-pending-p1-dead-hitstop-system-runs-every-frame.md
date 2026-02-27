---
status: done
priority: p1
issue_id: "051"
tags: [dead-code, game-loop]
dependencies: []
---

# Dead hitstop system still runs check every frame

## Problem Statement

The hitstop system in `Game.ts` was designed for ground pound freeze-frames. Ground pound was removed in this PR, but the hitstop field and per-frame check remain. `hitstopRemaining` is permanently `0` — nothing ever sets it. The conditional check runs every frame for no reason.

## Findings

- `src/Game.ts:136-137` — `hitstopRemaining` field with comment `// Hitstop effect (freeze frames on ground pound impact)`
- `src/Game.ts:1030-1038` — `if (this.hitstopRemaining > 0)` check runs every frame, never triggers
- Ground pound was removed in Phase 2 of this PR, but hitstop was missed in cleanup

## Proposed Solutions

### Option 1: Remove hitstop entirely

**Approach:** Delete the `hitstopRemaining` field and the if-block in the game loop.

**Pros:**
- Clean dead code removal
- Tiny perf improvement (one fewer conditional per frame)

**Cons:**
- None — this is dead code

**Effort:** 5 minutes

**Risk:** None

## Recommended Action

Option 1. Straight deletion.

## Technical Details

**Affected files:**
- `src/Game.ts:136-137` — delete field declaration
- `src/Game.ts:1030-1038` — delete if-block

## Resources

- **PR:** #6

## Acceptance Criteria

- [ ] `hitstopRemaining` field removed
- [ ] Hitstop check block removed from game loop
- [ ] No references to hitstop remain
- [ ] TypeScript compiles clean

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Claude Code (PR #6 review)

**Actions:**
- Code simplicity reviewer identified dead hitstop system
