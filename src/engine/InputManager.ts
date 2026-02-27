/**
 * InputManager - Handles keyboard and mouse input
 *
 * Tracks which keys are currently pressed and provides
 * a clean interface for checking input state.
 */

export class InputManager {
  // Currently pressed keys (lowercase)
  private keys: Set<string> = new Set();

  // Mouse movement since last frame
  public mouseDeltaX: number = 0;
  public mouseDeltaY: number = 0;

  // Pointer lock state
  public isPointerLocked: boolean = false;

  // Stored handler refs for cleanup
  private handleKeyDown = (e: KeyboardEvent) => { this.keys.add(e.key.toLowerCase()); };
  private handleKeyUp = (e: KeyboardEvent) => { this.keys.delete(e.key.toLowerCase()); };
  private handleMouseMove = (e: MouseEvent) => {
    if (this.isPointerLocked) {
      this.mouseDeltaX += e.movementX;
      this.mouseDeltaY += e.movementY;
    }
  };
  private handlePointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement !== null;
  };
  private handleBlur = () => { this.keys.clear(); };

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    window.addEventListener('blur', this.handleBlur);
  }

  /**
   * Check if a key is currently pressed
   */
  isKeyDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  /**
   * Check WASD movement keys
   */
  get forward(): boolean {
    return this.isKeyDown('w');
  }

  get backward(): boolean {
    return this.isKeyDown('s');
  }

  get left(): boolean {
    return this.isKeyDown('a');
  }

  get right(): boolean {
    return this.isKeyDown('d');
  }

  /**
   * Check arrow keys for camera control
   */
  get lookUp(): boolean {
    return this.isKeyDown('arrowup');
  }

  get lookDown(): boolean {
    return this.isKeyDown('arrowdown');
  }

  get lookLeft(): boolean {
    return this.isKeyDown('arrowleft');
  }

  get lookRight(): boolean {
    return this.isKeyDown('arrowright');
  }

  get jump(): boolean {
    return this.isKeyDown(' '); // Spacebar
  }

  get interact(): boolean {
    return this.isKeyDown('e');
  }

  /**
   * Request pointer lock on an element (usually the canvas)
   */
  requestPointerLock(element: HTMLElement): void {
    element.requestPointerLock();
  }

  /**
   * Exit pointer lock
   */
  exitPointerLock(): void {
    document.exitPointerLock();
  }

  /**
   * Reset mouse delta (call at end of each frame)
   */
  resetMouseDelta(): void {
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }

  /**
   * Remove all event listeners
   */
  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    window.removeEventListener('blur', this.handleBlur);
  }
}
