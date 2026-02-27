---
status: pending
priority: p2
issue_id: "034"
tags: [maintainability, duplication, architecture]
dependencies: ["030"]
---

# ParticleManager Massive Code Duplication (~1200 Lines Removable)

## Problem Statement

ParticleManager.ts is 2,300+ lines with 27 `create*` methods that all follow the exact same structural pattern. The only differences are particle count, color palette, position offsets, velocity patterns, and material options. Additionally, `new THREE.Color()` objects are re-created on every effect invocation despite being static.

## Findings

- 27 methods each 30-60 lines with identical scaffolding
- ~85 instances of `new THREE.Color()` in effect methods — same colors repeated across effects
- 6 pairs of throttle timer fields with identical throttle-check pattern
- Estimated ~1,200 lines removable with a generic factory

## Proposed Solutions

### Option 1: Generic Factory + Config Objects

**Approach:** Create a `ParticleEffectConfig` interface and a single `spawnParticleSystem(config)` factory. Each named effect becomes a 5-10 line wrapper. Hoist color palettes to static constants. Extract throttle logic to a shared helper.

```typescript
interface ParticleEffectConfig {
  count: number;
  colors: THREE.Color[];  // pre-allocated static arrays
  maxLife: number;
  size: number;
  opacity: number;
  blending: THREE.Blending;
  noGravity?: boolean;
  initParticle: (i: number, pos: Float32Array, vel: Float32Array, col: Float32Array) => void;
}
```

**Effort:** 4-6 hours (can be done alongside todo 030 pooling refactor)

**Risk:** Medium — all 27 effects need visual verification

## Acceptance Criteria

- [ ] Single factory method for particle system creation
- [ ] Color palettes are static constants (zero per-call allocation)
- [ ] Throttle logic deduplicated
- [ ] All effects visually identical to current behavior
- [ ] File reduced from ~2300 to ~500-800 lines

## Work Log

### 2026-02-27 - Code Review Discovery

**By:** Claude Code (multi-agent review)

**Actions:**
- Architecture + Simplicity agents both identified this as the largest duplication
- Simplicity agent estimated 1,200 lines removable
