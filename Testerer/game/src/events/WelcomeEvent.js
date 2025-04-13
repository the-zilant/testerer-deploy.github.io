// File: src/events/WelcomeEvent.js

import { BaseEvent } from './BaseEvent.js';
import { StateManager } from '../managers/StateManager.js';
import { ErrorManager } from '../managers/ErrorManager.js';

/**
 * WelcomeEvent
 * 
 * This event is triggered immediately after registration. It logs a welcome message
 * (invitation to approach the mirror) in the diary and enables the "Post" button.
 * It uses StateManager to check and update the "welcomeDone" flag so that the event
 * is launched only once per registration cycle.
 *
 * NOTE: This event is part of the sequential chain managed by GhostManager.
 * It only performs its task (publishing a ghost post and setting flags) and then
 * dispatches a "gameEventCompleted" event.
 */
export class WelcomeEvent extends BaseEvent {
  /**
   * @param {EventManager} eventManager - Manager handling diary operations.
   * @param {App} appInstance - Reference to the main application instance.
   * @param {LanguageManager} [languageManager] - Optional localization manager.
   */
  constructor(eventManager, appInstance, languageManager) {
    super(eventManager);
    this.app = appInstance;
    this.languageManager = languageManager;
    this.key = "welcome";
  }

  async activate() {
    // If the welcome event has already been completed, skip activation.
    if (StateManager.get("welcomeDone") === "true") {
      console.log("Welcome event already completed; skipping activation.");
      if (this.app.viewManager && typeof this.app.viewManager.setPostButtonEnabled === "function") {
        this.app.viewManager.setPostButtonEnabled(true);
      }
      return;
    }
    
    // If the event is already logged, check the universal active quest key for enabling the Post button.
    if (this.eventManager.isEventLogged(this.key)) {
      console.log(`Event '${this.key}' is already logged.`);
      if (StateManager.get("activeQuestKey") === "mirror_quest") {
        if (this.app.viewManager && typeof this.app.viewManager.setPostButtonEnabled === "function") {
          this.app.viewManager.setPostButtonEnabled(true);
          console.log("Post button enabled based on activeQuestKey 'mirror_quest'.");
        }
      } else {
        if (this.app.viewManager && typeof this.app.viewManager.setPostButtonEnabled === "function") {
          this.app.viewManager.setPostButtonEnabled(false);
          console.log("Post button remains disabled as activeQuestKey is not set to 'mirror_quest'.");
        }
      }
      return;
    }

    // Log the event as a ghost post.
    console.log(`Activating event '${this.key}': Logging invitation to approach the mirror`);
    await this.eventManager.addDiaryEntry(this.key, true);

    // Instead of setting "mirrorQuestReady", update the universal active quest key.
    this.app.ghostManager.activeQuestKey = "mirror_quest";
    StateManager.set("activeQuestKey", "mirror_quest");
    if (this.app.viewManager && typeof this.app.viewManager.setPostButtonEnabled === "function") {
      this.app.viewManager.setPostButtonEnabled(true);
    }
    
    // Trigger the mirror effect if available.
    if (this.app.visualEffectsManager && typeof this.app.visualEffectsManager.triggerMirrorEffect === "function") {
      this.app.visualEffectsManager.triggerMirrorEffect();
    }

    // Mark the welcome event as completed.
    StateManager.set("welcomeDone", "true");

    // Dispatch an event to signal that the welcome event has completed.
    document.dispatchEvent(new CustomEvent("gameEventCompleted", { detail: this.key }));
  }
}