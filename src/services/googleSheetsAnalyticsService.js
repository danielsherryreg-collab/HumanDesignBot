const { config } = require("../config/config");

async function sendAnalyticsEvent(event) {
  if (!config.googleSheetsWebhookUrl || !config.googleSheetsSecret) return;

  try {
    const response = await fetch(config.googleSheetsWebhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: config.googleSheetsSecret,
        event
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      console.error("Google Sheets analytics error", response.status);
    }
  } catch (error) {
    console.error("Google Sheets analytics unavailable", error.message);
  }
}

module.exports = { sendAnalyticsEvent };
