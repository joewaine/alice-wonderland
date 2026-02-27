---
status: pending
priority: p2
issue_id: "019"
tags: [architecture, duplication, types]
dependencies: []
---

# Consolidate Duplicated Zone Interface Definitions

## Problem Statement

Zone interfaces (AirCurrent, Water, SpeedBoost) are defined in both `PlayerController.ts` and `LevelBuilder.ts` with slightly different structures, requiring mapping between types.

## Findings

**PlayerController.ts (lines 27-42):**
```typescript
export interface AirCurrentZoneRef {
  bounds: THREE.Box3;
  force: number;
}
```

**LevelBuilder.ts (lines 68-94):**
```typescript
export interface AirCurrentZone {
  bounds: THREE.Box3;
  force: number;
  mesh: THREE.Mesh;  // Extra property
}
```

Same pattern repeats for `WaterZone` and `SpeedBoostZone`.

## Proposed Solutions

### Option 1: Create Shared types/zones.ts

**Approach:** Create a shared types file with common interfaces. Use inheritance or optional properties for the `mesh` field.

```typescript
// src/types/zones.ts
export interface ZoneBase {
  bounds: THREE.Box3;
}

export interface AirCurrentZone extends ZoneBase {
  force: number;
  mesh?: THREE.Mesh;
}
```

**Pros:**
- Single source of truth
- No mapping needed between modules

**Cons:**
- New file to maintain

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

Implement Option 1. Create `src/types/zones.ts` and update both files to import from it.

## Technical Details

**Affected files:**
- New: `src/types/zones.ts`
- `src/player/PlayerController.ts:27-42` - remove local interfaces
- `src/world/LevelBuilder.ts:68-94` - remove local interfaces

## Acceptance Criteria

- [ ] Single zone type definitions in src/types/
- [ ] Both files import from shared location
- [ ] No type casting required when passing zone data
- [ ] Build passes

## Work Log

### 2026-02-26 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified duplicated interface definitions
