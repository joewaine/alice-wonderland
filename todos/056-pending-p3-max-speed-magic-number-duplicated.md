---
status: pending
priority: p3
issue_id: "056"
tags: [code-quality]
dependencies: []
---

# Magic number 13 for max speed duplicated across 3 files

## Problem Statement

`MAX_SPEED = 13` appears as separate constants in PlayerController.ts, CameraController.ts, and as a hardcoded literal in Game.ts. If the speed ever changes, these will drift apart.

## Findings

- `src/player/PlayerController.ts:88` — `MAX_SPEED = 13`
- `src/camera/CameraController.ts:100` — `MAX_PLAYER_SPEED = 13`
- `src/Game.ts:1218` — `const maxSpeed = 13;` (hardcoded)

## Proposed Solutions

### Option 1: Export from PlayerController and import elsewhere

**Approach:** Export `MAX_SPEED` from PlayerController. Import in CameraController and Game.ts.

**Effort:** 10 minutes

**Risk:** None

## Technical Details

**Affected files:**
- `src/player/PlayerController.ts` — export constant
- `src/camera/CameraController.ts` — import and use
- `src/Game.ts` — import and use

## Acceptance Criteria

- [ ] Single source of truth for max speed constant

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Claude Code (PR #6 review)
