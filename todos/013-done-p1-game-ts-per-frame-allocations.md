---
status: done
priority: p1
issue_id: "013"
tags: [performance, gc-pressure, game-loop]
dependencies: []
---

# Fix Per-Frame Vector3 Allocations in Game.ts

## Problem Statement

Multiple `new THREE.Vector3()` allocations occur every frame inside the game loop in Game.ts, causing significant GC pressure. This can lead to frame rate drops and stuttering during gameplay.

## Findings

Per-frame allocations found in Game.ts:

| Line | Method | Code | Called Per Frame |
|------|--------|------|------------------|
| 698 | `updateLevel()` | `const playerPos = new THREE.Vector3(pos.x, pos.y, pos.z);` | Yes |
| 786 | `updatePlayer()` | `const playerPos = new THREE.Vector3(pos.x, pos.y, pos.z);` | Yes |
| 791 | `updatePlayer()` | `const playerPos = new THREE.Vector3(pos.x, pos.y, pos.z);` | Yes |
| 822 | `updateParticles()` | `const playerPos = new THREE.Vector3(pos.x, pos.y, pos.z);` | Yes |

Additional allocations in callbacks (less frequent but still during gameplay):
- Line 533: `onSizeChange` callback
- Line 563: `onLand` callback

## Proposed Solutions

### Option 1: Pre-allocate Class-Level Cached Vectors

**Approach:** Add cached Vector3 instances as class properties and reuse them, following the pattern already used in PlayerController.ts and CameraController.ts.

```typescript
// Add to class properties
private playerPosCache: THREE.Vector3 = new THREE.Vector3();
private tempVec3Cache: THREE.Vector3 = new THREE.Vector3();

// In methods, use:
this.playerPosCache.set(pos.x, pos.y, pos.z);
```

**Pros:**
- Zero per-frame allocations
- Consistent with existing patterns in PlayerController.ts (lines 126-127)

**Cons:**
- Slightly more verbose code

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

Implement Option 1. Add 2-3 cached Vector3 instances at the class level and update all per-frame allocation sites to use them.

## Technical Details

**Affected files:**
- `src/Game.ts:698` - updateLevel()
- `src/Game.ts:786` - updatePlayer()
- `src/Game.ts:791` - updatePlayer()
- `src/Game.ts:822` - updateParticles()

**Related components:**
- PlayerController.ts (reference implementation at lines 126-131)
- CameraController.ts (reference implementation at lines 86-87)

## Acceptance Criteria

- [ ] No `new THREE.Vector3()` calls in game loop methods
- [ ] Cached vectors declared as class properties
- [ ] Game functions identically after change
- [ ] Build passes with no TypeScript errors

## Work Log

### 2026-02-26 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified 4 per-frame allocations in Game.ts
- Verified PlayerController.ts pattern for cached vectors
