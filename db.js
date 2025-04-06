const mongoose = require("mongoose");

// Схема для таблицы лидеров
const leaderboardSchema = new mongoose.Schema({
  username: { type: String, required: true },
  score: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

// Модель для таблицы лидеров
const Leaderboard = mongoose.model("Leaderboard", leaderboardSchema);

// Функция для подключения к базе данных
async function connectDB() {
  try {
    // Используем переменную окружения для URL базы данных
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/tggame";
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB подключена успешно");
  } catch (error) {
    console.error("Ошибка подключения к MongoDB:", error);
    process.exit(1);
  }
}

module.exports = { connectDB, Leaderboard };
