import { BaseEvent } from '../events/baseEvent.js';

/**
 * FinalQuest – The final quest signifies the complete end of the scenario
 * (e.g., no more letters/phenomena). It logs the completion, updates the game
 * state via StateManager, triggers the ghost finishing process, and notifies the user
 * via ViewManager.
 */
export class FinalQuest extends BaseEvent {
  /**
   * @param {EventManager} eventManager - The event manager.
   * @param {App} appInstance - The main application instance.
   * @param {Object} [config] - Optional configuration (e.g., { key: "final_quest" }).
   */
  constructor(eventManager, appInstance, config = {}) {
    super(eventManager);
    this.app = appInstance;
    this.key = config.key || "final_quest";
    this.finished = false;
  }

  /**
   * activate – Logs the start of the final quest (if not already logged).
   *
   * @returns {Promise<void>}
   */
  async activate() {
    if (!this.eventManager.isEventLogged(this.key)) {
      console.log(`[FinalQuest] Activating final quest: ${this.key}`);
      await this.eventManager.addDiaryEntry(this.key, true);
    }
    console.log("[FinalQuest] Final quest initiated.");
    // Additional flags for final quest activation can be set here if needed.
  }

  /**
   * checkStatus – Performs any necessary checks (e.g., additional snapshot if needed).
   * Currently always returns true.
   *
   * @returns {Promise<boolean>}
   */
  async checkStatus() {
    return true;
  }

  /**
   * finish – Completes the final quest:
   *  1) Checks the final conditions via checkStatus.
   *  2) Logs the completion in the diary.
   *  3) Sets the "gameFinalized" flag via StateManager.
   *  4) Calls finishCurrentGhost from GhostManager to mark the scenario as finished.
   *  5) Notifies the user via ViewManager.
   *
   * @returns {Promise<void>}
   */
  async finish() {
    if (this.finished) return;
    
    const success = await this.checkStatus();
    if (!success) {
      if (this.app.viewManager && typeof this.app.viewManager.showNotification === "function") {
        this.app.viewManager.showNotification("❌ Final quest conditions not met!");
      } else {
        console.warn("❌ Final quest conditions not met!");
      }
      return;
    }

    this.finished = true;
    console.log(`[FinalQuest] Finishing quest: ${this.key}`);
    
    // Log the final quest completion in the diary.
    await this.eventManager.addDiaryEntry(`${this.key}_completed`, true);

    // Set the game finalized flag using StateManager.
    window.StateManager.set("gameFinalized", "true");
    
    // Mark the current ghost as finished via GhostManager.
    if (this.app.ghostManager) {
      await this.app.ghostManager.finishCurrentGhost();
    }

    // Notify the user that the scenario is finished via ViewManager.
    if (this.app.viewManager && typeof this.app.viewManager.showNotification === "function") {
      this.app.viewManager.showNotification("🎉 Final quest completed! Scenario ended!");
    } else {
      console.log("🎉 Final quest completed! Scenario ended!");
    }
  }
}