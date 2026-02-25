# Add Upscaling Pass to Generation Workflow

## Priority: P3 (NICE-TO-HAVE)

## Issue
Even with higher base resolution, an upscaling pass would add detail and sharpness to the final skybox images.

## Location
- `scripts/generate-skyboxes.ts:54-116` - generateSkybox workflow

## Recommended Addition
Add upscale nodes after VAEDecode:

```typescript
const workflow = {
  // ... existing nodes ...

  // Add upscale model loader
  "10": {
    "class_type": "UpscaleModelLoader",
    "inputs": {
      "model_name": "4x-UltraSharp.pth"
    }
  },

  // Add image upscale node
  "11": {
    "class_type": "ImageUpscaleWithModel",
    "inputs": {
      "upscale_model": ["10", 0],
      "image": ["8", 0]  // From VAEDecode
    }
  },

  // Update SaveImage to use upscaled output
  "9": {
    "class_type": "SaveImage",
    "inputs": {
      "filename_prefix": `skybox_chapter_${chapterNum}`,
      "images": ["11", 0]  // From upscaler instead of VAEDecode
    }
  }
};
```

## Alternative Models
- `4x-UltraSharp.pth` - Sharp details
- `RealESRGAN_x4plus.pth` - Good general purpose
- `4x-AnimeSharp.pth` - If using anime/illustration style

## Impact
- Sharper details in final images
- Cleaner edges and gradients
- Higher effective resolution

## Effort: Small

## Notes
- Will increase generation time by ~20-30%
- Will increase file size significantly (4x resolution = ~16x file size before compression)
- Consider generating at 2048x1024 and upscaling to 4096x2048 as a compromise
