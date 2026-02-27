---
status: pending
priority: p3
issue_id: "027"
tags: [duplication, consistency, colors]
dependencies: []
---

# Consolidate Duplicated Challenge Type Colors

## Problem Statement

Challenge type colors are defined in two places with slight variations, causing visual inconsistency.

## Findings

**WonderStarManager.ts (lines 347-356)** returns hex numbers:
```typescript
case 'race': return 0xff0000;
```

**StarSelect.ts (lines 281-289)** returns CSS strings:
```typescript
case 'race': return '#ff4444';  // Different shade!
```

The race color is `0xff0000` in one and `#ff4444` in another.

## Proposed Solutions

### Option 1: Create Shared Color Constants

**Approach:** Create `src/constants/colors.ts` with challenge type colors.

```typescript
export const CHALLENGE_COLORS = {
  exploration: { hex: 0x00ff00, css: '#00ff00' },
  race: { hex: 0xff0000, css: '#ff0000' },
  // ...
};
```

**Pros:**
- Single source of truth
- Consistent colors

**Cons:**
- New file

**Effort:** 20 minutes

**Risk:** Low

## Recommended Action

Create shared color constants to ensure visual consistency.

## Technical Details

**Affected files:**
- New: `src/constants/colors.ts`
- `src/world/WonderStarManager.ts:347-356`
- `src/ui/StarSelect.ts:281-289`

## Acceptance Criteria

- [ ] Single color definition per challenge type
- [ ] Both files use shared constants
- [ ] Colors are visually consistent

## Work Log

### 2026-02-26 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified inconsistent color definitions
