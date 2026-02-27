---
status: pending
priority: p2
issue_id: "045"
tags: [security, validation, scripts]
dependencies: ["043"]
---

# Security: no URL validation or size limit on Tripo API downloads

## Problem Statement

The generation scripts download GLB files from URLs returned by the Tripo3D API with no validation. If the API were compromised or returned unexpected data, the scripts could: (1) make requests to arbitrary internal hosts (SSRF), (2) download arbitrarily large files exhausting memory/disk.

## Findings

- `scripts/generate-garden-models.ts:224-236` — Downloads from `glbUrl` without checking domain
- `scripts/generate-npc-models.ts:200-214` — Same pattern
- `await glbRes.arrayBuffer()` loads entire response into memory with no size cap
- `taskId` from API response interpolated into URL without format validation

## Proposed Solutions

### Option 1: Add URL validation and size limits

**Approach:**
1. Validate download URL starts with `https://` and contains expected Tripo domain
2. Check `Content-Length` header before downloading (reject if > 100MB)
3. Validate `taskId` matches `^[a-zA-Z0-9_-]+$`
4. Optionally validate GLB magic bytes (`0x46546C67`) after download

**Effort:** 30 minutes

**Risk:** Low — these are build-time scripts, not runtime code

## Acceptance Criteria

- [ ] Download URL validated against expected Tripo domain
- [ ] Download size capped at reasonable limit (e.g., 100MB)
- [ ] taskId format validated before URL interpolation
