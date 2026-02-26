# Queen's Court Character Designs

**Date:** 2026-02-26
**Pipeline:** ComfyUI (image generation) -> Tripo AI (3D model generation)
**Style:** Cel-shaded, BotW-inspired, Victorian whimsy

---

## Overview

This document provides detailed character descriptions for 5 Alice in Wonderland characters destined for the Queen's Garden level. Each character has been researched against the original John Tenniel illustrations, Lewis Carroll's text, and modern interpretations to create designs that work well with:

- Cel-shaded rendering aesthetics
- 3D model generation via AI tools
- Animation rigging requirements
- The established BotW-inspired visual direction

---

## 1. The Queen of Hearts

### Source Material

**Original Book/Tenniel:**
- Carroll describes her as "a blind fury" - childish, imperious, and quick to order executions
- Tenniel based her design on Elizabeth de Mowbray, Duchess of Norfolk, from medieval stained glass
- Interestingly, Tenniel drew her dress based on a Queen of Spades playing card design
- Classic poses show her with outstretched arm and pointing finger, imperiously furious
- Heart motifs throughout her costume and crown

**Modern Interpretations:**
- **Disney (1951):** Large, imposing figure with exaggerated proportions. Fair skin, black hair in a bun with red headband. Black-and-red gown with black-and-yellow stripes. Instantly recognizable villain silhouette.
- **American McGee's Alice:** A horrific, fleshy tentacled creature representing Alice's broken emotions - far darker interpretation
- **Tim Burton (2010):** Helena Bonham Carter's "Red Queen" with an oversized head (3x normal), tiny waist, based on a toddler's proportions and temperament

### Key Visual Elements

| Element | Description |
|---------|-------------|
| **Silhouette** | Wide, imposing triangular shape (dress) with crown peak |
| **Crown** | Gold crown with prominent heart motif |
| **Face** | Stern, frowning expression, small eyes, strong chin |
| **Hair** | Black hair pulled back severely (bun or updo) |
| **Dress** | Full ball gown with heart patterns, corset bodice |
| **Accessories** | Scepter with heart, possibly fan, ruff collar |
| **Pose** | Commanding, often pointing or gesturing dramatically |

### Color Palette

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Cardinal Red | `#C41E3A` | Primary dress color, hearts |
| Jet Black | `#0A0A0A` | Hair, dress trim, shadows |
| Royal Gold | `#FFD700` | Crown, scepter, embroidery |
| Cream White | `#FFFDD0` | Skin accents, collar ruff |
| Deep Crimson | `#DC143C` | Heart accents, lips |
| Charcoal | `#36454F` | Secondary trim, underskirt |

### Body Proportions (for 3D modeling)

- **Head-to-body ratio:** 1:5 (slightly chibi/stylized for cel-shading)
- **Build:** Stout, imposing, wide shoulders with wider hips
- **Height relative to Alice:** 1.3x taller (commanding presence)
- **Key exaggerations:** Large head, small feet, voluminous dress, dramatic crown height
- **Hands:** Larger than realistic for expressive gestures

### Rigging Requirements

- **Type:** Biped (humanoid)
- **Bone count estimate:** 40-50 bones
- **Key articulation points:**
  - Expressive face rig (angry expressions, shouting)
  - Pointing arm with individual finger control
  - Dress bones for volume simulation
  - Crown should be separate mesh (for removal animations)
- **Special considerations:**
  - Skirt physics or bone-based animation for dress movement
  - Jaw rig for "Off with their heads!" shouting animation

### AI Prompt Suggestions (ComfyUI)

**Primary Prompt:**
```
cel-shaded 3D character, Queen of Hearts from Alice in Wonderland,
imperious royal woman, wide triangular red and black ball gown with
heart patterns, gold crown with heart motif, black hair in severe bun,
stern angry expression, pointing dramatically, Victorian regal costume,
playing card inspired design, stylized proportions, bold outlines,
flat color shading, anime-influenced, clean silhouette,
white ruff collar, gold scepter, front view, T-pose for rigging,
neutral gray background
```

**Negative Prompt:**
```
realistic, photorealistic, detailed textures, soft shading, gradient,
blurry, deformed, extra limbs, modern clothing, casual pose, smiling,
complex background, busy details
```

**Style Tags:**
```
cel shading, anime style, 3D render, character turnaround,
game character, stylized, clean topology
```

---

## 2. The King of Hearts

### Source Material

**Original Book/Tenniel:**
- Carroll depicts him as a moderate counterpart to the Queen's fury
- He secretly pardons subjects the Queen has sentenced to death
- Acts as judge at the Knave's trial, revealing juvenile behavior
- Tenniel shows him as shorter than the Queen, wearing royal robes
- Playing card aesthetic with heart motifs

**Modern Interpretations:**
- **Disney (1951):** Dwarfish man with an extremely tall crown that towers over his head. Orange hair, darker mustache. Flowing red robe. Comically small next to the Queen, emphasizing her dominance.
- **Tim Burton (2010):** Absent (Red Queen's husband is different)
- **Stage productions:** Often portrayed as bumbling, hen-pecked, sympathetic

### Key Visual Elements

| Element | Description |
|---------|-------------|
| **Silhouette** | Small, squat body with oversized crown creating tall profile |
| **Crown** | Extremely tall gold crown (comically disproportionate) |
| **Face** | Nervous expression, kind eyes, bushy mustache |
| **Hair** | Orange/reddish hair, balding or receding |
| **Robes** | Red royal robes with white ermine trim |
| **Accessories** | Small scepter, possibly scroll (as judge) |
| **Pose** | Hunched, submissive, fidgeting hands |

### Color Palette

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Royal Red | `#B22222` | Primary robe color |
| Bright Gold | `#FFD700` | Crown, scepter, trim |
| Orange Ginger | `#B5651D` | Hair color |
| Ermine White | `#FFFFF0` | Robe trim, collar |
| Dark Brown | `#3D2914` | Mustache, eyebrows |
| Pink Blush | `#FFB6C1` | Cheeks, nervous flush |

### Body Proportions (for 3D modeling)

- **Head-to-body ratio:** 1:4 (more chibi to emphasize smallness)
- **Build:** Short, pudgy, rounded shoulders
- **Height relative to Alice:** 0.9x (slightly shorter than Alice)
- **Height relative to Queen:** 0.6x her height (dramatic contrast)
- **Key exaggerations:** Very short stature, oversized crown (2x head height), round belly

### Rigging Requirements

- **Type:** Biped (humanoid)
- **Bone count estimate:** 35-40 bones
- **Key articulation points:**
  - Nervous fidgeting hands animation
  - Expressive eyebrows for worried looks
  - Hunched shoulder pose
  - Crown as separate mesh (for bobbling animation)
- **Special considerations:**
  - Robes need simple cloth simulation or bone chain
  - Facial rig for anxious expressions

### AI Prompt Suggestions (ComfyUI)

**Primary Prompt:**
```
cel-shaded 3D character, King of Hearts from Alice in Wonderland,
short pudgy royal man, extremely tall golden crown with heart motif,
red royal robes with white ermine trim, orange hair, bushy brown mustache,
nervous worried expression, kind eyes, hunched posture,
Victorian playing card inspired design, stylized chibi proportions,
bold outlines, flat color shading, clean silhouette,
front view, T-pose for rigging, neutral gray background
```

**Negative Prompt:**
```
realistic, photorealistic, tall, muscular, confident pose,
modern clothing, complex background, detailed textures, gradient shading
```

---

## 3. The Knave of Hearts

### Source Material

**Original Book/Tenniel:**
- Also known as the Jack of Hearts
- Accused of stealing the Queen's tarts
- Tenniel drew him based on the Knave of Spades playing card
- Notably drawn with a shaded nose (implying drunkenness/guilt)
- Appears in chains during his trial, sympathetic figure
- Young, servant-like appearance

**Modern Interpretations:**
- **Disney (1951):** Brief cameo as a living playing card, flat and two-dimensional
- **Tim Burton (2010):** "Ilosovic Stayne" - tall, sinister, wears heart-shaped eyepatch, played by Crispin Glover. Completely reimagined as a villain.
- **Stage productions:** Often a romantic figure, falsely accused

### Key Visual Elements

| Element | Description |
|---------|-------------|
| **Silhouette** | Tall, slender, youthful figure |
| **Face** | Young, roguish, slightly guilty expression |
| **Hair** | Dark hair, possibly disheveled |
| **Costume** | Page/servant outfit with heart motifs |
| **Accessories** | Chains (trial), tart prop, playing card flatness |
| **Pose** | Defensive, hands raised in innocence |

### Color Palette

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Heart Red | `#E31B23` | Primary costume accent, hearts |
| Cream Yellow | `#F5DEB3` | Base costume, stockings |
| Charcoal Gray | `#2F4F4F` | Chains, shadows, hair |
| Pale Flesh | `#FFE4C4` | Skin tone |
| Rose Pink | `#FF007F` | Cheek blush, nose tint |
| Gold Accent | `#DAA520` | Buttons, trim |

### Body Proportions (for 3D modeling)

- **Head-to-body ratio:** 1:6 (more realistic for sympathetic character)
- **Build:** Slender, athletic servant build
- **Height relative to Alice:** 1.2x taller (young adult)
- **Key exaggerations:** Slightly elongated limbs, youthful face, flat "playing card" quality to costume

### Rigging Requirements

- **Type:** Biped (humanoid)
- **Bone count estimate:** 40-45 bones
- **Key articulation points:**
  - Full hand articulation for defensive gestures
  - Expressive face for pleading/innocence
  - Shackle props with separate mesh
- **Special considerations:**
  - May need chain physics if shown in trial scene
  - Costume should have stiff, flat playing-card quality

### AI Prompt Suggestions (ComfyUI)

**Primary Prompt:**
```
cel-shaded 3D character, Knave of Hearts Jack of Hearts from Alice in Wonderland,
young slender male servant, playing card inspired costume with red hearts,
cream and red tunic, youthful roguish face, slightly guilty expression,
dark disheveled hair, Victorian page outfit, stylized proportions,
bold outlines, flat color shading, defensive innocent pose,
hands raised, front view, T-pose for rigging, neutral gray background
```

**Negative Prompt:**
```
realistic, photorealistic, villainous, scary, eyepatch, old,
complex background, modern clothing, detailed textures
```

---

## 4. The Gryphon

### Source Material

**Original Book/Tenniel:**
- Carroll provides no textual description, telling readers: "If you don't know what a Gryphon is, look at the picture"
- Tenniel's illustrations show a majestic griffin: eagle head/talons/wings + lion body
- Drawn with almost asinine (donkey-like) ear shape
- Upright gait, almost kangaroo-like posture
- Speaks with Cockney-like accent in the text
- Bossy toward the Mock Turtle, commanding

**Modern Interpretations:**
- **Disney (1951):** Cut from the film for pacing (designed but never animated)
- **Tim Burton (2010):** Appears only as memorial drawing (killed by Jabberwock)
- **Classic mythology:** Brown/gold feathers, tawny lion fur, guardian of treasures
- **Variations:** Some ancient sources describe black feathers, red breast, blue neck, white wings

### Key Visual Elements

| Element | Description |
|---------|-------------|
| **Head** | Eagle head with curved beak, crest of feathers |
| **Ears** | Large, almost donkey-like ears (Tenniel specific) |
| **Wings** | Large feathered eagle wings, folded at rest |
| **Front limbs** | Eagle talons with scales |
| **Back limbs** | Lion paws with claws |
| **Body** | Lion body covered in tawny fur |
| **Tail** | Lion tail with tuft |
| **Pose** | Upright, proud, commanding |

### Color Palette

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Golden Brown | `#996515` | Primary feather color, head |
| Tawny Tan | `#CD853F` | Lion fur, body |
| Cream White | `#FFFDD0` | Chest feathers, underbelly |
| Amber | `#FFBF00` | Beak, talons, accents |
| Dark Brown | `#3D2314` | Wing tips, mane details |
| Golden Yellow | `#FFD700` | Eye color, highlights |

### Body Proportions (for 3D modeling)

- **Overall scale:** Large creature, 1.5x Alice's height when sitting upright
- **Head-to-body ratio:** 1:4 (large eagle head)
- **Wing span:** 2x body length when extended
- **Build:** Powerful, muscular lion body with lean eagle front
- **Key exaggerations:** Proud chest, large expressive ears, regal bearing

### Rigging Requirements

- **Type:** Hybrid quadruped/biped
- **Bone count estimate:** 60-70 bones
- **Key articulation points:**
  - Wing rig with feather bones for folding/spreading
  - Eagle talons with individual toe control
  - Lion back legs with proper digitigrade setup
  - Beak for talking animations
  - Ear expressiveness
- **Special considerations:**
  - Needs "biped-quadruped switch" - can sit upright or walk on all fours
  - Wing fold/unfold animation system
  - Tail expressiveness for mood

### AI Prompt Suggestions (ComfyUI)

**Primary Prompt:**
```
cel-shaded 3D character, Gryphon Griffin from Alice in Wonderland,
majestic mythical creature, eagle head with curved beak and feather crest,
large donkey-like ears, golden brown feathers, tawny lion body,
eagle talons on front legs, lion paws on back legs, large folded wings,
lion tail with tuft, proud regal posture sitting upright,
Victorian illustration style, bold outlines, flat color shading,
fantasy creature, front three-quarter view, neutral gray background
```

**Negative Prompt:**
```
realistic, photorealistic, scary, aggressive, dragon-like,
complex background, detailed textures, gradient shading, cartoony
```

---

## 5. The Mock Turtle

### Source Material

**Original Book/Tenniel:**
- A brilliant visual pun on "mock turtle soup" (made from calf parts)
- Carroll's design: turtle body + calf head, hind hooves, and tail
- Tenniel shows sea turtle body with flippers (front) and calf hooves (back)
- Big-eared calf head, long tufted cow tail
- Perpetually sad and melancholic
- Sings about "Beautiful Soup" and does the "Lobster Quadrille"

**Modern Interpretations:**
- **Disney (1951):** Cut from film, appeared in Jell-O commercials
- **American McGee's Alice:** Black bull head with turtle body and humanoid hands/feet. More menacing.
- **Alice: Madness Returns:** Admiral role, helps guide Alice
- **Sunsoft mobile game (2006):** Head chef for the Queen

### Key Visual Elements

| Element | Description |
|---------|-------------|
| **Head** | Calf/cow head with large eyes, floppy ears |
| **Expression** | Perpetually sad, tearful, melancholic |
| **Shell** | Sea turtle shell, dome-shaped |
| **Front limbs** | Sea turtle flippers with scales |
| **Back limbs** | Calf hooves (the joke - mock turtle soup ingredients) |
| **Tail** | Long cow tail with tuft |
| **Pose** | Hunched, weeping, sitting on rocks |

### Color Palette

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Sea Green | `#2E8B57` | Shell, flippers |
| Calf Brown | `#8B4513` | Head, hooves, tail |
| Cream Tan | `#D2B48C` | Underbelly, face markings |
| Shell Olive | `#556B2F` | Shell patterns, darker areas |
| Tear Blue | `#ADD8E6` | Tears, sad highlights |
| Pink Nose | `#FFB6C1` | Calf nose, inner ears |

### Body Proportions (for 3D modeling)

- **Overall scale:** Medium creature, roughly Alice's height when sitting
- **Head-to-body ratio:** 1:3 (large expressive calf head)
- **Shell width:** 1.5x body width for rounded silhouette
- **Build:** Rounded turtle body, awkward hybrid limbs
- **Key exaggerations:** Very sad eyes, droopy ears, prominent tears

### Rigging Requirements

- **Type:** Hybrid quadruped (unique)
- **Bone count estimate:** 45-55 bones
- **Key articulation points:**
  - Large expressive ears (drooping animation)
  - Tear duct for crying effects
  - Flipper rotation for swimming/gesturing
  - Hoof articulation for dancing (Lobster Quadrille)
  - Mouth for singing
- **Special considerations:**
  - Shell should be rigid (single bone or static)
  - Tail needs bone chain for cow-like swishing
  - Unique locomotion blend between swimming and walking

### AI Prompt Suggestions (ComfyUI)

**Primary Prompt:**
```
cel-shaded 3D character, Mock Turtle from Alice in Wonderland,
sad melancholic creature, hybrid animal, calf head with big sad eyes
and floppy cow ears, sea turtle shell body, turtle flippers for front legs,
calf hooves for back legs, long cow tail with tuft, tears streaming down face,
sitting on beach rocks, green shell brown head, Victorian illustration style,
bold outlines, flat color shading, whimsical sad creature,
front three-quarter view, neutral gray background
```

**Negative Prompt:**
```
realistic, photorealistic, happy, aggressive, normal turtle, normal cow,
complex background, detailed textures, gradient shading, scary
```

---

## Pipeline Notes

### ComfyUI Best Practices

1. **Seed consistency:** Fix seed values when iterating on a design
2. **CLIPSetLastLayer:** Set to -2 for finer control
3. **Multi-view generation:** Generate front, side, and back views for Tripo
4. **Negative prompts:** Always include anti-realism terms for cel-shaded style
5. **Resolution:** 1024x1024 minimum for detail preservation

### Tripo AI Requirements

1. **Clean silhouettes:** AI models work best with clear, uncluttered designs
2. **Neutral poses:** T-pose or A-pose for proper auto-rigging
3. **No background geometry:** Character should be isolated
4. **Separate accessories:** Consider generating complex accessories separately
5. **Export format:** FBX for animation pipeline, GLB for Three.js

### Animation Priorities

For the Queen's Garden level, prioritize these animations:

| Character | Essential Animations |
|-----------|---------------------|
| Queen of Hearts | Pointing, shouting, walking regally |
| King of Hearts | Fidgeting, nervous nodding, hiding behind Queen |
| Knave of Hearts | Pleading, defensive gestures, bowing |
| Gryphon | Sitting idle, wing rustle, commanding gesture |
| Mock Turtle | Crying, singing, flipper gestures, sad sighing |

---

## Sources

### Queen of Hearts
- [Queen of Hearts - Wikipedia](https://en.wikipedia.org/wiki/Queen_of_Hearts_(Alice's_Adventures_in_Wonderland))
- [Queen of Hearts Pictures - Alice-in-Wonderland.net](https://www.alice-in-wonderland.net/resources/pictures/queen-of-hearts/)
- [John Tenniel's illustrations - Pan Macmillan](https://www.panmacmillan.com/blogs/books-for-children/john-tenniel-alice-in-wonderland-illustrations)
- [Queen of Hearts - Disney Wiki](https://disney.fandom.com/wiki/Queen_of_Hearts)
- [Queen of Hearts Color Palette - Color-Hex](https://www.color-hex.com/color-palette/4281)
- [American McGee's Alice - Queen of Hearts](https://villains.fandom.com/wiki/Queen_of_Hearts_(American_McGee's_Alice))
- [Tim Burton's Red Queen - Fxguide](https://www.fxguide.com/fxfeatured/alice_in_wonderland/)

### King of Hearts
- [King of Hearts - Wikipedia](https://en.wikipedia.org/wiki/King_of_Hearts_(Alice's_Adventures_in_Wonderland))
- [King of Hearts - Disney Wiki](https://disney.fandom.com/wiki/King_of_Hearts)
- [King of Hearts Character Analysis - SparkNotes](https://www.sparknotes.com/lit/alice/character/the-king-of-hearts/)

### Knave of Hearts
- [Knave of Hearts - Wikipedia](https://en.wikipedia.org/wiki/Knave_of_Hearts_(Alice's_Adventures_in_Wonderland))
- [Knave of Hearts - Disney Wiki](https://disney.fandom.com/wiki/Knave_of_Hearts)
- [Ilosovic Stayne - Wonderland Wiki](https://wonderland.fandom.com/wiki/Ilosovic_Stayne)

### Gryphon
- [Gryphon - Wikipedia](https://en.wikipedia.org/wiki/Gryphon_(Alice's_Adventures_in_Wonderland))
- [Gryphon and Mock Turtle - Disney Wiki](https://disney.fandom.com/wiki/The_Gryphon_and_the_Mock_Turtle)
- [Griffin Mythology - Mythology.net](https://mythology.net/mythical-creatures/griffin/)
- [The Gryphon - Apollo Magazine](https://apollo-magazine.com/alice-in-wonderland-tenniel-gryphon-dacre-beasts/)

### Mock Turtle
- [Mock Turtle - Wikipedia](https://en.wikipedia.org/wiki/Mock_Turtle)
- [Mock Turtle - Alice in Wonderland Wiki](https://aliceinwonderland.fandom.com/wiki/The_Mock_Turtle)
- [Mock Turtle Design Analysis - ShukerNature](https://karlshuker.blogspot.com/2017/01/making-mockery-of-mock-turtle-no-longer.html)

### General Design Resources
- [Cel Shading Guide - RebusFarm](https://rebusfarm.net/blog/how-to-do-cel-shading-techniques-tools)
- [Cel Shading Comprehensive Guide - GarageFarm](https://garagefarm.net/blog/cel-shading-a-comprehensive-guide)
- [ComfyUI Character Workflow Guide](https://comfyui.org/en/character-image-creation-workflow-guide)
- [Tripo AI 3D Model Generation](https://www.tripo3d.ai/)
- [Medieval Color Palette - Color-Hex](https://www.color-hex.com/color-palette/73778)
- [Sea Turtle Color Scheme - SchemeColor](https://www.schemecolor.com/sea-turtle.php)
