const { Telegraf, Markup, session } = require("telegraf");
const { config } = require("../config/config");
const { upsertUser, saveChartRequest, getRecentChartRequests, getChartRequestById } = require("../db/database");
const { geocodePlace, getTimezone } = require("../services/geoService");
const { calculateNatalChart } = require("../services/chartService");
const { buildInterpretation } = require("../services/interpretationService");
const { buildFullReport, buildNatalChartSvg } = require("../services/fullReportService");
const { parseDate, parseTime } = require("../utils/validators");

const STEPS = {
  DATE: "date",
  TIME: "time",
  PLACE: "place"
};

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
  "Оплата полного отчета проходит через Telegram Stars. После оплаты бот автоматически отправит астральную карту и подробный разбор."
].join("\n");

function mainKeyboard() {
  return Markup.keyboard([
    ["🔮 Рассчитать карту", "📜 История"],
    ["✨ Полный отчёт", "❓ Помощь"]
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
    [Markup.button.callback("⭐ Оплатить звездами (~300р)", `pay_full_report:${requestId}`)]
  ]);
}

function paymentKeyboard(requestId) {
  const action = requestId ? `pay_full_report:${requestId}` : "pay_full_report";
  return Markup.inlineKeyboard([
    [Markup.button.callback("⭐ Оплатить звездами (~300р)", action)],
    [Markup.button.callback("⬅️ Обратно в меню", "back_to_menu")]
  ]);
}

function createBot() {
  const bot = new Telegraf(config.botToken);

  bot.use(session());

  bot.start(async (ctx) => {
    upsertUser(ctx.from);
    ctx.session = {};

    await ctx.reply(
      "Привет! Я помогу собрать данные рождения и подготовить натальную карту: Солнце, Луна, Асцендент, дома, аспекты и краткую интерпретацию.",
      mainKeyboard()
    );
  });

  bot.hears("🔮 Рассчитать карту", askDate);
  bot.action("start_chart", askDate);
  bot.command("new", askDate);

  bot.action(/^full_report(?::(\d+))?$/, async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = ctx.match?.[1] || getLatestRequestId(ctx.from);
    await ctx.reply(FULL_REPORT_TEXT, paymentKeyboard(requestId));
  });

  bot.action(/^pay_full_report(?::(\d+))?$/, async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = ctx.match?.[1] || getLatestRequestId(ctx.from);

    if (!requestId) {
      await ctx.reply("Сначала рассчитайте карту, чтобы я мог подготовить полный отчет.", mainKeyboard());
      return;
    }

    await sendFullReportInvoice(ctx, requestId);
  });

  bot.on("pre_checkout_query", async (ctx) => {
    const query = ctx.update.pre_checkout_query;
    const expectedAmount = config.fullReportStars;
    const request = getRequestFromPayload(query.invoice_payload);

    if (!request || request.user_id !== upsertUser(query.from).id || query.currency !== "XTR" || query.total_amount !== expectedAmount) {
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
      await ctx.reply("✅ Оплата прошла успешно, но я не нашел расчет. Напишите /new и создайте карту заново.", mainKeyboard());
      return;
    }

    await sendPaidFullReport(ctx, request);
  });

  bot.action("back_to_menu", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("Главное меню", mainKeyboard());
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
      "✨ Полный персональный отчет\n\nУ вас уже есть сохраненная карта. Вы можете посмотреть описание отчета или сразу перейти к оплате звездами.",
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

    return ctx.reply("Выбери действие на клавиатуре или отправь /new для нового расчета.", mainKeyboard());
  });

  bot.catch((error, ctx) => {
    console.error("Bot error", error);
    ctx.reply("Что-то пошло не так. Попробуй еще раз или начни заново: /new").catch(() => {});
  });

  return bot;
}

async function askDate(ctx) {
  upsertUser(ctx.from);
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

    ctx.session = {};

    await ctx.reply(reportText, detailedReportKeyboard(savedRequest.id));
  } catch (error) {
    if (error.message === "PLACE_NOT_FOUND") {
      await ctx.reply("Не нашел такое место. Попробуй написать город и страну латиницей или подробнее.");
      return;
    }

    console.error(error);
    await ctx.reply("Не смог завершить расчет. Проверь место рождения или попробуй позже.");
  }
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

  await ctx.reply("Готово. Отчет можно перечитывать в этом чате — он останется в истории сообщений.", mainKeyboard());
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
