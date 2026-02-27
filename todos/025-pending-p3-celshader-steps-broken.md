---
status: pending
priority: p3
issue_id: "025"
tags: [bug, shader, cel-shading]
dependencies: []
---

# Fix CelShader `steps` Parameter Not Working

## Problem Statement

The `steps` option in CelShaderMaterial defaults to 3 but the fragment shader hardcodes the threshold checks instead of using the `uSteps` uniform.

## Findings

**File:** `src/shaders/CelShaderMaterial.ts`

The shader uses hardcoded thresholds:
```glsl
// Lines 83-92
if (lightIntensity < 0.33) { ... }
else if (lightIntensity < 0.66) { ... }
else { ... }
```

But has a `uSteps` uniform that goes unused:
```typescript
uSteps: { value: opts.steps },
```

## Proposed Solutions

### Option 1: Remove steps Parameter

**Approach:** Remove the broken parameter since 3 steps is the only working configuration.

**Pros:**
- Honest API
- No false promises

**Cons:**
- Less flexibility (but it didn't work anyway)

**Effort:** 5 minutes

**Risk:** Low

### Option 2: Fix Shader to Use uSteps

**Approach:** Update the fragment shader to calculate thresholds dynamically.

```glsl
float step = 1.0 / uSteps;
float band = floor(lightIntensity / step) / (uSteps - 1.0);
```

**Pros:**
- Parameter actually works

**Cons:**
- More complex shader
- May affect performance slightly

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

Implement Option 1 for now - remove the broken parameter. Can add proper dynamic steps later if needed.

## Technical Details

**Affected files:**
- `src/shaders/CelShaderMaterial.ts:20` - remove steps option
- `src/shaders/CelShaderMaterial.ts:83-92` - shader is fine as-is

## Acceptance Criteria

- [ ] Remove misleading `steps` parameter
- [ ] Cel-shading still works with 3 bands
- [ ] Build passes

## Work Log

### 2026-02-26 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified broken steps parameter in cel-shader
