const path = require("path");
require("dotenv").config();

const rootDir = path.resolve(__dirname, "..", "..");

const config = {
  rootDir,
  botToken: process.env.BOT_TOKEN || "",
  databasePath: path.resolve(rootDir, process.env.DATABASE_PATH || "./data/bot.sqlite"),
  nominatimEmail: process.env.NOMINATIM_EMAIL || "",
  nominatimUserAgent: process.env.NOMINATIM_USER_AGENT || "HumanDesignNatalBot/0.1",
  ephemerisPath: path.resolve(rootDir, process.env.EPHEMERIS_PATH || "./ephe"),
  fullReportStars: Number(process.env.FULL_REPORT_STARS || 150),
  adminTelegramIds: String(process.env.ADMIN_TELEGRAM_IDS || "").split(",").map((value) => Number(value.trim())).filter((value) => Number.isFinite(value) && value > 0),
  googleSheetsWebhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || "",
  googleSheetsSecret: process.env.GOOGLE_SHEETS_SECRET || ""
};

module.exports = { config };
