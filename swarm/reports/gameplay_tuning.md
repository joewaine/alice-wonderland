# Gameplay Tuning Audit Report

**Date:** 2026-02-26
**Scope:** Camera, Input, and Juice systems (PHASE 4 - MOVE)

---

## Executive Summary

The Alice in Wonderland platformer has solid N64-style movement foundations. Camera system is well-designed with collision avoidance. Input systems are clean but lack some comfort features. Juice is unevenly distributed - certain impacts are polished while others lack feedback.

---

## 4A - Camera Analysis

**File:** `src/camera/CameraController.ts` (395 lines)

### Smoothing & Damping ✅
- Uses THREE.MathUtils.lerp for smooth position transitions
- Configurable `followLerp` parameter (default 8)
- Asymmetric distance lerp: fast pull-in (3x) on wall contact

### Dead Zone ❌ MISSING
- No input dead zone for mouse/keyboard camera rotation
- **Recommendation**: Add 0.05-0.1 unit dead zone

### Look-Ahead ❌ MISSING
- Camera does not predict player movement direction
- Lower priority for exploration-focused game

### Player Visibility ✅
- Wall collision raycast prevents camera clipping
- Safe buffer zone: 1.5 units from wall collision
- Pitch limits (6° to 69°) prevent extreme angles

### Issues Found
1. Mouse sensitivity hardcoded to 0.003 - no accessibility option
2. No camera shake intensity limits documentation
3. Minor: Potential jitter during rapid wall transitions

**Rating: 8/10**

---

## 4B - Input & Feel Analysis

**Files:** `src/player/PlayerController.ts`, `src/engine/InputManager.ts`

### Coyote Time ✅ EXCELLENT
- Value: **150ms** (line 94)
- Standard: 80-120ms (slightly generous)
- Implementation: Clean timestamp check

### Input Buffering ✅ GOOD
- Value: **100ms** (line 95)
- Matches standard platformer feel (Mario/Celeste use 100ms)

### Acceleration Curves ✅ PROPER
- Uses momentum accumulation + friction damping (NOT linear lerp)
- Ground: GROUND_ACCEL = 1.8, GROUND_FRICTION = 0.75
- Air: AIR_ACCEL = 0.6, AIR_FRICTION = 0.96

### Landing Recovery ⚠️ PARTIAL
- Landing animation triggered
- Squash/stretch applied
- **Missing**: Input lockout window after landing
- **Recommendation**: Add 50ms lockout after hard landing (fallSpeed > 10)

### Turn Responsiveness ✅ SNAPPY
- Direct input-to-momentum mapping
- No acceleration ramp-up delay
- Diagonal normalization prevents straferunning speed boost

**Rating: 7.5/10**

---

## 4C - Juice Analysis

### Screen Shake ✅ GOOD
- Location: CameraController.shake()
- Mechanism: Random offset + exponential decay (0.88)
- Usage: Ground pound (0.4), platform break (0.3)
- Anisotropic: XZ 0.8, Y 0.5 multipliers

### FOV Kick ❌ MISSING
- Camera FOV fixed at 60 degrees
- **Recommendation**: Add 5-10° expansion on boost/dash moments

### Hitstop ❌ MISSING
- No frame freeze on impacts
- **Recommendation**: 2-3 frame freeze (33-50ms) on ground pound

### Particle Bursts ✅ EXCELLENT
| Effect | Particles | Quality |
|--------|-----------|---------|
| Size change | 30 | Directional, color-coded |
| Collectible | 20 | Upward gold burst |
| Landing dust | 15 | Scales with fall intensity |
| Footstep | 4 | Throttled at 0.2s |
| Gate unlock | 50 | Spiral pattern |
| Rose petals | 80 | Wind simulation, color variation |

### Missing Particle Effects
- Double jump sparkle
- Speed boost trail
- Ground pound shockwave

**Rating: 6.5/10**

---

## Priority Recommendations

### High Priority (Quick Wins)
1. Add 50ms landing recovery input lockout
2. Add double jump sparkle particle effect
3. Implement 3-frame hitstop on ground pound
4. Add FOV kick on speed boost (65° for 0.3s)

### Medium Priority
1. Add motion trails during long jumps
2. Add ground pound shockwave particle effect
3. Implement trauma system for shake accumulation
4. Add camera dead zone

### Low Priority (Polish)
1. Analog stick support
2. Customizable input sensitivity
3. Motion blur during speed boosts

---

## Overall Assessment

| Category | Score | Verdict |
|----------|-------|---------|
| Camera | 8/10 | Production-ready |
| Input | 7.5/10 | Solid core, polish missing |
| Juice | 6.5/10 | Functional, not cinematic |
| **Overall** | **7.5/10** | "Fun to play" but not "addictively satisfying" |

The movement system provides a solid N64-style foundation. Adding hitstop, FOV kicks, and filling particle effect gaps would elevate it significantly.
