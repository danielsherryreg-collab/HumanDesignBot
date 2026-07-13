const STATISTICS_SHEET = "Статистика";
const EVENTS_SHEET = "События";
const PARTNERS_SHEET = "Партнёры";
const SPREADSHEET_ID = "1TymmU0TCkH9wgrdg1R5C7_FF6_R_RZYDRocfi4qgFjY";

const STATISTICS_HEADERS = [
  "Код ссылки",
  "Канал",
  "Партнёр",
  "Размещение",
  "Запуски",
  "Начали расчёт",
  "Заполнили данные",
  "Завершили расчёт",
  "Увидели оффер",
  "CTA-клики",
  "Оплаты",
  "Получили отчёт",
  "Выручка Stars",
  "Конверсия в расчёт",
  "Конверсия CTA",
  "Конверсия в оплату",
  "Комиссия %",
  "Комиссия Stars",
  "Чистая выручка Stars",
  "Статус выплаты",
  "Последнее событие"
];

const EVENT_HEADERS = [
  "Дата",
  "Пользователь",
  "Событие",
  "Код ссылки",
  "Канал",
  "Партнёр/рубрика",
  "Размещение",
  "Данные"
];

const PARTNER_HEADERS = [
  "Код партнёра",
  "Имя",
  "Контакт",
  "Комиссия %",
  "Статус",
  "Дата старта"
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
  const statistics = getOrCreateSheet(STATISTICS_SHEET, STATISTICS_HEADERS);
  const events = getOrCreateSheet(EVENTS_SHEET, EVENT_HEADERS);
  const partners = getOrCreateSheet(PARTNERS_SHEET, PARTNER_HEADERS);

  statistics.getRange("N:P").setNumberFormat("0.0%");
  statistics.getRange("Q:Q").setNumberFormat("0.0%");
  partners.getRange("D:D").setNumberFormat("0.0%");
  events.getRange("A:A").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  statistics.getRange("U:U").setNumberFormat("yyyy-mm-dd hh:mm:ss");

  statistics.autoResizeColumns(1, STATISTICS_HEADERS.length);
  events.autoResizeColumns(1, EVENT_HEADERS.length);
  partners.autoResizeColumns(1, PARTNER_HEADERS.length);
}

function updateStatistics(event) {
  const source = event.source || "direct";
  const parsed = parseSource(source, event);
  const sheet = getOrCreateSheet(STATISTICS_SHEET, STATISTICS_HEADERS);
  const row = findOrCreateSourceRow(sheet, source, parsed, event);
  const eventColumn = EVENT_COLUMNS[event.event_name];

  if (eventColumn) {
    const cell = sheet.getRange(row, eventColumn);
    cell.setValue(Number(cell.getValue() || 0) + 1);
  }

  if (event.event_name === "payment_succeeded") {
    const revenueCell = sheet.getRange(row, 13);
    revenueCell.setValue(Number(revenueCell.getValue() || 0) + Number(event.metadata?.amount || 0));
  }

  setCalculatedFields(sheet, row, parsed.isAffiliate);
  sheet.getRange(row, 21).setValue(new Date(event.created_at || Date.now()));
}

function appendRawEvent(event) {
  const parsed = parseSource(event.source || "direct", event);
  const sheet = getOrCreateSheet(EVENTS_SHEET, EVENT_HEADERS);
  sheet.appendRow([
    new Date(event.created_at || Date.now()),
    event.user_id || "",
    event.event_name || "",
    event.source || "direct",
    parsed.channel,
    parsed.partner,
    parsed.placement,
    JSON.stringify(event.metadata || {})
  ]);
}

function parseSource(source, event) {
  const parts = String(source || "direct").split("_");
  const channel = parts[0] || event.platform || "direct";
  const isAffiliate = channel === "aff";

  return {
    channel,
    partner: isAffiliate ? (parts[1] || "") : (event.category || parts[1] || ""),
    placement: parts.slice(2).join("_") || event.content_id || "",
    isAffiliate
  };
}

function findOrCreateSourceRow(sheet, source, parsed, event) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const sources = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const index = sources.indexOf(source);
    if (index !== -1) return index + 2;
  }

  sheet.appendRow([
    source,
    parsed.channel,
    parsed.partner,
    parsed.placement,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    "", "", "", "", "", "", parsed.isAffiliate ? "Ожидает" : "",
    new Date(event.created_at || Date.now())
  ]);

  const row = sheet.getLastRow();
  setCalculatedFields(sheet, row, parsed.isAffiliate);
  return row;
}

function setCalculatedFields(sheet, row, isAffiliate) {
  sheet.getRange(row, 14).setFormula(`=IFERROR(H${row}/E${row},0)`);
  sheet.getRange(row, 15).setFormula(`=IFERROR(J${row}/I${row},0)`);
  sheet.getRange(row, 16).setFormula(`=IFERROR(K${row}/E${row},0)`);

  if (isAffiliate) {
    sheet.getRange(row, 17).setFormula(`=IFERROR(VLOOKUP(C${row},'${PARTNERS_SHEET}'!A:D,4,FALSE),0)`);
  } else {
    sheet.getRange(row, 17).setValue(0);
  }

  sheet.getRange(row, 18).setFormula(`=M${row}*Q${row}`);
  sheet.getRange(row, 19).setFormula(`=M${row}-R${row}`);
  sheet.getRange(row, 14, 1, 4).setNumberFormat("0.0%");
}

function getOrCreateSheet(name, headers) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#4c1d95")
    .setFontColor("#ffffff");
  sheet.setFrozenRows(1);

  return sheet;
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
