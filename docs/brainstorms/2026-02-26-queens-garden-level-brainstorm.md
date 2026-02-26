# The Queen's Garden - Level Brainstorm

**Date:** 2026-02-26
**Status:** Ready for planning

---

## What We're Building

A **showcase level** for Alice in Wonderland that demonstrates stunning visual quality, excellent game design, and polished character animation. This will be "The Queen's Garden" - a new chapter designed to be the most impressive level in the game.

### Core Concept

A BotW-inspired **vertical garden** with multi-level exploration featuring:

- **Lush Victorian gardens** with roses, hedges, fountains, and gazebos
- **20 Wonderland characters** telling their story perspectives
- **Hub-and-spokes structure** - central Queen's Court with 5-6 themed garden rooms at different elevations
- **Story exploration gameplay** - talk to characters, unlock areas through dialogue/quests

---

## Why This Approach

### Visual Direction: Breath of the Wild

Based on the `/inspo/` reference folder (330+ BotW screenshots), the target aesthetic features:

| Element | BotW Approach | Queen's Garden Application |
|---------|---------------|---------------------------|
| **Atmosphere** | Layered fog, silhouettes fading into distance | Hedge walls create depth layers, distant castle visible through haze |
| **Lighting** | God rays, warm/cool contrast, dramatic shadows | Dappled sunlight through rose arbors, golden hour feel |
| **Vegetation** | Dense foliage with particle effects (leaves, fireflies) | Rose petals drifting, fireflies at dusk, swaying flowers |
| **Color** | Limited palette per scene, intentional accents | Deep greens + red roses + white marble + gold trim |
| **Ground** | Rich grass detail, visible paths | Grass blades, cobblestone paths, flower borders |

### Structure: Hub-and-Spokes Vertical Garden

```
                    [Overlook Tower]
                         |
              [Cheshire Cat's Perch]
                    /         \
        [Tea Party]           [Mushroom Grove]
                    \         /
               [Queen's Court] ← Central hub
                    /         \
          [Rose Garden]     [Croquet Lawn]
                    \         /
               [Mock Turtle Grotto]
                    (underground)
```

Each room:
- Is visually distinct but shares BotW lighting language
- Contains 2-4 characters relevant to that theme
- Has unique environmental details and collectibles
- Connects via vertical pathways (stairs, climbing, hidden routes)

### Characters: ComfyCloud → Tripo Pipeline

The 20 Wonderland characters will be created as GLB models:

1. Alice (already exists)
2. The White Rabbit (already exists)
3. The Mouse (already exists)
4. The Dodo (already exists)
5. The Lory (already exists)
6. Bill the Lizard (already exists)
7. The Eaglet
8. The Duck
9. Pat
10. Puppy
11. The Caterpillar
12. The Duchess
13. The Cheshire Cat
14. The Hatter
15. The March Hare
16. The Dormouse
17. The Queen of Hearts
18. The King of Hearts
19. The Knave of Hearts
20. The Gryphon
21. The Mock Turtle

Each character will:
- Have idle animations (breathing, blinking, small movements)
- Have talking animations for dialogue
- Be placed in thematically appropriate garden sections
- Tell their perspective on the Alice story through dialogue

---

## Key Decisions

1. **Visuals-first approach** - Nail the BotW lighting, materials, and atmosphere before detailing gameplay mechanics

2. **Hub-and-spokes layout** - Central Queen's Court with distinct garden rooms at different elevations, connected by vertical pathways

3. **Full environment polish** - Foliage, architecture, and ground all treated with equal care using the AGENTIC_SWARM methodology

4. **Story exploration gameplay** - Characters unlock areas and share their story perspectives, creating a narrative-driven collectathon

5. **Character pipeline** - ComfyCloud → Tripo for GLB model generation, then animation in Blender/Three.js

---

## AGENTIC_SWARM Integration

The `/agentic-swarm-md.md` methodology will drive visual polish:

### Phase 1: Analyze
- Create style_bible.json capturing BotW aesthetic for gardens
- Audit existing cel-shader materials for compatibility
- Map scene requirements for each garden room

### Phase 2: Light
- Configure renderer for BotW-style tone mapping
- Set up god rays / volumetric lighting
- Establish per-room lighting profiles (sunny, shaded, underground)

### Phase 3: Surface
- Create hedge/rose/grass materials with proper PBR
- Add detail normal maps for architectural elements
- Implement wind animation for vegetation

### Phase 4: Move
- Camera improvements for vertical exploration
- Smooth transitions between elevation changes
- Character interaction camera behaviors

### Phase 5: Verify
- Performance testing (60 FPS target on desktop)
- Visual comparison against BotW references
- Draw call and texture memory budgets

---

## Resolved Questions

1. **Time of day** → **Fixed golden hour** - Warm afternoon light, easiest to polish, most BotW-like

2. **Unlock progression** → **Character quests** - Help characters with tasks to unlock new areas (fits story exploration theme)

3. **Scope of first pass** → **2-3 areas to 100%** - Rose Garden + Queen's Court + one more, made absolutely perfect

4. **Dialogue system** → **Extend existing** - Add quest flags to current NPCController, keep it simple

## Open Questions

None - all questions resolved!

---

## Success Criteria

A stunning Queen's Garden level means:

- [ ] Screenshots could pass for BotW concept art
- [ ] Vegetation feels alive (wind, particles, lighting)
- [ ] Characters have personality through animation and placement
- [ ] Vertical exploration feels rewarding and readable
- [ ] Performance stays at 60 FPS with full visual polish
- [ ] The level tells a cohesive story through environment and dialogue

---

## Next Steps

1. **Create style_bible.json** - Extract BotW visual rules from reference images
2. **Block out vertical layout** - Simple geometry for hub + 6 rooms
3. **Apply AGENTIC_SWARM Phase 2** - Get lighting foundation right
4. **Create one room to completion** - Rose Garden as proof-of-concept
5. **Generate first character batch** - 5-6 characters via Tripo pipeline
