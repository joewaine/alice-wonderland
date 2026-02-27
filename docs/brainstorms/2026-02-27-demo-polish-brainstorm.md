# Demo Polish: Performance, Models, and Visual Quality

**Date:** 2026-02-27
**Status:** Brainstorm
**Context:** Demo prep with a week+ timeline

## What We're Building

A comprehensive polish pass to make the Alice in Wonderland 3D platformer demo-ready. Three workstreams:

1. **Performance optimization** - Compress all GLB models (~190MB total down to ~40-50MB), implement particle pooling, fix physics ray leak, general render performance
2. **Complete NPC model coverage** - Generate the 10 missing character models via Tripo3D so no NPCs show as purple capsule fallbacks
3. **Visual environment quality** - Generate 3D garden environment models via Tripo3D to replace procedural fallbacks (colored boxes/cylinders)

## Why This Approach

- **Full asset pipeline** chosen over partial fixes because: demo audience sees everything, and the gap between "real" 3D models and procedural capsules/boxes is jarring
- **Tripo3D API key is available** in `config.json` and the generation script already exists
- **Compression is mandatory** - 14MB per model x 24+ models is unacceptable for browser loading
- **Week+ timeline** gives enough room for generation, compression, and performance work

## Current State

### NPC Models (14 exist, 10 missing)

**Existing models (have GLBs):**
- alice, white_rabbit, mouse, dodo, lory, bill_the_lizard
- eaglet, duck, pat, puppy, caterpillar, duchess, gryphon, mock_turtle

**Missing models (showing purple capsule fallback):**
- queen_of_hearts, king_of_hearts, knave_of_hearts
- cheshire_cat, mad_hatter, march_hare, dormouse
- card_painter (used by 3 NPCs), flamingo, hedgehog

### Garden Environment (0 models exist, 25 registered)

All assets in `GardenAssetLoader.ts` registry use procedural fallbacks:
- Platforms: hedge_straight, stone_path, grass_platform
- Centerpieces: fountain, gazebo, throne
- Decorations: rose_bush_red/white/pink, topiary_sphere/spiral/heart
- Props: garden_bench, tea_table, chair_ornate, lantern
- Stairs: stairs_stone, stairs_grass

### Performance Issues

- ~190MB total model data with no compression
- 34 NPCs in Queen's Garden level
- No particle object pooling (Todo #030)
- Physics ray leak in camera controller (Todo #037)
- No fixed timestep physics (Todo #039)

## Key Decisions

1. **Compress all GLBs** using Draco compression + mesh simplification (target: ~70-80% reduction)
2. **Generate all 10 missing NPC models** via Tripo3D using existing `generate-npc-models.ts` script
3. **Generate garden environment models** via Tripo3D (new script needed or extend existing)
4. **Implement particle pooling and ray cleanup** for runtime performance
5. **Models should match N64 low-poly aesthetic** - generation prompts should specify this style

## Resolved Questions

1. **Which garden assets?** All 25 registered asset types - full environment coverage
2. **Loading screen?** No - not needed for demo context
3. **Model compression tooling** - gltf-transform with Draco compression (standard approach)
4. **API access** - Tripo3D key available in `config.json`

5. **FPS target** - No specific number, just needs to feel smooth and not lag during demo
