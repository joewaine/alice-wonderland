/**
 * QuestNotification - Toast-style notifications for quest events
 *
 * Shows animated notifications when quests start or complete.
 * Notifications slide in from the right and fade out after 3 seconds.
 */

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

    // Style based on type
    const colors = {
      started: { bg: '#3B82F6', border: '#60A5FA', icon: '\u2605' },   // Blue star
      completed: { bg: '#10B981', border: '#34D399', icon: '\u2713' }, // Green check
      unlocked: { bg: '#8B5CF6', border: '#A78BFA', icon: '\u26BF' },  // Purple key
    };

    const color = colors[config.type];

    notification.style.cssText = `
      background: linear-gradient(135deg, ${color.bg}ee, ${color.bg}cc);
      border: 2px solid ${color.border};
      border-radius: 12px;
      padding: 12px 20px;
      min-width: 200px;
      max-width: 300px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transform: translateX(120%);
      opacity: 0;
      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s;
    `;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;';
    const iconSpan = document.createElement('span');
    iconSpan.style.fontSize = '24px';
    iconSpan.textContent = color.icon;
    row.appendChild(iconSpan);
    const textCol = document.createElement('div');
    const titleDiv = document.createElement('div');
    titleDiv.style.cssText = 'color:white;font-family:monospace;font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:0.8;';
    titleDiv.textContent = config.title;
    textCol.appendChild(titleDiv);
    if (config.message) {
      const msgDiv = document.createElement('div');
      msgDiv.style.cssText = 'color:white;font-family:sans-serif;font-size:14px;font-weight:bold;margin-top:2px;';
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
