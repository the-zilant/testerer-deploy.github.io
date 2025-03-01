import { BaseEvent } from '../events/baseEvent.js';

export class BaseRepeatingQuest extends BaseEvent {
  constructor(eventManager, appInstance, config = {}) {
    super(eventManager);
    this.app = appInstance;
    this.key = config.key || "repeating_quest";
    this.doneKey = config.doneKey || (this.key + "_done");

    // UI configuration (delegated to ViewManager)
    this.statusElementId = config.statusElementId || "repeating-quest-status";
    this.shootButtonId = config.shootButtonId || "btn_shoot";

    // Quest state
    this.totalStages = config.totalStages || 3;
    this.currentStage = 1;
    this.finished = false;
  }

  /**
   * activate – Activates the repeating quest.
   * If the quest is finished, resets its state.
   * Waits for the camera to be open if necessary, then starts the UI check loop.
   */
  async activate() {
    if (this.finished) {
      this.resetCycle();
    }
    console.log(`Activating repeating quest: ${this.key}`);
    await this.eventManager.addDiaryEntry(this.key, true);
    console.log(`[BaseRepeatingQuest] Repeating quest started with ${this.totalStages} stages`);

    if (!this.app.isCameraOpen) {
      console.log("[BaseRepeatingQuest] Camera is not open. Waiting for cameraReady event...");
      await new Promise(resolve => {
        const onCameraReady = () => {
          document.removeEventListener("cameraReady", onCameraReady);
          resolve();
        };
        document.addEventListener("cameraReady", onCameraReady);
      });
    }
    this.startCheckLoop();
  }

  /**
   * startCheckLoop – Delegates UI initialization for the repeating quest stage to the ViewManager.
   * Sets up the status display and registers a one-time callback for the "Shoot" button.
   */
  startCheckLoop() {
    if (this.app.viewManager && typeof this.app.viewManager.startRepeatingQuestUI === 'function') {
      this.app.viewManager.startRepeatingQuestUI({
        statusElementId: this.statusElementId,
        shootButtonId: this.shootButtonId,
        stage: this.currentStage,
        totalStages: this.totalStages,
        onShoot: () => this.finishStage()
      });
    } else {
      console.error("[BaseRepeatingQuest] ViewManager.startRepeatingQuestUI is not available.");
    }
    console.log("[BaseRepeatingQuest] Repeating quest UI updated. Awaiting user action to capture snapshot.");
  }

  /**
   * finishStage – Completes one stage of the repeating quest.
   * Captures a snapshot, logs a diary entry, updates the quest state, and refreshes the UI.
   */
  async finishStage() {
    if (this.finished) return;
    
    const shootBtn = document.getElementById(this.shootButtonId);
    if (shootBtn) {
      // Disable the shoot button immediately to prevent multiple clicks
      shootBtn.disabled = true;
      shootBtn.style.pointerEvents = "none";
      console.log("[BaseRepeatingQuest] Shoot button disabled after click.");
    }
    
    const photoData = this.captureSimplePhoto();
    console.log(`[BaseRepeatingQuest] Captured snapshot for stage ${this.currentStage}.`);
    
    await this.eventManager.addDiaryEntry(
      `repeating_stage_${this.currentStage} [photo attached]\n${photoData}`,
      false
    );
    console.log(`[BaseRepeatingQuest] Completed stage: ${this.currentStage}`);
    
    this.currentStage++;
    
    if (this.currentStage <= this.totalStages) {
      // Do not automatically set the readiness flag; keep the post button disabled until explicitly re-enabled
      const postBtn = this.app.postBtn;
      if (postBtn) {
        postBtn.disabled = true;
        console.log("[BaseRepeatingQuest] Post button remains disabled until external trigger.");
      }
    } else {
      // If all stages are completed, finish the repeating quest
      await this.finish();
    }
  }

  /**
   * finish – Completes the repeating quest.
   * Stops the UI check loop, logs the final diary entry, triggers the final repeating event,
   * and updates the UI accordingly.
   */
  async finish() {
    if (this.finished) return;
    
    this.finished = true;
    this.stopCheckLoop();  // Stop the check loop
    
    console.log(`[BaseRepeatingQuest] All ${this.totalStages} stages completed!`);
    
    // Log the final post in the diary
    await this.eventManager.addDiaryEntry(`${this.key}_complete`, true);
    
    // Trigger the final repeating event
    await this.app.gameEventManager.activateEvent("post_repeating_event");
    
    // Remove the readiness flag to avoid new cycle activation
    localStorage.removeItem("mirrorQuestReady");
    
    // Ensure the post button is disabled
    const postBtn = this.app.postBtn;
    if (postBtn) {
      postBtn.disabled = true;
      console.log("[BaseRepeatingQuest] Post button disabled after finishing repeating quest.");
    }
  }

  /**
   * captureSimplePhoto – Captures a snapshot from the active camera and returns a data URL.
   * @returns {string} Data URL of the captured image.
   */
  captureSimplePhoto() {
    const video = this.app.cameraSectionManager?.videoElement;
    if (!video || !video.srcObject) {
      console.warn("[BaseRepeatingQuest] Camera is not active — returning an empty string");
      return "";
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  }

  /**
   * resetCycle – Resets the state of the repeating quest for a new cycle.
   */
  resetCycle() {
    this.finished = false;
    this.currentStage = 1;
    console.log("[BaseRepeatingQuest] Quest state has been reset for a new cycle.");
  }
}