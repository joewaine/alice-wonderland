# Demo Playability Overhaul - Brainstorm

**Date:** 2026-02-27
**Goal:** Get Alice in Wonderland demo-ready — better camera, controls, visuals, and performance.

## What We're Building

A targeted overhaul to make the game feel like a modern 3rd-person adventure rather than an N64 platformer. The demo should feel smooth to play, look beautiful, and run well.

### Changes

1. **Remove Wonder Star system** — Cut `StarSelect` UI, `WonderStarManager`, and in-world star meshes. The star selection screen adds friction before gameplay and the challenge system is over-scoped for a demo.

2. **Simplify moveset to jump + double jump** — Remove wall jump, ground pound, triple jump, long jump, wall slide, ledge grab, crouch. These add complexity without value for a garden exploration demo.

3. **Rework camera to modern follow-cam** — Replace N64-style manual orbit camera with a smooth damped follow camera that stays behind the player. Minimal manual input needed. Better wall collision handling. Think Zelda: BotW / Spyro Reignited.

4. **Improve movement feel** — Snappier acceleration, less floaty jumps, more responsive direction changes. Modern 3rd-person feel rather than momentum-heavy N64 style.

5. **Replace skybox with AI-generated image** — Swap the procedural canvas skybox for a beautiful AI-generated fairytale garden panorama. Equirectangular image mapped to a sky sphere or used as a cubemap.

6. **Cut performance drains:**
   - Remove `UnrealBloomPass` (full-screen GPU pass every frame)
   - Reduce ambient particle count (currently 150) and rose petal count (currently 100)
   - Simplify or remove per-frame wind/foliage animation loop

7. **Visual consistency pass** — Ensure lighting, colors, and models feel cohesive together with the new skybox.

## Why This Approach

**Targeted Overhaul** — work with existing code rather than rewriting from scratch. Surgical cuts to remove unused complexity, focused rework of camera and controls which are the two systems that most impact how the game *feels*.

Rejected alternatives:
- **Minimal Touch** — hiding features with flags doesn't fix the core feel. Band-aids.
- **Ground-Up Rewrite** — too risky for demo prep. Physics integration and edge cases would eat time.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Game feel target | Modern 3rd-person (BotW / Spyro) | More accessible, smoother, better for showcasing a garden world |
| Moveset | Jump + double jump only | Simple, satisfying, covers basic platforming needs |
| Star system | Remove entirely | Over-scoped for demo, adds friction to starting gameplay |
| Skybox | AI-generated panoramic image | Dramatically better visuals for minimal effort |
| Bloom | Cut entirely | GPU cost not worth the subtle visual effect |
| Particles | Reduce counts | Keep some ambient feel, cut the expensive volume |
| Wind animation | Simplify or remove | Per-frame iteration over all foliage meshes is costly |
| Camera | Smooth damped follow-cam | Less manual control needed, always shows what matters |

## Scope Boundaries

**In scope:**
- Camera controller rework
- Movement simplification and tuning
- Wonder Star removal
- Skybox replacement
- Performance cuts (bloom, particles, wind)
- Movement feel tuning

**Out of scope:**
- New features or mechanics
- Additional levels or areas
- NPC / quest system changes
- Audio system changes
- New collectible types

## Resolved Questions

1. **Skybox format** — Cubemap (6 faces). Will need to generate or source 6 consistent square images for each cube face. Higher quality at edges.
2. **Camera collision** — Soft fade through walls. When the camera would clip through geometry, make nearby walls transparent instead of yanking the camera in. Modern approach, no jarring camera movement.
3. **Wonder Star removal scope** — Remove all stars entirely. No star collectibles in-world. Simplify to just cards and keys as collectible types. Cut WonderStarManager, StarSelect, and all star-related code from CollectibleManager.
