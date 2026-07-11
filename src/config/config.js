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
  fullReportStars: Number(process.env.FULL_REPORT_STARS || 150)
};

module.exports = { config };
