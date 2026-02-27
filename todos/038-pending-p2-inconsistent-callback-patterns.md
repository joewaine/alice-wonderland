---
status: pending
priority: p2
issue_id: "038"
tags: [architecture, consistency, patterns]
dependencies: ["018"]
---

# Inconsistent Event/Callback Patterns Across Modules

## Problem Statement

The codebase uses three different callback patterns with no consistency, making it unpredictable how to register for events from any given module.

## Findings

- **Public nullable properties:** `SceneManager.onPlayerSpawn`, `NPCController.onDialogueStart` (8 instances in SceneManager)
- **Callbacks object:** `QuestManager.callbacks.onQuestStarted` — single object with optional methods
- **setCallbacks method:** `PlayerController.setCallbacks(...)` — interface passed through setter

## Proposed Solutions

### Option 1: Standardize on setCallbacks Pattern

**Approach:** The `setCallbacks(interface)` pattern used by PlayerController is the cleanest — type-safe, groups related callbacks, doesn't expose mutable public properties. Apply it consistently.

**Effort:** 2-3 hours

**Risk:** Low

## Acceptance Criteria

- [ ] All modules use consistent callback pattern
- [ ] No public nullable callback properties
- [ ] Type-safe callback interfaces for each module

## Work Log

### 2026-02-27 - Code Review Discovery

**By:** Claude Code (multi-agent review)
