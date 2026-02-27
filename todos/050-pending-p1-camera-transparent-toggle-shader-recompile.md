---
status: done
priority: p1
issue_id: "050"
tags: [performance, camera, materials]
dependencies: []
---

# Wall fade toggles mat.transparent causing shader recompilation

## Problem Statement

`CameraController.updateWallFade()` sets `mat.transparent = true` when fading walls and `mat.transparent = false` when restoring. In Three.js, toggling `transparent` invalidates the compiled shader program, forcing a GPU recompile costing 5-50ms per material. This happens every time a wall enters or exits the fade zone.

## Findings

- `src/camera/CameraController.ts:~300-320` — toggles `mat.transparent` on fade/restore
- Three.js internally calls `material.needsUpdate = true` when transparent changes, triggering shader recompile
- Known Three.js performance pattern documented in learnings: materials should be pre-configured as `transparent: true, opacity: 1.0`
- Related to `docs/solutions/` learnings about `needsUpdate` performance cost

## Proposed Solutions

### Option 1: Pre-set all occludable materials to transparent

**Approach:** At load time, set `transparent: true` and `opacity: 1.0` on all materials that might be faded. Then wall fade only adjusts `opacity` (cheap uniform update), never toggles `transparent`.

**Pros:**
- Eliminates shader recompilation entirely
- Simple change — just set transparent at load time
- `opacity: 1.0` with `transparent: true` is visually identical to `transparent: false`

**Cons:**
- Transparent objects are rendered in a separate pass (slightly less efficient for opaque rendering)
- Need to identify which materials to pre-configure

**Effort:** 1 hour

**Risk:** Low — `transparent: true, opacity: 1.0` has negligible visual difference

### Option 2: Clone materials on first fade

**Approach:** When a mesh first enters the fade zone, clone its material and set the clone to `transparent: true`. Cache the clone. This also fixes the shared material mutation risk (P2 finding).

**Pros:**
- No upfront cost, lazy cloning
- Fixes shared material mutation issue simultaneously
- Original materials stay untouched

**Cons:**
- Still pays shader compile cost on first fade per material
- Memory cost of cloned materials (small)

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

Option 2 (clone-on-fade) is recommended — it fixes both the shader recompile on restore AND the shared material mutation issue in one change.

## Technical Details

**Affected files:**
- `src/camera/CameraController.ts:~300-320` — fade/restore logic

**Related components:**
- CelShaderMaterial (`src/shaders/CelShaderMaterial.ts`) — uses `uOpacity` uniform
- Standard THREE materials used by garden assets

## Resources

- **PR:** #6
- Known pattern: `docs/solutions/` material needsUpdate performance

## Acceptance Criteria

- [ ] `mat.transparent` is never toggled at runtime during wall fade
- [ ] Materials are either pre-configured or cloned before modification
- [ ] No shader recompilation on wall fade in/out
- [ ] Shared materials are not mutated (fixes P2 shared material risk)

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Claude Code (PR #6 review)

**Actions:**
- Performance reviewer identified as P1
- Architecture reviewer also flagged shared material mutation as P2
- Learnings researcher confirmed needsUpdate cost pattern from docs/solutions/
