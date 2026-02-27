---
status: pending
priority: p2
issue_id: "046"
tags: [performance, particles, duplication]
dependencies: ["041", "034"]
---

# ParticleManager: 16+ effects bypass pool, creating fresh GPU allocations

## Problem Statement

Only 6 of ~22 burst effects use the pool (`acquireSystem`). The remaining 16+ methods manually allocate `BufferGeometry`, `PointsMaterial`, and `THREE.Points` per burst. High-frequency non-pooled effects like `createSpeedBoostTrail` (50ms), `createSwimmingBubbles` (200ms), and `createMagnetTrail` (80ms) fire continuously during gameplay, creating GC pressure. The dual pooled/non-pooled code path also adds complexity to the `update()` method. Related to existing todo 034 (code duplication).

## Findings

- 6 pooled: `createSizeChangeBurst`, `createCollectBurst`, `createLandingDust`, `createFootstepDust`, `createRunDustPuff`, `createWallSlideParticles`
- 16+ non-pooled: all remaining `create*` methods
- `POOL_MAX_PARTICLES = 35` prevents pooling effects with >35 particles (ground pound = 36, quest complete = 60)
- No guard in `acquireSystem` for count > POOL_MAX_PARTICLES (silent overflow risk)
- No documentation on criteria for pooled vs non-pooled

## Proposed Solutions

### Option 1: Increase pool capacity and migrate high-frequency effects

**Approach:** Increase `POOL_MAX_PARTICLES` to 60. Add overflow guard in `acquireSystem`. Convert continuous/high-frequency effects to pooling. Add class-level doc comment explaining pooled vs non-pooled criteria.

**Effort:** 2-3 hours

**Risk:** Medium — need to verify all converted effects still look correct

### Option 2: Full migration (all effects pooled)

**Approach:** Same as Option 1 but convert ALL effects. Eliminates the dual code path entirely.

**Effort:** 4-6 hours

**Risk:** Medium — larger blast radius, more testing needed

## Acceptance Criteria

- [ ] `acquireSystem` has guard for count > POOL_MAX_PARTICLES
- [ ] High-frequency continuous effects use pooling
- [ ] Class-level doc comment explains pooled vs non-pooled criteria
- [ ] No visual regressions in any particle effect
