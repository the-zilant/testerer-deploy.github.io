export class ViewManager {
  constructor() {
    // Reference to the diary container element.
    this.diaryContainer = document.getElementById("diary");
    // Reference to the controls panel, if needed for blocking controls.
    this.controlsPanel = document.getElementById("controls-panel");
  }
  
  /**
   * switchScreen – Switches between different application screens and updates button groups.
   * @param {string} screenId - ID of the target screen to display.
   * @param {string} buttonsGroupId - ID of the buttons group within the controls panel to display.
   */
  switchScreen(screenId, buttonsGroupId) {
    // Hide all <section> elements.
    document.querySelectorAll('section').forEach(section => {
      section.style.display = 'none';
    });
    // Show the target screen.
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.style.display = 'block';
    }
    
    // Hide all button groups within the controls panel.
    document.querySelectorAll('#controls-panel > .buttons').forEach(group => {
      group.style.display = 'none';
      group.style.pointerEvents = 'none';
    });
    
    // Show the target buttons group.
    if (buttonsGroupId) {
      const targetGroup = document.getElementById(buttonsGroupId);
      if (targetGroup) {
        targetGroup.style.display = 'flex';
        targetGroup.style.pointerEvents = 'auto';
      }
    }
  }
  
  /**
   * setPostButtonEnabled – Enables or disables the "Post" button.
   * @param {boolean} isEnabled - True to enable, false to disable.
   */
  setPostButtonEnabled(isEnabled) {
    const postBtn = document.getElementById("post-btn");
    if (postBtn) {
      postBtn.disabled = !isEnabled;
    }
  }
  
  /**
   * setCameraButtonHighlight – Adds or removes a highlight effect on the camera toggle button.
   * @param {boolean} isActive - True to add highlight, false to remove.
   */
  setCameraButtonHighlight(isActive) {
    const cameraBtn = document.getElementById("toggle-camera");
    if (cameraBtn) {
      if (isActive) {
        cameraBtn.classList.add("glowing");
      } else {
        cameraBtn.classList.remove("glowing");
      }
    }
  }
  
  /**
   * setCameraButtonActive – Sets the active state for the "Open Camera" button.
   * In addition to adding/removing the CSS class "active", it saves the state in localStorage.
   * @param {boolean} isActive - True to mark as active, false to remove the active state.
   */
  setCameraButtonActive(isActive) {
    const cameraBtn = document.getElementById("toggle-camera");
    if (cameraBtn) {
      if (isActive) {
        cameraBtn.classList.add("active");
      } else {
        cameraBtn.classList.remove("active");
      }
      // Save the current state in localStorage.
      localStorage.setItem("cameraButtonActive", JSON.stringify(isActive));
    }
  }
  
  /**
   * restoreCameraButtonState – Restores the "Open Camera" button state from localStorage.
   * Should be called during initialization.
   */
  restoreCameraButtonState() {
    const stored = localStorage.getItem("cameraButtonActive");
    const isActive = stored ? JSON.parse(stored) : false;
    this.setCameraButtonActive(isActive);
  }
  
  /**
   * startMirrorQuestUI – Initializes the UI for the mirror quest.
   * @param {Object} options - Contains:
   *   - statusElementId: ID of the status display element.
   *   - shootButtonId: ID of the "Shoot" button.
   *   - onShoot: Callback function executed when the "Shoot" button is clicked.
   */
  startMirrorQuestUI(options) {
    const statusElem = document.getElementById(options.statusElementId);
    if (statusElem) {
      statusElem.style.display = "block";
      statusElem.textContent = "No match...";
    }
    const shootBtn = document.getElementById(options.shootButtonId);
    if (shootBtn) {
      shootBtn.style.display = "inline-block";
      shootBtn.disabled = true;
      shootBtn.onclick = null; // Remove any existing handler.
      shootBtn.onclick = () => {
        shootBtn.disabled = true;
        shootBtn.style.pointerEvents = "none";
        if (typeof options.onShoot === 'function') {
          options.onShoot();
        }
      };
    }
  }
  
  /**
   * updateMirrorQuestStatus – Updates the mirror quest status UI.
   * @param {boolean} success - True if the mirror match was successful.
   * @param {string} statusElementId - ID of the status display element.
   * @param {string} shootButtonId - ID of the "Shoot" button.
   */
  updateMirrorQuestStatus(success, statusElementId, shootButtonId) {
    const statusElem = document.getElementById(statusElementId);
    if (statusElem) {
      statusElem.textContent = success ? "You are in front of the mirror!" : "No match...";
    }
    const shootBtn = document.getElementById(shootButtonId);
    if (shootBtn) {
      shootBtn.disabled = !success;
    }
  }
  
  /**
   * stopMirrorQuestUI – Hides the mirror quest UI elements.
   * @param {string} statusElementId - ID of the status display element.
   */
  stopMirrorQuestUI(statusElementId) {
    const statusElem = document.getElementById(statusElementId);
    if (statusElem) {
      statusElem.style.display = "none";
    }
  }
  
  /**
   * startRepeatingQuestUI – Initializes the UI for a repeating quest stage.
   * @param {Object} options - Contains:
   *   - statusElementId: ID of the status display element.
   *   - shootButtonId: ID of the "Shoot" button.
   *   - stage: Current stage number.
   *   - totalStages: Total number of stages.
   *   - onShoot: Callback function executed when the "Shoot" button is clicked.
   */
  startRepeatingQuestUI(options) {
    const statusElem = document.getElementById(options.statusElementId);
    if (statusElem) {
      statusElem.style.display = "block";
      statusElem.textContent = `Repeating quest – Stage ${options.stage} of ${options.totalStages}`;
    }
    const shootBtn = document.getElementById(options.shootButtonId);
    if (shootBtn) {
      shootBtn.style.display = "inline-block";
      shootBtn.disabled = false;
      shootBtn.style.pointerEvents = "auto";
      shootBtn.onclick = null;
      shootBtn.onclick = () => {
        shootBtn.disabled = true;
        shootBtn.style.pointerEvents = "none";
        if (typeof options.onShoot === 'function') {
          options.onShoot();
        }
      };
    } else {
      console.error("[ViewManager] Shoot button not found in the DOM.");
    }
  }
  
  /**
   * disableShootButton – Disables the "Shoot" button.
   * @param {string} shootButtonId - ID of the "Shoot" button.
   */
  disableShootButton(shootButtonId) {
    const shootBtn = document.getElementById(shootButtonId);
    if (shootBtn) {
      shootBtn.disabled = true;
      shootBtn.style.pointerEvents = "none";
    }
  }
  
  /**
   * stopRepeatingQuestUI – Hides the repeating quest UI.
   * @param {string} statusElementId - ID of the status display element.
   */
  stopRepeatingQuestUI(statusElementId) {
    const statusElem = document.getElementById(statusElementId);
    if (statusElem) {
      statusElem.style.display = "none";
    }
  }
  
  /**
   * applyBackgroundTransition – Applies a background transition effect to the document body.
   * @param {string} color - The target background color.
   * @param {number} duration - Duration of the transition in milliseconds.
   */
  applyBackgroundTransition(color, duration) {
    document.body.style.transition = `background ${duration}ms`;
    document.body.style.background = color;
    setTimeout(() => {
      document.body.style.background = "";
    }, duration);
  }
  
  /**
   * showGhostAppearanceEffect – Displays a ghost appearance effect.
   * @param {string} ghostId - Identifier for the ghost effect image.
   */
  showGhostAppearanceEffect(ghostId) {
    const ghostEffect = document.createElement("div");
    Object.assign(ghostEffect.style, {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "200px",
      height: "200px",
      background: `url('images/${ghostId}.png') no-repeat center center`,
      backgroundSize: "contain",
      opacity: "0.7",
      transition: "opacity 2s"
    });
    document.body.appendChild(ghostEffect);
    setTimeout(() => { ghostEffect.style.opacity = "0"; }, 3000);
    setTimeout(() => { ghostEffect.remove(); }, 5000);
  }
  
  /**
   * showNotification – Displays a notification message to the user.
   * This implementation uses a simple toast notification.
   * @param {string} message - The notification message.
   */
  showNotification(message) {
    const notification = document.createElement("div");
    notification.textContent = message;
    Object.assign(notification.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "rgba(0,0,0,0.8)",
      color: "white",
      padding: "10px 20px",
      borderRadius: "5px",
      zIndex: 10000,
      opacity: "0",
      transition: "opacity 0.5s"
    });
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.opacity = "1";
    }, 100);
    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 3000);
  }
  
  /**
   * setControlsBlocked – Blocks or unblocks user interaction with the controls.
   * @param {boolean} shouldBlock - true to block controls, false to unblock.
   */
  setControlsBlocked(shouldBlock) {
    if (this.controlsPanel) {
      this.controlsPanel.style.pointerEvents = shouldBlock ? "none" : "auto";
    }
  }

  /**
   * clearCache – Sends a message to the Service Worker to clear all caches.
   */
  clearCache() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ action: 'CLEAR_CACHE' });
      console.log("Clear cache message sent to Service Worker.");
    } else {
      console.warn("No active Service Worker controller found.");
    }
  }

  /**
   * renderDiary – Renders the diary entries into the diary container.
   * @param {Array} entries - Array of diary entry objects.
   * @param {string} currentLanguage - The current language code.
   * @param {Object} effectsManager - Reference to the VisualEffectsManager.
   */
  renderDiary(entries, currentLanguage, effectsManager) {
    if (!this.diaryContainer) {
      console.error("Diary container not found!");
      return;
    }
    // Clear the diary container.
    this.diaryContainer.innerHTML = "";
    
    // Retrieve animated entry IDs from localStorage.
    const animatedIds = JSON.parse(localStorage.getItem("animatedDiaryIds") || "[]");
    const seen = new Set();
    
    entries.forEach(entryObj => {
      if (seen.has(entryObj.id)) return;
      seen.add(entryObj.id);
      
      const articleElem = document.createElement("article");
      articleElem.classList.add(entryObj.postClass);
      
      let mainText = entryObj.entry;
      let imageData = null;
      if (entryObj.entry.includes("[photo attached]")) {
        const parts = entryObj.entry.split("[photo attached]");
        mainText = parts[0].trim();
        if (parts.length >= 2) {
          imageData = parts[1].trim();
          if (!/^data:/.test(imageData)) {
            imageData = "data:image/png;base64," + imageData;
          }
        }
      }
      
      // Localize text if available. Assume a global localization object exists.
      const localizedText = window.localization && window.localization[currentLanguage] && window.localization[currentLanguage][mainText]
                            ? window.localization[currentLanguage][mainText]
                            : mainText;
      
      const cleanedText = localizedText.replace(/^user_post_success:\s*/, '').replace(/^user_post_failed:\s*/, '');
      const formattedTimestamp = entryObj.timestamp.replace(/\.\d+Z$/, '');
      const fullText = `${cleanedText} (${formattedTimestamp})`;
      
      const textContainer = document.createElement("p");
      if (imageData) {
        const img = document.createElement("img");
        img.src = imageData;
        img.alt = (window.localization && window.localization[currentLanguage] && window.localization[currentLanguage]["photo_attached"]) || "Photo attached";
        img.style.maxWidth = "100%";
        articleElem.appendChild(img);
      }
      articleElem.appendChild(textContainer);
      
      let messageText = fullText;
      const dateMatch = fullText.match(/(\(\d{4}-\d{2}-\d{2}.*\))$/);
      if (dateMatch) {
        const dateText = dateMatch[1].trim();
        messageText = fullText.replace(dateText, "").trim() + "<br>" + dateText;
      }
      
      const isAlreadyAnimated = animatedIds.includes(entryObj.id);
      if (isAlreadyAnimated) {
        textContainer.innerHTML = messageText;
      } else {
        const animatedSpan = document.createElement("span");
        textContainer.innerHTML = "";
        textContainer.appendChild(animatedSpan);
        
        if (entryObj.postClass === "ghost-post") {
          effectsManager.triggerGhostTextEffect(animatedSpan, messageText);
        } else {
          effectsManager.triggerUserTextEffect(animatedSpan, messageText);
        }
        
        animatedIds.push(entryObj.id);
      }
      
      this.diaryContainer.appendChild(articleElem);
    });
    
    localStorage.setItem("animatedDiaryIds", JSON.stringify(animatedIds));
    console.log("Diary updated.");
  }
}