# Add Panorama LoRA for Seamless Edges

## Priority: P2 (IMPORTANT)

## Issue
Standard diffusion models don't understand equirectangular projection. The left/right edges of panorama images need to match perfectly for seamless wrapping. Current abstract gradient prompts work around this but sacrifice visual interest and detail.

## Location
- `scripts/generate-skyboxes.ts:54-116` - generateSkybox workflow

## Current Approach
Using abstract gradient prompts ("no objects", "smooth color transitions") to avoid seam issues.

## Recommended Fix
Add a panorama-specific LoRA to the workflow:

```typescript
const workflow = {
  // ... existing nodes ...
  "4": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": {
      "ckpt_name": "juggernautXL_v9Rundiffusion.safetensors"
    }
  },
  "10": {
    "class_type": "LoraLoader",
    "inputs": {
      "lora_name": "panorama_xl.safetensors",
      "strength_model": 0.7,
      "strength_clip": 0.7,
      "model": ["4", 0],
      "clip": ["4", 1]
    }
  },
  // Update model references to use LoRA output
  "3": {
    "class_type": "KSampler",
    "inputs": {
      // ...
      "model": ["10", 0],  // From LoRA instead of checkpoint
      // ...
    }
  }
};
```

## Alternative: Tiling Workflow
Use ComfyUI's SeamlessTile node for horizontal edge blending:
```json
{
  "class_type": "SeamlessTile",
  "inputs": {
    "image": ["8", 0],
    "direction": "horizontal"
  }
}
```

## Impact
- Truly seamless skyboxes with no visible seam when rotating 360°
- Allows more detailed, interesting prompts instead of abstract gradients
- Professional quality panoramas

## Effort: Medium
