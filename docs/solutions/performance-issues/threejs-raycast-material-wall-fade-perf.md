---
title: "Three.js Wall Fade Performance: Scoped Raycasts and Clone-on-Fade"
date: 2026-02-27
category: performance-issues
tags: [three.js, raycast, material, shader-recompile, camera, wall-fade]
severity: P1
components: [CameraController, Game]
related_files:
  - src/camera/CameraController.ts
  - src/Game.ts
  - src/world/LevelBuilder.ts
---

# Three.js Wall Fade Performance: Scoped Raycasts and Clone-on-Fade

## Problem

The camera wall fade-through system had two critical performance issues:

1. **Full-scene recursive raycast every frame** — `raycaster.intersectObjects(scene.children, true)` traversed the entire scene graph (~49 GLB models with nested meshes) to find walls between camera and player. Cost: 1-3ms per frame.

2. **Material `transparent` toggle caused shader recompilation** — Setting `mat.transparent = true` on fade and `mat.transparent = false` on restore invalidated the compiled GPU shader program each time, triggering recompilation costing 5-50ms per material. Also mutated shared materials, affecting all mesh instances.

## Root Cause

### Raycast
`intersectObjects(scene.children, true)` with `recursive: true` walks the full scene hierarchy. With 49 loaded GLBs each containing multiple meshes, this is O(n) against all scene objects every frame — most of which (NPCs, particles, small props) can never occlude the camera.

### Shader Recompile
In Three.js, `material.transparent` controls whether the shader program includes alpha-blending logic. Changing this property at runtime invalidates the compiled shader, forcing a GPU recompile. This is a fundamental Three.js rendering pipeline behavior — not a bug, but a costly operation when done repeatedly.

## Solution

### 1. Scoped Raycast with Occludables Array

Store only relevant meshes (platforms, walls, large structures) in a dedicated array. Raycast against that instead of the full scene.

```typescript
// Before (1-3ms/frame)
const intersections = this.raycaster.intersectObjects(this.scene.children, true);

// After (~0.1ms/frame)
private occludables: THREE.Object3D[] = [];

setOccludables(objects: THREE.Object3D[]): void {
  this.restoreAllFadedMeshes();
  this.occludables = objects;
}

private updateWallFade(playerPos: THREE.Vector3): void {
  if (this.occludables.length === 0) return;
  // ...
  const intersections = this.raycaster.intersectObjects(this.occludables, true);
}
```

Wired up in `Game.ts` after level load:
```typescript
const platformMeshes = this.sceneManager.getPlatformMeshes();
this.cameraController?.setOccludables(platformMeshes);
```

### 2. Clone-on-Fade Pattern

Clone the material on first fade so `transparent` is set once at clone time. Restore the original material on unfade. Never toggle `transparent` at runtime.

```typescript
private fadedMeshes: Map<THREE.Mesh, { originalMaterial: THREE.Material }> = new Map();

// Fading in:
const clone = mat.clone();
clone.transparent = true;  // Set once at creation — no recompile later
clone.opacity = this.WALL_FADE_ALPHA;
this.fadedMeshes.set(obj, { originalMaterial: mat });
obj.material = clone;

// Fading out:
const fadedMat = mesh.material as THREE.Material;
mesh.material = saved.originalMaterial;  // Restore original
fadedMat.dispose();  // Clean up clone
```

This also fixes **shared material mutation** — the original material is never modified, so other mesh instances are unaffected.

## Prevention Rules

### Raycasting
- **Never** use `intersectObjects(scene.children, true)` on scenes with 20+ objects
- Always scope raycasts to a subset: bounded array, THREE.Layers, or spatial structure
- Set `raycaster.near` and `.far` to filter early
- Cache raycast vectors (pre-allocate, reuse)

### Material Changes at Runtime

**Safe (cheap uniform update):**
- `material.opacity`
- `material.color.set()`
- `shaderMaterial.uniforms.uValue.value`

**Unsafe (triggers shader recompile):**
- `material.transparent`
- `material.alphaTest`
- `material.depthWrite`
- `material.side`

When you need runtime transparency effects, use the clone-on-fade pattern.

### Dead Code in Hot Paths
When removing a feature, grep for all references and remove conditionals from update loops. Even `if (false)` adds cycles at 60fps.

## Code Review Checklist

- [ ] All raycasts scoped to a subset (not `scene.children`)
- [ ] `raycaster.near` and `.far` set
- [ ] No `material.transparent` toggled at runtime
- [ ] Cloned materials disposed when no longer needed
- [ ] No dead feature checks in update/render loops
- [ ] Raycast vectors pre-allocated (no `new Vector3()` per frame)

## Related

- `docs/solutions/performance-issues/mesh-caching-memory-race-conditions.md` — Mesh caching and per-frame allocation patterns
- `docs/solutions/integration-issues/skybox-quality-seams-artifacts.md` — Material/texture configuration
- Commit `d82a6dd` — Implementation of these fixes
- Commit `f8a74e3` — P2 cleanup (stale references, pool clamp)
