---
status: done
priority: p1
issue_id: "049"
tags: [performance, camera]
dependencies: []
---

# Camera wall fade does full-scene recursive raycast every frame

## Problem Statement

`CameraController.updateWallFade()` calls `this.raycaster.intersectObjects(this.scene.children, true)` every frame, traversing the entire scene graph recursively. With 49 GLB models (NPCs + garden assets) each containing multiple meshes, this is estimated at 1-3ms per frame — a significant chunk of the 16ms budget at 60fps.

## Findings

- `src/camera/CameraController.ts:274` — `intersectObjects(this.scene.children, true)` recursive traversal
- Scene contains ~49 loaded GLBs with nested mesh hierarchies
- Raycast runs unconditionally every frame, even when camera is far from any geometry
- Three.js Layers system exists specifically for this use case

## Proposed Solutions

### Option 1: Three.js Layers for occlusion group

**Approach:** Assign occludable meshes (hedges, walls, large garden objects) to a dedicated Layer. Set raycaster to only check that layer.

**Pros:**
- Near-zero cost for non-occludable objects (NPCs, small decorations, particles)
- Built-in Three.js feature, no custom code needed
- Can be as selective as needed

**Cons:**
- Need to tag relevant meshes during level loading

**Effort:** 1-2 hours

**Risk:** Low

### Option 2: Distance gate + reduced frequency

**Approach:** Only run raycast when camera is within a threshold distance of geometry (cheap bounding sphere check first). Also reduce to every 2nd or 3rd frame.

**Pros:**
- Simple to add
- Helps even without Layers

**Cons:**
- Still traverses full scene when near geometry
- Frame skipping may cause visible pop-in

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

Option 1 (Layers) is the proper fix. Can combine with Option 2's distance gate for extra savings.

## Technical Details

**Affected files:**
- `src/camera/CameraController.ts:274` — raycast call
- `src/world/LevelBuilder.ts` or `src/world/GardenAssetLoader.ts` — tag meshes with Layer

**Related components:**
- Wall fade-through system (new in this PR)

## Resources

- **PR:** #6

## Acceptance Criteria

- [ ] Raycast only checks meshes on a dedicated occlusion layer
- [ ] Non-occludable objects (NPCs, particles, small props) are excluded
- [ ] Wall fade still works correctly for hedges and large geometry
- [ ] Measurable frame time improvement

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Claude Code (PR #6 review)

**Actions:**
- Identified full-scene raycast as P1 performance issue
- Both performance and architecture reviewers flagged this independently
