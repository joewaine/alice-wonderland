# Redundant Geometry Inversion

## Priority: P2 (IMPORTANT)

## Issue
The skybox code uses BOTH geometry inversion (`scale(-1, 1, 1)`) AND `THREE.BackSide` rendering. This is redundant and could potentially cause texture orientation issues.

## Location
- `src/engine/SceneManager.ts:142-148`

## Current Code
```typescript
const geometry = new THREE.SphereGeometry(500, 64, 32);
geometry.scale(-1, 1, 1); // Invert so texture is on inside

const material = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.BackSide  // Also rendering back faces
});
```

## Recommended Fix
Use only ONE approach - inverted geometry with FrontSide (more explicit):

```typescript
const geometry = new THREE.SphereGeometry(500, 64, 32);
geometry.scale(-1, 1, 1);

const material = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.FrontSide,  // Changed from BackSide
  depthWrite: false  // Optimization: skybox always behind everything
});

this.skyboxMesh = new THREE.Mesh(geometry, material);
this.skyboxMesh.renderOrder = -1;  // Render first
```

## Impact
- Clearer code intent
- Avoids potential UV/orientation confusion
- Minor performance optimization with depthWrite: false

## Effort: Small
