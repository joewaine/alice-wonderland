---
status: pending
priority: p3
issue_id: "055"
tags: [performance, animation]
dependencies: []
---

# FoliageAnimator skip-frame should use time-based throttle

## Problem Statement

`FoliageAnimator.update()` uses `frameCount % 2` to skip every other frame. At variable frame rates, this means the update frequency varies (30fps at 60fps display, 20fps at 40fps display). A time accumulator would give consistent update rates regardless of frame rate.

## Findings

- `src/effects/FoliageAnimator.ts:71-72` — `this.frameCount++; if (this.frameCount % 2 !== 0) return;`
- At 144fps displays, foliage updates at 72fps (wasteful). At 30fps, updates at 15fps (choppy).

## Proposed Solutions

### Option 1: Time accumulator with fixed interval

**Approach:** Accumulate `dt` and only run update when accumulated time exceeds threshold (e.g., 33ms for ~30fps updates).

**Effort:** 10 minutes

**Risk:** None

## Technical Details

**Affected files:**
- `src/effects/FoliageAnimator.ts:67-72` — replace frameCount with time accumulator

## Acceptance Criteria

- [ ] Foliage updates at consistent frequency regardless of display refresh rate

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Claude Code (PR #6 review)
