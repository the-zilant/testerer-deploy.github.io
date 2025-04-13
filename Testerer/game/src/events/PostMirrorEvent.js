// File: src/events/PostMirrorEvent.js

import { BaseEvent } from './BaseEvent.js';
import { StateManager } from '../managers/StateManager.js';
import { ErrorManager } from '../managers/ErrorManager.js';

/**
 * PostMirrorEvent
 * 
 * This event publishes a ghost post and signals that the mirror quest cycle has ended.
 * It updates the UI via ViewManager without directly setting quest-specific flags.
 *
 * NOTE: This event is part of the sequential chain managed by GhostManager.
 * It only performs its task and then dispatches a "gameEventCompleted" event.
 */
export class PostMirrorEvent extends BaseEvent {
  /**
   * @param {EventManager} eventManager - Manager handling diary operations.
   * @param {App} appInstance - Reference to the main application instance.
   */
  constructor(eventManager, appInstance) {
    super(eventManager);
    this.app = appInstance;
    this.key = "post_mirror_event";
  }

  async activate() {
    if (this.eventManager.isEventLogged(this.key)) {
      console.log(`[PostMirrorEvent] Event '${this.key}' is already logged, skipping activation.`);
      return;
    }

    console.log(`[PostMirrorEvent] Activating event '${this.key}'.`);
    await this.eventManager.addDiaryEntry(this.key, true);

    // Instead of directly setting mirrorQuestReady or isRepeatingCycle,
    // signal that the mirror quest cycle has completed by enabling the Post button 
    // and triggering the mirror effect. The universal active quest state is managed elsewhere.
    if (this.app.viewManager && typeof this.app.viewManager.setPostButtonEnabled === "function") {
      this.app.viewManager.setPostButtonEnabled(true);
    }

    if (this.app.visualEffectsManager && typeof this.app.visualEffectsManager.triggerMirrorEffect === "function") {
      this.app.visualEffectsManager.triggerMirrorEffect();
    }

    console.log("[PostMirrorEvent] Mirror quest cycle ended; waiting for user action to trigger the next quest.");
    
    // Dispatch an event to signal that this event has completed.
    document.dispatchEvent(new CustomEvent("gameEventCompleted", { detail: this.key }));
  }
}