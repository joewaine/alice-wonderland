/**
 * QuestManager - Manages quest state and progression for story-driven levels
 *
 * Handles quest lifecycle: locked → available → active → complete
 * Tracks quest requirements and rewards (area unlocks, NPC spawns)
 * Persists progress to localStorage
 */

import type { Quest, QuestRewards, NPC } from '../data/LevelData';

export type QuestStatus = 'locked' | 'available' | 'active' | 'complete';

export interface QuestState {
  status: QuestStatus;
  progress: Record<string, number>;  // e.g., "items_collected": 2
}

export interface QuestManagerCallbacks {
  onQuestStarted?: (quest: Quest) => void;
  onQuestCompleted?: (quest: Quest) => void;
  onAreaUnlocked?: (areaId: string) => void;
  onNPCSpawned?: (npcId: string) => void;
}

export class QuestManager {
  private quests: Map<string, Quest> = new Map();
  private questStates: Map<string, QuestState> = new Map();
  private unlockedAreas: Set<string> = new Set();
  private spawnedNPCs: Set<string> = new Set();
  private npcQuestMap: Map<string, string[]> = new Map();  // NPC name → quest IDs

  // Callbacks
  public callbacks: QuestManagerCallbacks = {};

  // Persistence
  private storageKey: string = 'wonderland_quest_progress';

  constructor(chapterNumber: number) {
    this.storageKey = `wonderland_quest_progress_ch${chapterNumber}`;
  }

  /**
   * Initialize quests for a level
   */
  initialize(quests: Quest[], npcs: NPC[]): void {
    this.quests.clear();
    this.questStates.clear();
    this.npcQuestMap.clear();

    // Load saved progress
    this.load();

    // Initialize quests
    for (const quest of quests) {
      this.quests.set(quest.id, quest);

      // If not already in saved state, determine initial status
      if (!this.questStates.has(quest.id)) {
        const status = this.canStartQuest(quest) ? 'available' : 'locked';
        this.questStates.set(quest.id, {
          status,
          progress: {}
        });
      }

      // Map NPCs to their quests
      if (!this.npcQuestMap.has(quest.giver_npc)) {
        this.npcQuestMap.set(quest.giver_npc, []);
      }
      this.npcQuestMap.get(quest.giver_npc)!.push(quest.id);
    }

    // Build NPC quest map from NPC data as well
    for (const npc of npcs) {
      if (npc.quest_ids) {
        if (!this.npcQuestMap.has(npc.name)) {
          this.npcQuestMap.set(npc.name, []);
        }
        for (const questId of npc.quest_ids) {
          if (!this.npcQuestMap.get(npc.name)!.includes(questId)) {
            this.npcQuestMap.get(npc.name)!.push(questId);
          }
        }
      }
    }

    console.log(`QuestManager: Initialized ${this.quests.size} quests`);
  }

  /**
   * Check if a quest can be started (prerequisites met)
   */
  private canStartQuest(quest: Quest): boolean {
    if (quest.requirements.complete_quest) {
      const prereqState = this.questStates.get(quest.requirements.complete_quest);
      if (!prereqState || prereqState.status !== 'complete') {
        return false;
      }
    }
    return true;
  }

  /**
   * Start a quest (player accepted it)
   */
  startQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    const state = this.questStates.get(questId);

    if (!quest || !state) {
      console.warn(`QuestManager: Quest ${questId} not found`);
      return false;
    }

    if (state.status !== 'available') {
      console.warn(`QuestManager: Quest ${questId} is not available (status: ${state.status})`);
      return false;
    }

    state.status = 'active';
    this.save();

    console.log(`QuestManager: Started quest "${quest.name}"`);
    this.callbacks.onQuestStarted?.(quest);

    return true;
  }

  /**
   * Update progress on a quest requirement
   */
  updateProgress(questId: string, key: string, value: number): void {
    const state = this.questStates.get(questId);
    if (!state || state.status !== 'active') return;

    state.progress[key] = value;
    this.save();

    // Check if quest is now complete
    this.checkQuestCompletion(questId);
  }

  /**
   * Increment progress on a quest requirement
   */
  incrementProgress(questId: string, key: string, amount: number = 1): void {
    const state = this.questStates.get(questId);
    if (!state || state.status !== 'active') return;

    state.progress[key] = (state.progress[key] || 0) + amount;
    this.save();

    this.checkQuestCompletion(questId);
  }

  /**
   * Notify that player talked to an NPC (for talk_to_npc requirements)
   */
  notifyTalkedToNPC(npcName: string): void {
    // Check all active quests for talk_to_npc requirement
    for (const [questId, state] of this.questStates) {
      if (state.status !== 'active') continue;

      const quest = this.quests.get(questId);
      if (!quest) continue;

      if (quest.requirements.talk_to_npc === npcName) {
        state.progress['talked_to_npc'] = 1;
        this.save();
        this.checkQuestCompletion(questId);
      }
    }
  }

  /**
   * Notify that player reached a position (for reach_position requirements)
   */
  notifyReachedPosition(x: number, y: number, z: number): void {
    for (const [questId, state] of this.questStates) {
      if (state.status !== 'active') continue;

      const quest = this.quests.get(questId);
      if (!quest?.requirements.reach_position) continue;

      const target = quest.requirements.reach_position;
      const radius = quest.requirements.reach_radius || 3;
      const dx = x - target.x;
      const dy = y - target.y;
      const dz = z - target.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance <= radius) {
        state.progress['reached_position'] = 1;
        this.save();
        this.checkQuestCompletion(questId);
      }
    }
  }

  /**
   * Check if a quest's requirements are met and complete it
   */
  private checkQuestCompletion(questId: string): void {
    const quest = this.quests.get(questId);
    const state = this.questStates.get(questId);

    if (!quest || !state || state.status !== 'active') return;

    if (this.areRequirementsMet(quest, state)) {
      this.completeQuest(questId);
    }
  }

  /**
   * Check if all requirements for a quest are met
   */
  private areRequirementsMet(quest: Quest, state: QuestState): boolean {
    const req = quest.requirements;

    // Talk to NPC requirement
    if (req.talk_to_npc && !state.progress['talked_to_npc']) {
      return false;
    }

    // Reach position requirement
    if (req.reach_position && !state.progress['reached_position']) {
      return false;
    }

    // Collect items requirement
    if (req.collect_items) {
      for (const item of req.collect_items) {
        const collected = state.progress[`collected_${item.type}`] || 0;
        if (collected < item.count) {
          return false;
        }
      }
    }

    // Prerequisite quest (should already be checked, but verify)
    if (req.complete_quest) {
      const prereqState = this.questStates.get(req.complete_quest);
      if (!prereqState || prereqState.status !== 'complete') {
        return false;
      }
    }

    return true;
  }

  /**
   * Complete a quest and process rewards
   */
  completeQuest(questId: string): void {
    const quest = this.quests.get(questId);
    const state = this.questStates.get(questId);

    if (!quest || !state) return;
    if (state.status === 'complete') return;  // Already complete

    state.status = 'complete';
    console.log(`QuestManager: Completed quest "${quest.name}"`);

    // Process rewards
    this.processRewards(quest.rewards);

    // Check if any locked quests can now be available
    this.updateQuestAvailability();

    this.save();
    this.callbacks.onQuestCompleted?.(quest);
  }

  /**
   * Process quest rewards
   */
  private processRewards(rewards: QuestRewards): void {
    if (rewards.unlock_area) {
      this.unlockedAreas.add(rewards.unlock_area);
      console.log(`QuestManager: Unlocked area "${rewards.unlock_area}"`);
      this.callbacks.onAreaUnlocked?.(rewards.unlock_area);
    }

    if (rewards.spawn_npc) {
      this.spawnedNPCs.add(rewards.spawn_npc);
      console.log(`QuestManager: Spawned NPC "${rewards.spawn_npc}"`);
      this.callbacks.onNPCSpawned?.(rewards.spawn_npc);
    }

    // give_item would require inventory system - not implemented yet
  }

  /**
   * Update quest availability after a quest is completed
   */
  private updateQuestAvailability(): void {
    for (const [questId, state] of this.questStates) {
      if (state.status !== 'locked') continue;

      const quest = this.quests.get(questId);
      if (quest && this.canStartQuest(quest)) {
        state.status = 'available';
        console.log(`QuestManager: Quest "${quest.name}" is now available`);
      }
    }
  }

  // ===== Query Methods =====

  /**
   * Check if an area is unlocked
   */
  isAreaUnlocked(areaId: string): boolean {
    return this.unlockedAreas.has(areaId);
  }

  /**
   * Check if an NPC should be visible (spawned via quest reward)
   */
  isNPCSpawned(npcName: string): boolean {
    return this.spawnedNPCs.has(npcName);
  }

  /**
   * Check if an NPC should be visible based on appears_after_quest
   */
  shouldNPCAppear(npc: NPC): boolean {
    if (!npc.appears_after_quest) return true;  // No requirement

    const state = this.questStates.get(npc.appears_after_quest);
    return state?.status === 'complete';
  }

  /**
   * Get quest state
   */
  getQuestState(questId: string): QuestState | undefined {
    return this.questStates.get(questId);
  }

  /**
   * Get quest data
   */
  getQuest(questId: string): Quest | undefined {
    return this.quests.get(questId);
  }

  /**
   * Get available quest from an NPC (first available quest they give)
   */
  getAvailableQuestFrom(npcName: string): Quest | null {
    const questIds = this.npcQuestMap.get(npcName);
    if (!questIds) return null;

    for (const questId of questIds) {
      const state = this.questStates.get(questId);
      if (state?.status === 'available') {
        return this.quests.get(questId) || null;
      }
    }
    return null;
  }

  /**
   * Get active quest from an NPC
   */
  getActiveQuestFrom(npcName: string): Quest | null {
    const questIds = this.npcQuestMap.get(npcName);
    if (!questIds) return null;

    for (const questId of questIds) {
      const state = this.questStates.get(questId);
      if (state?.status === 'active') {
        return this.quests.get(questId) || null;
      }
    }
    return null;
  }

  /**
   * Get completed quest from an NPC (most recent)
   */
  getCompletedQuestFrom(npcName: string): Quest | null {
    const questIds = this.npcQuestMap.get(npcName);
    if (!questIds) return null;

    for (const questId of questIds) {
      const state = this.questStates.get(questId);
      if (state?.status === 'complete') {
        return this.quests.get(questId) || null;
      }
    }
    return null;
  }

  /**
   * Get dialogue for an NPC based on quest state
   * Returns appropriate dialogue (before/during/after) based on quest state
   */
  getDialogueForNPC(npcName: string, defaultDialogue: string[]): string[] {
    const questIds = this.npcQuestMap.get(npcName);
    if (!questIds || questIds.length === 0) {
      return defaultDialogue;
    }

    // Check for active quest first
    for (const questId of questIds) {
      const state = this.questStates.get(questId);
      const quest = this.quests.get(questId);
      if (!state || !quest) continue;

      if (state.status === 'active') {
        return quest.dialogue_during;
      }
    }

    // Check for available quest
    for (const questId of questIds) {
      const state = this.questStates.get(questId);
      const quest = this.quests.get(questId);
      if (!state || !quest) continue;

      if (state.status === 'available') {
        return quest.dialogue_before;
      }
    }

    // Check for completed quest
    for (const questId of questIds) {
      const state = this.questStates.get(questId);
      const quest = this.quests.get(questId);
      if (!state || !quest) continue;

      if (state.status === 'complete') {
        return quest.dialogue_after;
      }
    }

    return defaultDialogue;
  }

  // ===== Persistence =====

  /**
   * Save quest progress to localStorage
   */
  save(): void {
    try {
      const data = {
        questStates: Object.fromEntries(this.questStates),
        unlockedAreas: Array.from(this.unlockedAreas),
        spawnedNPCs: Array.from(this.spawnedNPCs)
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('QuestManager: Failed to save progress:', e);
    }
  }

  /**
   * Load quest progress from localStorage
   */
  load(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;

      const data = JSON.parse(stored);

      if (data.questStates) {
        for (const [questId, state] of Object.entries(data.questStates)) {
          this.questStates.set(questId, state as QuestState);
        }
      }

      if (data.unlockedAreas) {
        for (const areaId of data.unlockedAreas) {
          this.unlockedAreas.add(areaId);
        }
      }

      if (data.spawnedNPCs) {
        for (const npcId of data.spawnedNPCs) {
          this.spawnedNPCs.add(npcId);
        }
      }

      console.log(`QuestManager: Loaded saved progress`);
    } catch (e) {
      console.warn('QuestManager: Failed to load progress:', e);
    }
  }

  /**
   * Reset all quest progress (for testing)
   */
  resetAllProgress(): void {
    try {
      localStorage.removeItem(this.storageKey);
      this.questStates.clear();
      this.unlockedAreas.clear();
      this.spawnedNPCs.clear();

      // Re-initialize quest states
      for (const quest of this.quests.values()) {
        const status = this.canStartQuest(quest) ? 'available' : 'locked';
        this.questStates.set(quest.id, {
          status,
          progress: {}
        });
      }

      console.log('QuestManager: Reset all progress');
    } catch {
      // Ignore
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.quests.clear();
    this.questStates.clear();
    this.unlockedAreas.clear();
    this.spawnedNPCs.clear();
    this.npcQuestMap.clear();
    this.callbacks = {};
  }
}
