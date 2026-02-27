---
status: partial
priority: p1
issue_id: "030"
tags: [performance, draw-calls, architecture]
dependencies: []
---

# ParticleManager Needs Object Pooling (Draw Call Explosion)

## Problem Statement

Every particle effect creates a brand new `BufferGeometry`, `PointsMaterial`, and `THREE.Points` object, adds it to the scene graph, then removes it when done. During active gameplay (running, jumping, speed boosting, swimming), 30-50+ simultaneous particle systems can exist, each with its own draw call. Scene graph add/remove operations trigger internal Three.js bookkeeping every time.

This is the single biggest performance bottleneck in the game.

## Findings

- 27+ `create*` methods in `src/effects/ParticleManager.ts`, each allocating new GPU resources
- `scene.add(points)` / `scene.remove(system.points)` called 20-50 times per second during gameplay
- No cap on `this.systems.length` - unbounded growth under rapid actions
- Long jump trail creates ~40 systems per jump (50ms interval, ~2s duration)
- Each system independently iterated in the `update()` loop

## Proposed Solutions

### Option 1: Object Pool with Toggle Visibility

**Approach:** Pre-allocate a pool of `THREE.Points` objects at startup. When an effect is requested, grab from pool, configure attributes, set `.visible = true`. When done, set `.visible = false` and return to pool. Never add/remove from scene graph.

**Pros:**
- Eliminates geometry/material allocation per effect
- Eliminates scene graph churn
- Bounded resource usage

**Cons:**
- More complex initialization
- Pool sizing needs tuning

**Effort:** 4-6 hours

**Risk:** Medium (needs careful testing of all 27 effects)

---

### Option 2: Single Shared Particle Buffer

**Approach:** One large `InstancedBufferGeometry` or combined `Points` object. Effects write into slices of a pre-allocated attribute buffer.

**Pros:**
- Single draw call for all particles
- Maximum GPU efficiency

**Cons:**
- More complex to implement
- Harder to have per-effect material properties

**Effort:** 8-12 hours

**Risk:** High

## Recommended Action

Option 1 (object pool) provides 80% of the benefit with much less complexity.

## Technical Details

**Affected files:**
- `src/effects/ParticleManager.ts` - entire file architecture

## Acceptance Criteria

- [ ] No per-effect geometry/material allocation
- [ ] Bounded maximum particle systems (e.g., pool of 100)
- [ ] All 27 effects still work visually
- [ ] Measurable FPS improvement in active gameplay

## Work Log

### 2026-02-27 - Code Review Discovery

**By:** Claude Code (multi-agent review)

**Actions:**
- Performance agent identified draw call explosion as #1 bottleneck
- Architecture agent confirmed massive code duplication (same pattern 27 times)
- Simplicity agent estimated ~1200 lines removable with generic factory
