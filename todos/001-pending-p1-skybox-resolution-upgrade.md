# Skybox Resolution Upgrade

## Priority: P1 (CRITICAL)

## Issue
Current skybox generation uses 2048x1024 resolution with SD 1.5 model (dreamshaper_8) which produces blurry results when mapped to a 500-unit skybox sphere. The native resolution of SD 1.5 models is 512x512, so generating at 2048x1024 involves significant extrapolation.

## Location
- `scripts/generate-skyboxes.ts:80-84` - EmptyLatentImage dimensions
- `scripts/generate-skyboxes.ts:77-79` - CheckpointLoaderSimple model

## Current Code
```typescript
"5": {
  "class_type": "EmptyLatentImage",
  "inputs": {
    "width": 2048,
    "height": 1024,
    "batch_size": 1
  }
}
```

## Recommended Fix
1. Upgrade to SDXL model (native 1024x1024) for better coherence
2. Increase resolution to 4096x2048 for sharper results
3. Add upscaling pass using 4x-UltraSharp or similar

```typescript
// Use SDXL model
"4": {
  "class_type": "CheckpointLoaderSimple",
  "inputs": {
    "ckpt_name": "juggernautXL_v9Rundiffusion.safetensors"
  }
},
// Higher resolution
"5": {
  "class_type": "EmptyLatentImage",
  "inputs": {
    "width": 4096,
    "height": 2048,
    "batch_size": 1
  }
}
```

## Impact
- Visually sharper and more detailed skyboxes
- Better immersion for the player
- Improved quality at all viewing angles

## Effort: Medium
