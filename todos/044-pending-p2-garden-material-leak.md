---
status: done
priority: p2
issue_id: "044"
tags: [memory-leak, performance, garden]
dependencies: []
---

# GardenAssetLoader: original GLTF materials leaked on cel-shader replacement

## Problem Statement

In `applyGardenStyling()`, when `child.material` is reassigned to a new cel-shader material, the original `MeshStandardMaterial` from the GLTF loader is never disposed. This leaks GPU textures and material uniforms. With 35 garden asset placements, each potentially containing multiple meshes, this accumulates leaked GPU memory.

## Findings

- `src/world/GardenAssetLoader.ts:114-130` — `child.material = createCelShaderMaterial(...)` replaces material without disposing the original
- Original materials may include textures (`map`, `normalMap`, `roughnessMap`, etc.) from GLB files
- 35 asset placements * ~3-5 meshes per model = 105-175 material instances leaked

## Proposed Solutions

### Option 1: Dispose original material before replacement (Recommended)

**Approach:** Before assigning the new cel-shader material, dispose the original material and any of its textures.

```typescript
const originalMat = child.material as THREE.MeshStandardMaterial;
// Dispose textures if present
originalMat.map?.dispose();
originalMat.normalMap?.dispose();
originalMat.roughnessMap?.dispose();
originalMat.metalnessMap?.dispose();
originalMat.dispose();
// Then assign new material
child.material = createCelShaderMaterial({...});
```

**Effort:** 15 minutes

**Risk:** Low

## Acceptance Criteria

- [ ] Original GLTF materials disposed before replacement in `applyGardenStyling()`
- [ ] Associated textures disposed
- [ ] No visual regressions
