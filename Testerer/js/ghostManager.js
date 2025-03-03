// --- Error and State Management ---
import { ErrorManager } from './errorManager.js';
import { StateManager } from './stateManager.js';

/**
 * GhostManager class
 * Manages the list of ghosts and their state. It is responsible for:
 * - Maintaining the active ghost and tracking the progress of its phenomena (quest steps).
 * - Saving the ghost's state via DatabaseManager.
 * - Triggering events (e.g., final event) via GameEventManager.
 *
 * CURRENT CHANGE: The ghost list is simplified to contain only the default ghost.
 */
export class GhostManager {
  /**
   * @param {EventManager} eventManager - Manager for diary operations.
   * @param {ProfileManager} profileManager - Manager for saving profile/ghost progress.
   * @param {App} app - The main application instance.
   */
  constructor(eventManager, profileManager, app) {
    this.eventManager = eventManager;
    this.profileManager = profileManager;
    this.app = app;

    // Initialize ghost list with only the default ghost.
    this.ghosts = [];
    this.setupGhosts();

    // Set the initial active ghost (ID = 1).
    this.currentGhostId = 1;

    // Index of the current phenomenon (quest step) for the active ghost.
    this.currentPhenomenonIndex = 0;

    // We do not load saved ghost state here to ensure a reset.
    // this.loadState(); // Disabled for default ghost configuration.

    const currentGhost = this.getCurrentGhost();
    console.log(`Current active ghost: ${currentGhost ? currentGhost.name : 'not found'}`);
  }

  /**
   * setupGhosts
   * Generates the list of ghosts.
   * CURRENT CHANGE: Only the default ghost is created.
   */
  setupGhosts() {
    // Create a default ghost with ID 1.
    const defaultGhost = {
      id: 1,
      name: "призрак 1", // Default ghost name.
      phenomenaCount: 3, // Fixed default number of phenomena (quest steps).
      isFinished: false
    };
    this.ghosts = [defaultGhost];
  }

  /**
   * getCurrentGhost
   * Returns the active ghost object based on currentGhostId.
   * @returns {object|undefined} The ghost object, or undefined if not found.
   */
  getCurrentGhost() {
    return this.ghosts.find(g => g.id === this.currentGhostId);
  }

  /**
   * setCurrentGhost
   * Sets the active ghost by the given ID and saves its state via DatabaseManager.
   * @param {number} ghostId - The ID of the ghost to activate.
   */
  async setCurrentGhost(ghostId) {
    this.currentGhostId = ghostId;
    const ghost = this.getCurrentGhost();
    if (ghost) {
      console.log(`Ghost ${ghost.name} activated.`);
      // Save ghost state using the DatabaseManager.
      await this.app.databaseManager.saveGhostState(ghost);
    } else {
      ErrorManager.logError(`Ghost with ID=${ghostId} not found!`, "setCurrentGhost");
    }
  }

  /**
   * finishCurrentGhost
   * Marks the current ghost as finished and saves its state.
   */
  async finishCurrentGhost() {
    const ghost = this.getCurrentGhost();
    if (ghost) {
      ghost.isFinished = true;
      console.log(`Ghost ${ghost.name} finished.`);
      await this.app.databaseManager.saveGhostState(ghost);
    } else {
      ErrorManager.logError("Cannot finish ghost: ghost not found.", "finishCurrentGhost");
    }
  }

  /**
   * isCurrentGhostFinished
   * Checks whether the current active ghost is marked as finished.
   * @returns {boolean} True if finished, otherwise false.
   */
  isCurrentGhostFinished() {
    const ghost = this.getCurrentGhost();
    return ghost ? ghost.isFinished : false;
  }

  /**
   * triggerNextPhenomenon
   * Initiates the next phenomenon (quest step) for the current ghost.
   * - If the phenomenon index is less than the total phenomena for the ghost, a diary entry is added
   *   and the progress is updated via ProfileManager.
   * - If all phenomena are completed, a final diary entry is logged and the final event is triggered.
   */
  async triggerNextPhenomenon() {
    const ghost = this.getCurrentGhost();
    if (!ghost) {
      ErrorManager.logError("No ghost found to trigger phenomenon.", "triggerNextPhenomenon");
      return;
    }

    if (ghost.isFinished) {
      ErrorManager.logError(`Ghost "${ghost.name}" is already finished; phenomena unavailable.`, "triggerNextPhenomenon");
      return;
    }

    if (this.currentPhenomenonIndex < ghost.phenomenaCount) {
      const phenomenonNumber = this.currentPhenomenonIndex + 1;
      const phenomenonEntry = `${ghost.name}: Phenomenon ${phenomenonNumber} - Approach the mirror`;
      await this.eventManager.addDiaryEntry(phenomenonEntry);
      console.log(`Triggered phenomenon for ${ghost.name}: ${phenomenonEntry}`);

      this.currentPhenomenonIndex++;

      // Save ghost progress via ProfileManager.
      await this.profileManager.saveGhostProgress({
        ghostId: this.currentGhostId,
        phenomenonIndex: this.currentPhenomenonIndex
      });

      // If all phenomena are completed, log the final entry and trigger the final event.
      if (this.currentPhenomenonIndex === ghost.phenomenaCount) {
        const finalEntry = `${ghost.name}: Final phenomenon – ghost finished!`;
        await this.eventManager.addDiaryEntry(finalEntry);
        console.log(finalEntry);

        console.log(`Triggering final event for ghost "${ghost.name}"...`);
        // Await the activation of the final event to ensure sequential execution.
        await this.app.gameEventManager.activateEvent("ghost_final_event");
      }
    } else {
      ErrorManager.logError(`All phenomena for ghost ${ghost.name} have been completed (index=${this.currentPhenomenonIndex}).`, "triggerNextPhenomenon");
    }
  }

  /**
   * resetGhostChain
   * Resets the ghost chain:
   * - Sets the active ghost back to the default.
   * - Resets the phenomenon index.
   * - Resets the saved ghost progress via ProfileManager.
   * - Updates the database with the reset state.
   */
  async resetGhostChain() {
    this.currentGhostId = 1;
    this.currentPhenomenonIndex = 0;
    // Reset ghost progress stored in the profile.
    await this.profileManager.resetGhostProgress();
    console.log("Ghost chain has been reset.");
    const ghost = this.getCurrentGhost();
    if (ghost) {
      ghost.isFinished = false;
      await this.app.databaseManager.saveGhostState(ghost);
    } else {
      ErrorManager.logError("Failed to reset ghost chain: default ghost not found.", "resetGhostChain");
    }
  }
  
  // Note: Methods saveState() and loadState() are now obsolete because state persistence is handled via DatabaseManager.
}