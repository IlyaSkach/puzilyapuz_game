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
const MIN_COIN_LOSS = 1; // Минимальный процент потери монет
const MAX_COIN_LOSS = 2; // Максимальный процент потери монет

let gameStarted = false;

// Базовый URL для API
const API_URL = window.location.origin;

let isSoundOn = true;

// Инициализация Telegram WebApp
function initTelegramWebApp() {
  // Расширяем на весь экран
  tg.expand();

  // Устанавливаем цвет фона и текста
  tg.setHeaderColor("#1a1a2e");
  tg.setBackgroundColor("#1a1a2e");

  // Включаем кнопку "Назад"
  tg.enableClosingConfirmation();

  // Получаем данные пользователя
  const user = tg.initDataUnsafe?.user;
  if (user) {
    console.log("Пользователь авторизован:", user.username);
    // Сохраняем данные пользователя
    localStorage.setItem(
      "telegram_user",
      JSON.stringify({
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
      })
    );
  } else {
    console.log("Пользователь не авторизован");
  }

  // Загружаем сохраненные очки пользователя
  loadUserScore();
}

// Функция для загрузки счета пользователя
async function loadUserScore() {
  const user = tg.initDataUnsafe?.user;
  if (user) {
    try {
      const response = await fetch(
        `${API_URL}/api/leaderboard?username=${user.username}`
      );
      const data = await response.json();
      if (data.userRank) {
        coins = data.userRank.score;
        updateScore();
      }
    } catch (error) {
      console.error("Ошибка при загрузке счета:", error);
    }
  }
}

// Функция для сохранения счета пользователя
async function saveUserScore() {
  const user = tg.initDataUnsafe?.user;
  if (user) {
    try {
      const response = await fetch(`${API_URL}/api/scores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: user.username || "Аноним",
          score: coins,
        }),
      });
      const data = await response.json();
      if (data.success) {
        console.log("Счет успешно сохранен");
      }
    } catch (error) {
      console.error("Ошибка при сохранении счета:", error);
    }
  }
}

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

// Функция для показа цели
function showTarget() {
  // Определяем, будет ли это бомба
  isBomb = Math.random() < BOMB_CHANCE;

  // Случайное положение цели
  const position = randomPosition();
  target.style.left = position.x + "px";
  target.style.top = position.y + "px";

  // Устанавливаем изображение цели
  if (isBomb) {
    target.style.backgroundImage = "url('images/bomb.png')";
  } else {
    target.style.backgroundImage = "url('images/target.png')";
  }

  // Показываем цель
  target.style.display = "block";

  // Определяем время показа цели
  const times = getCurrentTimes();
  let displayTime;

  if (isBomb) {
    // Для бомбы увеличиваем время отображения в 2 раза
    displayTime =
      Math.random() * (times.maxDisplay - times.minDisplay) + times.minDisplay;
    displayTime *= 2; // Увеличиваем время отображения бомбы
  } else {
    displayTime =
      Math.random() * (times.maxDisplay - times.minDisplay) + times.minDisplay;
  }

  // Устанавливаем таймер для скрытия цели
  targetTimer = setTimeout(hideTarget, displayTime);
}

// Функция для скрытия цели
function hideTarget() {
  // Скрываем цель
  target.style.display = "none";

  // Определяем время скрытия цели
  const times = getCurrentTimes();
  const hideTime =
    Math.random() * (times.maxHide - times.minHide) + times.minHide;

  // Устанавливаем таймер для показа новой цели
  targetTimer = setTimeout(showTarget, hideTime);
}

// Обработчик кнопки выключения звука
stopStoryButton.addEventListener("click", () => {
  isSoundOn = !isSoundOn;
  if (!isSoundOn) {
    storyAudio.pause();
    storyAudio.currentTime = 0;
    popSound.volume = 0;
    pop2Sound.volume = 0;
    stopStoryButton.textContent = "🔈";
  } else {
    storyAudio
      .play()
      .catch((e) => console.log("Ошибка воспроизведения звука:", e));
    popSound.volume = 0.7;
    pop2Sound.volume = 0.7;
    stopStoryButton.textContent = "🔊";
  }
});

// Обработчик кнопки старта
startButton.addEventListener("click", () => {
  startGame();
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

// Обработчик клика по цели
target.addEventListener("click", () => {
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

  // Скрываем цель и запускаем новый цикл
  hideTarget();
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
  // Сохраняем очки при каждом обновлении
  saveUserScore();
}

// Функция для отображения таблицы лидеров
async function showLeaderboard(top10, userRank) {
  const leaderboardContainer = document.createElement("div");
  leaderboardContainer.className = "leaderboard-container";

  const leaderboardContent = document.createElement("div");
  leaderboardContent.className = "leaderboard-content";

  const title = document.createElement("h2");
  title.textContent = "Таблица лидеров";
  leaderboardContent.appendChild(title);

  const table = document.createElement("table");
  table.innerHTML = `
    <tr>
      <th>Место</th>
      <th>Игрок</th>
      <th>Счет</th>
    </tr>
  `;

  // Добавляем топ-10
  top10.forEach((player, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${player.username}</td>
      <td>${player.score}</td>
    `;
    table.appendChild(row);
  });

  // Если пользователь не в топ-10, добавляем его место
  if (userRank && userRank.rank > 10) {
    const separator = document.createElement("tr");
    separator.innerHTML = "<td colspan='3'>...</td>";
    table.appendChild(separator);

    const userRow = document.createElement("tr");
    userRow.className = "user-rank";
    userRow.innerHTML = `
      <td>${userRank.rank}</td>
      <td>${userRank.username}</td>
      <td>${userRank.score}</td>
    `;
    table.appendChild(userRow);
  }

  leaderboardContent.appendChild(table);

  const closeButton = document.createElement("button");
  closeButton.textContent = "Закрыть";
  closeButton.onclick = hideLeaderboard;
  leaderboardContent.appendChild(closeButton);

  leaderboardContainer.appendChild(leaderboardContent);
  document.body.appendChild(leaderboardContainer);
}

function hideLeaderboard() {
  const leaderboardContainer = document.querySelector(".leaderboard-container");
  if (leaderboardContainer) {
    leaderboardContainer.remove();
  }
}

// Обработчики событий для таблицы лидеров
document.addEventListener("DOMContentLoaded", () => {
  // Кнопки для показа таблицы лидеров
  const showLeaderboardBtns = document.querySelectorAll(".leaderboard-button");
  showLeaderboardBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const user = tg.initDataUnsafe?.user;
        const response = await fetch(
          `${API_URL}/api/leaderboard?username=${user?.username || ""}`
        );
        const data = await response.json();
        showLeaderboard(data.top10, data.userRank);
      } catch (error) {
        console.error("Ошибка при загрузке таблицы лидеров:", error);
      }
    });
  });

  // Кнопка закрытия модального окна
  const closeModalBtn = document.querySelector(".close-modal");
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", hideLeaderboard);
  }

  // Закрытие модального окна при клике вне его
  window.addEventListener("click", (event) => {
    const modal = document.getElementById("leaderboardModal");
    if (event.target === modal) {
      hideLeaderboard();
    }
  });
});

// Функция окончания игры
function endGame() {
  isGameRunning = false;
  clearTimeout(targetTimer);

  const username = tg.initDataUnsafe?.user?.username || "Аноним";

  // Сохраняем счет
  saveUserScore();

  // Показываем экран окончания игры
  const gameOverScreen = document.getElementById("gameOverScreen");
  const finalScore = document.getElementById("finalScore");
  finalScore.textContent = coins;

  // Скрываем игровой контейнер
  gameContainer.style.display = "none";
  gameOverScreen.style.display = "flex";
}

// Обработчик кнопки "Продолжить позже"
document.getElementById("continueLater").addEventListener("click", endGame);

// Обработчик кнопки "Продолжить позже" на экране окончания игры
document
  .getElementById("continueLaterFromGameOver")
  .addEventListener("click", endGame);

// Обновляем функцию startGame
function startGame() {
  // Скрываем заставку
  intro.style.display = "none";

  // Показываем игровой контейнер
  document.getElementById("gameContainer").style.display = "block";

  // Загружаем сохраненные очки пользователя
  loadUserScore();

  // Запускаем игру
  isGameRunning = true;
  showTarget();

  // Запускаем историю только если звук включен
  if (isSoundOn) {
    storyAudio
      .play()
      .catch((e) => console.log("Ошибка воспроизведения истории:", e));
  }
}

// Загружаем сохраненные данные при старте
document.addEventListener("DOMContentLoaded", () => {
  // Загружаем сохраненный счет
  const savedScore = localStorage.getItem("gameScore");
  if (savedScore) {
    coins = parseInt(savedScore);
    updateScore();
  }

  // Загружаем данные пользователя
  const user = tg.initDataUnsafe?.user;
  if (user) {
    console.log("Пользователь авторизован:", user.username);
    // Сохраняем данные пользователя
    localStorage.setItem(
      "telegram_user",
      JSON.stringify({
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
      })
    );
  }
});
