---
title: "Alice Wonderland Game - Performance and Race Condition Fixes"
date: 2026-02-25
category: performance-issues
tags:
  - three-js
  - performance
  - memory-leak
  - race-condition
  - async
  - game-loop
  - dom-cleanup
  - caching
severity: P1
status: resolved
files_affected:
  - src/world/Collectible.ts
  - src/ui/HUD.ts
  - src/Game.ts
issues_fixed:
  - mesh-traverse-every-frame
  - style-element-memory-leak
  - respawn-race-condition
  - chapter-loading-race-condition
---

# Performance and Race Condition Fixes

This document captures fixes for P1 issues identified during a `/workflows:review` of the Alice in Wonderland browser-based 3D platformer game.

## Summary

Four P1 issues were identified and fixed:

1. **Mesh traverse every frame** - CollectibleManager was calling `mesh.traverse()` on every collectible during each frame update
2. **Memory leak in HUD** - `showChapterComplete()` injected a `<style>` element that was never removed
3. **Respawn race condition** - `handleDeath()` could be called multiple times while already respawning
4. **Chapter loading race condition** - `loadChapter()` could be invoked concurrently via debug keys or callbacks

## Root Cause Analysis

### Issue 1: Mesh Traverse Every Frame (Collectible.ts)

**Root Cause:** The hover glow effect required accessing all mesh materials in each collectible to update emissive intensity. The original implementation called `collectible.mesh.traverse()` inside the update loop, which runs 60 times per second. The `traverse()` method walks the entire scene graph hierarchy of each collectible mesh, creating significant CPU overhead when multiplied by the number of collectibles and frame rate.

**Impact:** Unnecessary object iteration causing frame rate degradation, especially with many collectibles on screen.

### Issue 2: Memory Leak in HUD (HUD.ts)

**Root Cause:** The `showChapterComplete()` method dynamically creates a `<style>` element containing `@keyframes` CSS animation and appends it to `document.head`. When the celebration overlay was removed, only the overlay div was cleaned up—the style element remained orphaned in the document head. Each chapter completion added another style element that was never removed.

**Impact:** DOM pollution with orphaned style elements accumulating over gameplay sessions, causing gradual memory growth.

### Issue 3: Race Condition in Respawn (Game.ts)

**Root Cause:** The `handleDeath()` method is triggered when the player falls below y=-50. If the player falls rapidly through the death threshold, the condition could evaluate true multiple times before the first respawn completed, causing overlapping fade animations and position resets.

**Impact:** Visual glitches from overlapping fade transitions, potential state corruption from concurrent respawn operations.

### Issue 4: Race Condition in Chapter Loading (Game.ts)

**Root Cause:** The `loadChapter()` method is async and takes time to complete (clearing pickups, loading level assets, setting up NPCs). Users pressing number keys rapidly (1-4) or triggering chapter transitions while one was in progress could start multiple concurrent chapter loads, leading to partial initialization and asset conflicts.

**Impact:** Corrupted game state, missing assets, NPCs not properly initialized, potential crashes from accessing partially loaded resources.

## Solutions

### Fix 1: Mesh Cache for Collectibles

Added a `Map` to cache mesh references during initialization, eliminating per-frame traversal:

```typescript
// Cached mesh references for performance (avoid traverse every frame)
private meshCache: Map<CollectibleObject, THREE.Mesh[]> = new Map();

setCollectibles(collectibles: CollectibleObject[]): void {
  this.collectibles = collectibles;
  this.meshCache.clear();

  // Cache mesh references for each collectible
  for (const collectible of collectibles) {
    const meshes: THREE.Mesh[] = [];
    collectible.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });
    this.meshCache.set(collectible, meshes);
  }
  // ... rest of initialization
}
```

In the update loop, use cached references:

```typescript
const cachedMeshes = this.meshCache.get(collectible) || [];

for (const mesh of cachedMeshes) {
  const mat = mesh.material as THREE.MeshStandardMaterial;
  if (mat.emissiveIntensity !== undefined) {
    mat.emissiveIntensity = 0.3 + intensity;
  }
}
```

### Fix 2: Style Element Cleanup in HUD

Added explicit removal of the injected style element in the cleanup callback:

```typescript
// Wait then fade out and continue
setTimeout(() => {
  overlay.style.opacity = '0';
  setTimeout(() => {
    document.body.removeChild(overlay);
    document.head.removeChild(style); // Clean up injected style
    onComplete();
  }, 500);
}, 3000);
```

### Fix 3: Respawn Guard Flag

Added an `isRespawning` flag with try/finally pattern:

```typescript
private isRespawning: boolean = false;

private async handleDeath(): Promise<void> {
  if (!this.sceneManager || this.isRespawning) return;

  this.isRespawning = true;

  try {
    audioManager.playFall();
    await this.sceneManager.fadeToBlack();
    this.spawnPlayerAt(new THREE.Vector3(0, 5, 0));
    audioManager.playRespawn();
    await this.sceneManager.fadeIn();
  } finally {
    this.isRespawning = false;
  }
}
```

### Fix 4: Chapter Loading Guard with Error Recovery

Added an `isLoadingChapter` flag with try/catch/finally and fallback:

```typescript
private isLoadingChapter: boolean = false;

private async loadChapter(chapterNumber: number): Promise<void> {
  if (!this.sceneManager || !this.world || this.isLoadingChapter) return;

  this.isLoadingChapter = true;

  try {
    this.clearSizePickups();
    await this.sceneManager.loadLevel(chapterNumber);
    // ... rest of setup
  } catch (error) {
    console.error(`Failed to load chapter ${chapterNumber}:`, error);
    if (chapterNumber !== 1) {
      console.log('Falling back to chapter 1');
      this.isLoadingChapter = false;
      await this.loadChapter(1);
    }
  } finally {
    this.isLoadingChapter = false;
  }
}
```

## Prevention Strategies

### Mesh Traverse Performance

**Best Practice:** Never traverse scene graphs inside render loops. Cache references at initialization time.

**Code Review Checklist:**
- [ ] No `traverse()`, `find()`, `querySelector()` calls inside animation loops
- [ ] Object lookups cached in constructors or init methods
- [ ] Missing object caching for frequently accessed objects

### Memory Leak Prevention

**Best Practice:** Every dynamically created element must have a corresponding cleanup path.

**Code Review Checklist:**
- [ ] Every `createElement()` has a corresponding `remove()` call
- [ ] Classes that create DOM elements have `dispose()` methods
- [ ] Event listeners are removed before elements
- [ ] Hiding elements doesn't replace removing them

### Race Condition Prevention

**Best Practice:** Use state flags or request IDs to invalidate stale async responses.

**Code Review Checklist:**
- [ ] Async functions that modify shared state include staleness checks
- [ ] Guard flags prevent concurrent execution of non-reentrant operations
- [ ] Try/finally ensures flags are always reset
- [ ] AbortController used for cancelable operations

## Testing Checklist

- [ ] Profile frame rate during extended gameplay sessions
- [ ] Monitor memory usage over time (should stabilize, not grow)
- [ ] Test rapid user interactions that trigger async operations
- [ ] Verify cleanup runs correctly when switching scenes/levels
- [ ] Rapid key presses (1-4) don't corrupt game state
- [ ] Falling off world multiple times doesn't break respawn

## Related Patterns

Future solution docs should cross-reference:

- Three.js Performance Patterns (mesh caching, object pooling)
- Memory Leak Prevention (DOM cleanup, Three.js dispose())
- Async/Race Condition Patterns (AbortController, stale closure prevention)
- Error Handling Patterns (graceful fallbacks, user-facing error states)
