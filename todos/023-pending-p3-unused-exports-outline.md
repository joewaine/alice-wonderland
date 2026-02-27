---
status: pending
priority: p3
issue_id: "023"
tags: [dead-code, cleanup, exports]
dependencies: []
---

# Remove Unused Exports from OutlineEffect.ts

## Problem Statement

Four exported functions in OutlineEffect.ts are never used by consuming code.

## Findings

**File:** `src/shaders/OutlineEffect.ts`

Unused exports:
- `createOutlinedMesh()` (lines 65-87)
- `removeOutlinesFromObject()` (lines 138-154)
- `updateOutlineThickness()` (lines 159-168)
- `updateOutlineColor()` (lines 173-184)

Only `createOutlineMaterial()` and `addOutlinesToObject()` are actually used.

## Proposed Solutions

### Option 1: Remove Unused Functions

**Approach:** Delete the unused functions to reduce bundle size and API surface.

**Pros:**
- Smaller bundle
- Simpler API

**Cons:**
- Would need to re-add if needed later

**Effort:** 10 minutes

**Risk:** Low

### Option 2: Mark as Internal

**Approach:** Keep functions but remove `export` keyword.

**Pros:**
- Available if needed internally
- Still reduces API surface

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

Implement Option 1 - remove the unused functions entirely.

## Technical Details

**Affected files:**
- `src/shaders/OutlineEffect.ts:65-184` - remove unused functions

## Acceptance Criteria

- [ ] Unused functions removed
- [ ] Build passes
- [ ] Outline effect still works

## Work Log

### 2026-02-26 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified unused exports in OutlineEffect.ts
