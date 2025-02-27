export class VisualEffectsManager {
  /** 
   * @param {App} appInstance – Reference to the main application instance (contains flag isCameraOpen).
   * @param {HTMLElement} controlsPanel – The controls panel element for blocking interactions.
   */
  constructor(appInstance, controlsPanel) {
    this.app = appInstance;
    this.controlsPanel = controlsPanel;
  }

  /**
   * Plays an audio file and stops it automatically after the specified delay.
   * @param {string} audioSrc - Path to the audio file.
   * @param {number} stopDelay - Time in milliseconds after which to stop playback.
   */
  playAudioWithStop(audioSrc, stopDelay) {
    const audio = new Audio(audioSrc);
    audio.play();
    if (stopDelay && stopDelay > 0) {
      setTimeout(() => {
        audio.pause();
      }, stopDelay);
    }
    return audio; // Return the audio object for manual control if needed.
  }

  /**
   * Blocks or unblocks the controls.
   * Delegates to ViewManager if available.
   * @param {boolean} shouldBlock - true to block controls, false to unblock.
   */
  setControlsBlocked(shouldBlock) {
    // If camera is open, do not block controls.
    if (this.app.isCameraOpen) {
      shouldBlock = false;
    }
    if (this.app.viewManager && typeof this.app.viewManager.setControlsBlocked === 'function') {
      this.app.viewManager.setControlsBlocked(shouldBlock);
    } else if (this.controlsPanel) {
      this.controlsPanel.style.pointerEvents = shouldBlock ? "none" : "auto";
    }
  }

  /**
   * Animates HTML text by "typing" it into the target element.
   * @param {HTMLElement} targetElem - The target element to animate text into.
   * @param {string} text - The text (including HTML tags) to animate.
   * @param {number} speed - Typing speed in milliseconds.
   * @param {HTMLAudioElement} [audioObj] - Audio object to play during animation.
   * @param {Function} [callback] - Callback function invoked after animation completes.
   * @param {Function} [onChar] - Function called after each character is inserted.
   */
  animateHTMLText(targetElem, text, speed, audioObj, callback, onChar) {
    targetElem.innerHTML = "";
    let pos = 0;
    let currentHTML = "";
    let isTag = false;
    let tagBuffer = "";
 
    const intervalId = setInterval(() => {
      const char = text[pos];
      if (!char) {
        clearInterval(intervalId);
        if (audioObj) audioObj.pause();
        if (callback) callback();
        return;
      }
 
      // Tag parsing logic.
      if (char === "<") {
        isTag = true;
      }
      if (isTag) {
        tagBuffer += char;
        if (char === ">") {
          currentHTML += tagBuffer;
          tagBuffer = "";
          isTag = false;
        }
      } else {
        currentHTML += char;
      }
 
      targetElem.innerHTML = currentHTML;
      pos++;
 
      if (typeof onChar === "function") {
        onChar(targetElem, currentHTML);
      }
    }, speed);
  }

  /**
   * Triggers the mirror effect.
   * Delegates background transition to ViewManager if available.
   */
  triggerMirrorEffect() {
    if (!this.app.isCameraOpen) {
      console.log("Mirror effect not triggered: camera is closed.");
      return;
    }
    if (this.app.viewManager && typeof this.app.viewManager.applyBackgroundTransition === 'function') {
      // Delegate background transition.
      this.app.viewManager.applyBackgroundTransition("black", 1000);
    } else {
      // Fallback: Direct manipulation of document.body styles.
      document.body.style.transition = "background 1s";
      document.body.style.background = "black";
      setTimeout(() => {
        document.body.style.background = "";
      }, 1000);
    }
    // Play the ringtone audio for 3 seconds.
    this.playAudioWithStop('audio/phone_ringtone.mp3', 3000);
  }

  /**
   * Triggers the ghost appearance effect.
   * Delegates display to ViewManager if available.
   * @param {string} ghostId - The identifier of the ghost effect.
   */
  triggerGhostAppearanceEffect(ghostId) {
    if (!this.app.isCameraOpen) {
      console.log("Ghost appearance effect not triggered: camera is closed.");
      return;
    }
    if (this.app.viewManager && typeof this.app.viewManager.showGhostAppearanceEffect === 'function') {
      this.app.viewManager.showGhostAppearanceEffect(ghostId);
    } else {
      // Fallback: Direct DOM manipulation.
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
  }

  /**
   * Triggers the whisper effect (plays whisper audio for 5 seconds).
   */
  triggerWhisperEffect() {
    this.playAudioWithStop('audio/whisper.mp3', 5000);
  }

  /**
   * Triggers ghost text effect by "typing" ghostly text.
   * Blocks controls during the animation.
   * @param {HTMLElement} targetElem - The target element for text animation.
   * @param {string} text - The ghost text to animate.
   * @param {Function} callback - Callback invoked after animation completes.
   */
  triggerGhostTextEffect(targetElem, text, callback) {
    // Block controls.
    this.setControlsBlocked(true);
 
    // Play ghost sound.
    const ghostSound = new Audio('audio/ghost_effect.mp3');
    ghostSound.play();
 
    this.animateHTMLText(
      targetElem,
      text,
      100,
      ghostSound,
      () => {
        this.setControlsBlocked(false);
        if (callback) callback();
      }
    );
  }
 
  /**
   * Triggers user text effect that simulates typing with a moving pencil icon.
   * Blocks controls during the animation.
   * @param {HTMLElement} targetElem - The target element for text animation.
   * @param {string} text - The text to animate.
   * @param {Function} callback - Callback invoked after animation completes.
   */
  triggerUserTextEffect(targetElem, text, callback) {
    // Create a pencil icon.
    const pencilIcon = document.createElement("img");
    pencilIcon.src = "images/pencil.png";
    pencilIcon.alt = "Typing...";
    Object.assign(pencilIcon.style, {
      width: "24px",
      height: "24px",
      position: "absolute"
    });
 
    // Insert the pencil icon into the parent element.
    const parentElem = targetElem.parentElement;
    parentElem.style.position = "relative";
    parentElem.insertBefore(pencilIcon, targetElem);
 
    // Block controls.
    this.setControlsBlocked(true);
 
    // Play typing sound.
    const typeSound = new Audio('audio/type_sound.mp3');
    typeSound.loop = true;
    typeSound.play();
 
    const onChar = () => {
      const dummySpan = document.createElement("span");
      dummySpan.innerHTML = "&nbsp;"; // To get a position reference.
      targetElem.appendChild(dummySpan);
 
      const rectDummy = dummySpan.getBoundingClientRect();
      const rectParent = parentElem.getBoundingClientRect();
      // Update pencil icon position.
      pencilIcon.style.left = (rectDummy.left - rectParent.left) + "px";
      pencilIcon.style.top  = (rectDummy.top - rectParent.top) + "px";
 
      dummySpan.remove();
    };
 
    this.animateHTMLText(
      targetElem,
      text,
      100,
      typeSound,
      () => {
        pencilIcon.remove();
        this.setControlsBlocked(false);
        if (callback) callback();
      },
      onChar
    );
  }
}