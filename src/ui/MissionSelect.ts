/**
 * MissionSelect - Mission selection screen shown after "Begin Journey"
 *
 * Displays available quests as cards. Locked quests are greyed out.
 * Player picks a mission to start the game with that quest active.
 */

import type { Quest } from '../data/LevelData';
import type { QuestStatus } from '../quests/QuestManager';
import { audioManager } from '../audio/AudioManager';

export interface MissionInfo {
  quest: Quest;
  status: QuestStatus;
}

export class MissionSelect {
  private container: HTMLDivElement;

  // Callback when player picks a mission
  public onMissionSelected: ((questId: string) => void) | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 50%, #4a2c6e 100%);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: 'Georgia', serif;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.4s ease;
    `;
    document.body.appendChild(this.container);
  }

  show(missions: MissionInfo[]): void {
    // Clear previous content
    this.container.innerHTML = '';

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Choose Your Mission';
    title.style.cssText = `
      font-size: 48px;
      color: #ffd700;
      text-shadow: 0 0 20px #ffd700, 0 4px 8px rgba(0,0,0,0.5);
      margin: 0 0 40px 0;
      letter-spacing: 3px;
    `;
    this.container.appendChild(title);

    // Cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 600px;
      width: 90%;
    `;
    this.container.appendChild(cardsContainer);

    // Create a card for each mission
    for (const mission of missions) {
      const card = this.createMissionCard(mission, missions);
      cardsContainer.appendChild(card);
    }

    // Show
    this.container.style.display = 'flex';
    requestAnimationFrame(() => {
      this.container.style.opacity = '1';
    });
  }

  hide(): void {
    this.container.style.opacity = '0';
    setTimeout(() => {
      this.container.style.display = 'none';
    }, 400);
  }

  private createMissionCard(mission: MissionInfo, allMissions: MissionInfo[]): HTMLDivElement {
    const { quest, status } = mission;
    const isAvailable = status === 'available';
    const isLocked = status === 'locked';
    const isComplete = status === 'complete';

    const card = document.createElement('div');
    card.style.cssText = `
      background: ${isLocked ? 'rgba(30, 20, 50, 0.7)' : 'rgba(60, 40, 90, 0.8)'};
      border: 2px solid ${isLocked ? '#555' : isComplete ? '#4a9' : '#ffd700'};
      border-radius: 12px;
      padding: 20px 24px;
      cursor: ${isAvailable ? 'pointer' : 'default'};
      transition: all 0.25s ease;
      opacity: ${isLocked ? '0.5' : '1'};
      position: relative;
    `;

    // Hover effects for available missions
    if (isAvailable) {
      card.onmouseenter = () => {
        audioManager.playUIHover();
        card.style.transform = 'scale(1.03)';
        card.style.borderColor = '#ffec80';
        card.style.boxShadow = '0 4px 20px rgba(255, 215, 0, 0.3)';
      };
      card.onmouseleave = () => {
        card.style.transform = 'scale(1)';
        card.style.borderColor = '#ffd700';
        card.style.boxShadow = 'none';
      };
      card.onclick = () => {
        if (this.onMissionSelected) {
          this.onMissionSelected(quest.id);
        }
      };
    }

    // Mission name row
    const nameRow = document.createElement('div');
    nameRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    `;

    // Lock/status icon
    const icon = document.createElement('span');
    icon.style.cssText = 'font-size: 20px;';
    if (isLocked) {
      icon.textContent = '\u{1F512}'; // lock emoji
    } else if (isComplete) {
      icon.textContent = '\u2714'; // checkmark
      icon.style.color = '#4a9';
    } else {
      icon.textContent = '\u2726'; // sparkle
      icon.style.color = '#ffd700';
    }
    nameRow.appendChild(icon);

    const name = document.createElement('span');
    name.textContent = quest.name;
    name.style.cssText = `
      font-size: 22px;
      font-weight: bold;
      color: ${isLocked ? '#777' : '#fff'};
    `;
    nameRow.appendChild(name);

    card.appendChild(nameRow);

    // Quest giver
    const giver = document.createElement('div');
    giver.textContent = `Given by: ${quest.giver_npc}`;
    giver.style.cssText = `
      font-size: 14px;
      color: ${isLocked ? '#666' : '#c9a0dc'};
      margin-bottom: 8px;
      font-style: italic;
    `;
    card.appendChild(giver);

    // Objective description
    const objective = document.createElement('div');
    objective.textContent = this.getObjectiveText(quest, allMissions);
    objective.style.cssText = `
      font-size: 15px;
      color: ${isLocked ? '#555' : '#ddd'};
      margin-bottom: 8px;
    `;
    card.appendChild(objective);

    // Reward hint
    const rewardText = this.getRewardText(quest);
    if (rewardText) {
      const reward = document.createElement('div');
      reward.textContent = rewardText;
      reward.style.cssText = `
        font-size: 13px;
        color: ${isLocked ? '#555' : '#a89060'};
      `;
      card.appendChild(reward);
    }

    // Lock reason for locked missions
    if (isLocked && quest.requirements.complete_quest) {
      const prereq = allMissions.find(m => m.quest.id === quest.requirements.complete_quest);
      const prereqName = prereq ? prereq.quest.name : quest.requirements.complete_quest;
      const lockReason = document.createElement('div');
      lockReason.textContent = `Requires: ${prereqName}`;
      lockReason.style.cssText = `
        font-size: 13px;
        color: #885555;
        margin-top: 4px;
        font-style: italic;
      `;
      card.appendChild(lockReason);
    }

    return card;
  }

  private getObjectiveText(quest: Quest, _allMissions: MissionInfo[]): string {
    const req = quest.requirements;

    if (req.talk_to_npc) {
      return `Find and talk to ${req.talk_to_npc}`;
    }
    if (req.reach_position) {
      return 'Reach the gazebo on the hill';
    }
    if (req.complete_quest) {
      return `Complete a prerequisite quest first`;
    }
    return quest.dialogue_before[0] || 'Complete the mission objectives';
  }

  private getRewardText(quest: Quest): string | null {
    const rewards = quest.rewards;
    const parts: string[] = [];

    if (rewards.unlock_area) {
      // Human-readable area names
      const areaNames: Record<string, string> = {
        'tea_party_terrace': 'Tea Party Terrace',
        'gazebo_hill': 'Gazebo Hill',
        'croquet_lawn': 'Croquet Lawn',
      };
      parts.push(areaNames[rewards.unlock_area] || rewards.unlock_area);
    }
    if (rewards.spawn_npc) {
      parts.push(`Meet ${rewards.spawn_npc}`);
    }

    if (parts.length === 0) return null;
    return `Unlocks: ${parts.join(', ')}`;
  }

  dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
