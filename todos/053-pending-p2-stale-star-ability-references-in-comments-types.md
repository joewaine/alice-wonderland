---
status: done
priority: p2
issue_id: "053"
tags: [dead-code, cleanup]
dependencies: []
---

# Stale references to removed stars/abilities in comments and types

## Problem Statement

Multiple files still reference "stars", "ground pound", "wall slide", and other removed features in comments, JSDoc, type definitions, and data structures. This is misleading for anyone reading the code.

## Findings

- `src/Game.ts:282` — comment says "star/card collection" (stars removed)
- `src/effects/ParticleManager.ts:1418-1420` — JSDoc references stars in `createCollectTrail`
- `src/effects/ParticleManager.ts:105` — pool usage comment references "wall slide"
- `src/world/Collectible.ts:4` — module doc says "Handles keys, stars, and cards"
- `src/world/Collectible.ts:106` — comment says "only for stars and cards"
- `src/world/Collectible.ts:166` — comment says "Stars and keys get gold emissive"
- `src/animation/AnimationStateManager.ts` — `groundPound` still in AnimationState type, STATE_PRIORITY, and DEFAULT_CROSSFADE
- `src/data/LevelData.ts:66` — `collect_stars` quest objective type
- `src/data/LevelData.ts:69-70` — `perform_ground_pounds`, `perform_long_jumps` quest types
- `src/data/LevelData.ts:20` — `breakable?: boolean` references ground pound
- `src/data/LevelData.ts:77` — `'star'` as valid collectible type

## Proposed Solutions

### Option 1: Sweep and clean all stale references

**Approach:** Update comments to remove star/ability references. Remove `groundPound` from AnimationStateManager types. Remove stale quest objectives and collectible type from LevelData.ts.

**Effort:** 30 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `src/Game.ts` — update comment
- `src/effects/ParticleManager.ts` — update JSDoc and pool comment
- `src/world/Collectible.ts` — update 3 comments
- `src/animation/AnimationStateManager.ts` — remove groundPound from type, priority, crossfade
- `src/data/LevelData.ts` — remove stale quest/collectible types

## Acceptance Criteria

- [ ] No comments reference stars, ground pound, wall slide, long jump, triple jump
- [ ] AnimationState type only includes active states
- [ ] LevelData quest objectives only include achievable objectives
- [ ] TypeScript compiles clean

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Claude Code (PR #6 review)

**Actions:**
- Code simplicity reviewer found stale references across 5+ files
