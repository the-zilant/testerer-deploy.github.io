import { ImageUtils } from './utils/imageUtils.js';
import { VisualEffectsManager } from './utils/visualEffectsManager.js';
import { DatabaseManager } from './databaseManager.js';
import { LanguageManager } from './languageManager.js';
import { cameraSectionManager } from './cameraSectionManager.js';
import { ProfileManager } from './profileManager.js';
import { ApartmentPlanManager } from './apartmentPlanManager.js';
import { GhostManager } from './ghostManager.js';
import { EventManager } from './eventManager.js';
import { GameEventManager } from './gameEventManager.js';
import { QuestManager } from './questManager.js';
import { ShowProfileModal } from './showProfileModal.js';

/**
 * Main application class.
 * Manages screens (registration, selfie, main/blog), initializes managers 
 * (EventManager, QuestManager, etc.) and holds the user's selfie data.
 *
 * Quest activation logic (e.g., "Post" and "Shoot" buttons) is delegated to QuestManager.
 *
 * NOTE: Only the WelcomeEvent is triggered automatically after registration.
 * Subsequent events (mirror quest, repeating quest, final event) must be triggered explicitly
 * from quest finish methods.
 */
export class App {
  constructor() {
    // Bind the switchScreen method to the global window object
    window.switchScreen = this.switchScreen.bind(this);

    // Flag indicating whether the camera mode is active
    this.isCameraOpen = false;

    // === Get main DOM elements ===
    // Application screens
    this.registrationScreen = document.getElementById('registration-screen');
    this.selfieScreen       = document.getElementById('selfie-screen');
    this.mainScreen         = document.getElementById('main-screen');

    // Registration elements
    this.nameInput    = document.getElementById('player-name');
    this.genderSelect = document.getElementById('player-gender');
    this.nextStepBtn  = document.getElementById('next-step-btn');
    this.captureBtn   = document.getElementById('capture-btn');
    this.selfiePreview= document.getElementById('selfie-preview');
    this.completeBtn  = document.getElementById('complete-registration');

    // Profile elements
    this.profileNameElem  = document.getElementById('profile-name');
    this.profilePhotoElem = document.getElementById('profile-photo');

    // Reset/Export/Import buttons
    this.resetBtn        = document.getElementById('reset-data');
    this.exportBtn       = document.getElementById('export-profile-btn');
    this.importFileInput = document.getElementById('import-file');
    this.importBtn       = document.getElementById('import-profile-btn');

    // "Post" button (visible only on main/blog screen)
    this.postBtn = document.getElementById('post-btn');

    // Controls panel and visual effects manager
    this.controlsPanel = document.getElementById("controls-panel");
    this.visualEffectsManager = new VisualEffectsManager(this, this.controlsPanel);

    // Initialize managers: language, camera, profile, database
    this.languageManager      = new LanguageManager('language-selector');
    this.cameraSectionManager = new cameraSectionManager();
    this.profileManager       = new ProfileManager();
    this.databaseManager      = new DatabaseManager();

    // Initialize GhostManager and EventManager (they are interdependent)
    this.ghostManager = new GhostManager(null, this.profileManager, this);
    this.eventManager = new EventManager(
      this.databaseManager,
      this.languageManager,
      this.ghostManager,
      this.visualEffectsManager
    );
    this.ghostManager.eventManager = this.eventManager;

    // Initialize QuestManager and GameEventManager
    this.questManager     = new QuestManager(this.eventManager, this);
    this.gameEventManager = new GameEventManager(this.eventManager, this, this.languageManager);
    this.showProfileModal = new ShowProfileModal(this);

    // Temporary canvas for selfie processing (during registration)
    this.tempCanvas = document.createElement("canvas");
    this.tempCtx    = this.tempCanvas.getContext("2d");

    // Store user's selfie (captured during registration)
    this.selfieData = null;

    this.bindEvents();
    this.init();
  }

  /**
   * loadAppState – Loads the application state (e.g., current ghost) from localStorage.
   */
  loadAppState() {
    const savedGhostId = localStorage.getItem('currentGhostId');
    if (savedGhostId) {
      this.ghostManager.setCurrentGhost(parseInt(savedGhostId));
    } else {
      this.ghostManager.setCurrentGhost(1);
    }
  }

  /**
   * init – Asynchronous initialization of the application:
   *  1) Load application state.
   *  2) Wait for the database to initialize.
   *  3) Update the diary display.
   *  4) Switch screen based on whether a profile exists (main or registration).
   *  5) If the profile is registered, trigger the WelcomeEvent after 5 seconds.
   * 
   * NOTE: Only the WelcomeEvent is triggered automatically. Further events
   * (mirror quest, repeating quest, final event) must be triggered explicitly.
   */
  async init() {
    this.loadAppState();
    await this.databaseManager.initDatabasePromise;

    // Make the "toggle-camera" button visible on the main screen
    const cameraBtn = document.getElementById("toggle-camera");
    cameraBtn.style.display = "inline-block";

    // Update the diary display (list all entries)
    this.eventManager.updateDiaryDisplay();

    if (this.profileManager.isProfileSaved()) {
      const profile = this.profileManager.getProfile();
      console.log("Profile found:", profile);
      this.showMainScreen();

      // If registration is completed, trigger the WelcomeEvent after 5 seconds.
      // This is the only automatic event trigger; subsequent events must be triggered explicitly.
      if (localStorage.getItem("registrationCompleted") === "true") {
        setTimeout(() => {
          console.log("Triggering WelcomeEvent explicitly...");
          this.gameEventManager.activateEvent("welcome");
        }, 5000);
      }

      // Update the camera button state based on mirror quest activity
      this.questManager.updateCameraButtonState();
    } else {
      console.log("Profile not found, showing registration screen.");
      this.showRegistrationScreen();
    }
  }

  /**
   * switchScreen – Universal method to switch screens (<section>)
   * and button groups (div.buttons) within #controls-panel.
   * @param {string} screenId - ID of the screen to display.
   * @param {string} buttonsGroupId - ID of the buttons group in #controls-panel.
   */
  switchScreen(screenId, buttonsGroupId) {
    // Hide all screens
    document.querySelectorAll('section').forEach(section => {
      section.style.display = 'none';
    });

    // Show the target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.style.display = 'block';
    }

    // Hide all button groups and disable clicks
    document.querySelectorAll('#controls-panel > .buttons').forEach(group => {
      group.style.display = 'none';
      group.style.pointerEvents = 'none';
    });

    // Show the target buttons group (if specified)
    if (buttonsGroupId) {
      const targetGroup = document.getElementById(buttonsGroupId);
      if (targetGroup) {
        targetGroup.style.display = 'flex';
        targetGroup.style.pointerEvents = 'auto';
      }
    }
  }

  /**
   * bindEvents – Attaches event listeners to all elements.
   * Button logic for "Post" and "Shoot" is delegated to QuestManager.
   */
  bindEvents() {
    // Registration fields
    this.nameInput.addEventListener('input', () => {
      console.log("Name input changed:", this.nameInput.value);
      this.validateRegistration();
    });
    this.genderSelect.addEventListener('change', () => {
      console.log("Gender select changed:", this.genderSelect.value);
      this.validateRegistration();
    });

    // "Next" button (Registration -> Apartment Plan)
    if (this.nextStepBtn) {
      this.nextStepBtn.addEventListener('click', () => {
        console.log("Next button clicked");
        this.goToApartmentPlanScreen();
      });
    }

    // Buttons for selfie, registration, reset, export, import, and profile modal
    this.captureBtn.addEventListener('click', () => this.captureSelfie());
    this.completeBtn.addEventListener('click', () => this.completeRegistration());
    this.resetBtn.addEventListener('click', () => this.profileManager.resetProfile());
    this.exportBtn.addEventListener('click', () => this.exportProfile());
    this.importBtn.addEventListener('click', () => this.importProfile());
    this.profilePhotoElem.addEventListener("click", () => this.showProfileModal.show());

    // Screen transitions (Apartment Plan -> Selfie, Floor navigation)
    document.getElementById("apartment-plan-next-btn").addEventListener("click", () => this.goToSelfieScreen());
    document.getElementById("prev-floor-btn").addEventListener("click", () => {
      if (this.apartmentPlanManager) {
        this.apartmentPlanManager.prevFloor();
      }
    });
    document.getElementById("next-floor-btn").addEventListener("click", () => {
      if (this.apartmentPlanManager) {
        this.apartmentPlanManager.nextFloor();
      }
    });

    // Buttons to toggle between camera and diary
    document.getElementById("toggle-camera").addEventListener("click", () => this.toggleCameraView());
    document.getElementById("toggle-diary").addEventListener("click", () => this.toggleCameraView());

    // "Post" button – delegate logic to QuestManager
    if (this.postBtn) {
      this.postBtn.addEventListener('click', () => {
        this.questManager.handlePostButtonClick();
      });
    }

    // "Shoot" button – delegate logic to QuestManager (active only on camera screen)
    const shootBtn = document.getElementById("btn_shoot");
    if (shootBtn) {
      shootBtn.addEventListener("click", () => {
        this.questManager.handleShootMirrorQuest();
      });
    }
  }

  /**
   * validateRegistration – Validates that both "Name" and "Gender" fields are filled.
   */
  validateRegistration() {
    const isValid = (
      this.nameInput.value.trim() !== "" &&
      this.genderSelect.value !== ""
    );
    console.log("validateRegistration:", isValid);
    this.nextStepBtn.disabled = !isValid;
  }

  /**
   * goToApartmentPlanScreen – Saves registration data to localStorage,
   * switches the screen to the apartment plan, and displays the "apartment-plan-buttons" group.
   */
  goToApartmentPlanScreen() {
    const regData = {
      name: this.nameInput.value.trim(),
      gender: this.genderSelect.value,
      language: document.getElementById('language-selector').value
    };
    localStorage.setItem('regData', JSON.stringify(regData));

    window.switchScreen('apartment-plan-screen', 'apartment-plan-buttons');
    if (!this.apartmentPlanManager) {
      this.apartmentPlanManager = new ApartmentPlanManager('apartment-plan-container', this.databaseManager);
    }
  }

  /**
   * goToSelfieScreen – Switches to the "selfie-screen",
   * displays the global camera container, and starts the camera.
   */
  goToSelfieScreen() {
    window.switchScreen('selfie-screen', 'selfie-buttons');
    const globalCamera = document.getElementById('global-camera');
    globalCamera.style.display = 'block';

    this.cameraSectionManager.attachTo('global-camera', {
      width: "100%",
      height: "100%",
      filter: "grayscale(100%)"
    });
    this.cameraSectionManager.startCamera();
    // Disable the "Complete" button until a selfie is captured
    this.completeBtn.disabled = true;
  }

  /**
   * captureSelfie – Captures a snapshot from the camera,
   * converts it to grayscale, displays the thumbnail (#selfie-thumbnail),
   * and saves the result in this.selfieData.
   */
  captureSelfie() {
    console.log("📸 Attempting to capture selfie...");
    const video = this.cameraSectionManager.videoElement;
    if (!video || !video.srcObject) {
      console.error("❌ Camera is not active!");
      alert("Error: Camera is not active.");
      return;
    }
    if (video.readyState < 2) {
      console.warn("⏳ Camera is not ready yet...");
      alert("Please wait for the camera to load.");
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Failed to get 2D drawing context.");
      }
      // Draw the current video frame onto the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert the image to grayscale
      const grayscaleData = ImageUtils.convertToGrayscale(canvas);
      const thumbnail = document.getElementById('selfie-thumbnail');
      thumbnail.src = grayscaleData;
      thumbnail.style.display = 'block';

      // Enable the "Complete" button
      this.completeBtn.disabled = false;
      this.selfieData = grayscaleData;
      console.log("✅ Selfie captured successfully!");
    } catch (error) {
      console.error("❌ Error capturing selfie:", error);
      alert("Error capturing selfie! Please try again.");
    }
  }

  /**
   * completeRegistration – Completes the registration process:
   *  1) Retrieves the captured selfie.
   *  2) Saves the profile (name, gender, language, selfie).
   *  3) Stops the camera and hides the global container.
   *  4) Switches to the main screen (showMainScreen).
   *  5) Explicitly triggers the WelcomeEvent after 5 seconds.
   */
  completeRegistration() {
    const selfieSrc = (this.selfiePreview?.src || document.getElementById('selfie-thumbnail').src);
    if (!selfieSrc || selfieSrc === "") {
      alert("Please capture your selfie before completing registration.");
      return;
    }
    const regDataStr = localStorage.getItem('regData');
    if (!regDataStr) {
      alert("Registration data missing.");
      return;
    }
    const regData = JSON.parse(regDataStr);
    const profile = {
      name: regData.name,
      gender: regData.gender,
      language: regData.language,
      selfie: selfieSrc
    };
    this.profileManager.saveProfile(profile);
    localStorage.setItem("registrationCompleted", "true");

    // Stop the camera and hide the global camera container
    this.cameraSectionManager.stopCamera();
    document.getElementById('global-camera').style.display = 'none';

    // Switch to the main screen
    this.showMainScreen();

    // Explicitly trigger the WelcomeEvent after 5 seconds.
    setTimeout(() => {
      console.log("Explicitly triggering WelcomeEvent...");
      this.gameEventManager.activateEvent("welcome");
    }, 5000);
  }

  /**
   * toggleCameraView – Toggles between the camera view and the blog view.
   * When opening the camera:
   *   - Hides the diary, shows the global camera.
   *   - Hides the "Post" button, shows the "Shoot" button (disabled).
   * When closing the camera:
   *   - Returns to the diary, hides the global camera.
   *   - Shows the "Post" button, hides the "Shoot" button.
   *
   * NOTE: Mirror quest specific logic is delegated to the corresponding modules.
   */
  async toggleCameraView() {
    const diary = document.getElementById("diary");
    const globalCamera = document.getElementById("global-camera");
    const toggleCameraBtn = document.getElementById("toggle-camera");
    const toggleDiaryBtn = document.getElementById("toggle-diary");
    const shootBtn = document.getElementById("btn_shoot");
    const postBtn = this.postBtn;
    const buttonsToHide = [
      document.getElementById("reset-data"),
      document.getElementById("export-profile-btn"),
      document.getElementById("import-profile-container")
    ];

    if (!this.isCameraOpen) {
      console.log("📸 Switching to camera view...");
      diary.style.display = "none";
      globalCamera.style.display = "flex";
      if (toggleCameraBtn) toggleCameraBtn.style.display = "none";
      if (toggleDiaryBtn) toggleDiaryBtn.style.display = "inline-block";
      buttonsToHide.forEach(btn => { if (btn) btn.style.display = "none"; });
      if (postBtn) postBtn.style.display = "none";

      // Always disable shoot button by default
      if (shootBtn) {
        shootBtn.style.display = "inline-block";
        shootBtn.disabled = true;
        console.log("Shoot button set to disabled by default.");
      }

      this.cameraSectionManager.attachTo('global-camera', {
        width: "100%",
        height: "100%"
      });
      await this.cameraSectionManager.startCamera();
      await new Promise(resolve => {
        const vid = this.cameraSectionManager.videoElement;
        if (vid.readyState >= 2) {
          resolve();
        } else {
          vid.onloadedmetadata = () => resolve();
        }
      });
      console.log("Video ready:", 
        this.cameraSectionManager.videoElement.videoWidth,
        this.cameraSectionManager.videoElement.videoHeight
      );
      this.isCameraOpen = true;
    } else {
      console.log("📓 Returning to diary view...");
      diary.style.display = "block";
      globalCamera.style.display = "none";
      if (toggleCameraBtn) toggleCameraBtn.style.display = "inline-block";
      if (toggleDiaryBtn) toggleDiaryBtn.style.display = "none";
      buttonsToHide.forEach(btn => { if (btn) btn.style.display = "block"; });
      if (postBtn) postBtn.style.display = "inline-block";
      if (shootBtn) {
        shootBtn.style.display = "none";
        shootBtn.disabled = true;
      }
      this.cameraSectionManager.stopCamera();
      this.isCameraOpen = false;
    }
  }

  /**
   * showMainScreen – Switches to the main (diary) screen and displays the "main-buttons" group.
   * Displays the user profile and ensures that on the diary screen:
   *  - The "Post" button is visible,
   *  - The "Shoot" button is hidden,
   *  - The "toggle-camera" button is displayed.
   */
  showMainScreen() {
    window.switchScreen('main-screen', 'main-buttons');

    const toggleCameraBtn = document.getElementById("toggle-camera");
    const toggleDiaryBtn  = document.getElementById("toggle-diary");
    if (toggleCameraBtn) toggleCameraBtn.style.display = "inline-block";
    if (toggleDiaryBtn)  toggleDiaryBtn.style.display = "none";

    // On the diary screen, only the "Post" button should be visible
    const postBtn = this.postBtn;
    if (postBtn) {
      postBtn.style.display = "inline-block";
    }
    // Ensure that the "Shoot" button is hidden
    const shootBtn = document.getElementById("btn_shoot");
    if (shootBtn) {
      shootBtn.style.display = "none";
    }

    const profile = this.profileManager.getProfile();
    if (profile) {
      this.profileNameElem.textContent = profile.name;
      this.profilePhotoElem.src = profile.selfie;
      this.profilePhotoElem.style.display = 'block';
      // Save the selfie for use in mirror quest
      this.selfieData = profile.selfie;
    }

    // Optionally update the state of the "Post" button via QuestManager
    // this.questManager.updatePostButtonState();
  }

  /**
   * showRegistrationScreen – Switches to the registration screen and displays the "registration-buttons" group.
   */
  showRegistrationScreen() {
    window.switchScreen('registration-screen', 'registration-buttons');
  }

  /**
   * exportProfile – Exports the profile (and diary) to a JSON file.
   */
  exportProfile() {
    this.profileManager.exportProfileData(this.databaseManager, this.apartmentPlanManager);
  }

  /**
   * importProfile – Imports the profile from a JSON file.
   */
  importProfile() {
    if (this.importFileInput.files.length === 0) {
      alert("Please select a profile file to import.");
      return;
    }
    const file = this.importFileInput.files[0];
    this.profileManager.importProfileData(file, this.databaseManager, this.apartmentPlanManager);
  }
}