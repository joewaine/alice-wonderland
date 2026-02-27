---
status: pending
priority: p2
issue_id: "031"
tags: [security, api-key]
dependencies: []
---

# ClaudeParser API Key Exposed in Client-Side Code

## Problem Statement

`ClaudeParser` accepts an API key in its constructor and sends it in the `x-api-key` header of fetch requests to `api.anthropic.com`. This is client-side code — the key would be visible in browser devtools and bundled JS.

## Findings

- `src/api/ClaudeParser.ts:78-81,92-98` - API key stored and sent in headers
- The class appears unused in the current game flow (falls back to JSON files)
- `loadFallbackLevel` at line 171-172 constructs fetch paths with `chapterNumber` without validation

## Proposed Solutions

### Option 1: Remove ClaudeParser or Guard It

**Approach:** If unused, remove the class. If needed for future use, add a guard that refuses to run in production, or route through a backend proxy.

**Effort:** 30 minutes

**Risk:** Low

## Acceptance Criteria

- [ ] No API keys in client-side bundle
- [ ] Game still loads levels correctly via fallback JSON

## Work Log

### 2026-02-27 - Code Review Discovery

**By:** Claude Code (multi-agent review)
