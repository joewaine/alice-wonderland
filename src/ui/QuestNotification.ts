/**
 * QuestNotification - Toast-style notifications for quest events
 *
 * Shows animated notifications when quests start or complete.
 * Notifications slide in from the right and fade out after 3 seconds.
 */

import { injectTheme } from './theme';

export type QuestNotificationType = 'started' | 'completed' | 'unlocked';

interface NotificationConfig {
  type: QuestNotificationType;
  title: string;
  message?: string;
}

export class QuestNotification {
  private container: HTMLDivElement;
  private activeNotifications: HTMLDivElement[] = [];

  constructor() {
    injectTheme();

    // Create container for notifications
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      z-index: 200;
    `;
    document.body.appendChild(this.container);
  }

  /**
   * Show a quest notification
   */
  show(config: NotificationConfig): void {
    const notification = this.createNotification(config);
    this.container.appendChild(notification);
    this.activeNotifications.push(notification);

    // Trigger animation
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    });

    // Remove after 3 seconds
    setTimeout(() => {
      this.hide(notification);
    }, 3000);
  }

  /**
   * Show quest started notification
   */
  showQuestStarted(questName: string): void {
    this.show({
      type: 'started',
      title: 'Quest Started',
      message: questName,
    });
  }

  /**
   * Show quest completed notification
   */
  showQuestCompleted(questName: string): void {
    this.show({
      type: 'completed',
      title: 'Quest Complete!',
      message: questName,
    });
  }

  /**
   * Show area unlocked notification
   */
  showAreaUnlocked(areaName: string): void {
    this.show({
      type: 'unlocked',
      title: 'Area Unlocked',
      message: areaName,
    });
  }

  /**
   * Create notification element
   */
  private createNotification(config: NotificationConfig): HTMLDivElement {
    const notification = document.createElement('div');

    // Accent color per event type, on the shared glass panel
    const accents = {
      started: { color: 'var(--aw-lilac)', icon: '\u2726' },
      completed: { color: 'var(--aw-gold-bright)', icon: '\u2767' },
      unlocked: { color: 'var(--aw-emerald)', icon: '\uD83D\uDDDD' },
    };

    const accent = accents[config.type];

    notification.className = 'aw-panel';
    notification.style.cssText += `
      border-left: 3px solid ${accent.color};
      padding: 12px 20px;
      min-width: 210px;
      max-width: 320px;
      transform: translateX(120%);
      opacity: 0;
      transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s;
    `;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:12px;';
    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = `font-size: 22px; color: ${accent.color};`;
    iconSpan.textContent = accent.icon;
    row.appendChild(iconSpan);
    const textCol = document.createElement('div');
    const titleDiv = document.createElement('div');
    titleDiv.className = 'aw-display';
    titleDiv.style.cssText = `color: ${accent.color}; font-size: 14px; text-transform: uppercase; letter-spacing: 0.18em; opacity: 0.9;`;
    titleDiv.textContent = config.title;
    textCol.appendChild(titleDiv);
    if (config.message) {
      const msgDiv = document.createElement('div');
      msgDiv.style.cssText = 'color: var(--aw-parchment); font-family: var(--aw-font-text); font-style: italic; font-size: 17px; margin-top: 3px;';
      msgDiv.textContent = config.message;
      textCol.appendChild(msgDiv);
    }
    row.appendChild(textCol);
    notification.appendChild(row);

    return notification;
  }

  /**
   * Hide a notification with animation
   */
  private hide(notification: HTMLDivElement): void {
    notification.style.transform = 'translateX(120%)';
    notification.style.opacity = '0';

    setTimeout(() => {
      notification.remove();
      const index = this.activeNotifications.indexOf(notification);
      if (index > -1) {
        this.activeNotifications.splice(index, 1);
      }
    }, 400);
  }

  /**
   * Clear all notifications
   */
  clear(): void {
    for (const notification of this.activeNotifications) {
      notification.remove();
    }
    this.activeNotifications = [];
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.clear();
    this.container.remove();
  }
}
