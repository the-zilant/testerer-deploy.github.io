import { BaseEvent } from '../events/baseEvent.js';
import { ImageUtils } from '../utils/imageUtils.js';
import { StateManager } from '../stateManager.js';

/**
 * BaseMirrorQuest – Base class for the mirror quest.
 * Encapsulates the logic for comparing the current frame (canvas → grayscale → compare),
 * managing the check loop, and delegating UI updates to the ViewManager.
 */
export class BaseMirrorQuest extends BaseEvent {
  constructor(eventManager, appInstance, config = {}) {
    super(eventManager);
    this.app = appInstance;
    this.key = config.key || "mirror_quest"; // Allows overriding the key.
    this.doneKey = config.doneKey || "mirror_done";

    // Configuration for UI elements (identifiers used by ViewManager)
    this.statusElementId = config.statusElementId || "mirror-quest-status";
    this.shootButtonId = config.shootButtonId || "btn_shoot";

    // Auxiliary flags/variables
    this.checkInterval = null; // For startCheckLoop
    this.finished = false;

    // Canvas for frame comparison
    this.tempCanvas = document.createElement("canvas");
    this.tempCtx = this.tempCanvas.getContext("2d");

    this.registerEvents();
  }

  /**
   * registerEvents
   * Registers a listener for the "cameraReady" event.
   * If the "mirrorQuestActive" flag is set in the StateManager, starts the check loop.
   */
  registerEvents() {
    document.addEventListener('cameraReady', () => {
      if (StateManager.get("mirrorQuestActive") === "true") {
        this.startCheckLoop();
      }
    });
  }

  /**
   * activate
   * Activates the mirror quest. If the event has not been logged,
   * logs it in the diary and sets the "mirrorQuestActive" flag via StateManager.
   */
  async activate() {
    if (!this.eventManager.isEventLogged(this.key)) {
      console.log(`Activating event: ${this.key}`);
      await this.eventManager.addDiaryEntry(this.key);
    }
    console.log("[BaseMirrorQuest] Mirror quest activated.");
    StateManager.set("mirrorQuestActive", "true");
  }

  /**
   * startCheckLoop
   * Initializes the UI for the mirror quest via ViewManager and starts a periodic loop
   * to check the quest status every 2 seconds.
   */
  startCheckLoop() {
    if (this.checkInterval) return; // Already running.
    if (this.app.viewManager && typeof this.app.viewManager.startMirrorQuestUI === 'function') {
      this.app.viewManager.startMirrorQuestUI({
        statusElementId: this.statusElementId,
        shootButtonId: this.shootButtonId,
        onShoot: () => this.finish()
      });
    }
    this.checkInterval = setInterval(async () => {
      if (!this.app.isCameraOpen) {
        console.warn("[BaseMirrorQuest] Camera is not active - stopping check loop.");
        this.stopCheckLoop();
        return;
      }
      const success = await this.checkStatus();
      if (this.app.viewManager && typeof this.app.viewManager.updateMirrorQuestStatus === 'function') {
        this.app.viewManager.updateMirrorQuestStatus(success, this.statusElementId, this.shootButtonId);
      }
    }, 2000);
  }

  /**
   * stopCheckLoop
   * Stops the periodic quest status check loop and delegates UI cleanup to the ViewManager.
   */
  stopCheckLoop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.app.viewManager && typeof this.app.viewManager.stopMirrorQuestUI === 'function') {
      this.app.viewManager.stopMirrorQuestUI(this.statusElementId);
    }
  }

  /**
   * checkStatus
   * Checks the current quest status by performing a frame comparison.
   */
  async checkStatus() {
    console.log("[BaseMirrorQuest] checkStatus() -> compareFrameInternally()");
    return await this.compareFrameInternally();
  }

  /**
   * compareFrameInternally
   * Captures the current video frame, converts it to grayscale,
   * compares it with the saved selfie, and returns whether the match is sufficient.
   */
  async compareFrameInternally() {
    if (!this.app.isCameraOpen) {
      console.warn("[BaseMirrorQuest] Camera is not active (app.isCameraOpen false)");
      return false;
    }
    if (!this.app.selfieData) {
      console.warn("[BaseMirrorQuest] No saved selfie (app.selfieData)");
      return false;
    }
    const videoEl = this.app.cameraSectionManager?.videoElement;
    if (!videoEl || !videoEl.srcObject) {
      console.warn("[BaseMirrorQuest] Camera is not active!");
      return false;
    }

    this.tempCanvas.width = videoEl.videoWidth || 640;
    this.tempCanvas.height = videoEl.videoHeight || 480;
    this.tempCtx.drawImage(videoEl, 0, 0, this.tempCanvas.width, this.tempCanvas.height);
    const currentFrameData = ImageUtils.convertToGrayscale(this.tempCanvas);
    const matchPixel = ImageUtils.pixelWiseComparison(this.app.selfieData, currentFrameData);
    const matchHist = ImageUtils.histogramComparison(this.app.selfieData, currentFrameData);
    console.log(`[BaseMirrorQuest] pixel=${matchPixel.toFixed(2)}, hist=${matchHist.toFixed(2)}`);
    const success = (matchPixel > 0.6 && matchHist > 0.7);
    if (success) {
      this.app.lastMirrorPhoto = currentFrameData;
    }
    return success;
  }

  /**
   * updateUIAfterFinish
   * Delegates UI updates after the mirror quest finishes to the ViewManager.
   *
   * @param {boolean} success - Indicates whether the mirror quest was successful.
   */
  updateUIAfterFinish(success) {
    if (this.app.viewManager && typeof this.app.viewManager.updateMirrorQuestUIAfterFinish === 'function') {
      this.app.viewManager.updateMirrorQuestUIAfterFinish(success, {
        statusElementId: this.statusElementId,
        shootButtonId: this.shootButtonId,
        cameraButtonId: "toggle-camera" // Assuming this ID is constant.
      });
    }
  }

  /**
   * finish
   * Finalizes the mirror quest:
   * - Stops the check loop.
   * - Checks the final status and logs a corresponding diary entry.
   * - Updates the UI and resets the active flag using StateManager.
   * - If successful, triggers the post-mirror event.
   */
  async finish() {
    if (this.finished) return;
    this.finished = true;
    this.stopCheckLoop();
    const success = await this.checkStatus();
    const ghost = this.app.ghostManager.getCurrentGhost();
    const randomLetter = ghost ? this.getRandomLetter(ghost.name) : "";
    if (success) {
      const photoData = this.app.lastMirrorPhoto
        ? ` [photo attached]\n${this.app.lastMirrorPhoto}`
        : "";
      await this.eventManager.addDiaryEntry(`user_post_success: ${randomLetter}${photoData}`, false);
    } else {
      await this.eventManager.addDiaryEntry(`user_post_failed: ${randomLetter}`, false);
    }
    this.updateUIAfterFinish(success);
    // Remove active state from the Open Camera button via ViewManager.
    if (this.app.viewManager && typeof this.app.viewManager.setCameraButtonActive === 'function') {
      this.app.viewManager.setCameraButtonActive(false);
    }
    // Remove the "mirrorQuestActive" flag using StateManager.
    StateManager.remove("mirrorQuestActive");
    // If the quest was successful, trigger the post-mirror event.
    if (success) {
      this.app.gameEventManager.activateEvent("post_mirror_event");
    }
  }

  /**
   * getRandomLetter
   * Returns a random letter from the ghost's name (only alphabetic characters).
   *
   * @param {string} name - The ghost's name.
   * @returns {string} A random letter.
   */
  getRandomLetter(name) {
    if (!name) return "";
    const letters = name.replace(/[^A-Za-zА-Яа-яЁё]/g, '').split('');
    if (!letters.length) return '';
    return letters[Math.floor(Math.random() * letters.length)];
  }
}