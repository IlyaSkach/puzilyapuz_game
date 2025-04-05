let tg = window.Telegram.WebApp;
tg.expand();

let coins = 0;
const target = document.getElementById("target");
const coinsDisplay = document.getElementById("coins");
const intro = document.getElementById("intro");
const gameContainer = document.querySelector(".game-container");
const startButton = document.getElementById("startGame");
const stopStoryButton = document.getElementById("stopStory");

// Создаем аудио элементы
const storyAudio = new Audio("sounds/story.mp3");
const popSound = new Audio("sounds/pop.mp3");
const pop2Sound = new Audio("sounds/pop2.mp3");

// Настройка звуков
storyAudio.volume = 0.5;
popSound.volume = 0.7;
pop2Sound.volume = 0.7;

// Скрываем игровое поле до начала игры
gameContainer.style.display = "none";

// Переменные для таймера и сложности
let targetTimer;
let targetVisible = false;
let gameStartTime;
let difficultyLevel = 1;
let lastHitTime = 0;
const DIFFICULTY_INCREASE_INTERVAL = 10000; // увеличиваем сложность каждые 10 секунд
const MAX_DIFFICULTY = 5; // максимальный уровень сложности
const MISS_TIME_THRESHOLD = 15000; // 15 секунд без попаданий для уменьшения сложности
const DIFFICULTY_DECREASE_INTERVAL = 5000; // проверяем каждые 5 секунд

// Базовые настройки времени
const BASE_MIN_DISPLAY_TIME = 500;
const BASE_MAX_DISPLAY_TIME = 2000;
const BASE_MIN_HIDE_TIME = 1000;
const BASE_MAX_HIDE_TIME = 3000;

let isBomb = false;
const BOMB_CHANCE = 0.2; // 20% шанс появления бомбы
const MIN_COIN_LOSS = 5; // Минимальный процент потери монет
const MAX_COIN_LOSS = 10; // Максимальный процент потери монет

let gameStarted = false;

// Функция для расчета текущего времени показа/скрытия
function getCurrentTimes() {
  const displayTimeReduction = (difficultyLevel - 1) * 0.2; // 20% уменьшение на каждый уровень
  const hideTimeReduction = (difficultyLevel - 1) * 0.15; // 15% уменьшение на каждый уровень

  return {
    minDisplay: BASE_MIN_DISPLAY_TIME * (1 - displayTimeReduction),
    maxDisplay: BASE_MAX_DISPLAY_TIME * (1 - displayTimeReduction),
    minHide: BASE_MIN_HIDE_TIME * (1 - hideTimeReduction),
    maxHide: BASE_MAX_HIDE_TIME * (1 - hideTimeReduction),
  };
}

// Функция для увеличения сложности
function increaseDifficulty() {
  if (difficultyLevel < MAX_DIFFICULTY) {
    difficultyLevel++;
    console.log(`Уровень сложности увеличен до ${difficultyLevel}`);
  }
}

// Функция для уменьшения сложности
function decreaseDifficulty() {
  if (difficultyLevel > 1) {
    difficultyLevel--;
    console.log(`Уровень сложности уменьшен до ${difficultyLevel}`);
  }
}

// Функция для проверки необходимости уменьшения сложности
function checkDifficultyDecrease() {
  const currentTime = Date.now();
  const timeSinceLastHit = currentTime - lastHitTime;

  if (timeSinceLastHit > MISS_TIME_THRESHOLD && difficultyLevel > 1) {
    decreaseDifficulty();
    lastHitTime = currentTime; // Сбрасываем таймер после уменьшения сложности
  }
}

// Функция для показа Пузиляпуса
function showTarget() {
  if (!targetVisible) {
    // Определяем, будет ли это бомба
    isBomb = Math.random() < BOMB_CHANCE;
    console.log("Появляется:", isBomb ? "бомба" : "цель"); // Для отладки

    const position = randomPosition();
    target.style.left = position.x + "px";
    target.style.top = position.y + "px";

    if (isBomb) {
      target.style.backgroundColor = "transparent";
      target.style.backgroundImage = 'url("images/bomb.png")';
      target.style.backgroundSize = "contain";
    } else {
      target.style.backgroundColor = "transparent";
      target.style.backgroundImage = 'url("images/target.png")';
      target.style.backgroundSize = "contain";
    }

    target.style.display = "block";
    targetVisible = true;

    const times = getCurrentTimes();
    // Случайное время показа
    const displayTime =
      Math.random() * (times.maxDisplay - times.minDisplay) + times.minDisplay;
    targetTimer = setTimeout(hideTarget, displayTime);
  }
}

// Функция для скрытия Пузиляпуса
function hideTarget() {
  target.style.display = "none";
  targetVisible = false;

  const times = getCurrentTimes();
  // Случайное время скрытия
  const hideTime =
    Math.random() * (times.maxHide - times.minHide) + times.minHide;
  targetTimer = setTimeout(showTarget, hideTime);
}

// Обработчик кнопки выключения истории
stopStoryButton.addEventListener("click", () => {
  storyAudio.pause();
  storyAudio.currentTime = 0;
  stopStoryButton.style.display = "none";
});

// Обработчик кнопки старта
startButton.addEventListener("click", () => {
  // Скрываем заставку и кнопку
  intro.style.display = "none";
  startButton.style.display = "none";

  // Показываем игровое поле
  gameContainer.style.display = "block";

  // Скрываем Пузиляпуса изначально
  target.style.display = "none";

  // Запускаем игру
  gameStarted = true;

  // Запускаем цикл появления/исчезновения
  setTimeout(showTarget, 1000);

  // Запускаем таймер сложности
  gameStartTime = Date.now();
  lastHitTime = gameStartTime;

  // Таймер увеличения сложности
  setInterval(() => {
    const currentTime = Date.now();
    const elapsedTime = currentTime - gameStartTime;
    const newLevel = Math.floor(elapsedTime / DIFFICULTY_INCREASE_INTERVAL) + 1;

    if (newLevel > difficultyLevel && newLevel <= MAX_DIFFICULTY) {
      difficultyLevel = newLevel;
      console.log(`Уровень сложности увеличен до ${difficultyLevel}`);
    }
  }, 1000);

  // Таймер проверки уменьшения сложности
  setInterval(checkDifficultyDecrease, DIFFICULTY_DECREASE_INTERVAL);

  // Начинаем воспроизведение истории
  storyAudio.play().catch((e) => console.log("Ошибка воспроизведения истории"));
});

// Случайное положение цели
function randomPosition() {
  const maxX = window.innerWidth - 100;
  const maxY = window.innerHeight - 100;
  return {
    x: Math.random() * maxX,
    y: Math.random() * maxY,
  };
}

// Создание монетки
function createCoin(x, y) {
  const coin = document.createElement("div");
  coin.className = "coin";
  coin.style.left = x + "px";
  coin.style.top = y + "px";
  document.querySelector(".game-container").appendChild(coin);

  // Удаляем монетку после анимации
  setTimeout(() => {
    coin.remove();
  }, 1000);
}

// Обработчик клика
target.addEventListener("click", () => {
  if (targetVisible) {
    // Останавливаем текущий таймер
    clearTimeout(targetTimer);

    // Обновляем время последнего попадания
    lastHitTime = Date.now();

    if (isBomb) {
      // Если это бомба
      playSound("pop2");
      const coinLoss =
        Math.floor(Math.random() * (MAX_COIN_LOSS - MIN_COIN_LOSS + 1)) +
        MIN_COIN_LOSS;
      const lossAmount = Math.max(1, Math.floor(coins * (coinLoss / 100))); // Минимум 1 монета
      coins = Math.max(0, coins - lossAmount);
      updateScore();
      showCoinLoss(lossAmount);
    } else {
      // Если это обычная цель
      playSound("pop");
      const coinsCount = Math.floor(Math.random() * 5) + 1;
      coins += coinsCount;
      updateScore();

      // Создаем монетки в текущей позиции
      const rect = target.getBoundingClientRect();
      for (let i = 0; i < coinsCount; i++) {
        setTimeout(() => {
          createCoin(rect.left + 50, rect.top + 50);
        }, i * 100);
      }
    }

    // Скрываем Пузиляпуса и запускаем новый цикл
    hideTarget();
  }
});

function showCoinLoss(amount) {
  const lossElement = document.createElement("div");
  lossElement.className = "coin-loss";
  lossElement.textContent = `-${amount}`;

  // Получаем позицию цели
  const targetRect = target.getBoundingClientRect();

  // Устанавливаем позицию элемента потери монет
  lossElement.style.position = "absolute";
  lossElement.style.left = `${targetRect.left + targetRect.width / 2}px`;
  lossElement.style.top = `${targetRect.top + targetRect.height / 2}px`;

  // Добавляем элемент в игровой контейнер
  gameContainer.appendChild(lossElement);

  // Удаляем элемент после анимации
  setTimeout(() => {
    lossElement.remove();
  }, 1500);
}

function playSound(soundName) {
  const sound = soundName === "pop2" ? pop2Sound : popSound;
  sound.currentTime = 0;
  sound.play().catch((e) => console.log("Ошибка воспроизведения звука:", e));
}

function updateScore() {
  coinsDisplay.textContent = coins;
}
