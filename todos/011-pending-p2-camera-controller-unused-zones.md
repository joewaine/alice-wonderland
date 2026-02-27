---
status: pending
priority: p2
issue_id: "011"
tags: [dead-code, simplification, camera]
dependencies: []
---

# CameraController Zone System is Dead Code

## Problem Statement

The camera zone system in `CameraController.ts` (~40 lines) is infrastructure without any callers:

- `addZone()` - never called
- `setZones()` - never called
- `clearZones()` - called but only clears an always-empty array
- `updateZone()` - runs every frame but does nothing (zones array is empty)

This adds complexity and per-frame overhead for unused functionality.

## Findings

- **Lines 33-37:** `CameraZone` interface defined but never used externally
- **Lines 67-68:** `zones: CameraZone[] = []` - always empty
- **Lines 174-193:** `updateZone()` - iterates empty array every frame
- **Lines 322-340:** Three methods for zone management - unused

No level data contains camera zones. No code calls addZone() or setZones().

## Proposed Solutions

### Option 1: Remove Zone System Entirely

**Approach:** Delete the zone-related code.

**Removes:**
- CameraZone interface (~5 lines)
- zones array property (~1 line)
- updateZone() method (~19 lines)
- addZone(), clearZones(), setZones() methods (~15 lines)
- updateZone() call in update() (~1 line)

**Pros:**
- Removes ~40 lines of dead code
- Eliminates per-frame empty array iteration
- Simpler to understand

**Cons:**
- Would need to re-add if zones become needed later

**Effort:** 15 minutes

**Risk:** Low

---

### Option 2: Keep But Document as Future Feature

**Approach:** Add TODO comment, remove updateZone() call from hot path until zones are populated.

**Pros:**
- Preserves future capability
- Removes per-frame overhead

**Cons:**
- Still carries dead code

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

Option 1 - Remove entirely. YAGNI (You Aren't Gonna Need It). If zone-based camera zoom is needed later, it can be re-implemented with actual requirements.

## Technical Details

**Affected files:**
- `src/camera/CameraController.ts:33-37, 67-68, 174-193, 252, 322-340`
- `src/Game.ts:241` - Remove clearZones() call

## Acceptance Criteria

- [ ] Zone-related code removed
- [ ] No per-frame iteration of empty array
- [ ] File reduced by ~40 lines

## Work Log

### 2026-02-26 - Simplicity Review Discovery

**By:** Claude Code

**Actions:**
- Identified dead code pattern
- Verified no callers in codebase
- Recommended removal
