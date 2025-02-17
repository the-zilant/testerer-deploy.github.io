// App.js – главный класс приложения

import { LanguageManager } from './languageManager.js';
import { cameraSectionManager } from './cameraSectionManager.js';
import { ImageUtils } from './utils/imageUtils.js';
import { ProfileManager } from './profileManager.js';
import { ApartmentPlanManager } from './apartmentPlanManager.js';
import { DatabaseManager } from './databaseManager.js';
import { ShowProfileModal } from './showProfileModal.js';
import { EventManager } from './eventManager.js';
import { QuestManager } from './questManager.js';
import { GameEventManager } from './gameEventManager.js';
import { GhostManager } from './ghostManager.js';

export class App {
  constructor() {
    // Привязываем метод switchScreen к глобальному объекту для возможности вызова из других модулей.
    window.switchScreen = this.switchScreen.bind(this);
    
    // Получаем DOM-элементы экранов и формы регистрации
    this.registrationScreen = document.getElementById('registration-screen');
    this.selfieScreen = document.getElementById('selfie-screen');
    this.mainScreen = document.getElementById('main-screen');
    this.nameInput = document.getElementById('player-name');
    this.genderSelect = document.getElementById('player-gender');
    this.nextStepBtn = document.getElementById('next-step-btn');
    this.selfieVideo = document.getElementById('selfie-video');
    this.captureBtn = document.getElementById('capture-btn');
    // Элемент full-size превью может остаться, если понадобится, но для миниатюры используется thumbnail
    this.selfiePreview = document.getElementById('selfie-preview');
    this.completeBtn = document.getElementById('complete-registration');
    this.profileNameElem = document.getElementById('profile-name');
    this.profilePhotoElem = document.getElementById('profile-photo');
    this.resetBtn = document.getElementById('reset-data');
    this.exportBtn = document.getElementById('export-profile-btn');
    this.importFileInput = document.getElementById('import-file');
    this.importBtn = document.getElementById('import-profile-btn');
    this.postBtn = document.getElementById('post-btn');
    
    // Инициализируем менеджеры
    this.languageManager = new LanguageManager('language-selector');
    this.cameraSectionManager = new cameraSectionManager();
    this.profileManager = new ProfileManager();
    this.databaseManager = new DatabaseManager();
    this.eventManager = new EventManager(this.databaseManager, this.languageManager);
    this.questManager = new QuestManager(this.eventManager, this);
    this.gameEventManager = new GameEventManager(this.eventManager, this, this.languageManager);
    this.showProfileModal = new ShowProfileModal(this);
    this.ghostManager = new GhostManager(this.eventManager, this.profileManager, this);
    
    // Создаем временную канву для обработки изображений
    this.tempCanvas = document.createElement("canvas");
    this.tempCtx = this.tempCanvas.getContext("2d");
    
    // Поле для сохранения данных селфи
    this.selfieData = null;

    // Привязываем обработчики событий и запускаем инициализацию
    this.bindEvents();
    this.init();
  }

  /**
   * loadAppState – загружает состояние приложения (например, ID текущего призрака) из localStorage.
   */
  loadAppState() {
    const savedGhostId = localStorage.getItem('currentGhostId');
    if (savedGhostId) {
      this.ghostManager.setCurrentGhost(parseInt(savedGhostId));
    } else {
      this.ghostManager.setCurrentGhost(1); // По умолчанию устанавливаем Призрак 1
    }
  }

  /**
   * init – инициализирует приложение:
   *   - Загружает состояние
   *   - Ждет инициализации базы данных
   *   - Обновляет дневник и отображает нужный экран в зависимости от наличия профиля
   */
  async init() {
    this.loadAppState();
    await this.databaseManager.initDatabasePromise;
    
    // Делает кнопку камеры видимой после регистрации.
    const cameraBtn = document.getElementById("toggle-camera");
    cameraBtn.style.display = "inline-block";

    // Обновляем дневник.
    this.eventManager.updateDiaryDisplay();

    // Если профиль уже сохранён, отображаем основной экран; иначе – экран регистрации.
    if (this.profileManager.isProfileSaved()) {
      const profile = this.profileManager.getProfile();
      console.log("Profile found:", profile);
      this.showMainScreen();
      if (localStorage.getItem("registrationCompleted") === "true") {
        setTimeout(() => {
          this.gameEventManager.activateEvent("welcome");
        }, 5000);
      }
      if (localStorage.getItem("mirrorQuestActive") === "true") {
        cameraBtn.classList.add("glowing");
      } else {
        cameraBtn.classList.remove("glowing");
      }
    } else {
      console.log("Profile not found, showing registration screen.");
      this.showRegistrationScreen();
    }
  }

  /**
   * switchScreen – переключает видимость экранов и групп кнопок.
   * @param {string} screenId - ID экрана, который нужно показать.
   * @param {string} buttonsGroupId - ID группы кнопок, которые должны отображаться.
   */
  switchScreen(screenId, buttonsGroupId) {
    // Скрываем все экраны.
    document.querySelectorAll('section').forEach(section => section.style.display = 'none');
    
    // Отображаем целевой экран.
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.style.display = 'block';
    }
    
    // Скрываем все группы кнопок и отключаем их взаимодействие.
    document.querySelectorAll('#controls-panel > .buttons').forEach(group => {
      group.style.display = 'none';
      group.style.pointerEvents = 'none';
    });
    
    // Отображаем указанную группу кнопок.
    if (buttonsGroupId) {
      const targetGroup = document.getElementById(buttonsGroupId);
      if (targetGroup) {
        targetGroup.style.display = 'flex';
        targetGroup.style.pointerEvents = 'auto';
      }
    }
  }

  /**
   * bindEvents – привязывает обработчики событий к элементам интерфейса.
   */
  bindEvents() {
    // Обработчики для полей регистрации.
    this.nameInput.addEventListener('input', () => {
      console.log("Name input changed:", this.nameInput.value);
      this.validateRegistration();
    });
    this.genderSelect.addEventListener('change', () => {
      console.log("Gender select changed:", this.genderSelect.value);
      this.validateRegistration();
    });

    // Обработчик для кнопки "Next" регистрации.
    if (this.nextStepBtn) {
      this.nextStepBtn.addEventListener('click', () => {
        console.log("Next button clicked");
        this.goToApartmentPlanScreen();
      });
    } else {
      console.error("Элемент next-step-btn не найден!");
    }

    // Привязка остальных событий.
    this.captureBtn.addEventListener('click', () => this.captureSelfie());
    this.completeBtn.addEventListener('click', () => this.completeRegistration());
    this.resetBtn.addEventListener('click', () => this.profileManager.resetProfile());
    this.exportBtn.addEventListener('click', () => this.exportProfile());
    this.importBtn.addEventListener('click', () => this.importProfile());
    this.profilePhotoElem.addEventListener("click", () => this.showProfileModal.show());
    
    // Переход от плана квартиры к экрану селфи.
    document.getElementById("apartment-plan-next-btn").addEventListener("click", () => this.goToSelfieScreen());
    document.getElementById("prev-floor-btn").addEventListener("click", () => {
      if (this.apartmentPlanManager) { this.apartmentPlanManager.prevFloor(); }
    });
    document.getElementById("next-floor-btn").addEventListener("click", () => {
      if (this.apartmentPlanManager) { this.apartmentPlanManager.nextFloor(); }
    });
    document.getElementById("toggle-camera").addEventListener("click", () => this.toggleCameraView());
    document.getElementById("toggle-diary").addEventListener("click", () => this.toggleCameraView());
    
    if (this.postBtn) {
      this.postBtn.addEventListener('click', () => this.handlePostButtonClick());
    } else {
      console.error("Элемент post-btn не найден!");
    }
  }

  /**
   * validateRegistration – проверяет корректность заполнения формы регистрации.
   */
  validateRegistration() {
    const isValid = (this.nameInput.value.trim() !== "" && this.genderSelect.value !== "");
    console.log("validateRegistration:", isValid);
    this.nextStepBtn.disabled = !isValid;
  }

  /**
   * goToApartmentPlanScreen – сохраняет данные регистрации и переключает экран на план квартиры.
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
   * goToSelfieScreen – переключает экран на селфи, открывает глобальный контейнер камеры
   * и запускает камеру.
   */
  goToSelfieScreen() {
    // Переключаем экран на селфи и отображаем кнопки для селфи.
    window.switchScreen('selfie-screen', 'selfie-buttons');
    
    // Открываем глобальный контейнер с камерой.
    const globalCamera = document.getElementById('global-camera');
    globalCamera.style.display = 'block';
    this.cameraSectionManager.attachTo('global-camera', {
      width: "100%",
      height: "100%",
      filter: "grayscale(100%)"
    });
    this.cameraSectionManager.startCamera();
    this.completeBtn.disabled = true;
  }

  /**
   * captureSelfie – делает снимок из видео, преобразует его в оттенки серого
   * и обновляет миниатюру селфи в панели управления.
   */
  captureSelfie() {
    console.log("📸 Попытка сделать снимок...");
    if (!this.cameraSectionManager.videoElement || !this.cameraSectionManager.videoElement.srcObject) {
      console.error("❌ Камера не активна!");
      alert("Ошибка: Камера не включена.");
      return;
    }
    const video = this.cameraSectionManager.videoElement;
    if (video.readyState < 2) {
      console.warn("⏳ Камера ещё не готова...");
      alert("Подождите, пока камера загрузится.");
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Не удалось получить контекст рисования.");
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Преобразуем изображение в оттенки серого с помощью ImageUtils.
      const grayscaleData = ImageUtils.convertToGrayscale(canvas);
      
      // Обновляем миниатюру селфи в панели управления (элемент с id "selfie-thumbnail").
      const thumbnail = document.getElementById('selfie-thumbnail');
      thumbnail.src = grayscaleData;
      thumbnail.style.display = 'block';
      
      this.completeBtn.disabled = false;
      this.selfieData = grayscaleData;
      console.log("✅ Снимок успешно сделан!");
    } catch (error) {
      console.error("❌ Ошибка при создании снимка:", error);
      alert("Ошибка при создании снимка! Попробуйте снова.");
    }
  }

  /**
   * completeRegistration – завершается процесс регистрации:
   * сохраняется профиль, останавливается камера и переключается экран на основной.
   */
  completeRegistration() {
    // Используем либо src элемента selfiePreview, либо миниатюры, если первый не доступен.
    const selfieSrc = (this.selfiePreview && this.selfiePreview.src) || document.getElementById('selfie-thumbnail').src;
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
    this.cameraSectionManager.stopCamera();
    document.getElementById('global-camera').style.display = 'none';
    this.showMainScreen();
    
    // Активируем событие "welcome" через 5 секунд.
    setTimeout(() => {
      this.gameEventManager.activateEvent("welcome");
    }, 5000);
  }

  /**
   * toggleCameraView – переключает отображение между камерой и дневником.
   */
  async toggleCameraView() {
    const diary = document.getElementById("diary");
    const cameraContainer = document.getElementById("camera-container");
    const toggleCameraBtn = document.getElementById("toggle-camera");
    const toggleDiaryBtn = document.getElementById("toggle-diary");
    const buttonsToHide = [
      document.getElementById("reset-data"),
      document.getElementById("export-profile-btn"),
      document.getElementById("import-profile-container")
    ];

    if (cameraContainer.style.display === "none") {
      console.log("📸 Переключаемся на камеру...");
      diary.style.display = "none";
      cameraContainer.style.display = "flex";
      toggleCameraBtn.style.display = "none";
      toggleDiaryBtn.style.display = "inline-block";
      buttonsToHide.forEach(btn => { if (btn) btn.style.display = "none"; });

      // Прикрепляем видео к контейнеру камеры и запускаем камеру.
      this.cameraSectionManager.attachTo('camera-container', {
        width: "100%",
        height: "100%"
      });
      await this.cameraSectionManager.startCamera();

      await new Promise(resolve => {
        if (this.cameraSectionManager.videoElement.readyState >= 2) {
          resolve();
        } else {
          this.cameraSectionManager.videoElement.onloadedmetadata = () => resolve();
        }
      });
      console.log("Видео готово:", this.cameraSectionManager.videoElement.videoWidth, this.cameraSectionManager.videoElement.videoHeight);

      setTimeout(async () => {
        if (localStorage.getItem("mirrorQuestActive") === "true") {
          console.log("Запускаем проверку зеркального квеста после включения камеры...");
          await this.questManager.triggerMirrorQuestIfActive();
        }
      }, 5000);
    } else {
      console.log("📓 Возвращаемся в блог...");
      diary.style.display = "block";
      cameraContainer.style.display = "none";
      toggleCameraBtn.style.display = "inline-block";
      toggleDiaryBtn.style.display = "none";
      buttonsToHide.forEach(btn => { if (btn) btn.style.display = "block"; });
      this.cameraSectionManager.stopCamera();
    }
  }

  /**
   * showMainScreen – отображает основной экран (блог/дневник) с информацией профиля.
   */
  showMainScreen() {
    window.switchScreen('main-screen', 'main-buttons');
    const profile = this.profileManager.getProfile();
    if (profile) {
      this.profileNameElem.textContent = profile.name;
      this.profilePhotoElem.src = profile.selfie;
      this.profilePhotoElem.style.display = 'block';
      // Сохраняем селфи для дальнейшего сравнения.
      this.selfieData = profile.selfie;
    }
    this.updatePostButtonState();
  }

  /**
   * showRegistrationScreen – отображает экран регистрации.
   */
  showRegistrationScreen() {
    window.switchScreen('registration-screen', 'registration-buttons');
  }

  /**
   * exportProfile – экспортирует данные профиля.
   */
  exportProfile() {
    this.profileManager.exportProfileData(this.databaseManager, this.apartmentPlanManager);
  }

  /**
   * importProfile – импортирует данные профиля из выбранного файла.
   */
  importProfile() {
    if (this.importFileInput.files.length === 0) {
      alert("Please select a profile file to import.");
      return;
    }
    const file = this.importFileInput.files[0];
    this.profileManager.importProfileData(file, this.databaseManager, this.apartmentPlanManager);
  }

  /**
   * updatePostButtonState – обновляет состояние кнопки "Запостить" в зависимости от флага.
   */
  updatePostButtonState() {
    const isReady = localStorage.getItem("mirrorQuestReady") === "true";
    console.log("updatePostButtonState: mirrorQuestReady =", isReady);
    if (this.postBtn) {
      this.postBtn.disabled = !isReady;
    }
  }

  /**
   * handlePostButtonClick – обрабатывает нажатие на кнопку "Запостить".
   */
  async handlePostButtonClick() {
    console.log("Кнопка 'Запостить' нажата");
    if (localStorage.getItem("mirrorQuestReady") === "true") {
      localStorage.removeItem("mirrorQuestReady");
      this.updatePostButtonState();
      console.log("Добавляем пост от пользователя");
      const cameraBtn = document.getElementById("toggle-camera");
      if (cameraBtn) {
        cameraBtn.classList.add("glowing");
      }
      await this.questManager.activateQuest("mirror_quest");
    } else {
      alert("Ждите приглашения от призрака для начала квеста.");
    }
  }

  /**
   * compareCurrentFrame – сравнивает текущий кадр видео с сохранённым селфи,
   * используя пиксельное и гистограммное сравнение.
   * @returns {boolean} true, если совпадение достаточно, иначе false.
   */
  async compareCurrentFrame() {
    console.log("▶️ Начало compareCurrentFrame()");
    if (!this.selfieData) {
      console.warn("❌ Нет сохранённого селфи!");
      return false;
    }
    if (!this.cameraSectionManager.videoElement || !this.cameraSectionManager.videoElement.srcObject) {
      console.warn("❌ Камера не активна!");
      return false;
    }
    this.tempCanvas.width = this.cameraSectionManager.videoElement.videoWidth || 640;
    this.tempCanvas.height = this.cameraSectionManager.videoElement.videoHeight || 480;
    this.tempCtx.drawImage(
      this.cameraSectionManager.videoElement,
      0,
      0,
      this.tempCanvas.width,
      this.tempCanvas.height
    );
    const currentData = ImageUtils.convertToGrayscale(this.tempCanvas);
    this.lastMirrorPhoto = currentData;
    const matchPixel = ImageUtils.pixelWiseComparison(this.selfieData, currentData);
    const matchHistogram = ImageUtils.histogramComparison(this.selfieData, currentData);
    console.log(`🔎 Сравнение кадров: Pixel=${matchPixel.toFixed(2)}, Histogram=${matchHistogram.toFixed(2)}`);
    if (matchPixel > 0.6 && matchHistogram > 0.7) {
      alert("✅ Вы перед зеркалом!");
      return true;
    } else {
      alert("❌ Нет совпадения!");
      return false;
    }
  }
}