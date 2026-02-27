---
status: pending
priority: p3
issue_id: "012"
tags: [code-quality, maintainability, camera]
dependencies: []
---

# CameraController Contains Magic Numbers

## Problem Statement

`CameraController.ts` contains numerous magic numbers without named constants, making the code harder to understand and tune.

## Findings

| Line | Value | Context |
|------|-------|---------|
| 45 | `0.3` | Initial pitch value |
| 48-49 | `8` | Initial distance |
| 52-53 | `2` | Height offset |
| 165-166 | `0.5` | Pitch rotation multiplier |
| 218 | `0.5` | Ray origin height factor |
| 237 | `1.5` | Minimum camera distance |
| 237 | `0.85` | Wall collision buffer |
| 260 | `3` | Fast pull-in multiplier |
| 285 | `0.5` | Look-at height factor |
| 303 | `0.3` | Reset pitch (duplicate of line 45) |

## Proposed Solutions

### Option 1: Extract to Named Constants

**Approach:** Create constants object or individual readonly properties.

```typescript
const CAMERA_DEFAULTS = {
  INITIAL_PITCH: 0.3,
  INITIAL_DISTANCE: 8,
  HEIGHT_OFFSET: 2,
  MIN_DISTANCE: 1.5,
  WALL_BUFFER: 0.85,
  FAST_PULL_MULTIPLIER: 3,
  PITCH_ROTATION_FACTOR: 0.5,
  HEIGHT_FACTORS: {
    RAY_ORIGIN: 0.5,
    LOOK_AT: 0.5,
  },
} as const;
```

**Pros:**
- Self-documenting code
- Single source of truth
- Easy to tune values

**Cons:**
- More lines of code

**Effort:** 20 minutes

**Risk:** Low

## Recommended Action

Extract magic numbers to named constants.

## Technical Details

**Affected files:**
- `src/camera/CameraController.ts`

## Acceptance Criteria

- [ ] All magic numbers replaced with named constants
- [ ] Constants have descriptive names

## Work Log

### 2026-02-26 - Code Quality Review

**By:** Claude Code

**Actions:**
- Catalogued magic number locations
- Proposed constant names
