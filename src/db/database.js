const fs = require("fs");
const path = require("path");
const { config } = require("../config/config");

let store;

function getStorePath() {
  return config.databasePath.replace(/\.sqlite$/i, ".json");
}

function getDb() {
  if (!store) {
    const storePath = getStorePath();
    fs.mkdirSync(path.dirname(storePath), { recursive: true });

    if (fs.existsSync(storePath)) {
      store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    } else {
      store = {
        users: [],
        chartRequests: [],
        nextUserId: 1,
        nextChartRequestId: 1
      };
      persist();
    }
  }

  return store;
}

function initDb() {
  getDb();
}

function persist() {
  const storePath = getStorePath();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");
}

function upsertUser(from) {
  const database = getDb();
  const now = new Date().toISOString();
  let user = database.users.find((item) => item.telegram_id === from.id);

  if (!user) {
    user = {
      id: database.nextUserId,
      telegram_id: from.id,
      created_at: now
    };
    database.nextUserId += 1;
    database.users.push(user);
  }

  user.username = from.username || null;
  user.first_name = from.first_name || null;
  user.last_name = from.last_name || null;
  user.updated_at = now;

  persist();

  return user;
}

function saveChartRequest({ userId, birth, chart, reportText }) {
  const database = getDb();
  const row = {
    id: database.nextChartRequestId,
    user_id: userId,
    birth,
    chart,
    report_text: reportText,
    created_at: new Date().toISOString()
  };

  database.nextChartRequestId += 1;
  database.chartRequests.push(row);
  persist();

  return row;
}

function getRecentChartRequests(userId, limit = 5) {
  return getDb().chartRequests
    .filter((row) => row.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

module.exports = {
  getDb,
  initDb,
  upsertUser,
  saveChartRequest,
  getRecentChartRequests
};
