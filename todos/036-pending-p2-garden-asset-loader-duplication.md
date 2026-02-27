---
status: pending
priority: p2
issue_id: "036"
tags: [duplication, maintainability]
dependencies: []
---

# GardenAssetLoader Redundant Cel-Shader Material Creation

## Problem Statement

17 fallback builder functions each manually call `createCelShaderMaterial` with near-identical parameters. The `MATERIAL_PRESETS` map exists but is underutilized. Asset category knowledge is duplicated across 3 locations.

## Findings

- `src/world/GardenAssetLoader.ts:104-778` - 17 identical material creation patterns
- `getMaterialPreset` (lines 67-78) uses `startsWith()` chain — same prefix-to-category mapping is in `createFallbackAsset` and `LevelBuilder.getSurfaceType`
- `addOutlinesToObject` called at end of every builder with near-identical args

## Proposed Solutions

### Option 1: Helper Functions + Data-Driven Categories

**Approach:** Create `materialFromPreset(name)` and `finalizeAsset(group, preset)` helpers. Add `category` field to `GARDEN_ASSETS` to eliminate duplicate prefix mapping.

**Effort:** 1-2 hours

**Risk:** Low

## Acceptance Criteria

- [ ] Single path for creating materials from presets
- [ ] Asset category mapping defined once
- [ ] ~100 lines removed
- [ ] Visual appearance unchanged

## Work Log

### 2026-02-27 - Code Review Discovery

**By:** Claude Code (multi-agent review)
