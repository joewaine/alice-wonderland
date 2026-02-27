---
status: done
priority: p1
issue_id: "008"
tags: [performance, gc-pressure, hot-path]
dependencies: []
---

# Per-Frame Object Allocations Causing GC Pressure

## Problem Statement

Multiple controllers create new `THREE.Vector3` and `RAPIER.Vector3/Ray` objects every frame in hot paths. At 60 FPS, this creates 300-500+ object allocations per second, leading to garbage collection pressure and potential frame stutters.

## Findings

### CameraController.ts
- **Line 203:** `new THREE.Vector3()` in `getIdealPosition()` - called 2x per frame
- **Lines 283-287:** `new THREE.Vector3()` for `lookAtPos` - called every frame

### PlayerController.ts
- **Lines 571-579:** `new RAPIER.Ray()` + 2x `new RAPIER.Vector3()` in `checkGrounded()` - every frame
- **Line 327:** `new THREE.Vector3()` in `applyAirCurrents()` - every frame when not grounded
- **Line 352:** `new THREE.Vector3()` in `checkSpeedBoosts()` - every frame
- **Line 386:** `new THREE.Vector3()` in `checkWaterZones()` - every frame
- **Lines 314-317, 336, 363, 453, 512, 536, 560:** `new RAPIER.Vector3()` in various movement methods

### Game.ts
- **Lines 461, 491, 706, 711, 742:** Multiple `new THREE.Vector3()` per frame

### SceneManager.ts
- **Lines 300-332:** `new THREE.Box3()` for each bouncy platform every frame

**Estimated impact:** ~500+ allocations/second at 60 FPS

## Proposed Solutions

### Option 1: Pre-allocate Reusable Vectors

**Approach:** Create class-level cached vectors and reuse them.

```typescript
// CameraController
private idealPosCache: THREE.Vector3 = new THREE.Vector3();
private lookAtCache: THREE.Vector3 = new THREE.Vector3();

private getIdealPosition(playerPos: THREE.Vector3, distance: number): THREE.Vector3 {
  const x = playerPos.x + Math.sin(this.yaw) * Math.cos(this.pitch) * distance;
  // ...
  return this.idealPosCache.set(x, y, z);
}

// PlayerController
private groundCheckRay: RAPIER.Ray;
private groundCheckDir: RAPIER.Vector3;
private playerPosCache: THREE.Vector3 = new THREE.Vector3();
private velocityCache: RAPIER.Vector3;
```

**Pros:**
- Zero allocations in hot paths
- Simple refactor pattern
- No API changes needed

**Cons:**
- Slightly more state to manage
- Must be careful about cache invalidation

**Effort:** 2-3 hours

**Risk:** Low

## Recommended Action

Implement Option 1 starting with the highest-impact files: PlayerController (most allocations), then CameraController, then Game.ts.

## Technical Details

**Affected files:**
- `src/camera/CameraController.ts` - 2 cached vectors
- `src/player/PlayerController.ts` - ~5 cached vectors + ray
- `src/Game.ts` - 2-3 cached vectors
- `src/engine/SceneManager.ts` - 1 cached Box3

**Priority order:**
1. PlayerController (most allocations, called every frame)
2. CameraController (2-3 allocations per frame)
3. Game.ts (3-5 allocations per frame)
4. SceneManager (scales with bouncy platform count)

## Acceptance Criteria

- [ ] No `new THREE.Vector3()` in update/render loops
- [ ] No `new RAPIER.Vector3()` in update loops
- [ ] No `new RAPIER.Ray()` in update loops
- [ ] Performance profiler shows reduced GC activity

## Work Log

### 2026-02-26 - Performance Review Discovery

**By:** Claude Code

**Actions:**
- Catalogued all per-frame allocations
- Estimated impact at 60 FPS
- Identified priority order for fixes
