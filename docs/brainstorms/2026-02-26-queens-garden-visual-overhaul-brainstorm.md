# Queen's Garden Visual Overhaul - Brainstorm

**Date:** 2026-02-26
**Status:** Ready for Planning

## What We're Building

A complete visual overhaul of Alice in Wonderland, focusing on **one showcase level** (Queen's Garden) with **Breath of the Wild-inspired** stylized 3D aesthetics. The goal is to transform the game from a prototype into something that feels like a polished, real video game.

### Core Vision

- **Art Style:** Modern stylized 3D - clean cel-shaded look with bold colors (BotW/Okami inspiration)
- **Scope:** Single showcase level - Queen's Garden (replaces existing 4 chapters)
- **Quality Bar:** Finished game feel, not a prototype

### What's Included

1. **World Environment**
   - Seamless high-fidelity 360° skybox
   - Textured platforms (hedge walls, stone paths, rose gardens)
   - Environmental props (topiaries, card soldier statues, fountains)
   - Cohesive lighting that supports the stylized look

2. **Characters**
   - Alice with full skeletal rig and walk cycle
   - NPCs with proper armatures and idle/talk animations
   - Expressive, stylized character designs

3. **Visual Polish**
   - Cel-shading/toon shaders for unified look
   - Post-processing (subtle bloom, color grading)
   - Particle effects for atmosphere

## Why This Approach

**Full Asset Pipeline Overhaul** was chosen because:

1. **Cohesion** - AI-generated assets can be prompted with consistent style direction
2. **Animation Quality** - Mixamo integration enables proper walk cycles without manual rigging
3. **Skybox Quality** - Blockade Labs produces seamless 360° HDRIs that wrap correctly
4. **Ambition Match** - Matches the stated goal of "ambitious, beautiful visual worlds"

### Rejected Alternatives

- **Shader-First:** Would make existing box geometry look better but not solve the fundamental asset quality issue
- **Hybrid:** Acceptable compromise but risks visual inconsistency

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Number of levels | 1 showcase | Quality over quantity |
| Level setting | Queen's Garden | Colorful, iconic, good variety of elements |
| Art style | BotW-style cel-shaded | Modern, appealing, achievable with shaders |
| Animation approach | Full skeletal | Walk cycles, proper rigging for polished feel |
| Asset sourcing | AI-generated + refined | Meshy/Tripo for models, Blockade Labs for skybox, Mixamo for animation |
| Character focus | Alice primary, NPCs secondary | Player character most important |

## Technical Approach

### Asset Pipeline

```
Skybox:     Blockade Labs → Seamless 360° HDRI → Three.js CubeTexture
Platforms:  Meshy/Tripo → Textured GLB → Apply cel-shader material
Characters: Meshy → Mixamo (rig + animate) → GLB with animations → Three.js AnimationMixer
Props:      Meshy/Tripo → Textured GLB → Scene placement
```

### Rendering Stack

- **Cel-Shading:** Custom cel-shader for full control over BotW aesthetic
- **Outlines:** Inverted hull technique or post-process edge detection
- **Lighting:** Directional sun + hemisphere ambient (warm/cool)
- **Post-Processing:** EffectComposer (if needed for bloom/color grading)

### Animation System

- Three.js `AnimationMixer` for skeletal animation
- State machine for: Idle → Walk → Jump → Land
- Blend between states for smooth transitions

## Queen's Garden Level Design

### Environment Elements

- **Hedge Maze Walls** - Textured green hedges forming pathways
- **Rose Gardens** - Red/white rose bushes as decorative clusters
- **Stone Pathways** - Cobblestone or chess-pattern flooring
- **Card Soldier Statues** - Decorative props, potential NPCs
- **Royal Fountain** - Centerpiece landmark
- **Archways & Gates** - Transition points, chapter gate becomes ornate

### Color Palette

- **Greens:** Rich hedge greens (#2D5A27, #4A7C3F)
- **Reds:** Vibrant rose reds (#C41E3A, #DC143C)
- **Whites:** Cream whites for roses and architecture (#FFF8DC)
- **Gold:** Royal accents (#FFD700)
- **Sky:** Soft blue with painterly clouds

### Characters Present

- **Alice** (playable) - Blue dress, blonde hair, expressive
- **Queen of Hearts** (NPC) - Red dress, crown, dramatic focal character

> **Future:** Card Soldiers, White Rabbit can be added after core showcase

## Resolved Questions

| Question | Decision |
|----------|----------|
| Skybox Style | **Painterly stylized** - Hand-painted look with soft brushstroke clouds |
| Platform Shapes | **Organic shapes** - Curved hedges, natural stone, flowing garden paths |
| Alice Model | **Generate new** - Fresh AI-generated model designed for BotW style |
| Shader Complexity | **Custom cel-shader** - Full control to match BotW aesthetic exactly |

## Success Criteria

- [ ] Skybox is seamless and high-fidelity (no visible seams)
- [ ] All platforms have proper textures (no solid colors)
- [ ] Alice has working walk/idle/jump animations
- [ ] Queen of Hearts has idle animation
- [ ] Consistent BotW-inspired visual style throughout
- [ ] Level feels like a "real game" not a prototype

## Next Steps

1. Generate painterly skybox via Blockade Labs
2. Create organic platform assets (curved hedges, stone paths) via Meshy/Tripo
3. Generate new Alice model and rig via Mixamo with walk/idle/jump animations
4. Implement custom cel-shading render pipeline
5. Assemble Queen's Garden level
6. Polish and iterate
