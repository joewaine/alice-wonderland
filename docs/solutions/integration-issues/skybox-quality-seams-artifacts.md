---
title: "Skybox images not seamless and lacking quality/detail"
category: integration-issues
tags:
  - comfyui
  - skybox
  - image-generation
  - seamless-textures
  - three-js
  - equirectangular
  - texture-filtering
severity: medium
date_solved: 2026-02-25
related_files:
  - src/engine/SceneManager.ts
  - scripts/generate-skyboxes.ts
  - public/assets/skyboxes/
---

# Skybox Quality, Seams, and Artifacts

## Problem

Skybox images generated via ComfyUI Cloud were:
- Not seamless (visible seam when rotating 360 degrees)
- Lacking detail and quality
- Containing unwanted objects and figures in sky images

## Root Cause

Multiple compounding issues:

1. **Missing Texture Filtering** - Three.js texture loaded without anisotropic filtering, mipmaps, or proper wrap modes, causing blurry textures at oblique angles and visible seams.

2. **Redundant Geometry Inversion** - Code used BOTH `geometry.scale(-1, 1, 1)` AND `THREE.BackSide` material, creating potential texture orientation issues.

3. **Inadequate Generation Prompts** - Original prompts lacked panorama-specific keywords and allowed ground/objects/figures to appear in generated images.

4. **SD 1.5 Model Limitations** - The dreamshaper_8 model (512x512 native) extrapolates significantly when generating at 2048x1024.

## Solution

### Fix 1: Texture Filtering (SceneManager.ts)

```typescript
// Configure texture filtering for maximum quality
texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
texture.minFilter = THREE.LinearMipmapLinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.generateMipmaps = true;
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.ClampToEdgeWrapping;
texture.colorSpace = THREE.SRGBColorSpace;
texture.needsUpdate = true;
```

Required passing `renderer` to SceneManager constructor.

### Fix 2: Geometry Rendering (SceneManager.ts)

```typescript
// Use inverted geometry with FrontSide (not both)
const geometry = new THREE.SphereGeometry(500, 64, 32);
geometry.scale(-1, 1, 1);

const material = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.FrontSide,   // Changed from BackSide
  depthWrite: false        // Optimization
});

this.skyboxMesh.renderOrder = -1;  // Render first
```

### Fix 3: Enhanced Prompts (generate-skyboxes.ts)

```typescript
const SKYBOX_STYLE = `equirectangular sky panorama, 360 degree seamless sky environment, ONLY clouds and sky, pure atmospheric sky gradient, fantasy sky illustration, painterly volumetric clouds, masterpiece quality, highly detailed`;

const NEGATIVE_PROMPT = `ground, horizon, landscape, terrain, mountains, trees, buildings, structures, objects, spheres, people, figures, faces, bodies, characters, silhouettes, text, watermark, split image, seam, distorted, low quality, blurry, jpeg artifacts`;
```

Chapter prompts updated to describe pure sky scenes with explicit "no ground no objects" suffixes.

### Fix 4: Sampler Settings

```typescript
"steps": 40,              // Increased from 35
"cfg": 7,                 // Lowered from 8
"sampler_name": "dpmpp_2m_sde",  // Changed from dpmpp_2m
```

## What Didn't Work

**SDXL Model Upgrade** - Attempted to use `juggernautXL_v9Rundiffusion.safetensors` for better native resolution (1024x1024 vs 512x512), but ComfyUI Cloud doesn't have SDXL models available. Documented in `todos/001-pending-p1-skybox-resolution-upgrade.md`.

## Prevention Strategies

### Always Configure Texture Filtering
```typescript
texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
texture.minFilter = THREE.LinearMipmapLinearFilter;
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.ClampToEdgeWrapping;
```

### Use Explicit Exclusions in AI Prompts
Always include: `"no objects, no figures, no ground, abstract atmospheric only"`

### Pick One Geometry Inversion Method
Use EITHER inverted geometry with FrontSide OR normal geometry with BackSide, never both.

### Test Skybox Wrapping
- Rotate camera 360 degrees slowly
- Check horizon at multiple pitch angles
- Verify no unwanted objects appear

## Skybox Implementation Checklist

- [ ] Texture anisotropy set to max
- [ ] Mipmaps enabled
- [ ] Wrap modes configured (RepeatWrapping horizontal, ClampToEdge vertical)
- [ ] Geometry inversion matches material side setting
- [ ] Prompts include panorama keywords and exclusions
- [ ] Negative prompt excludes objects/figures/ground
- [ ] Test 360-degree rotation for seams

## Related Documentation

- `docs/solutions/performance-issues/mesh-caching-memory-race-conditions.md` - Three.js performance patterns
- `todos/001-pending-p1-skybox-resolution-upgrade.md` - Pending SDXL upgrade
- `todos/004-pending-p2-panorama-lora-for-seamless-edges.md` - Panorama LoRA for true seamlessness
