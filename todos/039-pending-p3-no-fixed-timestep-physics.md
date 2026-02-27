---
status: pending
priority: p3
issue_id: "039"
tags: [physics, correctness, game-feel]
dependencies: []
---

# No Fixed-Timestep Physics Accumulator

## Problem Statement

The game loop caps delta time at 0.1s but doesn't use a fixed-timestep accumulator for physics. Frame spikes cause large dt values, potentially causing tunneling and missed collisions. Visual movement (using variable `dt`) and physics resolution (Rapier's default timestep) are disconnected.

## Findings

- `src/Game.ts:1179` - `Math.min(delta, 0.1)` caps but doesn't accumulate
- `src/Game.ts:1511` - `world.step()` uses default timestep, not variable `dt`

## Proposed Solutions

### Option 1: Fixed-Timestep Accumulator

**Approach:** Accumulate time and step physics in fixed increments (e.g., 1/60s). Interpolate visual positions between physics steps for smooth rendering.

**Effort:** 2-4 hours

**Risk:** Medium (affects all movement feel)

## Acceptance Criteria

- [ ] Physics steps at fixed rate regardless of frame rate
- [ ] No tunneling on frame spikes
- [ ] Movement feels smooth at variable frame rates

## Work Log

### 2026-02-27 - Code Review Discovery

**By:** Claude Code (multi-agent review)
