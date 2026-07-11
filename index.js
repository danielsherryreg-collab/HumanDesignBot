const { createBot } = require("./src/bot/bot");
const { config } = require("./src/config/config");
const { initDb } = require("./src/db/database");
const http = require("http");

function startHealthServer() {
  const port = process.env.PORT;

  if (!port) {
    return null;
  }

  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Human Design Natal bot is running");
  });

  server.listen(port, () => {
    console.log(`Health server is listening on port ${port}.`);
  });

  return server;
}

async function main() {
  if (!config.botToken) {
    throw new Error("BOT_TOKEN is missing. Copy .env.example to .env and add your Telegram bot token.");
  }

  initDb();
  const healthServer = startHealthServer();

  const bot = createBot();
  await bot.launch();

  console.log("Human Design Natal bot is running.");

  process.once("SIGINT", () => {
    bot.stop("SIGINT");
    healthServer?.close();
  });
  process.once("SIGTERM", () => {
    bot.stop("SIGTERM");
    healthServer?.close();
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
