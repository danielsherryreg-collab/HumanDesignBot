const path = require("path");
const { Telegraf, Markup, session } = require("telegraf");
const { config } = require("../config/config");
const { upsertUser, saveChartRequest, getRecentChartRequests, getChartRequestById, trackEvent, getAnalyticsSummary } = require("../db/database");
const { geocodePlace, getTimezone } = require("../services/geoService");
const { calculateNatalChart } = require("../services/chartService");
const { buildInterpretation } = require("../services/interpretationService");
const { buildFullReport, buildNatalChartSvg } = require("../services/fullReportService");
const { buildCompatibilityReport } = require("../services/compatibilityService");
const { buildDailyForecast } = require("../services/dailyForecastService");
const { buildNatalReportPdf } = require("../services/pdfReportService");
const { parseDate, parseTime } = require("../utils/validators");

const STEPS = {
  DATE: "date",
  TIME: "time",
  PLACE: "place",
  COMPAT_A_DATE: "compat_a_date",
  COMPAT_A_TIME: "compat_a_time",
  COMPAT_A_PLACE: "compat_a_place",
  COMPAT_B_DATE: "compat_b_date",
  COMPAT_B_TIME: "compat_b_time",
  COMPAT_B_PLACE: "compat_b_place"
};

const MAIN_MENU_IMAGE_PATH = path.resolve(__dirname, "..", "..", "assets", "main-menu.png");
const MAIN_MENU_TEXT = [
  "🌌 Главное меню",
  "",
  "Рассчитайте натальную карту и узнайте больше о своём характере, талантах, отношениях, деньгах и точках роста.",
  "",
  "Выберите действие ниже:"
].join("\n");

const FULL_REPORT_TEXT = [
  "🔮 Вы получили только краткий разбор своей натальной карты.",
  "",
  "Это менее 10% информации, которую можно узнать по вашим дате, времени и месту рождения.",
  "",
  "✨ В полном персональном отчете вы узнаете:",
  "",
  "• Ваши сильные и слабые стороны.",
  "• Предназначение и скрытые таланты.",
  "• Что мешает достигать целей.",
  "• Особенности отношений и совместимости.",
  "• Наиболее подходящие сферы для карьеры и финансов.",
  "• Главные жизненные уроки и точки роста.",
  "",
  "📖 Это индивидуальный разбор, созданный именно по вашим данным. Никаких общих гороскопов — только персональная интерпретация вашей натальной карты.",
  "",
  "Нажмите кнопку ниже и получите полный отчет, который поможет взглянуть на себя с новой стороны."
].join("\n");

const WELCOME_TEXT = [
  "✨ Ваша натальная карта — это личная карта характера, талантов и жизненных сценариев.",
  "",
  "По дате, времени и месту рождения я покажу:",
  "• где ваша сильная энергия",
  "• как вы проявляетесь в отношениях",
  "• какие сферы подходят для денег и карьеры",
  "• что может мешать достигать целей",
  "• какие точки роста заложены в вашей карте",
  "",
  "Сначала вы получите краткий разбор бесплатно.",
  "После этого сможете открыть полный персональный отчёт со схемой натальной карты.",
  "",
  "🔮 Начнём?"
].join("\n");

const HELP_TEXT = [
  "❓ Помощь",
  "",
  "Чтобы рассчитать карту, мне нужны:",
  "",
  "• дата рождения в формате ГГГГ-ММ-ДД",
  "• точное время рождения в формате ЧЧ:ММ",
  "• место рождения: город и страна",
  "",
  "Чем точнее время рождения, тем точнее Асцендент и дома.",
  "",
  "Для совместимости нужны такие же данные двух людей.",
  "",
  "Прогноз дня можно смотреть каждый день — если карта уже рассчитана, бот добавит персональный акцент.",
  "",
  "Оплата полного отчета проходит через Telegram Stars. После оплаты бот автоматически отправит астральную карту и подробный разбор."
].join("\n");

const COMPATIBILITY_INTRO_TEXT = [
  "💞 Совместимость",
  "",
  "Я рассчитаю две натальные карты и сравню эмоциональную, романтическую и характерную совместимость.",
  "",
  "Сначала введите данные первого человека, затем второго."
].join("\n");

function mainKeyboard() {
  return Markup.keyboard([
    ["🔮 Рассчитать карту", "💞 Совместимость"],
    ["🌙 Прогноз дня", "📜 История"],
    ["✨ Полный отчёт", "📄 PDF отчёт"],
    ["❓ Помощь"]
  ]).resize();
}

function detailedReportKeyboard(requestId) {
  const action = requestId ? `full_report:${requestId}` : "full_report";
  return Markup.inlineKeyboard([[Markup.button.callback("📖 Подробный отчет", action)]]);
}

function startKeyboard() {
  return Markup.inlineKeyboard([[Markup.button.callback("🔮 Рассчитать карту", "start_chart")]]);
}

function helpKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🔮 Рассчитать карту", "start_chart")],
    [Markup.button.callback("📜 Мои расчёты", "show_history")]
  ]);
}

function fullReportIntroKeyboard(requestId) {
  if (!requestId) {
    return Markup.inlineKeyboard([[Markup.button.callback("🔮 Сначала рассчитать карту", "start_chart")]]);
  }

  return Markup.inlineKeyboard([
    [Markup.button.callback("📖 Посмотреть описание", `full_report:${requestId}`)],
    [Markup.button.callback("🌌 Получить полный отчет", `pay_full_report:${requestId}`)],
    [Markup.button.callback("📄 Получить PDF", `pdf_report:${requestId}`)]
  ]);
}

function paymentKeyboard(requestId) {
  const action = requestId ? `pay_full_report:${requestId}` : "pay_full_report";
  const pdfAction = requestId ? `pdf_report:${requestId}` : "pdf_report";
  return Markup.inlineKeyboard([
    [Markup.button.callback("🌌 Получить полный отчет", action)],
    [Markup.button.callback("📄 Получить PDF", pdfAction)],
    [Markup.button.callback("⬅️ Обратно в меню", "back_to_menu")]
  ]);
}

async function sendWelcomeWindow(ctx) {
  await ctx.reply(WELCOME_TEXT, mainKeyboard());
}

async function sendMainMenu(ctx) {
  try {
    await ctx.replyWithPhoto(
      { source: MAIN_MENU_IMAGE_PATH },
      {
        caption: MAIN_MENU_TEXT,
        ...mainKeyboard()
      }
    );
  } catch (error) {
    console.error("Main menu image error", error);
    await ctx.reply(MAIN_MENU_TEXT, mainKeyboard());
  }
}

function createBot() {
  const bot = new Telegraf(config.botToken);

  bot.use(session());

  bot.start(async (ctx) => {
    const source = parseStartSource(ctx.startPayload);
    const user = upsertUser(ctx.from, source);
    trackEvent({ userId: user.id, eventName: "bot_started", source });
    ctx.session = {};

    await sendWelcomeWindow(ctx);
    await sendMainMenu(ctx);
  });

  bot.hears("🔮 Рассчитать карту", async (ctx) => {
    await askDate(ctx);
  });

  bot.hears("💞 Совместимость", async (ctx) => {
    await askCompatibilityStart(ctx);
  });

  bot.hears("🌙 Прогноз дня", async (ctx) => {
    await sendDailyForecast(ctx);
  });

  bot.hears("📄 PDF отчёт", async (ctx) => {
    await sendLatestPdfReport(ctx);
  });

  bot.action("start_chart", async (ctx) => {
    await ctx.answerCbQuery();
    await askDate(ctx);
  });

  bot.command("new", async (ctx) => {
    await askDate(ctx);
  });

  bot.action(/^full_report(?::(\d+))?$/, async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = ctx.match?.[1] || getLatestRequestId(ctx.from);
    trackUserEvent(ctx.from, "paywall_viewed", { requestId });
    await ctx.reply(FULL_REPORT_TEXT, paymentKeyboard(requestId));
  });

  bot.action(/^pay_full_report(?::(\d+))?$/, async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = ctx.match?.[1] || getLatestRequestId(ctx.from);

    if (!requestId) {
      await ctx.reply("Сначала рассчитайте карту, чтобы я мог подготовить полный отчет.", mainKeyboard());
      return;
    }

    const request = getChartRequestById(requestId);

    if (!request) {
      await ctx.reply("Не нашел расчет. Создайте карту заново: /new", mainKeyboard());
      return;
    }

    trackUserEvent(ctx.from, "payment_started", { requestId: request.id });
    await sendFullReportInvoice(ctx, request.id);
  });

  bot.action(/^pdf_report(?::(\d+))?$/, async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = ctx.match?.[1] || getLatestRequestId(ctx.from);

    if (!requestId) {
      await ctx.reply("Сначала рассчитайте карту, чтобы я мог подготовить PDF-отчет.", mainKeyboard());
      return;
    }

    const request = getChartRequestById(requestId);

    if (!request) {
      await ctx.reply("Не нашел расчет. Создайте карту заново: /new", mainKeyboard());
      return;
    }

    await sendPdfReport(ctx, request);
  });

  bot.on("pre_checkout_query", async (ctx) => {
    const query = ctx.update.pre_checkout_query;
    const expectedAmount = config.fullReportStars;
    const request = getRequestFromPayload(query.invoice_payload);

    if (!request || request.user_id !== upsertUser(query.from).id || query.currency !== "XTR" || query.total_amount !== expectedAmount) {
      trackUserEvent(query.from, "payment_failed", { reason: "pre_checkout_validation" });
      await ctx.answerPreCheckoutQuery(false, "Платеж не прошел проверку. Попробуйте еще раз.");
      return;
    }

    await ctx.answerPreCheckoutQuery(true);
  });

  bot.on("successful_payment", async (ctx) => {
    const payment = ctx.message.successful_payment;

    if (payment.currency !== "XTR") {
      return;
    }

    const request = getRequestFromPayload(payment.invoice_payload);

    if (!request) {
      trackUserEvent(ctx.from, "payment_failed", { reason: "request_not_found" });
      await ctx.reply("✅ Оплата прошла успешно, но я не нашел расчет. Напишите /new и создайте карту заново.", mainKeyboard());
      return;
    }

    trackUserEvent(ctx.from, "payment_succeeded", {
      requestId: request.id,
      amount: payment.total_amount,
      currency: payment.currency,
      telegramPaymentChargeId: payment.telegram_payment_charge_id
    });
    await sendPaidFullReport(ctx, request);
  });

  bot.command("analytics", async (ctx) => {
    if (!config.adminTelegramIds.includes(ctx.from.id)) return;
    const summary = getAnalyticsSummary(7);
    const count = summary.counts;
    await ctx.reply([
      "Аналитика за 7 дней", "",
      `Запуски: ${count.bot_started}`,
      `Начали расчет: ${count.calculation_started}`,
      `Заполнили данные: ${count.birth_data_completed}`,
      `Получили результат: ${count.calculation_completed}`,
      `Увидели оффер: ${count.paywall_viewed}`,
      `Начали оплату: ${count.payment_started}`,
      `Оплатили: ${count.payment_succeeded}`,
      `Получили отчет: ${count.report_delivered}`, "",
      `Выручка: ${summary.revenueStars} Stars`
    ].join("\n"));
  });

  bot.action("back_to_menu", async (ctx) => {
    await ctx.answerCbQuery();
    await sendMainMenu(ctx);
  });

  bot.hears("✨ Полный отчёт", async (ctx) => {
    const requestId = getLatestRequestId(ctx.from);

    if (!requestId) {
      await ctx.reply(
        "✨ Полный отчет создается по вашей натальной карте.\n\nСначала рассчитайте карту — после этого я смогу подготовить персональный разбор.",
        fullReportIntroKeyboard(null)
      );
      return;
    }

    await ctx.reply(
      "✨ Полный персональный отчет\n\nУ вас уже есть сохраненная карта. Вы можете посмотреть описание отчета или сразу открыть тестовую выдачу полного отчета.",
      fullReportIntroKeyboard(requestId)
    );
  });

  bot.hears("❓ Помощь", async (ctx) => {
    await ctx.reply(HELP_TEXT, helpKeyboard());
  });

  bot.action("show_history", async (ctx) => {
    await ctx.answerCbQuery();
    await showHistory(ctx);
  });

  bot.hears("📜 История", showHistory);

  async function showHistory(ctx) {
    const user = upsertUser(ctx.from);
    const history = getRecentChartRequests(user.id, 5);

    if (!history.length) {
      await ctx.reply("Истории пока нет. Нажми «🔮 Рассчитать карту», чтобы создать первую.", startKeyboard());
      return;
    }

    await ctx.reply("Последние расчеты:");

    for (const [index, item] of history.entries()) {
      const text = [
        `${index + 1}. ${item.birth.date} ${item.birth.time}`,
        `Место: ${item.birth.place}`,
        `Создано: ${formatDateTime(item.created_at)}`
      ].join("\n");

      await ctx.reply(text, detailedReportKeyboard(item.id));
    }
  }

  bot.on("text", async (ctx) => {
    const step = ctx.session?.step;

    if (step === STEPS.DATE) {
      return handleDate(ctx);
    }

    if (step === STEPS.TIME) {
      return handleTime(ctx);
    }

    if (step === STEPS.PLACE) {
      return handlePlace(ctx);
    }

    if (step === STEPS.COMPAT_A_DATE || step === STEPS.COMPAT_B_DATE) {
      return handleCompatibilityDate(ctx);
    }

    if (step === STEPS.COMPAT_A_TIME || step === STEPS.COMPAT_B_TIME) {
      return handleCompatibilityTime(ctx);
    }

    if (step === STEPS.COMPAT_A_PLACE || step === STEPS.COMPAT_B_PLACE) {
      return handleCompatibilityPlace(ctx);
    }

    return sendMainMenu(ctx);
  });

  bot.catch((error, ctx) => {
    console.error("Bot error", error);
    ctx.reply("Что-то пошло не так. Попробуй еще раз или начни заново: /new").catch(() => {});
  });

  return bot;
}

async function askDate(ctx) {
  const user = upsertUser(ctx.from);
  trackEvent({ userId: user.id, eventName: "calculation_started" });
  ctx.session = {
    step: STEPS.DATE,
    birth: {}
  };

  await ctx.reply("Введи дату рождения в формате ГГГГ-ММ-ДД. Например: 1998-04-12");
}

async function handleDate(ctx) {
  const date = parseDate(ctx.message.text);

  if (!date) {
    await ctx.reply("Не вижу дату. Введи в формате ГГГГ-ММ-ДД, например: 1998-04-12");
    return;
  }

  ctx.session.birth.date = date;
  ctx.session.step = STEPS.TIME;

  await ctx.reply("Теперь введи точное время рождения в формате ЧЧ:ММ. Например: 14:35");
}

async function handleTime(ctx) {
  const time = parseTime(ctx.message.text);

  if (!time) {
    await ctx.reply("Не вижу время. Введи в формате ЧЧ:ММ, например: 14:35");
    return;
  }

  ctx.session.birth.time = time;
  ctx.session.step = STEPS.PLACE;

  await ctx.reply("Теперь введи место рождения: город и страна. Например: Tbilisi, Georgia");
}

async function handlePlace(ctx) {
  const placeInput = ctx.message.text.trim();

  if (placeInput.length < 2) {
    await ctx.reply("Введи город и страну, например: Tbilisi, Georgia");
    return;
  }

  await ctx.reply("Секунду, ищу координаты, часовой пояс и считаю карту...");

  trackUserEvent(ctx.from, "birth_data_completed");

  try {
    const geo = await geocodePlace(placeInput);
    const timezone = getTimezone(geo.lat, geo.lon);
    const birth = {
      ...ctx.session.birth,
      place: geo.place,
      lat: geo.lat,
      lon: geo.lon,
      timezone
    };
    const chart = await calculateNatalChart(birth);
    const reportText = buildInterpretation({ birth, chart });
    const user = upsertUser(ctx.from);

    const savedRequest = saveChartRequest({
      userId: user.id,
      birth,
      chart,
      reportText
    });
    trackEvent({ userId: user.id, eventName: "calculation_completed", metadata: { requestId: savedRequest.id } });

    ctx.session = {};

    await ctx.reply(reportText, detailedReportKeyboard(savedRequest.id));
  } catch (error) {
    trackUserEvent(ctx.from, "calculation_failed", { reason: error.message || "unknown" });
    if (error.message === "PLACE_NOT_FOUND") {
      await ctx.reply("Не нашел такое место. Попробуй написать город и страну латиницей или подробнее.");
      return;
    }

    console.error(error);
    await ctx.reply("Не смог завершить расчет. Проверь место рождения или попробуй позже.");
  }
}

async function askCompatibilityStart(ctx) {
  upsertUser(ctx.from);
  ctx.session = {
    step: STEPS.COMPAT_A_DATE,
    compatibility: {
      personA: {},
      personB: {}
    }
  };

  await ctx.reply(COMPATIBILITY_INTRO_TEXT);
  await ctx.reply("Введите дату рождения первого человека в формате ГГГГ-ММ-ДД. Например: 1998-04-12");
}

async function handleCompatibilityDate(ctx) {
  const date = parseDate(ctx.message.text);

  if (!date) {
    await ctx.reply("Не вижу дату. Введите в формате ГГГГ-ММ-ДД, например: 1998-04-12");
    return;
  }

  const person = getCompatibilityPerson(ctx);
  person.date = date;
  ctx.session.step = ctx.session.step === STEPS.COMPAT_A_DATE ? STEPS.COMPAT_A_TIME : STEPS.COMPAT_B_TIME;

  await ctx.reply(`Теперь введите точное время рождения ${getCompatibilityPersonLabel(ctx)} в формате ЧЧ:ММ. Например: 14:35`);
}

async function handleCompatibilityTime(ctx) {
  const time = parseTime(ctx.message.text);

  if (!time) {
    await ctx.reply("Не вижу время. Введите в формате ЧЧ:ММ, например: 14:35");
    return;
  }

  const person = getCompatibilityPerson(ctx);
  person.time = time;
  ctx.session.step = ctx.session.step === STEPS.COMPAT_A_TIME ? STEPS.COMPAT_A_PLACE : STEPS.COMPAT_B_PLACE;

  await ctx.reply(`Теперь введите место рождения ${getCompatibilityPersonLabel(ctx)}: город и страна. Например: Tbilisi, Georgia`);
}

async function handleCompatibilityPlace(ctx) {
  const placeInput = ctx.message.text.trim();

  if (placeInput.length < 2) {
    await ctx.reply("Введите город и страну, например: Tbilisi, Georgia");
    return;
  }

  await ctx.reply("Секунду, ищу координаты и часовой пояс...");

  try {
    const geo = await geocodePlace(placeInput);
    const timezone = getTimezone(geo.lat, geo.lon);
    const person = getCompatibilityPerson(ctx);

    Object.assign(person, {
      place: geo.place,
      lat: geo.lat,
      lon: geo.lon,
      timezone
    });

    if (ctx.session.step === STEPS.COMPAT_A_PLACE) {
      ctx.session.step = STEPS.COMPAT_B_DATE;
      await ctx.reply("Теперь введите дату рождения второго человека в формате ГГГГ-ММ-ДД. Например: 1999-08-21");
      return;
    }

    await finishCompatibility(ctx);
  } catch (error) {
    if (error.message === "PLACE_NOT_FOUND") {
      await ctx.reply("Не нашел такое место. Попробуйте написать город и страну латиницей или подробнее.");
      return;
    }

    console.error(error);
    await ctx.reply("Не смог обработать место рождения. Попробуйте позже или введите место подробнее.");
  }
}

async function finishCompatibility(ctx) {
  await ctx.reply("Считаю совместимость по двум натальным картам...");

  const birthA = ctx.session.compatibility.personA;
  const birthB = ctx.session.compatibility.personB;
  const chartA = await calculateNatalChart(birthA);
  const chartB = await calculateNatalChart(birthB);
  const report = buildCompatibilityReport({
    birthA,
    birthB,
    chartA,
    chartB
  });

  ctx.session = {};
  await ctx.reply(report, mainKeyboard());
}

async function sendDailyForecast(ctx) {
  const user = upsertUser(ctx.from);
  const [latestRequest] = getRecentChartRequests(user.id, 1);
  const forecast = buildDailyForecast({
    date: new Date(),
    latestRequest
  });

  await ctx.reply(forecast, mainKeyboard());
}

async function sendLatestPdfReport(ctx) {
  const requestId = getLatestRequestId(ctx.from);

  if (!requestId) {
    await ctx.reply("Сначала рассчитайте карту, чтобы я мог подготовить PDF-отчет.", startKeyboard());
    return;
  }

  const request = getChartRequestById(requestId);

  if (!request) {
    await ctx.reply("Не нашел расчет. Создайте карту заново: /new", mainKeyboard());
    return;
  }

  await sendPdfReport(ctx, request);
}

async function sendPdfReport(ctx, request) {
  await ctx.reply("📄 Собираю PDF-отчет...");
  const pdf = await buildNatalReportPdf({
    birth: request.birth,
    chart: request.chart
  });

  await ctx.replyWithDocument(
    {
      source: pdf,
      filename: `natal-report-${request.id}.pdf`
    },
    {
      caption: "📄 Ваш персональный PDF-отчет"
    }
  );
}

function getCompatibilityPerson(ctx) {
  if (String(ctx.session.step).startsWith("compat_a")) {
    return ctx.session.compatibility.personA;
  }

  return ctx.session.compatibility.personB;
}

function getCompatibilityPersonLabel(ctx) {
  return String(ctx.session.step).startsWith("compat_a") ? "первого человека" : "второго человека";
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("ru-RU", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

async function sendFullReportInvoice(ctx, requestId) {
  await ctx.replyWithInvoice({
    title: "Полный персональный отчет",
    description: "Подробная интерпретация натальной карты по вашим дате, времени и месту рождения.",
    payload: `full_report:${requestId}:${ctx.from.id}:${Date.now()}`,
    provider_token: "",
    currency: "XTR",
    prices: [
      {
        label: "Полный отчет",
        amount: config.fullReportStars
      }
    ]
  });
}

async function sendPaidFullReport(ctx, request) {
  const svg = buildNatalChartSvg({
    birth: request.birth,
    chart: request.chart
  });
  const reportParts = buildFullReport({
    birth: request.birth,
    chart: request.chart
  });

  await ctx.reply("✅ Оплата прошла успешно. Готовлю ваш полный персональный отчет...");
  await ctx.replyWithDocument(
    {
      source: Buffer.from(svg, "utf8"),
      filename: `natal-chart-${request.id}.svg`
    },
    {
      caption: "🌌 Ваша натальная карта"
    }
  );

  for (const part of reportParts) {
    await ctx.reply(part);
  }

  await ctx.reply("Готово. Отчет можно перечитывать в этом чате — он останется в истории сообщений.");
  trackUserEvent(ctx.from, "report_delivered", { requestId: request.id });
  await sendMainMenu(ctx);
}

function parseStartSource(payload) {
  const source = String(payload || "").trim().toLowerCase();
  return /^[a-z0-9_-]{1,64}$/.test(source) ? source : null;
}

function trackUserEvent(from, eventName, metadata = null) {
  const user = upsertUser(from);
  return trackEvent({ userId: user.id, eventName, metadata });
}

function getRequestFromPayload(payload) {
  const [, requestId] = String(payload || "").split(":");
  return requestId ? getChartRequestById(requestId) : null;
}

function getLatestRequestId(from) {
  const user = upsertUser(from);
  const [latest] = getRecentChartRequests(user.id, 1);
  return latest?.id || null;
}

module.exports = { createBot };
