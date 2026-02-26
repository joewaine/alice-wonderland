---
status: done
priority: p1
issue_id: "015"
tags: [performance, gc-pressure, wonder-stars]
dependencies: []
---

# Fix Per-Frame Vector3 Allocation in WonderStarManager

## Problem Statement

A `new THREE.Vector3()` is created frequently via `trackReachPosition()` which is invoked every frame from `SceneManager.update()`, causing GC pressure during exploration challenges.

## Findings

**File:** `src/world/WonderStarManager.ts`
**Line:** 254

```typescript
const target = new THREE.Vector3(req.reach_position.x, req.reach_position.y, req.reach_position.z);
```

This is called from `trackReachPosition()` which is invoked every frame when an exploration challenge is active.

## Proposed Solutions

### Option 1: Cache Target Vector When Challenge Activates

**Approach:** Pre-calculate and cache the target vector when `setActiveStar()` is called, not on every position check.

```typescript
// Add to class
private reachTargetCache: THREE.Vector3 | null = null;

// In setActiveStar() or when challenge starts:
if (req.reach_position) {
  this.reachTargetCache = new THREE.Vector3(
    req.reach_position.x,
    req.reach_position.y,
    req.reach_position.z
  );
}

// In trackReachPosition():
if (!this.reachTargetCache) return;
const distance = playerPosition.distanceTo(this.reachTargetCache);
```

**Pros:**
- Zero per-frame allocations
- Target only calculated once per challenge

**Cons:**
- Need to clear cache when challenge ends

**Effort:** 15 minutes

**Risk:** Low

## Recommended Action

Implement Option 1. Cache the target position when the challenge activates, not on every frame.

## Technical Details

**Affected files:**
- `src/world/WonderStarManager.ts:254` - trackReachPosition()

**Related components:**
- SceneManager (calls trackReachPosition every frame)

## Acceptance Criteria

- [ ] No `new THREE.Vector3()` in trackReachPosition()
- [ ] Target vector cached when challenge activates
- [ ] Cache cleared when challenge completes
- [ ] Reach position detection works correctly

## Work Log

### 2026-02-26 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified per-frame Vector3 allocation in WonderStarManager
- Proposed caching solution
