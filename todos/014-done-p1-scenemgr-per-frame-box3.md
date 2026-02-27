---
status: done
priority: p1
issue_id: "014"
tags: [performance, gc-pressure, scene-manager]
dependencies: []
---

# Fix Per-Frame Box3 Allocation in SceneManager

## Problem Statement

A `new THREE.Box3()` is created every frame for each bouncy platform in `updateBouncyPlatforms()`, causing GC pressure proportional to the number of bouncy platforms in the level.

## Findings

**File:** `src/engine/SceneManager.ts`
**Line:** 305

```typescript
const bounds = new THREE.Box3().setFromObject(mesh);
```

This is called in `updateBouncyPlatforms()` which runs every frame. With 4-6 bouncy platforms per level, this creates 4-6 Box3 objects per frame (~240-360 allocations per second at 60fps).

## Proposed Solutions

### Option 1: Pre-calculate Bounds on Platform Creation

**Approach:** Calculate and store bounds when platforms are created in LevelBuilder, add `bounds` to the `BouncyPlatform` interface.

```typescript
// In LevelBuilder.buildPlatforms():
bouncy.push({
  mesh,
  baseY: platform.position.y,
  compressionAmount: 0,
  bounds: new THREE.Box3().setFromObject(mesh)  // Calculate once
});
```

**Pros:**
- Zero per-frame allocations
- Bounds only calculated once during level load

**Cons:**
- Requires interface change
- Bounds won't update if mesh transforms (but bouncy platforms don't move)

**Effort:** 20 minutes

**Risk:** Low

### Option 2: Cache Single Box3 for Reuse

**Approach:** Create a single class-level Box3 instance and reuse it.

```typescript
private boundsCache: THREE.Box3 = new THREE.Box3();

// In updateBouncyPlatforms():
this.boundsCache.setFromObject(mesh);
```

**Pros:**
- Minimal code change
- Works even if meshes could transform

**Cons:**
- Still calling setFromObject every frame (minor CPU cost)

**Effort:** 10 minutes

**Risk:** Low

## Recommended Action

Implement Option 1 for maximum performance. Bouncy platforms don't change position, so pre-calculating bounds is safe.

## Technical Details

**Affected files:**
- `src/engine/SceneManager.ts:305` - updateBouncyPlatforms()
- `src/world/LevelBuilder.ts:37` - BouncyPlatform interface

**Related components:**
- LevelBuilder (creates bouncy platforms)

## Acceptance Criteria

- [ ] No `new THREE.Box3()` calls in updateBouncyPlatforms
- [ ] BouncyPlatform interface includes bounds property
- [ ] Bounds calculated once during platform creation
- [ ] Bouncy platform collision detection works correctly

## Work Log

### 2026-02-26 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified per-frame Box3 allocation in SceneManager
- Proposed pre-calculation solution
