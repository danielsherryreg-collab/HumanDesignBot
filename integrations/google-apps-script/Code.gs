const STATISTICS_SHEET = "Статистика";
const EVENTS_SHEET = "События";
const SPREADSHEET_ID = "1TymmU0TCkH9wgrdg1R5C7_FF6_R_RZYDRocfi4qgFjY";

const STATISTICS_HEADERS = [
  "Код публикации",
  "Площадка",
  "Рубрика",
  "Номер публикации",
  "Запуски",
  "Начали расчет",
  "Заполнили данные",
  "Завершили расчет",
  "Увидели оффер",
  "Начали оплату",
  "Оплаты",
  "Получили отчет",
  "Выручка Stars",
  "Последнее событие"
];

const EVENT_COLUMNS = {
  bot_started: 5,
  calculation_started: 6,
  birth_data_completed: 7,
  calculation_completed: 8,
  paywall_viewed: 9,
  payment_started: 10,
  payment_succeeded: 11,
  report_delivered: 12
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const expectedSecret = PropertiesService.getScriptProperties().getProperty("ANALYTICS_SECRET");

    if (!expectedSecret || payload.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: "unauthorized" });
    }

    const event = payload.event || {};
    appendRawEvent(event);
    updateStatistics(event);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error.message || error) });
  } finally {
    lock.releaseLock();
  }
}

function setupSheets() {
  getOrCreateSheet(STATISTICS_SHEET, STATISTICS_HEADERS);
  getOrCreateSheet(EVENTS_SHEET, ["Дата", "Пользователь", "Событие", "Код публикации", "Площадка", "Рубрика", "Номер публикации", "Данные"]);
}

function updateStatistics(event) {
  const source = event.source || "direct";
  const sheet = getOrCreateSheet(STATISTICS_SHEET, STATISTICS_HEADERS);
  const row = findOrCreateSourceRow(sheet, source, event);
  const eventColumn = EVENT_COLUMNS[event.event_name];

  if (eventColumn) {
    const cell = sheet.getRange(row, eventColumn);
    cell.setValue(Number(cell.getValue() || 0) + 1);
  }

  if (event.event_name === "payment_succeeded") {
    const revenueCell = sheet.getRange(row, 13);
    revenueCell.setValue(Number(revenueCell.getValue() || 0) + Number(event.metadata?.amount || 0));
  }

  sheet.getRange(row, 14).setValue(new Date(event.created_at || Date.now()));
}

function appendRawEvent(event) {
  const headers = ["Дата", "Пользователь", "Событие", "Код публикации", "Площадка", "Рубрика", "Номер публикации", "Данные"];
  const sheet = getOrCreateSheet(EVENTS_SHEET, headers);
  sheet.appendRow([
    new Date(event.created_at || Date.now()),
    event.user_id || "",
    event.event_name || "",
    event.source || "direct",
    event.platform || "",
    event.category || "",
    event.content_id || "",
    JSON.stringify(event.metadata || {})
  ]);
}

function findOrCreateSourceRow(sheet, source, event) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const sources = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const index = sources.indexOf(source);
    if (index !== -1) return index + 2;
  }

  sheet.appendRow([
    source,
    event.platform || "",
    event.category || "",
    event.content_id || "",
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    new Date(event.created_at || Date.now())
  ]);
  return sheet.getLastRow();
}

function getOrCreateSheet(name, headers) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
