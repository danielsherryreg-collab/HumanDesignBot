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
        analyticsEvents: [],
        nextUserId: 1,
        nextChartRequestId: 1,
        nextAnalyticsEventId: 1
      };
      persist();
    }
  }

  store.analyticsEvents ||= [];
  store.nextAnalyticsEventId ||= 1;

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

function upsertUser(from, source = null) {
  const database = getDb();
  const now = new Date().toISOString();
  let user = database.users.find((item) => item.telegram_id === from.id);

  if (!user) {
    user = {
      id: database.nextUserId,
      telegram_id: from.id,
      first_source: source,
      created_at: now
    };
    database.nextUserId += 1;
    database.users.push(user);
  }

  user.username = from.username || null;
  user.first_name = from.first_name || null;
  user.last_name = from.last_name || null;
  if (source) {
    user.first_source ||= source;
    user.latest_source = source;
  }
  user.updated_at = now;

  persist();

  return user;
}

function trackEvent({ userId, eventName, source = null, metadata = null }) {
  const database = getDb();
  const user = database.users.find((item) => item.id === userId);
  const effectiveSource = source || user?.latest_source || user?.first_source || null;
  const [platform = null, category = null, contentId = null] = String(effectiveSource || "").split("_");
  const row = {
    id: database.nextAnalyticsEventId,
    user_id: userId,
    event_name: eventName,
    source: effectiveSource,
    platform,
    category,
    content_id: contentId,
    metadata,
    created_at: new Date().toISOString()
  };

  database.nextAnalyticsEventId += 1;
  database.analyticsEvents.push(row);
  persist();
  return row;
}

function getAnalyticsSummary(days = 7) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const events = getDb().analyticsEvents.filter((event) => Date.parse(event.created_at) >= since);
  const eventNames = ["bot_started", "calculation_started", "birth_data_completed", "calculation_completed", "paywall_viewed", "payment_started", "payment_succeeded", "report_delivered"];
  const counts = Object.fromEntries(eventNames.map((name) => [name, new Set()]));
  let revenueStars = 0;

  for (const event of events) {
    counts[event.event_name]?.add(event.user_id);
    if (event.event_name === "payment_succeeded") revenueStars += Number(event.metadata?.amount || 0);
  }

  return {
    days,
    counts: Object.fromEntries(Object.entries(counts).map(([name, users]) => [name, users.size])),
    revenueStars
  };
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

function getChartRequestById(id) {
  return getDb().chartRequests.find((row) => row.id === Number(id)) || null;
}

module.exports = {
  getDb,
  initDb,
  upsertUser,
  trackEvent,
  getAnalyticsSummary,
  saveChartRequest,
  getRecentChartRequests,
  getChartRequestById
};
