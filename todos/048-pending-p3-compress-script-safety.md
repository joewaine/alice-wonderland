---
status: pending
priority: p3
issue_id: "048"
tags: [reliability, scripts]
dependencies: []
---

# compress-models.ts: overwrites files in-place and reads files twice

## Problem Statement

The compression script writes compressed output back to the same file path. If the process crashes mid-write, the original file is lost. Additionally, `isDracoCompressed()` reads and fully parses each GLB, then `compressFile()` reads and parses it again — doubling I/O for each model.

## Findings

- `scripts/compress-models.ts:78` — `await io.write(filePath, doc)` overwrites in-place
- `scripts/compress-models.ts:37-53` + `55-85` — each file parsed twice (once for Draco check, once for compression)

## Proposed Solutions

### Option 1: Atomic write + single parse

**Approach:** Write to `filePath.tmp` then `fs.renameSync(tmpPath, filePath)`. Combine the Draco check and compression into a single read: parse once, check for Draco extension, compress if needed.

**Effort:** 20 minutes

**Risk:** Low

## Acceptance Criteria

- [ ] Compressed files written atomically via temp file + rename
- [ ] Each file read/parsed only once
- [ ] Interrupted compression does not corrupt original files
