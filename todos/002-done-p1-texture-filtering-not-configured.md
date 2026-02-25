# Texture Filtering Not Configured

## Priority: P1 (CRITICAL)

## Issue
The skybox texture loading code doesn't configure anisotropic filtering, mipmaps, or proper wrap modes. This causes:
- Blurry textures at oblique angles (especially near horizon)
- Potential shimmering/aliasing when texture is minified
- Possible seam visibility at panorama edges

## Location
- `src/engine/SceneManager.ts:127-150` - loadSkybox method

## Current Code
```typescript
texture.colorSpace = THREE.SRGBColorSpace;
this.currentSkyboxTexture = texture;

const material = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.BackSide
});
```

## Recommended Fix
```typescript
// Configure texture filtering for quality
texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
texture.minFilter = THREE.LinearMipmapLinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.generateMipmaps = true;
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.ClampToEdgeWrapping;
texture.colorSpace = THREE.SRGBColorSpace;
texture.needsUpdate = true;
```

Note: This requires passing the renderer to SceneManager or accessing it another way.

## Impact
- Dramatically sharper skybox at horizon angles
- Eliminates shimmering artifacts
- Better overall visual quality

## Effort: Small
