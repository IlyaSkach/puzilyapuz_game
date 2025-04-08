const express = require("express");
const cors = require("cors");
const path = require("path");
const { connectDB, Leaderboard } = require("./db");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Подключаемся к базе данных
connectDB();

// Маршрут для получения таблицы лидеров
app.get("/api/leaderboard", async (req, res) => {
  try {
    const username = req.query.username;
    const leaderboard = await Leaderboard.find().sort({ score: -1 });

    // Получаем топ-10
    const top10 = leaderboard.slice(0, 10);

    // Если указано имя пользователя, находим его место
    let userRank = null;
    if (username) {
      const userIndex = leaderboard.findIndex(
        (player) => player.username === username
      );
      if (userIndex !== -1) {
        userRank = {
          rank: userIndex + 1,
          username: username,
          score: leaderboard[userIndex].score,
        };
      }
    }

    res.json({ top10, userRank });
  } catch (error) {
    console.error("Ошибка при получении таблицы лидеров:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Маршрут для сохранения счета
app.post("/api/scores", async (req, res) => {
  try {
    const { username, score } = req.body;
    console.log("Получен запрос на сохранение счета:", { username, score });

    // Находим пользователя в таблице лидеров
    let userScore = await Leaderboard.findOne({ username });

    if (userScore) {
      // Если пользователь уже есть, обновляем его счет, если новый счет выше
      if (score > userScore.score) {
        userScore.score = score;
        await userScore.save();
        console.log("Обновлен счет для пользователя:", username);
      }
    } else {
      // Если пользователя нет, создаем новую запись
      userScore = new Leaderboard({ username, score });
      await userScore.save();
      console.log("Создана новая запись для пользователя:", username);
    }

    // Получаем обновленную таблицу лидеров
    const leaderboard = await Leaderboard.find().sort({ score: -1 });
    const top10 = leaderboard.slice(0, 10);

    // Находим место пользователя
    const userIndex = leaderboard.findIndex(
      (player) => player.username === username
    );
    const userRank = {
      rank: userIndex + 1,
      username: username,
      score: leaderboard[userIndex].score,
    };

    res.json({ success: true, top10, userRank });
  } catch (error) {
    console.error("Ошибка при сохранении счета:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Serve index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
