---
status: done
priority: p2
issue_id: "054"
tags: [performance, particles]
dependencies: []
---

# POOL_MAX_PARTICLES=20 clamps createSizeChangeBurst (24 particles)

## Problem Statement

`createSizeChangeBurst()` requests 24 particles but `POOL_MAX_PARTICLES` was reduced to 20 in Phase 6 perf cuts. The pool silently clamps to 20, losing 4 particles per burst. This affects the visual quality of size change effects.

## Findings

- `src/effects/ParticleManager.ts` — `POOL_MAX_PARTICLES = 20`
- `createSizeChangeBurst()` creates 24 particles
- Buffer geometry `setAttribute` positions array is sized to POOL_MAX_PARTICLES
- Excess particles are silently dropped

## Proposed Solutions

### Option 1: Reduce burst to 20 particles

**Approach:** Change `createSizeChangeBurst()` to request 20 instead of 24.

**Effort:** 5 minutes

**Risk:** None — 20 vs 24 is barely noticeable

### Option 2: Raise POOL_MAX_PARTICLES to 24

**Approach:** Bump the pool max back to 24 to accommodate the largest burst.

**Effort:** 5 minutes

**Risk:** Low — marginal memory increase

## Recommended Action

Option 1 — the whole point of Phase 6 was to reduce particle counts. Align the burst to the pool limit.

## Technical Details

**Affected files:**
- `src/effects/ParticleManager.ts` — `createSizeChangeBurst()` particle count

## Acceptance Criteria

- [ ] No pooled effect requests more particles than POOL_MAX_PARTICLES
- [ ] Size change burst still looks good at 20 particles

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Claude Code (PR #6 review)
