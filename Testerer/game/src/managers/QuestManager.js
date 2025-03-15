// --- Quest Classes ---
import { BaseMirrorQuest } from '../quests/BaseMirrorQuest.js';
import { BaseRepeatingQuest } from '../quests/BaseRepeatingQuest.js';
import { FinalQuest } from '../quests/FinalQuest.js';

// --- State and Error Management ---
import { StateManager } from './StateManager.js';
import { ErrorManager } from './ErrorManager.js';

/**
 * QuestManager class
 * 
 * Responsible for managing quest activation, state updates, and UI restoration.
 * All UI updates (e.g., enabling/disabling buttons) are delegated to ViewManager,
 * and all state access uses StateManager.
 *
 * NOTE: Sequential linking of events and quests is now handled exclusively by GhostManager.
 *       QuestManager is solely responsible for directly activating quests and updating the UI.
 */
export class QuestManager {
  /**
   * @param {EventManager} eventManager - The event manager handling diary entries.
   * @param {App} appInstance - The main application instance.
   */
  constructor(eventManager, appInstance) {
    this.eventManager = eventManager;
    this.app = appInstance;

    // Initialize quests with respective configurations.
    this.quests = [
      new BaseMirrorQuest(this.eventManager, this.app, { key: "mirror_quest" }),
      new BaseRepeatingQuest(this.eventManager, this.app, {
        key: "repeating_quest",
        totalStages: 5,
        statusElementId: "repeating-quest-status",
        shootButtonId: "btn_shoot"
      }),
      new FinalQuest(this.eventManager, this.app, { key: "final_quest" })
    ];

    // Set up camera-related event listeners.
    this.initCameraListeners();

    // Restore UI state for the repeating quest if previously saved.
    if (StateManager.get("quest_state_repeating_quest")) {
      console.log("[QuestManager] Detected saved state for repeating quest.");
      this.restoreRepeatingQuestUI();
    }

    // Optionally, restore additional UI states (e.g., camera button state).
    if (this.app.viewManager && typeof this.app.viewManager.restoreCameraButtonState === 'function') {
      this.app.viewManager.restoreCameraButtonState();
    }
  }

  /**
   * initCameraListeners
   * Registers listeners for camera readiness and closure events.
   */
  initCameraListeners() {
    const cameraManager = this.app.cameraSectionManager;
    if (!cameraManager) return;
    cameraManager.onVideoReady = () => {
      console.log("[QuestManager] onVideoReady signal received.");
    };
    cameraManager.onCameraClosed = () => {
      console.log("[QuestManager] onCameraClosed signal received.");
      // Optionally, deactivate the camera button when the camera is closed.
      // this.app.viewManager.setCameraButtonActive(false);
    };
  }

  /**
   * syncQuestState
   * Synchronizes the current quest state from the database.
   * - If the game is finalized, disable the Post button.
   * - If an active quest is detected (mirror or repeating) and not finished, disable the Post button.
   * - Otherwise, enable the Post button.
   */
async syncQuestState() {
  const mirrorQuestRecord = this.app.databaseManager.getQuestRecord("mirror_quest");
  const repeatingQuestRecord = this.app.databaseManager.getQuestRecord("repeating_quest");

  const activeQuestRecord = [mirrorQuestRecord, repeatingQuestRecord]
    .find(record => record && record.status === "active");

  if (activeQuestRecord) {
    this.app.viewManager.setPostButtonEnabled(false);
  } else {
    this.app.viewManager.setPostButtonEnabled(true);
  }
}

  /**
   * activateQuest
   * Finds a quest by its key and activates it.
   * This method simply activates the quest without performing any sequence checks.
   * It then calls syncQuestState() to update the UI.
   *
   * @param {string} key - The quest key.
   */
  async activateQuest(key) {
    const quest = this.quests.find(q => q.key === key);
    if (!quest) {
      console.warn([QuestManager] Quest with key "${key}" not found.);
      return;
    }
    console.log([QuestManager] Activating quest: ${key});
    await quest.activate();
    // Update the UI state after quest activation.
    await this.syncQuestState();
  }

  /**
   * checkQuest
   * Finalizes the quest by calling its finish() method.
   * Then, updates the UI state.
   *
   * @param {string} key - The quest key.
   */
  async checkQuest(key) {
    const quest = this.quests.find(q => q.key === key);
    if (!quest) {
      console.warn([QuestManager] Cannot check quest "${key}": not found.);
      return;
    }
    console.log([QuestManager] Finishing quest: ${key});
    await quest.finish();
    // Update the UI state after quest completion.
    await this.syncQuestState();
  }

  /**
   * updateQuestProgress
   * Saves the quest progress to the database.
   *
   * @param {string} questKey - The key of the quest.
   * @param {number} currentStage - The current stage of the quest.
   * @param {number} totalStages - The total number of stages.
   * @param {string} status - The status of the quest.
   */
  async updateQuestProgress(questKey, currentStage, totalStages, status) {
    const questData = {
      quest_key: questKey,
      current_stage: currentStage,
      total_stages: totalStages,
      status
    };
    await this.app.databaseManager.saveQuestRecord(questData);
    console.log("[QuestManager] Quest progress updated:", questData);
  }

  /**
   * restoreRepeatingQuestUI
   * Restores the UI for the repeating quest by delegating the restoration to the quest instance.
   */
  restoreRepeatingQuestUI() {
    const repeatingQuest = this.quests.find(q => q.key === "repeating_quest");
    if (repeatingQuest && typeof repeatingQuest.restoreUI === "function") {
      console.log("[QuestManager] Restoring repeating quest UI...");
      repeatingQuest.restoreUI();
    }
  }
<<<<<<< HEAD
<<<<<<< HEAD

<<<<<<< HEAD
/**
 * restoreAllActiveQuests
 * Scans through all quests, retrieves their database records, and if a quest is considered active—
 * i.e. either its DB status is "active" OR its status is "finished" but the current stage is not beyond totalStages,
 * and the quest is not marked as finished locally—calls its restoreUI() method.
 * This provides a universal approach to re-initialize any ongoing quest's UI without specialized checks.
 */
=======
  /**
   * restoreAllActiveQuests
   * Scans through all quests, retrieves their database records, and if a quest is marked
   * "active" and is not finished locally, calls its restoreUI() method. This provides a
   * universal approach to re-initialize any ongoing quest's UI without specialized checks.
   */
>>>>>>> parent of 272483a (Update QuestManager.js)
  restoreAllActiveQuests() {
    console.log("[QuestManager] Attempting to restore UI for all active quests...");
    this.quests.forEach(quest => {
      const record = this.app.databaseManager.getQuestRecord(quest.key);
<<<<<<< HEAD
      // Consider the quest active if DB status is "active" OR if status is "finished" but there are still stages left
      if (
        record &&
        (record.status === "active" || (record.status === "finished" && quest.currentStage <= quest.totalStages)) &&
        !quest.finished
      ) {
        console.log([QuestManager] Found active quest "${quest.key}". Restoring UI...);
        if (typeof quest.restoreUI === "function") {
          quest.restoreUI();
        } else {
          console.log([QuestManager] Quest "${quest.key}" does not implement restoreUI().);
        }
=======
      if (record && record.status === "active" && !quest.finished) {
        console.log(`[QuestManager] Found active quest "${quest.key}". Restoring UI...`);
        quest.restoreUI();
>>>>>>> parent of 272483a (Update QuestManager.js)
      }
    });
  }
=======
>>>>>>> parent of 785a026 (laslsa)
=======
>>>>>>> parent of 785a026 (laslsa)
}