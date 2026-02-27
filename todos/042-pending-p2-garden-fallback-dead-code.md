---
status: done
priority: p2
issue_id: "042"
tags: [dead-code, simplification, garden]
dependencies: ["036"]
---

# GardenAssetLoader: ~500 lines of dead procedural fallback geometry

## Problem Statement

All 25 garden assets now have real `.glb` model files. The 11 procedural fallback builder functions (~500-620 lines) in `GardenAssetLoader.ts` will only execute if a model file fails to load at runtime. This is the majority of the file's weight — the core loading + styling logic is only ~140 lines. Additionally, `preloadGardenAssets()` and `getGardenAssetIds()` are exported but never called anywhere.

## Findings

- `src/world/GardenAssetLoader.ts:148-767` — 11 fallback functions: `createFallbackAsset`, `createHedgeFallback`, `createRoseBushFallback`, `createFountainFallback`, `createTopiaryFallback`, `createGazeboFallback`, `createStonePath`, `createBenchFallback`, `createChairFallback`, `createTableFallback`, `createLanternFallback`
- `src/world/GardenAssetLoader.ts:779-781` — `getGardenAssetIds()` exported but no callers
- `src/world/GardenAssetLoader.ts:786-792` — `preloadGardenAssets()` exported but no callers
- All 25 `.glb` files verified present in `public/assets/models/garden/`
- Each fallback builder creates unique uncached materials and geometries (related to todo 036)

## Proposed Solutions

### Option 1: Replace with generic box fallback (Recommended)

**Approach:** Delete all 11 bespoke fallback builders. Replace `createFallbackAsset` with a single 5-10 line function that returns a colored box with the asset's material preset. Keep the error logging. Remove unused exports.

**Pros:**
- Removes ~500 lines immediately
- File becomes readable and maintainable (~200 lines)
- Still has a safety net for broken builds

**Cons:**
- Fallback is less visually informative during development

**Effort:** 30 minutes

**Risk:** Low

## Affected Files

- `src/world/GardenAssetLoader.ts:148-792` — bulk deletion + simplification

## Acceptance Criteria

- [ ] All bespoke fallback builders removed
- [ ] Single generic fallback still works if a model fails to load
- [ ] Unused exports (`getGardenAssetIds`, `preloadGardenAssets`) removed
- [ ] Game still boots and renders garden assets normally
