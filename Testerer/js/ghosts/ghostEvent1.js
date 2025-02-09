export class GhostEvent1 {
  /**
   * @param {EventManager} eventManager – менеджер событий
   * @param {App} appInstance – ссылка на основной объект приложения
   */
  constructor(eventManager, appInstance) {
    this.eventManager = eventManager;
    this.app = appInstance;
    this.key = "ghost_1";  // Уникальный идентификатор события
    this.doneKey = "ghost_1_done";
  }

  /**
   * При активации события будет происходить проявление призрака через VisualEffectsManager
   * и добавление записи в дневник.
   */
  async activate() {
    if (!this.eventManager.isEventLogged(this.key)) {
      console.log(`🔮 Призрак 1 активирован`);
      await this.eventManager.addDiaryEntry(this.key);
      
      // Визуальный эффект для первого призрака
      const effectsManager = new VisualEffectsManager();
      effectsManager.triggerGhostEffect("ghost_1");
    }
  }

  /**
   * Проверка завершенности события.
   */
  async checkStatus() {
    // В данном случае, для простоты, можно всегда возвращать true.
    // Однако можно добавить логику для проверки, например, через камеру или взаимодействие.
    return true;
  }

  /**
   * Завершение события.
   */
  async finish() {
    const success = await this.checkStatus();
    if (success) {
      if (!this.eventManager.isEventLogged(this.doneKey)) {
        await this.eventManager.addDiaryEntry(this.doneKey);
      }
      alert("🎉 Призрак 1 завершен!");
      
      // Переход к следующему событию или квесту
      if (this.app.ghostManager) {
        this.app.ghostManager.triggerNextPhenomenon();
      }
    } else {
      alert("❌ Призрак 1 не завершен, попробуйте еще раз.");
    }
  }
}