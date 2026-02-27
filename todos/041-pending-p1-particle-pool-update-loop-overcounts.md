---
status: done
priority: p1
issue_id: "041"
tags: [performance, particles, correctness]
dependencies: ["030"]
---

# ParticleManager: pooled systems process all 35 buffer slots instead of active count

## Problem Statement

The `update()` loop uses `positions.count` to determine how many particles to iterate. For pooled systems, `.count` returns the total buffer capacity (`POOL_MAX_PARTICLES = 35`), not the actual active particle count. A footstep dust effect with 4 particles still processes all 35 buffer slots every frame. Additionally, when toggling `vertexColors` between `true`/`false` on pooled materials, `mat.needsUpdate = true` is never set, meaning the shader won't recompile — causing potential visual artifacts.

## Findings

- `src/effects/ParticleManager.ts:2098` — `const count = positions.count` returns full buffer capacity (35), not draw range
- Footstep dust (4 particles, fires every 0.2s) and run dust (5 particles, every 0.15s) both process 35 slots per frame
- Stale velocity/position data from prior bursts remains in unused buffer slots
- `src/effects/ParticleManager.ts:121-132` — `acquireSystem()` toggles `mat.vertexColors` without setting `mat.needsUpdate = true`

## Proposed Solutions

### Option 1: Add `activeCount` field to ParticleSystem

**Approach:** Add a `count` field to the `ParticleSystem` interface. Set it in `acquireSystem()`. Use it instead of `positions.count` in the update loop. Also add `mat.needsUpdate = true` when changing `vertexColors`.

**Pros:**
- Minimal change, high impact
- Fixes both CPU waste and correctness bug

**Cons:**
- None significant

**Effort:** 30 minutes

**Risk:** Low

## Acceptance Criteria

- [ ] ParticleSystem interface has `activeCount` field
- [ ] `update()` uses `activeCount` for pooled systems
- [ ] `acquireSystem()` sets `mat.needsUpdate = true` when changing `vertexColors`
- [ ] Footstep/run dust only processes actual particle count per frame
- [ ] No visual artifacts when pooled systems switch between effect types

## Work Log

### 2026-02-27 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Found via parallel performance + architecture review agents
- Confirmed `positions.count` returns buffer capacity not draw range
- Identified missing `needsUpdate` flag as correctness bug
