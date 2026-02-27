---
title: "Pre-Demo Task Cleanup Sprint"
type: refactor
status: active
date: 2026-02-27
---

# Pre-Demo Task Cleanup Sprint

## Overview

Burn down 19 of 30 outstanding todos in a focused 4-hour sprint, prioritizing security, visible bugs, and quick wins that maximize codebase quality before demo. The strategy is **batch by file proximity and category** to minimize context-switching, then verify everything with a play-through.

## Problem Statement

30 outstanding tasks (2 P1, 16 P2, 12 P3) have accumulated across code reviews. Many are small (under 30 min) but collectively they represent security risks, resource leaks, dead code, and visual bugs that would be noticed during a demo.

## Strategy: Wave-Based Execution

Group tasks into **6 waves** ordered by priority and natural file groupings. Each wave touches related files, reducing context-switching overhead. Waves are independent — if one runs long, skip to the next.

---

## Wave 1 — Security & Data Integrity (30 min)

**Why first:** An exposed API key or crash from bad data would be the worst thing to hit during a demo.

| Todo | File | Fix | Time |
|------|------|-----|------|
| **031** P2 — API key in client code | `src/api/ClaudeParser.ts` | Remove the class if unused, or strip the direct API call. Falls back to JSON already. | 15 min |
| **010** P2 — localStorage no array check | `src/world/WonderStarManager.ts:402-424` | Add `Array.isArray()` guard after `JSON.parse()` | 5 min |
| **033** P2 — fetchLevelData no validation | `src/engine/SceneManager.ts:365-376` | Add structural validation using existing `validateLevelData()` from ClaudeParser | 10 min |

---

## Wave 2 — Event Listener Leaks (30 min)

**Why second:** Listener leaks cause subtle bugs — duplicate handlers, memory growth. These are all small, mechanical fixes.

| Todo | File | Fix | Time |
|------|------|-----|------|
| **009+021** P2+P3 — StarSelect listener | `src/ui/StarSelect.ts` | Move `removeEventListener` into `hide()` method. Fixes both 009 (background click) and 021 (star selection). | 10 min |
| **016** P2 — InputManager no dispose | `src/engine/InputManager.ts` | Store handler refs as class properties, add `dispose()` method | 15 min |
| **017** P2 — AnimationStateManager listener | `src/animation/AnimationStateManager.ts:63,244` | Store `finished` handler, remove in `dispose()` | 5 min |

---

## Wave 3 — Dead Code Removal (20 min)

**Why third:** Dead code is zero-risk removal. Makes the codebase cleaner for anyone reviewing it.

| Todo | File | Fix | Time |
|------|------|-----|------|
| **026** P3 — Delete counter.ts | `src/counter.ts` | Delete the file (Vite boilerplate, no imports) | 1 min |
| **011** P2 — Camera zone dead code | `src/camera/CameraController.ts` | Remove `addZone()`, `setZones()`, `clearZones()`, `updateZone()` and related properties (~40 lines) | 10 min |
| **023** P3 — Unused OutlineEffect exports | `src/shaders/OutlineEffect.ts:65-184` | Remove 4 unused exported functions | 5 min |
| **024** P3 — Unused animation methods | `src/animation/AnimationStateManager.ts:209-244` | Remove or make private 5 unused public methods | 5 min |

---

## Wave 4 — Visual & Rendering Fixes (30 min)

**Why fourth:** These are things a viewer would actually see during the demo — broken shaders, inconsistent colors, scene graph bugs.

| Todo | File | Fix | Time |
|------|------|-----|------|
| **025** P3 — CelShader `steps` broken | `src/shaders/CelShaderMaterial.ts:20,83-92` | Either fix shader to use `uSteps` uniform dynamically, or remove the misleading parameter | 15 min |
| **035** P2 — OutlineEffect scene graph bypass | `src/shaders/OutlineEffect.ts:130-131` | Replace manual `parent.children` manipulation with `parent.add()` | 10 min |
| **040** P3 — HUD styles injected per call | `src/ui/HUD.ts:412-420,515-522` | Move `<style>` creation to constructor (follow existing `popAnimationStyle` pattern) | 5 min |

---

## Wave 5 — Code Quality Quick Wins (30 min)

**Why fifth:** Encapsulation break and color inconsistencies — small fixes that make the code noticeably cleaner.

| Todo | File | Fix | Time |
|------|------|-----|------|
| **020** P2 — SceneManager encapsulation | `src/engine/SceneManager.ts:420`, `src/world/LevelBuilder.ts` | Add public `removeBody()` to LevelBuilder, replace bracket notation access | 10 min |
| **027** P3 — Duplicated challenge colors | `src/world/WonderStarManager.ts`, `src/ui/StarSelect.ts` | Create shared color constants, use in both locations | 10 min |
| **012** P3 — Camera magic numbers | `src/camera/CameraController.ts` | Extract to `CAMERA_DEFAULTS` object (time permitting) | 10 min |

---

## Wave 6 — Testing & Verification (60 min)

**Why last:** Verify nothing is broken. This is the most important wave.

- [ ] Run `npm run build` — confirm zero TypeScript errors
- [ ] Play through Chapter 1 (Vertical Descent) — test jumping, air currents, particles
- [ ] Play through Chapter 2 (Swimming) — test water physics, buoyancy effects
- [ ] Play through Chapter 3 (Racing) — test speed boosts, star collection
- [ ] Play through Chapter 4 (Size Mastery) — test size changes, breakable platforms
- [ ] Open StarSelect menu, close via background click — verify no listener leak
- [ ] Collect a WonderStar — verify cel-shading, outlines, HUD display
- [ ] Check browser console — no errors, no warnings from removed code
- [ ] Check DevTools Performance tab — verify no obvious memory growth over 2 minutes of play

---

## What We're Explicitly Skipping (and Why)

These are too large or too risky for a 4-hour pre-demo sprint:

| Todo | Reason to Skip |
|------|----------------|
| **001** P1 — Skybox resolution | Requires SDXL model setup, not a code fix |
| **004** P2 — Panorama LoRA | Asset pipeline change, not demo-critical |
| **006** P3 — Upscaling pass | Complements 001, skip together |
| **018** P2 — God class refactor | 4-6 hours alone, high risk |
| **019** P2 — Duplicated zone interfaces | Touches architecture across files |
| **030** P1 — Particle pooling | 4-6 hours, needs visual verification of 27 effects |
| **032** P2 — Game.ts dispose | 2-3 hours, only matters for HMR/SPA nav (not during demo) |
| **034** P2 — Particle dedup | Depends on 030, same scope |
| **036** P2 — GardenAssetLoader dedup | Medium effort, not visible |
| **037** P2 — RAPIER ray leak | Depends on 032 (Game.ts dispose) |
| **038** P2 — Callback patterns | Depends on 018 (God class refactor) |
| **039** P3 — Fixed timestep physics | Large, risky — affects all movement feel |
| **022** P3 — Swimming magic numbers | Nice-to-have, time permitting |

---

## Scorecard

| Metric | Value |
|--------|-------|
| **Tasks resolved** | 19 of 30 (63%) |
| **P2 tasks resolved** | 10 of 16 (63%) |
| **P3 tasks resolved** | 7 of 12 (58%) |
| **Implementation time** | ~2.5-3 hours |
| **Testing time** | ~1 hour |
| **Risk level** | Low — all changes are small, isolated, and mechanical |

## Execution Notes

- **Commit after each wave.** This way if something goes wrong, you can revert a wave cleanly.
- **If a wave runs over by 10+ min, skip to the next.** The testing wave is non-negotiable.
- **Wave 1 (security) is the only must-complete.** Everything else is gravy.
- **Keep the game running in a browser tab** while coding — quick manual checks between waves catch issues early.

## References

- Todo files: `todos/001-040`
- Active plan: `docs/plans/2026-02-25-feat-n64-style-platformer-overhaul-plan.md`
- Documented solutions: `docs/solutions/`
