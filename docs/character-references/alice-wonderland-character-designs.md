# Alice in Wonderland Character Designs
## For 3D Model Generation (ComfyUI → Tripo) with Cel-Shaded Aesthetic

This document provides detailed character references for creating 3D models of Alice in Wonderland characters suitable for a cel-shaded platformer game.

---

## Table of Contents
1. [The Duchess & Cook](#1-the-duchess--cook)
2. [The Cheshire Cat](#2-the-cheshire-cat)
3. [The Hatter (Mad Hatter)](#3-the-hatter-mad-hatter)
4. [The March Hare](#4-the-march-hare)
5. [The Dormouse](#5-the-dormouse)
6. [General Cel-Shading Guidelines](#general-cel-shading-guidelines)
7. [ComfyUI/Tripo Workflow Tips](#comfyuitripo-workflow-tips)

---

## 1. The Duchess & Cook

### Original Book/Tenniel Description

**The Duchess:**
Carroll's description from Chapter 9 states: "Alice did not much like keeping so close to her: first, because the Duchess was very ugly; and secondly, because she was exactly the right height to rest her chin upon Alice's shoulder, and it was an uncomfortably sharp chin."

Tenniel's illustration was directly inspired by Quentin Matsys's painting "The Ugly Duchess" (c. 1513), which depicts an old woman with:
- Grotesque, exaggerated facial features
- Wrinkled skin
- An aristocratic horned headdress (escoffion)
- A red flower held in her right hand (symbol of seeking a suitor)

Tenniel softened some harshness but retained the grotesque quality.

**The Cook:**
Not physically described in the book. She is characterized by behavior:
- Ill-mannered, belligerent, and volatile
- Constantly cooking with excessive pepper
- Throws dishes, pans, and fire-irons at everyone

### Modern Interpretations

| Version | Duchess Design | Cook Design |
|---------|---------------|-------------|
| Disney 1951 | Not featured prominently | Not featured |
| Tim Burton 2010 | Not featured | Not featured |
| American McGee | Gothic/grotesque interpretation | Darker, more sinister |

### Key Visual Elements

**Duchess:**
- Oversized head with exaggerated ugly features
- Sharp, prominent chin
- Victorian aristocratic clothing (now unfashionable)
- Horned headdress or elaborate bonnet
- Stern, unpleasant expression
- Short/stocky stature (chin-height to Alice's shoulder)

**Cook:**
- Apron over simple dress
- Flour/pepper-dusted appearance
- Angry expression
- Holding cooking implements (ladle, rolling pin)
- Surrounded by floating pepper particles

### Suggested Color Palette

**Duchess:**
| Color | Hex Code | Usage |
|-------|----------|-------|
| Dusty Rose | `#C48B8B` | Face/skin tones |
| Deep Purple | `#4A235A` | Dress/main fabric |
| Aged Gold | `#B8860B` | Jewelry/trim |
| Cream | `#FFF8DC` | Lace collar/headdress |
| Dark Brown | `#3E2723` | Hair/shadows |

**Cook:**
| Color | Hex Code | Usage |
|-------|----------|-------|
| Off-White | `#F5F5DC` | Apron |
| Slate Gray | `#708090` | Dress |
| Copper | `#B87333` | Cookware |
| Pepper Black | `#1C1C1C` | Pepper particles |
| Ruddy Red | `#CD5C5C` | Angry face tones |

### Body Proportions (3D Modeling)

**Duchess:**
- **Head-to-body ratio:** 1:3 (exaggerated large head for grotesque effect)
- **Height:** Short/squat, approximately 4-5 heads tall total
- **Build:** Plump, pear-shaped body
- **Hands:** Small, aristocratic with rings
- **Head shape:** Elongated, sharp chin, wide forehead

**Cook:**
- **Head-to-body ratio:** 1:4 (more standard stylized)
- **Height:** Taller than Duchess, sturdy frame
- **Build:** Stocky, strong arms from cooking
- **Hands:** Large, capable, holding implements

### Rigging Needs

| Character | Rig Type | Special Notes |
|-----------|----------|---------------|
| Duchess | Biped humanoid | Exaggerated facial rig for expressions, sharp chin deformation |
| Cook | Biped humanoid | Arm emphasis for throwing animations, facial anger expressions |

### AI Prompt Suggestions (ComfyUI → Tripo)

**Duchess - Concept Image Prompt:**
```
Victorian aristocratic ugly duchess character, grotesque exaggerated features, sharp pointed chin, wrinkled elderly woman, horned headdress bonnet, purple velvet dress with gold trim, cream lace collar, pompous expression, stylized cartoon proportions, cel-shaded game character, clean silhouette, T-pose, white background, full body front view
```

**Duchess - Tripo 3D Text Prompt:**
```
Stylized cartoon elderly duchess character, oversized head with sharp chin, grotesque ugly features, Victorian purple dress, horned headdress, cream lace details, gold jewelry, short plump body, aristocratic pose, cel-shaded style, game-ready model, low-poly friendly, T-pose for rigging
```

**Cook - Concept Image Prompt:**
```
Angry Victorian kitchen cook character, stout woman, flour-dusted apron, holding wooden ladle and rolling pin, pepper particles floating around, red angry face, messy hair under cap, gray dress, copper pots nearby, stylized cartoon proportions, cel-shaded game character, clean silhouette, T-pose, white background
```

**Cook - Tripo 3D Text Prompt:**
```
Stylized angry cook character, stocky build, white apron over gray dress, holding cooking implements, messy hair, red cheeks, furious expression, cel-shaded style, game-ready character, medium-poly, T-pose for animation rigging
```

---

## 2. The Cheshire Cat

### Original Book/Tenniel Description

Tenniel's 1865 illustrations depict the Cheshire Cat with:
- A large, impossibly wide grin (the defining feature)
- Striped fur pattern
- Ability to disappear gradually, leaving only the grin
- Perched on tree branches
- Round, well-fed body
- Large, knowing eyes

Carroll never specified exact colors - Tenniel's woodblock prints were black and white.

### Modern Interpretations

| Version | Key Design Elements |
|---------|-------------------|
| **Disney 1951** | Pink and purple stripes, round body, turquoise/yellow eyes, mischievous grin |
| **Tim Burton 2010** | Blue-gray fur, large luminous eyes, more realistic cat proportions |
| **American McGee's Alice** | Emaciated/skeletal, gray furless skin, tribal tattoo markings, gold earring, blood on teeth, disturbing uncanny grin |
| **Alice: Madness Returns** | Even more gaunt, philosophical demeanor, acts as guide |

### Key Visual Elements

- **Signature grin** - Wide, toothy, Cheshire smile (MOST IMPORTANT)
- **Stripes** - Alternating pattern on body/tail
- **Large eyes** - Knowing, mysterious expression
- **Fluffy tail** - Often with tuft or distinct tip
- **Ability to phase/disappear** - Consider transparency effects
- **Tree-perching pose** - Lounging, relaxed body language

### Suggested Color Palette

**Classic/Disney-Inspired:**
| Color | Hex Code | Usage |
|-------|----------|-------|
| Soft Pink | `#FFB6C1` | Primary stripe color |
| Royal Purple | `#9B59B6` | Secondary stripe color |
| Hot Pink | `#FF69B4` | Nose, inner ears, paw pads |
| Bright Yellow | `#FFD700` | Eyes (iris) |
| White | `#FFFFFF` | Teeth, eye whites |
| Black | `#1A1A1A` | Pupils, stripe outlines |

**Darker/American McGee-Inspired:**
| Color | Hex Code | Usage |
|-------|----------|-------|
| Charcoal Gray | `#36454F` | Primary body |
| Sickly Green | `#9DC183` | Eyes |
| Bone White | `#E3DAC9` | Teeth/grin |
| Crimson | `#DC143C` | Blood accents |
| Black | `#0D0D0D` | Tattoo markings |
| Gold | `#FFD700` | Earring |

### Body Proportions (3D Modeling)

**Friendly/Platformer Style:**
- **Head-to-body ratio:** 1:2 (very large head for expressiveness)
- **Overall shape:** Round, plump body
- **Legs:** Short, stubby
- **Tail:** Long, fluffy, 1.5x body length
- **Face:** 60% of head is the grin area
- **Eyes:** Large, about 20% of face each

**Darker Style:**
- **Head-to-body ratio:** 1:3 (large head, thin body)
- **Overall shape:** Emaciated, visible ribs
- **Legs:** Long, thin, spider-like
- **Tail:** Thin with tuft at end
- **Face:** Stretched grin, sunken features

### Rigging Needs

| Rig Type | Special Requirements |
|----------|---------------------|
| **Quadruped** (base) | Four-legged cat skeleton |
| **Semi-biped** | Can sit upright, use front paws expressively |
| **Facial rig** | CRITICAL - complex mouth rig for grin, brow controls |
| **Tail** | FK/IK tail with many segments |
| **Special** | Transparency/fade shader for disappearing effect |

### AI Prompt Suggestions (ComfyUI → Tripo)

**Classic Style - Concept Image Prompt:**
```
Cheshire Cat character, round plump cat with massive wide grin showing all teeth, pink and purple horizontal stripes, large yellow eyes, fluffy long tail, mischievous expression, sitting on tree branch, cel-shaded cartoon style, clean silhouette, Alice in Wonderland, stylized game character, front three-quarter view, white background
```

**Classic Style - Tripo 3D Text Prompt:**
```
Stylized cartoon Cheshire Cat, round plump body, pink and purple stripes, iconic wide toothy grin, large yellow eyes, long fluffy tail, sitting pose, cel-shaded game character, low-poly friendly mesh, quadruped cat rig ready, clean topology
```

**Darker Style - Concept Image Prompt:**
```
Dark Cheshire Cat character, emaciated skeletal cat, gray hairless skin, black tribal tattoo markings, gold hoop earring, disturbing wide human-like grin, large green eyes, long thin body, American McGee inspired, horror game character, cel-shaded style, T-pose, white background
```

**Darker Style - Tripo 3D Text Prompt:**
```
Gothic Cheshire Cat, thin skeletal cat body, gray skin with black tattoo patterns, oversized grinning head, green glowing eyes, gold earring, long thin tail with tuft, horror-cute style, cel-shaded materials, game-ready model, quadruped rig
```

---

## 3. The Hatter (Mad Hatter)

### Original Book/Tenniel Description

Carroll never describes the hat style - Tenniel created the iconic look:
- **Large top hat** with hatband reading "In this style 10/6" (price tag: ten shillings and sixpence)
- **Protruding nose**
- **Bulging eyes** creating a "grotesque mishmash"
- **Victorian gentleman's attire** (coat, vest, cravat)
- Possibly based on **Theophilus Carter**, an eccentric Oxford furniture dealer who always wore a top hat

The character conveys madness through grotesque features while remaining human.

### Modern Interpretations

| Version | Key Design Elements |
|---------|-------------------|
| **Disney 1951** | Green/yellow outfit, oversized top hat, buck teeth, wild eyes, orange hair |
| **Tim Burton 2010** | Orange hair (mercury poisoning), mismatched clothes, pale skin, gap teeth, color-changing outfit based on emotions, clown-like makeup |
| **American McGee** | More sinister, mechanical elements, steampunk influences |
| **Classic Stage** | Traditional Victorian with exaggerated proportions |

### Key Visual Elements

- **Oversized top hat** with 10/6 price tag (ESSENTIAL)
- **Mismatched patterns** - plaids, stripes, polka dots combined chaotically
- **Victorian silhouette** - coat with tails, vest, bow tie/cravat
- **Wild hair** - often orange or reddish (mercury reference)
- **Exaggerated eyes** - wide, manic, expressive
- **Tea stains** - on clothes, showing constant tea party lifestyle
- **Sewing implements** - thimbles, thread, pins as accessories

### Suggested Color Palette

**Classic/Disney-Inspired:**
| Color | Hex Code | Usage |
|-------|----------|-------|
| Forest Green | `#228B22` | Main coat |
| Mustard Yellow | `#FFDB58` | Vest/accents |
| Orange | `#FF8C00` | Hair |
| Cream | `#FFFDD0` | Shirt/face |
| Brown | `#8B4513` | Hat band/shoes |
| Purple | `#800080` | Bow tie/accent patterns |

**Tim Burton-Inspired:**
| Color | Hex Code | Usage |
|-------|----------|-------|
| Teal Blue | `#008B8B` | Coat (combative mood) |
| Dusty Gray | `#696969` | Coat (depressed mood) |
| Bright Orange | `#FF4500` | Hair |
| Pale White | `#FAF0E6` | Skin |
| Violet | `#EE82EE` | Eye shadow area |
| Burnt Sienna | `#E97451` | Freckles/details |

### Body Proportions (3D Modeling)

- **Head-to-body ratio:** 1:4 (slightly large head for expressiveness)
- **Height:** Tall and lanky, approximately 6 stylized heads
- **Build:** Thin, angular, elongated limbs
- **Hands:** Large, expressive, good for gesturing
- **Hat:** Should be 1.5-2x head height
- **Shoulders:** Narrow, slightly hunched
- **Posture:** Slightly forward-leaning, energetic

### Rigging Needs

| Rig Type | Special Requirements |
|----------|---------------------|
| **Biped humanoid** | Standard humanoid skeleton |
| **Facial rig** | Complex expressions - manic joy, confusion, anger |
| **Hand rig** | Detailed finger controls for tea party animations |
| **Hat** | Separate bone/constraint for hat physics |
| **Clothing** | Consider cloth simulation for coat tails |

### AI Prompt Suggestions (ComfyUI → Tripo)

**Concept Image Prompt:**
```
Mad Hatter character, tall lanky man with oversized green top hat with 10/6 price tag, wild orange hair, wide manic eyes, buck teeth, forest green coat with tails, yellow vest, purple polka dot bow tie, mismatched patterns, holding teacup, Victorian style, cel-shaded cartoon, stylized game character, full body T-pose, white background
```

**Tripo 3D Text Prompt:**
```
Stylized Mad Hatter character, tall thin body, oversized top hat with price tag, wild orange hair, exaggerated facial features, green Victorian coat, yellow vest, purple bow tie, lanky proportions, cel-shaded style, game-ready model, biped humanoid, T-pose for rigging, clean topology
```

**Alternative (Burton-Inspired) Prompt:**
```
Gothic Mad Hatter, pale skin with orange wild hair, mismatched colorful Victorian outfit, oversized decorated top hat, theatrical makeup around eyes, gap-toothed smile, long coat with burned edges, whimsical dark style, cel-shaded materials, game character, T-pose, full body view
```

---

## 4. The March Hare

### Original Book/Tenniel Description

Tenniel's illustration depicts:
- **Straw on his head** - Victorian symbol of madness (hares supposedly go mad in March during breeding season)
- **Human clothing** contradicting his wild nature
- **Rabbit mouth** with lips pulled back revealing teeth (bizarre expression)
- **Long ears** (naturally)
- **House with chimney shaped like rabbit ears** and fur-thatched roof

The combination of animal features with human dress creates uncanny effect.

### Modern Interpretations

| Version | Key Design Elements |
|---------|-------------------|
| **Disney 1951** | Tan/brown fur, blonde hair, red jacket, brown pants, magenta nose, buck teeth, manic energy, inspired by voice actor Jerry Colonna |
| **Tim Burton 2010** | More realistic hare, disheveled, clearly "mad" expression |
| **American McGee** | Darker, more aggressive, mechanical elements |

### Key Visual Elements

- **Long upright ears** (can be one flopped for personality)
- **Straw/hay** in or around hair/ears
- **Victorian waistcoat/jacket** - usually red or warm colored
- **Buck teeth** - pronounced rabbit teeth
- **Wide, manic eyes**
- **Fur pattern** - brown/tan with lighter underbelly
- **Cotton tail** - visible from behind
- **Mallet or teapot** - often carrying something

### Suggested Color Palette

| Color | Hex Code | Usage |
|-------|----------|-------|
| Tan/Fawn | `#D2B48C` | Primary fur |
| Cream | `#FFFDD0` | Underbelly/inner ears |
| Crimson Red | `#DC143C` | Jacket |
| Brown | `#8B4513` | Pants/shoes |
| Straw Yellow | `#E4D96F` | Straw accents |
| Magenta | `#C71585` | Nose |
| Pink | `#FFB6C1` | Inner ears |
| Black | `#1A1A1A` | Eyes/pupils |

### Body Proportions (3D Modeling)

- **Head-to-body ratio:** 1:3 (large head, hare-like)
- **Height:** Medium, slightly shorter than Mad Hatter
- **Build:** Lean but energetic, springy pose
- **Ears:** Very long, 1.5x head height each
- **Legs:** Strong haunches (rabbit legs) but wearing pants
- **Feet:** Large rabbit feet in shoes (or barefoot with fur)
- **Hands/Paws:** Humanoid but with fur, 4 fingers

### Rigging Needs

| Rig Type | Special Requirements |
|----------|---------------------|
| **Bipedal anthropomorphic** | Humanoid with animal proportions |
| **Ear rig** | Independent ear controls, flopping physics |
| **Facial rig** | Buck teeth always visible, twitchy nose |
| **Tail** | Small cottontail with wiggle |
| **Digitigrade option** | Consider rabbit leg structure vs human |

### AI Prompt Suggestions (ComfyUI → Tripo)

**Concept Image Prompt:**
```
March Hare character, anthropomorphic rabbit standing upright, tan brown fur, very long ears with straw tucked in, manic wide eyes, buck teeth, blonde messy hair, red Victorian jacket with buttons, brown pants, magenta nose, energetic pose, holding teacup, cel-shaded cartoon style, Alice in Wonderland, game character, T-pose, white background
```

**Tripo 3D Text Prompt:**
```
Stylized anthropomorphic March Hare, tan rabbit with long ears, straw in hair for madness symbol, red jacket, brown pants, buck teeth, manic expression, humanoid biped proportions, cel-shaded game character, cartoon style, T-pose for rigging, medium-poly, clean topology
```

---

## 5. The Dormouse

### Original Book/Tenniel Description

Tenniel depicts the Dormouse as:
- A **small, sleepy mouse** always drowsing
- Used as a cushion by Hatter and March Hare
- Eventually stuffed into a teapot
- Tenniel may have been inspired by **Dante Gabriel Rossetti's pet wombat Topsy** who fell asleep at tables

The character is almost always asleep, rousing only briefly.

### Modern Interpretations

| Version | Key Design Elements |
|---------|-------------------|
| **Disney 1951** | Small mouse, fuchsia/pink jacket, purple shoes, gray trousers, half-closed eyes, high-pitched voice, panics at word "cat" |
| **Tim Burton 2010** | More realistic dormouse, still sleepy but can be fierce when provoked |
| **American McGee** | Darker interpretation, still small and vulnerable |

### Key Visual Elements

- **Small size** - fits in a teacup/teapot
- **Perpetually sleepy** - half-closed eyes, droopy posture
- **Mouse features** - round ears, long tail, whiskers
- **Cozy clothing** - jacket, sometimes nightcap
- **Soft, round body** - pudgy and huggable
- **Tea stains** - from living in teapot

### Suggested Color Palette

| Color | Hex Code | Usage |
|-------|----------|-------|
| Soft Gray | `#A9A9A9` | Primary fur |
| Cream/Beige | `#F5F5DC` | Underbelly/face |
| Fuchsia Pink | `#FF00FF` | Jacket |
| Purple | `#800080` | Shoes/shirt |
| Gray | `#696969` | Trousers |
| Pink | `#FFC0CB` | Nose/inner ears |
| Black | `#000000` | Eyes (half-closed) |

### Body Proportions (3D Modeling)

- **Head-to-body ratio:** 1:1.5 (very large head, cute proportions)
- **Height:** Very small - should fit in a teacup
- **Build:** Round, soft, pudgy
- **Ears:** Large circular mouse ears
- **Tail:** Long, thin, mouse tail (can curl)
- **Hands/Paws:** Tiny, 4 fingers
- **Eyes:** Small, always half-closed or closed

### Rigging Needs

| Rig Type | Special Requirements |
|----------|---------------------|
| **Biped tiny** | Small humanoid mouse skeleton |
| **Facial rig** | Sleepy expressions, occasional panic |
| **Ear rig** | Floppy ears that droop when sleeping |
| **Tail** | Long thin tail with FK chain |
| **Scale** | Must work at very small scale relative to other characters |

### AI Prompt Suggestions (ComfyUI → Tripo)

**Concept Image Prompt:**
```
Dormouse character, tiny sleepy mouse, soft gray fur, very large round ears, half-closed drowsy eyes, pink nose, fuchsia pink jacket, purple shoes, gray trousers, round pudgy body, cute proportions, sitting sleepily in teacup, cel-shaded cartoon style, Alice in Wonderland, game character, white background
```

**Tripo 3D Text Prompt:**
```
Stylized cute Dormouse, tiny sleepy mouse character, soft gray fur, big round ears, half-closed eyes, pink jacket, pudgy round body, very small scale, cel-shaded game character, cartoon proportions, biped mouse rig, T-pose, low-poly friendly, clean mesh
```

---

## General Cel-Shading Guidelines

### Visual Style Principles

For a cohesive cel-shaded platformer aesthetic:

1. **Simplified Geometry**
   - Use clean, smooth 3D models
   - Avoid excessive detail that looks messy with toon shading
   - Large graphic forms read better

2. **Bold Outlines**
   - Black outline around models (edge detection)
   - Thickness: 2-4 pixels at 1080p
   - Emphasizes shapes and silhouettes

3. **Limited Shading Steps**
   - 2-3 shade levels maximum
   - Sharp transitions between light and shadow
   - No smooth gradients

4. **Exaggerated Proportions**
   - Larger heads for expressiveness
   - Simplified hands (4 fingers common)
   - Stylized body ratios (2-6 heads tall)

5. **Vibrant, Saturated Colors**
   - Strong color contrast
   - Readable silhouettes at distance
   - Character-specific color identities

### Platformer-Specific Considerations

| Aspect | Recommendation |
|--------|---------------|
| **Silhouette** | Must be instantly recognizable |
| **Scale** | Consistent relative sizes between characters |
| **Animation-ready** | Clean topology, proper edge loops |
| **LOD-friendly** | Design works at multiple detail levels |
| **Collision** | Simple shapes for gameplay |

---

## ComfyUI/Tripo Workflow Tips

### Prompt Engineering Best Practices

Based on Tripo AI documentation:

1. **Structure Your Prompts:**
   - Main Subject (the core character)
   - Descriptors & Modifiers (size, style, details)
   - Materials & Textures (surface properties)
   - Style & Genre (cel-shaded, cartoon, etc.)
   - Quality & Technical Specs (poly count, rig-ready)

2. **Be Specific About:**
   - Art style: "cel-shaded", "cartoon", "stylized"
   - Pose: "T-pose", "A-pose" (for rigging)
   - View: "full body", "front view"
   - Background: "white background" (cleaner extraction)

3. **Avoid:**
   - Overly long descriptions (diminishing returns)
   - Vague terms without specifics
   - Conflicting style directions

### Recommended Workflow

```
1. Generate concept images in ComfyUI (Flux/SD)
   ↓
2. Select best reference image
   ↓
3. Use Tripo image-to-3D or text-to-3D
   ↓
4. Set output to T-pose or A-pose
   ↓
5. Enable PBR materials for quality
   ↓
6. Use "Detailed/Ultra" mode for complex characters
   ↓
7. Export and refine in Blender if needed
   ↓
8. Apply cel-shader materials in game engine
```

### Tripo-Specific Settings

| Setting | Recommendation |
|---------|---------------|
| **Mode** | Detailed/Ultra for main characters |
| **Pose** | T-pose for bipeds, natural for quadrupeds |
| **Face Limit** | 50K-100K for hero characters |
| **PBR** | Enable for material quality |
| **Auto-rig** | Use Tripo's built-in rigging node |

### Quality Checklist

Before finalizing models:
- [ ] Clean silhouette from all angles
- [ ] Consistent style with other characters
- [ ] Proper topology for animation
- [ ] T-pose/A-pose for rigging
- [ ] No floating geometry
- [ ] Appropriate poly count for platform
- [ ] UV-ready for texturing

---

## Sources & References

### Original Source Material
- [Tenniel Illustrations - Project Gutenberg](https://www.gutenberg.org/files/114/114-h/114-h.htm)
- [Alice-in-Wonderland.net Pictures](https://www.alice-in-wonderland.net/resources/pictures/alices-adventures-in-wonderland/)
- [Victorian Web - Tenniel Illustrations](https://victorianweb.org/art/illustration/tenniel/alice/7.1.html)

### Character Research
- [The Ugly Duchess - Wikipedia](https://en.wikipedia.org/wiki/The_Ugly_Duchess)
- [National Gallery - Matsys Painting](https://www.nationalgallery.org.uk/paintings/quinten-massys-an-old-woman-the-ugly-duchess)
- [Mad Hatter - Wikipedia](https://en.wikipedia.org/wiki/Mad_Hatter)
- [March Hare - Wikipedia](https://en.wikipedia.org/wiki/March_Hare)
- [Cheshire Cat - Wikipedia](https://en.wikipedia.org/wiki/Cheshire_Cat)
- [Dormouse Character - Wikipedia](https://en.wikipedia.org/wiki/Dormouse_(Alice's_Adventures_in_Wonderland_character))

### Disney References
- [Disney Wiki - Cheshire Cat](https://disney.fandom.com/wiki/Cheshire_Cat)
- [Disney Wiki - March Hare](https://disney.fandom.com/wiki/March_Hare)
- [Disney Wiki - Dormouse](https://disney.fandom.com/wiki/Dormouse)

### Video Game Interpretations
- [Alice Wiki - Cheshire Cat (American McGee)](https://alice.fandom.com/wiki/Cheshire_Cat)
- [Tim Burton Wiki - Tarrant Hightopp](https://timburton.fandom.com/wiki/Tarrant_Hightopp)

### Technical Resources
- [Cel Shading - Wikipedia](https://en.wikipedia.org/wiki/Cel_shading)
- [Tripo AI - Text to 3D Prompt Engineering](https://www.tripo3d.ai/blog/text-to-3d-prompt-engineering)
- [Tripo ComfyUI Node Tutorial](https://www.tripo3d.ai/blog/tripo-comfyui-node-tutorial)
- [Character Proportions Guide](https://www.cs22.space/character-proportions)
