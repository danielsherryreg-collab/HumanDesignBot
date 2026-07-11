const SIGN_TEXT = {
  Aries: "инициатива, смелость, прямое действие",
  Taurus: "устойчивость, телесность, умение создавать ресурс",
  Gemini: "любопытство, речь, гибкость мышления",
  Cancer: "чувствительность, семья, эмоциональная память",
  Leo: "самовыражение, творчество, желание сиять",
  Virgo: "система, польза, внимание к деталям",
  Libra: "партнерство, эстетика, баланс",
  Scorpio: "глубина, трансформация, психологическая сила",
  Sagittarius: "смысл, обучение, расширение горизонтов",
  Capricorn: "структура, ответственность, долгий результат",
  Aquarius: "свобода, идеи, нестандартность",
  Pisces: "интуиция, эмпатия, тонкое восприятие"
};

function buildInterpretation({ birth, chart }) {
  const sun = chart.planets.sun;
  const moon = chart.planets.moon;
  const venus = chart.planets.venus;
  const mars = chart.planets.mars;
  const saturn = chart.planets.saturn;
  const aspectLines = chart.aspects.slice(0, 5).map((aspect) => `• ${aspect.from} ${aspect.type} ${aspect.to}, орб ${aspect.orb}°`);

  return [
    "🔮 Натальная карта",
    "",
    `Дата: ${birth.date}`,
    `Время: ${birth.time}`,
    `Место: ${birth.place}`,
    `Координаты: ${birth.lat}, ${birth.lon}`,
    `Часовой пояс: ${birth.timezone}`,
    "",
    chart.engine === "demo" ? `⚠️ ${chart.note}` : `✅ ${chart.note}`,
    "",
    "Главные положения:",
    `☀️ Солнце: ${sun.sign}, дом ${sun.house} — ${SIGN_TEXT[sun.sign]}.`,
    `🌙 Луна: ${moon.sign}, дом ${moon.house} — эмоциональный стиль и потребности.`,
    `⬆️ Асцендент: ${chart.ascendant.sign} — первое впечатление и способ входить в жизнь.`,
    "",
    "Сильные стороны:",
    `• Солнце в ${sun.sign}: ${SIGN_TEXT[sun.sign]}.`,
    `• Марс в ${mars.sign}: как человек действует, защищает себя и запускает цели.`,
    "",
    "Отношения:",
    `• Венера в ${venus.sign}: что важно в любви, близости и симпатии.`,
    "",
    "Деньги и карьера:",
    `• Сатурн в ${saturn.sign}: где нужны дисциплина, зрелость и долгий фокус.`,
    "",
    "Аспекты:",
    aspectLines.length ? aspectLines.join("\n") : "• Сильных мажорных аспектов в базовом орбе не найдено.",
    "",
    "Для профессионального продукта сюда можно добавить AI-трактовку, PDF-отчет и оплату."
  ].join("\n");
}

module.exports = { buildInterpretation };
