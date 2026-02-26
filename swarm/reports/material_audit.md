# Material Audit Report

**Date:** 2026-02-26
**Scope:** All THREE.js materials in Alice Wonderland codebase

---

## Summary Statistics

- **Total material instances found**: ~45+
- **Using cel-shader**: ~45 (**100%**) ✅
- **Using MeshStandardMaterial**: 0 (converted)
- **Using MeshBasicMaterial**: ~3 (skybox, UI - intentional)
- **Using PointsMaterial**: ~8 (particles - correct)

---

## Critical Issues

### 1. Improper Metalness Usage (Anti-Pattern)

**Files affected**: LevelBuilder.ts, SizePickup.ts, WonderStarManager.ts

| Object | Location | Issue |
|--------|----------|-------|
| Keys | LevelBuilder:482-488 | metalness=0.8, emissive glow - should use cel-shader |
| Wonder Stars | WonderStarManager:318-324 | metalness=0.9 on gold material |
| Checkpoints | LevelBuilder:960-966 | Using emissive as fake lighting |

### 2. Excessive Emissive Usage (Fake Lighting)

**Severity**: High - breaks cel-shading aesthetic

| Object | Location | Issue |
|--------|----------|-------|
| Lanterns | GardenAssetLoader:749-755 | emissive=0xFFD700, intensity=0.5 |
| Speed boost pads | LevelBuilder:908-914 | emissive=0xFFD700, intensity=0.3 |
| Checkpoint rings | LevelBuilder:960-966 | emissive used as primary lighting |
| Keys | LevelBuilder:482-488 | emissive=0xffd700, intensity=0.3 |

### 3. Color Luminance Issues

**Too Bright (>0.8)**:
- Rose white petals (GardenAssetLoader:57): 0xFAFAFA (luminance ~0.95)
- Marble highlight color: 0xFFFFFF everywhere
- White spots on mushrooms (SizePickup:75): 0xffffff (pure white)

---

## Materials Missing Cel-Shader

Priority ranking (highest impact first):

1. **Water surfaces** (LevelBuilder:846-873) - Uses MeshStandardMaterial
2. **Speed boost pads** (LevelBuilder:908-914) - Whimsical game element
3. **Checkpoint rings** (LevelBuilder:960-966) - Should match platform aesthetic
4. **Lantern glass** (GardenAssetLoader:749-755) - Garden decoration
5. **Size pickup bottles** (SizePickup:92-96) - Game collectible

---

## Priority Fixes

### CRITICAL (breaks aesthetic)
- [ ] Remove emissive usage on collectibles - fake lighting breaks cel-shader
- [ ] Convert water materials to cel-shader
- [ ] Convert speed boost pads to cel-shader
- [ ] Remove metalness from non-metal objects

### IMPORTANT (visual quality)
- [ ] Reduce bright highlight colors (0xFFFFFF) to softer whites
- [ ] Add cel-shader to lanterns
- [ ] Add cel-shader to checkpoint rings
- [ ] Hide debug visual zones (wireframe boxes)

### NICE-TO-HAVE (refinement)
- [ ] Add subtle normal map details to simple geometry
- [ ] Vary roughness on garden assets procedurally
- [ ] Create specialized water shader for stylized look

---

## Materials Correctly Using Cel-Shader

- All platform types (solid, bouncy, breakable)
- Garden assets (hedges, rose bushes, topiaries, gazebo, benches, etc.)
- NPC models
- Gate base and pillars
- Collectible icons (stars, cards)

**Quality assessment**: Consistent 3-step lighting, proper rim colors, matching outline thickness.
