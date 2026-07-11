const { Telegraf, Markup, session } = require("telegraf");
const { config } = require("../config/config");
const { upsertUser, saveChartRequest, getRecentChartRequests } = require("../db/database");
const { geocodePlace, getTimezone } = require("../services/geoService");
const { calculateNatalChart } = require("../services/chartService");
const { buildInterpretation } = require("../services/interpretationService");
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

function mainKeyboard() {
  return Markup.keyboard([["🔮 Рассчитать карту"], ["📜 История"]]).resize();
}

function detailedReportKeyboard() {
  return Markup.inlineKeyboard([[Markup.button.callback("📖 Подробный отчет", "full_report")]]);
}

function paymentKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("💳 Оплатить 500р", "pay_full_report")],
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
  bot.command("new", askDate);

  bot.action("full_report", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(FULL_REPORT_TEXT, paymentKeyboard());
  });

  bot.action("pay_full_report", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "Оплата пока не подключена. Следующий шаг — добавить платежную систему и ссылку на оплату полного отчета.",
      paymentKeyboard()
    );
  });

  bot.action("back_to_menu", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("Главное меню", mainKeyboard());
  });

  bot.hears("📜 История", async (ctx) => {
    const user = upsertUser(ctx.from);
    const history = getRecentChartRequests(user.id, 5);

    if (!history.length) {
      await ctx.reply("Истории пока нет. Нажми «🔮 Рассчитать карту», чтобы создать первую.");
      return;
    }

    await ctx.reply("Последние расчеты:");

    for (const [index, item] of history.entries()) {
      const text = [
        `${index + 1}. ${item.birth.date} ${item.birth.time}`,
        `Место: ${item.birth.place}`,
        `Создано: ${formatDateTime(item.created_at)}`
      ].join("\n");

      await ctx.reply(text, detailedReportKeyboard());
    }
  });

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

    saveChartRequest({
      userId: user.id,
      birth,
      chart,
      reportText
    });

    ctx.session = {};

    await ctx.reply(reportText, detailedReportKeyboard());
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

module.exports = { createBot };
