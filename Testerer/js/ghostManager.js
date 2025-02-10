export class GhostManager {
  constructor(eventManager, profileManager, app) {
    this.eventManager = eventManager;
    this.profileManager = profileManager;
    this.app = app;
this.ghosts = [
  { id: 1, name: "призрак 1", usedLetters: [] },
  { id: 2, name: "призрак 2", usedLetters: [] }
];

    this.currentGhostId = 1;
    this.currentPhenomenonIndex = 0;
    this.loadState();
    console.log(`Текущий активный призрак: ${this.getCurrentGhost().name}`);
  }

  getCurrentGhost() {
    return this.ghosts.find(g => g.id === this.currentGhostId);
  }

  setCurrentGhost(ghostId) {
    this.currentGhostId = ghostId;
    console.log(`Призрак ${this.getCurrentGhost().name} активирован.`);
    this.saveState();
  }

  finishCurrentGhost() {
    if (this.getCurrentGhost()) {
      this.getCurrentGhost().isFinished = true;
      console.log(`Призрак ${this.getCurrentGhost().name} завершен.`);
      this.saveState();
    }
  }

  isCurrentGhostFinished() {
    return this.getCurrentGhost() && this.getCurrentGhost().isFinished;
  }


checkFinalQuestActivation() {
  const ghost = this.getCurrentGhost();
  const nameLength = ghost.name.length;
  const usedLetters = ghost.usedLetters.length;

  // Если использованы все буквы, активируем финальный квест
  if (usedLetters >= nameLength - 2) { // Т.е. когда все, кроме последних 2 букв
    this.activateFinalQuest();
  }
}

activateFinalQuest() {
  console.log("Финальный квест активирован для Призрака 1");
  this.app.questManager.activateQuest("final_quest"); // Активируем финальный квест
  this.finishCurrentGhost();
}


async triggerNextPhenomenon() {
  const ghost = this.getCurrentGhost();
  if (!ghost) return;
  
  // Определяем следующую букву из имени призрака, которая будет использована
  const nextLetter = ghost.name.charAt(ghost.usedLetters.length);  // Берем следующую букву
  
  // Если буква ещё не использована, активируем её
  if (!ghost.usedLetters.includes(nextLetter)) {
    this.markLetterAsUsed(nextLetter);
    await this.eventManager.addGhostDiaryEntry(`Использована буква: ${nextLetter}`);
    console.log(`Добавлена буква в дневник: ${nextLetter}`);
  }

  // Проверка на финальный квест
  this.checkFinalQuestActivation();
}


  resetGhostChain() {
    this.currentGhostId = 1;
    this.currentPhenomenonIndex = 0;
    this.profileManager.resetGhostProgress();
    console.log("Цепочка призраков сброшена.");
  }

  saveState() {
    localStorage.setItem('ghostState', JSON.stringify(this.ghosts));
  }

  loadState() {
    const savedState = localStorage.getItem('ghostState');
    if (savedState) {
      this.ghosts = JSON.parse(savedState);
      console.log('Загружено состояние призраков:', this.ghosts);
    }
  }
}