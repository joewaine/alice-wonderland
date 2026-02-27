---
status: done
priority: p3
issue_id: "024"
tags: [dead-code, cleanup, animation]
dependencies: []
---

# Remove Unused Public Methods from AnimationStateManager

## Problem Statement

Several public methods in AnimationStateManager are never called outside the class.

## Findings

**File:** `src/animation/AnimationStateManager.ts`

Unused methods:
- `isInState()` (line 209) - never called
- `hasAnimation()` (line 237) - never called
- `getRegisteredStates()` (line 230) - never called
- `getIsTransitioning()` (line 216) - never called
- `stopAll()` (line 244) - only called internally by dispose()

## Proposed Solutions

### Option 1: Make Methods Private or Remove

**Approach:** Either mark methods as private or remove them entirely.

**Pros:**
- Smaller API surface
- Clearer what's actually used

**Cons:**
- Would need to re-add if needed later

**Effort:** 10 minutes

**Risk:** Low

## Recommended Action

Make `stopAll()` private and remove the other unused methods.

## Technical Details

**Affected files:**
- `src/animation/AnimationStateManager.ts:209-244`

## Acceptance Criteria

- [ ] Unused methods removed or made private
- [ ] Animation system still works
- [ ] Build passes

## Work Log

### 2026-02-26 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified unused public methods
