# Enhanced Prompt Engineering

## Priority: P2 (IMPORTANT)

## Issue
Current prompts are relatively simple and missing key technical keywords for equirectangular panorama generation. Quality boosters and specific artistic style keywords would improve output.

## Location
- `scripts/generate-skyboxes.ts:25-52` - SKYBOX_STYLE and CHAPTER_SKYBOXES

## Current Code
```typescript
const SKYBOX_STYLE = `abstract sky gradient, smooth color transitions, dreamy clouds, fantasy atmosphere, soft ethereal glow, magical ambient lighting, no ground, no horizon line, no objects, pure sky and clouds only, painterly style, watercolor clouds`;

const NEGATIVE_PROMPT = `ground, trees, buildings, objects, horizon, landscape, people, text, sharp edges, high contrast, realistic, photograph`;
```

## Recommended Fix
```typescript
const SKYBOX_STYLE = `
  equirectangular projection, 360 degree hdri panorama, seamless spherical environment,
  fantasy illustration, Studio Ghibli inspired, painterly clouds,
  volumetric atmosphere, soft ethereal glow, magical ambient lighting,
  no ground visible, endless sky, masterpiece quality, highly detailed,
  8k uhd, best quality
`;

const NEGATIVE_PROMPT = `
  ground, horizon line, buildings, people, text, watermark,
  split image, seam visible, distorted, low quality, blurry,
  jpeg artifacts, oversaturated, realistic photograph
`;

const CHAPTER_SKYBOXES = [
  {
    chapter: 1,
    name: 'Down the Rabbit-Hole',
    prompt: `deep cosmic void above fading to mystical purple twilight,
      swirling violet and indigo nebula clouds, scattered diamond stars,
      magical aurora wisps, dreamlike fantasy atmosphere,
      otherworldly celestial scene, infinite depth`
  },
  // ... enhanced prompts for other chapters
];
```

## Key Additions
- "equirectangular projection, 360 degree" - Technical guidance
- "masterpiece quality, highly detailed, 8k uhd" - Quality boosters
- "seamless spherical environment" - Hints at edge continuity
- "Studio Ghibli inspired" - Consistent artistic style
- More evocative, detailed chapter descriptions

## Impact
- Higher quality, more coherent image generation
- Better composition and artistic consistency
- More visually interesting results

## Effort: Small
