// File: src/managers/QuestManager.js

import { StateManager } from './StateManager.js';
import { ErrorManager } from './ErrorManager.js';
import { loadGameEntitiesConfig } from '../utils/GameEntityLoader.js';

/**
 * QuestManager class
 * 
 * Responsible for managing quest activation, state updates, and UI restoration.
 * Quest definitions are loaded dynamically from a unified JSON configuration.
 */
export class QuestManager {
  /**
   * @param {EventManager} eventManager - The event manager handling diary entries.
   * @param {App} appInstance - The main application instance.
   */
  constructor(eventManager, appInstance) {
    this.eventManager = eventManager;
    this.app = appInstance;
    this.quests = [];

    // Load the unified configuration and instantiate quests dynamically.
    loadGameEntitiesConfig()
      .then(async config => {
        for (const questCfg of config.quests) {
          // Build dependency mapping.
          const dependencyMapping = {
            "eventManager": this.eventManager,
            "app": this.app
          };
          const params = questCfg.dependencies.map(dep => dependencyMapping[dep]);
          // Append quest-specific configuration if exists.
          if (questCfg.config) {
            params.push(questCfg.config);
          }
          // Dynamically import the quest class from ../quests/<ClassName>.js
          const modulePath = `../quests/${questCfg.className}.js`;
          try {
            const module = await import(modulePath);
            const QuestClass = module[questCfg.className];
            if (!QuestClass) {
              ErrorManager.logError(
                `Quest class "${questCfg.className}" is not exported from ${modulePath}.`,
                "QuestManager"
              );
              continue;
            }
            const instance = new QuestClass(...params);
            // Set the key as specified in the configuration.
            instance.key = questCfg.key;
            this.quests.push(instance);
          } catch (error) {
            ErrorManager.logError(
              `Failed to import quest class "${questCfg.className}" from ${modulePath}: ${error.message}`,
              "QuestManager"
            );
          }
        }
        console.log("Quests loaded from configuration:", this.quests.map(q => q.key));
      })
      .catch(error => {
        ErrorManager.logError("Failed to load quests configuration: " + error.message, "QuestManager");
      });

    // Initialize camera listeners.
    this.initCameraListeners();

    // Restore UI for repeating quest if a saved state exists.
    if (StateManager.get("quest_state_repeating_quest")) {
      console.log("[QuestManager] Detected saved state for repeating quest.");
      this.restoreRepeatingQuestUI();
    }
    // Restore camera button state.
    if (this.app.viewManager && typeof this.app.viewManager.restoreCameraButtonState === 'function') {
      this.app.viewManager.restoreCameraButtonState();
    }
  }

  /**
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
    };
  }

  /**
   * Synchronizes the UI for a given quest based on the universal active quest key.
   * Disables the Post button when the quest is active or the game is finalized.
   * @param {string} questKey - The key of the quest to synchronize.
   */
  async syncQuestStateForQuest(questKey) {
    if (StateManager.get("gameFinalized") === "true") {
      if (this.app.viewManager && typeof this.app.viewManager.setPostButtonEnabled === 'function') {
        this.app.viewManager.setPostButtonEnabled(false);
      }
      console.log(`[QuestManager] Game finalized; Post button disabled for quest "${questKey}".`);
      return;
    }
    const activeQuestKey = StateManager.get("activeQuestKey");
    if (activeQuestKey && activeQuestKey === questKey) {
      if (this.app.viewManager && typeof this.app.viewManager.setPostButtonEnabled === 'function') {
        this.app.viewManager.setPostButtonEnabled(false);
      }
      console.log(`[QuestManager] Active quest "${questKey}" is in progress; Post button disabled.`);
    } else {
      if (this.app.viewManager && typeof this.app.viewManager.setPostButtonEnabled === 'function') {
        this.app.viewManager.setPostButtonEnabled(true);
      }
      console.log(`[QuestManager] No active quest "${questKey}"; Post button enabled.`);
    }
  }

  /**
   * Synchronizes the quest state for predefined quests.
   */
  async syncQuestState() {
    await this.syncQuestStateForQuest("mirror_quest");
    await this.syncQuestStateForQuest("repeating_quest");
  }

  /**
   * Finds a quest by its key and activates it.
   * After activation, updates the universal active quest key.
   * @param {string} key - The quest key.
   */
  async activateQuest(key) {
    const quest = this.quests.find(q => q.key === key);
    if (!quest) {
      console.warn(`[QuestManager] Quest with key "${key}" not found.`);
      return;
    }
    console.log(`[QuestManager] Activating quest: ${key}`);
    await quest.activate();
    // Update the universal active quest key.
    this.app.ghostManager.activeQuestKey = key;
    StateManager.set("activeQuestKey", key);
    await this.syncQuestState();
  }

  /**
   * Finalizes a quest by calling its finish() method and updating the UI.
   * @param {string} key - The quest key.
   */
  async checkQuest(key) {
    const quest = this.quests.find(q => q.key === key);
    if (!quest) {
      console.warn(`[QuestManager] Cannot check quest "${key}": not found.`);
      return;
    }
    console.log(`[QuestManager] Finishing quest: ${key}`);
    await quest.finish();
    await this.syncQuestState();
  }

  /**
   * Saves the quest progress to the database.
   * @param {string} questKey - The quest key.
   * @param {number} currentStage - The current stage.
   * @param {number} totalStages - The total number of stages.
   * @param {string} status - The quest status.
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
   * Restores the UI for the repeating quest.
   */
  restoreRepeatingQuestUI() {
    const repeatingQuest = this.quests.find(q => q.key === "repeating_quest");
    if (repeatingQuest && typeof repeatingQuest.restoreUI === "function") {
      console.log("[QuestManager] Restoring repeating quest UI...");
      repeatingQuest.restoreUI();
    }
  }

  /**
   * Re-initializes the UI for all active quests.
   * For each quest with an active or partially completed record, calls its restoreUI method.
   */
  restoreAllActiveQuests() {
    console.log("[QuestManager] Attempting to restore UI for all active quests...");
    this.quests.forEach(quest => {
      const record = this.app.databaseManager.getQuestRecord(quest.key);
      if (
        record &&
        (record.status === "active" ||
          (record.status === "finished" && quest.currentStage <= quest.totalStages)) &&
        !quest.finished
      ) {
        console.log(`[QuestManager] Found active quest "${quest.key}". Restoring UI...`);
        if (typeof quest.restoreUI === "function") {
          quest.restoreUI();
        } else {
          console.log(`[QuestManager] Quest "${quest.key}" does not implement restoreUI().`);
        }
      }
    });
  }
}