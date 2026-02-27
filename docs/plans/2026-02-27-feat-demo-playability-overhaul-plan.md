---
title: "feat: Demo Playability Overhaul"
type: feat
status: active
date: 2026-02-27
brainstorm: docs/brainstorms/2026-02-27-demo-playability-overhaul-brainstorm.md
---

# Demo Playability Overhaul

## Overview

Targeted overhaul to make the game feel like a modern 3rd-person adventure for demo. Rework camera and controls, remove over-scoped features (Wonder Stars), replace procedural skybox with AI-generated cubemap, and cut performance drains.

## Problem Statement

The game currently plays like an N64 platformer (Mario 64 clone) with 8+ special moves, a manual orbit camera, a star selection screen, and heavy particle/post-processing effects. For a demo of a Wonderland garden exploration game, this feels clunky, complex, and runs slower than it should.

## Proposed Solution

Surgical cuts and reworks across 6 phases. Work with existing code — no ground-up rewrites.

## Implementation Phases

### Phase 1: Remove Wonder Stars & Star Collectibles

The cleanest cut. Removes the most user-facing friction (star select screen before gameplay) and simplifies the collectible system.

**Files to modify:**

- [ ] `src/ui/StarSelect.ts` — Delete entire file
- [ ] `src/world/WonderStarManager.ts` — Delete entire file
- [ ] `src/engine/SceneManager.ts` — Remove `wonderStarManager` property, `setStars()` call in `loadLevel()` (~line 129), `update()` call to wonder star manager (~line 515), all proxy methods (`trackGroundPound`, `trackLongJump`, `trackPlatformBreak`, `trackCollectible`), `onStarCollected` callback wiring (~line 89)
- [ ] `src/Game.ts` — Remove `StarSelect` import and instantiation (~line 232), `showStarSelect()` method (~lines 579-611), star select trigger in `loadLevel()` (~lines 443-445), all wonder star callback wiring
- [ ] `src/world/Collectible.ts` — Remove `stars` and `totalStars` from `CollectionState` interface (~line 11), remove `'star'` case from `collect()` switch (~line 191), remove star total counting from `setCollectibles()` (~line 65)
- [ ] `src/ui/HUD.ts` — Remove `starCounter` property (~line 13), `previousStarCount` (~line 19), `#star-counter` div from `updateCollectibles()` (~lines 211-213), `popStarCounter()` method (~line 233), star display from `showChapterComplete()` (~line 419) and `showLevelComplete()` (~line 510)
- [ ] `public/assets/fallback/queens_garden.json` — Remove any `wonderStars` array from level data

**Acceptance criteria:**
- [ ] Game starts directly into gameplay — no star selection screen
- [ ] No star collectibles in-world
- [ ] HUD shows only cards and key
- [ ] No console errors from removed references
- [ ] Level complete screen shows cards/key only

---

### Phase 2: Simplify Moveset to Jump + Double Jump

Strip PlayerController down to core movement. The abilities are well-separated into individual methods, making this clean.

**Files to modify:**

- [ ] `src/player/PlayerController.ts`:
  - **Remove triple jump:** `performTripleJump()` (~line 1013-1025), `consecutiveGroundJumps` tracking (~lines 85-87, 376-380, 884-893, 910-917), `TRIPLE_JUMP_FORCE` constant
  - **Remove ground pound:** `startGroundPound()` + `executeGroundPoundDive()` (~lines 1030-1058), ground pound state vars (~lines 76-79), ground pound trigger in update (~line 418), `GROUND_POUND_FORCE` constant
  - **Remove long jump:** `performLongJump()` (~lines 954-976), long jump detection (~lines 868-873), `LONG_JUMP_VERTICAL` / `LONG_JUMP_HORIZONTAL_BOOST` constants
  - **Remove wall slide:** `checkWallSlide()` (~lines 594-648), wall slide state vars (~lines 108-113), `WALL_SLIDE_GRAVITY_SCALE` constant
  - **Remove wall jump:** `performWallJump()` (~lines 981-1008), `WALL_JUMP_VERTICAL` / `WALL_JUMP_HORIZONTAL` constants
  - **Remove ledge grab:** `checkLedgeGrab()` (~lines 654-721), ledge state vars (~lines 119-130)
  - **Simplify `handleJump()`:** Strip triple jump and long jump branches, keep normal jump + double jump path only
  - **Keep:** Swimming (separate code path at ~line 410-413) — it's in the garden level
  - **Keep:** Coyote time, jump buffering, landing lockout — these make basic jumping feel good

- [ ] `src/player/PlayerController.ts` callbacks interface (~lines 20-38):
  - Remove: `onTripleJump`, `onGroundPound`, `onGroundPoundLand`, `onLongJump`, `onWallSlide`, `onWallJump`, `onLedgeGrab`, `onCrouch`
  - Keep: `onJumpAnticipation`, `onJump`, `onLand`, `onFootstep`, `onSpeedBoost`, `onSpeedBoostActive`, `onWaterEnter`, `onWaterExit`, `onSwimmingSplash`

- [ ] `src/Game.ts` — Remove all callback implementations for removed abilities (triple jump particles, ground pound shockwave, long jump trail, wall slide dust, wall jump sparks, ledge grab shimmer, crouch visual)

- [ ] `src/effects/ParticleManager.ts` — Remove methods for cut abilities:
  - `createTripleJumpSpiral()`, `createLongJumpTrail()`, `createWallSlideParticles()`, `createWallJumpSpark()`, `createGroundPoundShockwave()`, `createLedgeGrabShimmer()`

**Acceptance criteria:**
- [ ] Player can run, jump, and double jump
- [ ] No other special moves trigger
- [ ] Swimming still works in water zones
- [ ] Coyote time and jump buffering still feel responsive
- [ ] No dead code references remaining

---

### Phase 3: Rework Camera to Modern Follow-Cam

Replace the N64-style manual orbit camera with a smooth damped follow camera. This is the highest-impact change for how the game *feels*.

**Design goals:**
- Camera stays behind player automatically, no manual input needed to play
- Smooth damped following (not snappy, not laggy)
- Soft wall fade-through instead of yanking camera position
- Right-stick / mouse still allows optional look-around, but camera returns to behind-player

**Files to modify:**

- [x] `src/camera/CameraController.ts` — Major rework:
  - **Replace orbit model with follow-cam:** Camera target = player position + offset behind player's facing direction. Use damped lerp (not instant snap) to follow.
  - **Auto-rotation:** Camera yaw smoothly tracks player's movement direction (not facing — movement direction matters more). When player stops, camera holds.
  - **Soft wall fade-through:** Instead of raycast pull-in, detect when camera would clip geometry. Set nearby meshes to transparent (alpha fade) when between camera and player. Restore alpha when camera moves past. Use a short sphere/capsule cast to find occluding meshes.
  - **Keep:** Screen shake, FOV kick, landing dip — these are polish effects, not camera behavior
  - **Keep:** Size distance multiplier — still relevant
  - **Remove or simplify:** Camera zones (flagged as potentially dead code in cleanup plan), underwater wobble (keep if swimming stays), dialogue focus
  - **Tune defaults:** Increase `followLerp` for snappier tracking, reduce `targetDistance` slightly for tighter framing, raise default pitch slightly for better ground visibility

- [x] `src/Game.ts` — Update camera wiring:
  - Remove arrow key camera rotation from InputManager bindings (or make optional)
  - Update `updatePlayer()` camera call to pass movement direction instead of facing angle

**Key constants to tune:**
```
targetDistance: 6-8 (slightly further than current 5, better overview)
heightOffset: 2.0 (higher for better ground visibility)
followLerp: 4-6 (smooth but responsive)
returnToFollowSpeed: 2.0 (how fast camera returns after manual look)
wallFadeDistance: 1.5 (how close before walls start fading)
wallFadeAlpha: 0.15 (how transparent faded walls become)
```

**Acceptance criteria:**
- [ ] Camera smoothly follows behind player with no manual input
- [ ] Walking in circles shows smooth camera tracking
- [ ] Camera near walls: walls become transparent, camera doesn't jerk
- [ ] Optional mouse/right-stick look works, camera returns to follow after release
- [ ] Screen shake, FOV kick, landing dip still work

---

### Phase 4: Movement Feel Tuning

Make movement feel snappier and more responsive. Modern 3rd-person, not momentum-heavy N64.

**File to modify:**

- [x] `src/player/PlayerController.ts` — Tune constants (~lines 132-163):

| Constant | Current | Target | Why |
|----------|---------|--------|-----|
| `GROUND_ACCEL` | 1.8 | 2.5-3.0 | Snappier start |
| `AIR_ACCEL` | 0.6 | 0.8-1.0 | More air control |
| `GROUND_FRICTION` | 0.75 | 0.65-0.70 | Quicker stop |
| `MAX_SPEED` | 16 | 12-14 | Slightly slower for control |
| `JUMP_FORCE` | 14 | 12-13 | Less floaty arc |
| `DOUBLE_JUMP_FORCE` | 12 | 11-12 | Match main jump feel |

- [x] `src/Game.ts` — Gravity tuning: Current gravity is `(0, -20, 0)`. May increase to `-25` or `-28` to reduce float time. Test in combination with jump force changes.

**Tuning approach:** These are iterative. Set initial values, playtest, adjust. The brainstorm numbers are starting points.

**Acceptance criteria:**
- [ ] Player feels responsive to direction changes
- [ ] Jumps feel purposeful, not floaty
- [ ] Running to a stop doesn't slide excessively
- [ ] Double jump arc feels natural
- [ ] Walking off ledges feels controlled (coyote time helps here)

---

### Phase 5: Replace Skybox with AI-Generated Cubemap

Swap procedural canvas skybox for beautiful AI-generated fairytale garden cubemap.

**Approach:** Use `THREE.CubeTextureLoader` with 6 face images. This avoids the equirectangular seam issues documented in `docs/solutions/integration-issues/skybox-quality-seams-artifacts.md`.

**Files to modify:**

- [ ] Generate cubemap images (6 faces: px, nx, py, ny, pz, nz) using AI image generation tool. Prompt direction:
  - Style: fairytale garden, whimsical, painterly, Wonderland aesthetic
  - Content: dreamy sky with soft clouds, distant rolling green hills, flowering hedges on horizon, warm golden light
  - Must be seamless across face edges
  - Resolution: 1024x1024 or 2048x2048 per face
  - Save to `public/assets/skyboxes/garden/` as `px.png`, `nx.png`, `py.png`, `ny.png`, `pz.png`, `nz.png`

- [x] `src/engine/SceneManager.ts` — Replace `createGardenSkybox()` (~lines 175-336):
  ```typescript
  private loadSkybox(): void {
    const loader = new THREE.CubeTextureLoader();
    loader.setPath('assets/skyboxes/garden/');
    const cubeTexture = loader.load([
      'px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'
    ]);
    cubeTexture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = cubeTexture;
  }
  ```
  - Delete all procedural canvas drawing code (~lines 175-320)
  - Remove `skyboxMesh` and sphere geometry — cubemap doesn't need a mesh
  - Keep `currentSkyboxTexture` reference for disposal

- [ ] `src/Game.ts` — May need to adjust fog color/distance to match new skybox warmth

**Acceptance criteria:**
- [ ] Skybox looks beautiful from all angles
- [ ] No visible seams between cubemap faces
- [ ] Fog blends naturally with skybox horizon
- [ ] Colors feel cohesive with cel-shaded art style

---

### Phase 6: Performance Cuts

Remove/reduce systems that cost GPU/CPU without proportional visual value.

**Files to modify:**

- [x] `src/Game.ts` — **Remove bloom post-processing:**
  - Remove `UnrealBloomPass` import and creation (~lines 194-208)
  - Replace `EffectComposer` render with direct `renderer.render(scene, camera)` — or keep composer with just RenderPass if other passes may be added later
  - This saves a full-screen GPU pass every frame

- [x] `src/effects/ParticleManager.ts` — **Reduce particle counts:**
  - Ambient particles: 200 → 60-80 (still atmospheric, less GPU)
  - Rose petals: 80 → 30-40
  - Reduce `POOL_MAX_PARTICLES` from 35 to 20
  - Reduce `MAX_SYSTEMS` from 80 to 40

- [x] `src/effects/FoliageAnimator.ts` — **Simplify wind:**
  - Option A: Remove entirely (simplest, small visual loss)
  - Option B: Update every 2nd or 3rd frame instead of every frame (halves cost, barely visible difference)
  - Recommend Option B — skip frames with `this.frameCount++ % 2 === 0` guard in `update()`

- [x] `src/engine/SceneManager.ts` — **Remove duplicate wind system:**
  - Delete `collectFoliageMeshes()` (~line 414) and `updateWindAnimation()` (~line 447)
  - Remove wind update call from `SceneManager.update()` (~line 535)
  - FoliageAnimator in Game.ts is the newer, cleaner version — no need for both

**Acceptance criteria:**
- [ ] No bloom post-processing running
- [ ] Ambient particles and petals still visible but reduced
- [ ] Wind animation runs at reduced frequency (or removed)
- [ ] No duplicate wind system
- [ ] Measurable FPS improvement (use backtick stats overlay)

---

### Phase 7: Visual Consistency Pass

Final sweep to make everything feel cohesive with the new skybox and simplified systems.

- [ ] Adjust fog color (`0xFFE8C8`) and distance (40-180) to match new skybox palette
- [ ] Adjust ambient light color/intensity to complement skybox
- [ ] Verify sun direction matches skybox sun position
- [ ] Check cel-shader light direction syncing still looks correct
- [ ] Test all remaining particle colors against new skybox backdrop
- [ ] Verify NPC and garden model materials look correct without bloom
- [ ] Playtest full loop: start → explore garden → collect cards → find key → gate

**Acceptance criteria:**
- [ ] Art style feels cohesive across skybox, models, particles, lighting
- [ ] No visual jarring when looking in any direction
- [ ] Demo loop plays smoothly from start to finish

---

## Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Camera wall fade-through is complex | High | Start with basic transparency. Can fall back to improved raycast if needed |
| Movement tuning is subjective | Medium | Set initial values, iterate through playtesting |
| AI cubemap faces may not be seamless | Medium | Use inpainting on edges. Existing solution doc has prompt guidance |
| Removing abilities breaks level design | Low | Queen's Garden doesn't require wall jumps or ground pounds to complete |
| Removing bloom changes visual character | Low | Cel-shading + good lighting carries the look without bloom |

## Phase Order & Dependencies

```
Phase 1 (Stars)  ──→ can start immediately
Phase 2 (Moves)  ──→ can start immediately (parallel with 1)
Phase 3 (Camera) ──→ after Phase 2 (movement changes affect camera tuning)
Phase 4 (Tuning) ──→ after Phase 2 & 3 (tune against simplified systems)
Phase 5 (Skybox) ──→ can start immediately (independent)
Phase 6 (Perf)   ──→ after Phase 1 & 2 (star/move particles removed first)
Phase 7 (Visual)  ──→ after Phase 5 & 6 (needs final skybox + perf cuts in place)
```

## References

### Internal
- Brainstorm: `docs/brainstorms/2026-02-27-demo-playability-overhaul-brainstorm.md`
- Skybox solutions: `docs/solutions/integration-issues/skybox-quality-seams-artifacts.md`
- Performance patterns: `docs/solutions/performance-issues/mesh-caching-memory-race-conditions.md`
- Original overhaul plan: `docs/plans/2026-02-25-feat-n64-style-platformer-overhaul-plan.md`

### Key Files
- `src/Game.ts` — Main integration point (~1700 lines)
- `src/camera/CameraController.ts` — Camera system (657 lines)
- `src/player/PlayerController.ts` — Movement system (~1100 lines)
- `src/world/WonderStarManager.ts` — Star challenges (530 lines, to delete)
- `src/ui/StarSelect.ts` — Star select UI (311 lines, to delete)
- `src/world/Collectible.ts` — Collectible system (263 lines)
- `src/ui/HUD.ts` — HUD display (557 lines)
- `src/engine/SceneManager.ts` — Scene/skybox/wind
- `src/effects/ParticleManager.ts` — Particles (~2330 lines)
- `src/effects/FoliageAnimator.ts` — Wind animation (110 lines)
