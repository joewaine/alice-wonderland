---
status: pending
priority: p3
issue_id: "022"
tags: [code-quality, maintainability, constants]
dependencies: []
---

# Extract Swimming Magic Numbers to Constants

## Problem Statement

Swimming physics in PlayerController uses several magic numbers that make the code harder to tune and understand.

## Findings

**File:** `src/player/PlayerController.ts`

| Line | Magic Number | Meaning |
|------|--------------|---------|
| 472 | `0.6` | Swim up speed |
| 473 | `0.4` | Dive speed |
| 479 | `0.15` | Buoyancy factor |
| 494 | `8` | Max swim speed |
| 510 | `0.5` | Surface detection threshold |
| 713 | `2` | Rising velocity threshold |

## Proposed Solutions

### Option 1: Add Named Constants

**Approach:** Add constants at the class level with descriptive names.

```typescript
private readonly SWIM_UP_ACCEL = 0.6;
private readonly DIVE_ACCEL = 0.4;
private readonly BUOYANCY_FACTOR = 0.15;
private readonly MAX_SWIM_SPEED = 8;
```

**Pros:**
- Self-documenting code
- Easy to tune

**Cons:**
- Minor verbosity

**Effort:** 15 minutes

**Risk:** Low

## Recommended Action

Add named constants for all swimming-related magic numbers.

## Technical Details

**Affected files:**
- `src/player/PlayerController.ts:472-510` - swimming methods

## Acceptance Criteria

- [ ] All swimming magic numbers have named constants
- [ ] Swimming behavior unchanged
- [ ] Constants grouped near other physics constants

## Work Log

### 2026-02-26 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified magic numbers in swimming code
