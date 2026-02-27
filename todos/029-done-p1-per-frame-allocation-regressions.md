---
status: done
priority: p1
issue_id: "029"
tags: [performance, gc-pressure, regression]
dependencies: []
---

# Per-Frame Allocation Regressions (Known Pattern Violations)

## Problem Statement

Despite previous fixes (todos 008, 013, 014, 015) establishing a pattern of pre-allocated cached vectors, new code has reintroduced per-frame `new THREE.Vector3()` and `new THREE.Box3()` allocations in hot paths. These cause GC pressure leading to frame hitches.

## Findings

**Game.ts regressions:**
- `src/Game.ts:1378` - `new THREE.Vector3(pos.x, pos.y, pos.z)` every frame for footstep dust (while grounded + moving)
- `src/Game.ts:1391` - `new THREE.Vector3(behindX, pos.y, behindZ)` every frame for run dust puff (while sprinting)
- `src/Game.ts:1304` - `new THREE.Box3().setFromObject(mesh)` in a loop over bouncy platforms on velocity reversal
- `src/Game.ts:1344,1374` - `horizontalSpeed` computed twice with same values

**ParticleManager regressions:**
- `src/effects/ParticleManager.ts:2218` - Default parameter `new THREE.Vector3(0.3, 0, 0.1)` evaluated every frame
- `src/effects/ParticleManager.ts:2227-2229` - Two `new THREE.Vector3()` per frame in `updateRosePetals`

**Collectible regressions:**
- `src/world/Collectible.ts:116` - `new THREE.Vector3()` per collectible in range per frame (magnet effect)

**SceneManager regressions:**
- `src/engine/SceneManager.ts:525` - `platform.bounds.clone()` per breakable platform per frame
- `src/engine/SceneManager.ts:541` - `new THREE.Vector3()` per frame for platform center
- `src/engine/SceneManager.ts:661` - `this.boundsCache.clone()` per platform in getSurfaceTypeAt

**PlayerController:**
- `src/player/PlayerController.ts:1144` - `getMomentum()` returns `this.momentum.clone()`, called 3x/frame from Game.ts

## Proposed Solutions

### Option 1: Apply Existing Cache Pattern

**Approach:** Use existing `tempPosCache`/`playerPosCache` in Game.ts. Add class-level cached vectors to ParticleManager, Collectible, SceneManager. Change `getMomentum()` to return read-only reference.

**Fixes:**
```typescript
// Game.ts:1378 - use existing cache
this.tempPosCache.set(pos.x, pos.y, pos.z);
this.particleManager.createFootstepDust(this.tempPosCache, horizontalSpeed / 10);

// Game.ts:1391
this.tempPosCache.set(behindX, pos.y, behindZ);
this.particleManager.createRunDustPuff(this.tempPosCache);

// ParticleManager - add class fields
private defaultWindDir = new THREE.Vector3(0.3, 0, 0.1);
private roseSizeCache = new THREE.Vector3();
private roseCenterCache = new THREE.Vector3();

// PlayerController - return direct reference
getMomentum(): THREE.Vector3 { return this.momentum; }
```

**Effort:** 1-2 hours

**Risk:** Low

## Acceptance Criteria

- [ ] Zero `new THREE.Vector3()` or `new THREE.Box3()` in any per-frame code path
- [ ] All hot paths use pre-allocated caches
- [ ] getMomentum() does not allocate
- [ ] Game still plays correctly

## Work Log

### 2026-02-27 - Code Review Discovery

**By:** Claude Code (multi-agent review)

**Actions:**
- Identified 11 per-frame allocation sites across 5 files
- Confirmed these violate patterns established in todos 008, 013, 014, 015
- Learnings researcher confirmed regressions
