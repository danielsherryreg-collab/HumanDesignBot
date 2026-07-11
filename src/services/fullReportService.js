const SIGN_TEXT = {
  Aries: {
    ru: "Овен",
    gift: "смелость, скорость решений и умение запускать новое",
    shadow: "нетерпение, резкость и желание получить результат сразу",
    advice: "учиться действовать не только быстро, но и стратегично"
  },
  Taurus: {
    ru: "Телец",
    gift: "устойчивость, практичность и талант создавать ресурс",
    shadow: "упрямство, страх перемен и зависание в привычном",
    advice: "развивать гибкость, не теряя внутренней опоры"
  },
  Gemini: {
    ru: "Близнецы",
    gift: "ум, коммуникация, легкость обучения и живой интерес",
    shadow: "распыление, сомнения и незавершенные начинания",
    advice: "собирать идеи в систему и доводить главное до результата"
  },
  Cancer: {
    ru: "Рак",
    gift: "эмпатия, интуиция, забота и глубокая эмоциональная память",
    shadow: "обидчивость, закрытость и зависимость от настроения",
    advice: "строить безопасность внутри себя, а не только через близких"
  },
  Leo: {
    ru: "Лев",
    gift: "харизма, творчество, щедрость и способность вдохновлять",
    shadow: "гордость, драматизация и зависимость от признания",
    advice: "сиять через пользу и творчество, а не через доказательство значимости"
  },
  Virgo: {
    ru: "Дева",
    gift: "точность, аналитика, системность и умение улучшать процессы",
    shadow: "критичность, тревожность и перфекционизм",
    advice: "видеть прогресс, даже если результат еще не идеален"
  },
  Libra: {
    ru: "Весы",
    gift: "дипломатия, вкус, чувство баланса и талант к партнерству",
    shadow: "нерешительность, зависимость от оценки и избегание конфликта",
    advice: "выбирать себя так же честно, как вы умеете учитывать других"
  },
  Scorpio: {
    ru: "Скорпион",
    gift: "глубина, психологическая сила и способность проходить трансформации",
    shadow: "контроль, подозрительность и эмоциональная крайность",
    advice: "использовать интенсивность как источник роста, а не борьбы"
  },
  Sagittarius: {
    ru: "Стрелец",
    gift: "смысл, масштаб, вера, обучение и расширение горизонтов",
    shadow: "излишняя прямота, непостоянство и бегство от деталей",
    advice: "соединять большие идеи с конкретными шагами"
  },
  Capricorn: {
    ru: "Козерог",
    gift: "дисциплина, зрелость, ответственность и долгий результат",
    shadow: "жесткость, страх ошибки и привычка все тащить на себе",
    advice: "строить успех без внутреннего давления и вечного экзамена"
  },
  Aquarius: {
    ru: "Водолей",
    gift: "оригинальность, свобода мышления и способность видеть будущее",
    shadow: "отстраненность, бунт ради бунта и сложность с близостью",
    advice: "оставаться свободным, но не уходить от эмоционального контакта"
  },
  Pisces: {
    ru: "Рыбы",
    gift: "интуиция, воображение, мягкость и тонкое восприятие мира",
    shadow: "идеализация, избегание реальности и размытые границы",
    advice: "заземлять вдохновение в действия и ясные договоренности"
  }
};

const HOUSE_TEXT = {
  1: "личность, тело, образ и первое впечатление",
  2: "деньги, ценности, самооценка и личные ресурсы",
  3: "общение, мышление, обучение и близкое окружение",
  4: "семья, корни, дом и внутренняя безопасность",
  5: "творчество, любовь, дети, радость и самовыражение",
  6: "работа, режим, здоровье и ежедневная эффективность",
  7: "партнерство, брак, клиенты и важные союзы",
  8: "глубина, кризисы, трансформация и общие ресурсы",
  9: "смысл, путешествия, образование и мировоззрение",
  10: "карьера, статус, цели и социальная реализация",
  11: "друзья, команды, аудитория и большие мечты",
  12: "подсознание, уединение, духовность и скрытые процессы"
};

const ZODIAC_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const PLANET_SYMBOLS = {
  sun: "☉",
  moon: "☽",
  mercury: "☿",
  venus: "♀",
  mars: "♂",
  jupiter: "♃",
  saturn: "♄"
};

function buildFullReport({ birth, chart }) {
  const sun = planet(chart, "sun");
  const moon = planet(chart, "moon");
  const mercury = planet(chart, "mercury");
  const venus = planet(chart, "venus");
  const mars = planet(chart, "mars");
  const jupiter = planet(chart, "jupiter");
  const saturn = planet(chart, "saturn");
  const asc = signInfo(chart.ascendant.sign);
  const strongHouses = getStrongHouses(chart);
  const aspects = chart.aspects || [];

  return [
    [
      "✨ Ваш полный персональный отчет готов",
      "",
      "Натальная карта построена по дате, времени и месту рождения.",
      "Ниже — астрологическая схема и подробная интерпретация ключевых сфер жизни.",
      "",
      `Дата: ${birth.date}`,
      `Время: ${birth.time}`,
      `Место: ${birth.place}`,
      `Часовой пояс: ${birth.timezone}`,
      "",
      "🔮 Это не общий гороскоп, а индивидуальный разбор именно по вашим данным."
    ].join("\n"),
    [
      "☀️ 1. Ядро личности",
      "",
      `Солнце: ${sun.signRu}, ${sun.house} дом`,
      "",
      `Ваше Солнце показывает главный источник характера и жизненной энергии. В знаке ${sun.signRu} оно дает ${sun.info.gift}.`,
      `Через ${sun.house} дом эта энергия особенно проявляется в теме: ${HOUSE_TEXT[sun.house]}.`,
      "",
      `В плюсе вы раскрываетесь через ${sun.info.gift}.`,
      `В минусе может включаться ${sun.info.shadow}.`,
      `Главная рекомендация: ${sun.info.advice}.`
    ].join("\n"),
    [
      "🌙 2. Эмоции и внутренний мир",
      "",
      `Луна: ${moon.signRu}, ${moon.house} дом`,
      "",
      `Луна описывает ваши потребности, реакции и способ восстанавливаться. В знаке ${moon.signRu} эмоциональная природа окрашена темой: ${moon.info.gift}.`,
      `Через ${moon.house} дом важны события и переживания в сфере: ${HOUSE_TEXT[moon.house]}.`,
      "",
      "Чтобы чувствовать себя устойчивее, вам важно замечать не только внешние задачи, но и свои настоящие эмоциональные потребности."
    ].join("\n"),
    [
      "⬆️ 3. Асцендент и впечатление",
      "",
      `Асцендент: ${asc.ru}`,
      "",
      `Асцендент показывает, как вы входите в мир и какое первое впечатление производите. ${asc.ru} дает образ, в котором заметны ${asc.gift}.`,
      `Люди могут считывать вас через эту энергию раньше, чем увидят вашу глубинную мотивацию.`,
      "",
      `Ваша задача — использовать этот образ осознанно: ${asc.advice}.`
    ].join("\n"),
    [
      "💎 4. Сильные стороны",
      "",
      `• ${sun.signRu}: ${sun.info.gift}.`,
      `• ${mars.signRu}: способность действовать через ${mars.info.gift}.`,
      `• ${jupiter.signRu}: рост приходит через ${jupiter.info.gift}.`,
      "",
      `Самые активные сферы карты: ${strongHouses.map((house) => `${house} дом (${HOUSE_TEXT[house]})`).join("; ")}.`,
      "Именно там легче всего увидеть ваш потенциал, влияние и естественную вовлеченность."
    ].join("\n"),
    [
      "🌑 5. Слабые стороны и блоки",
      "",
      `Солнце может давать тень: ${sun.info.shadow}.`,
      `Луна может реагировать через: ${moon.info.shadow}.`,
      `Сатурн показывает урок зрелости: ${saturn.info.shadow}.`,
      "",
      "Это не приговор, а карта напряжений. Когда вы видите эти сценарии, ими становится легче управлять."
    ].join("\n"),
    [
      "❤️ 6. Отношения и совместимость",
      "",
      `Венера: ${venus.signRu}, ${venus.house} дом`,
      `Луна: ${moon.signRu}, ${moon.house} дом`,
      "",
      `В любви вам важна энергия ${venus.signRu}: ${venus.info.gift}.`,
      `Отношения раскрываются через тему ${venus.house} дома: ${HOUSE_TEXT[venus.house]}.`,
      "",
      "Гармоничное партнерство для вас строится там, где есть уважение к вашему эмоциональному ритму и ценностям."
    ].join("\n"),
    [
      "💰 7. Деньги и карьера",
      "",
      `Марс: ${mars.signRu}, ${mars.house} дом`,
      `Сатурн: ${saturn.signRu}, ${saturn.house} дом`,
      "",
      `Деньги и карьера лучше растут там, где вы соединяете действие (${mars.info.gift}) и дисциплину (${saturn.info.gift}).`,
      `Марс в ${mars.house} доме подсказывает, где вы активно пробиваете путь: ${HOUSE_TEXT[mars.house]}.`,
      `Сатурн в ${saturn.house} доме показывает сферу долгого результата: ${HOUSE_TEXT[saturn.house]}.`
    ].join("\n"),
    [
      "🔥 8. Предназначение и скрытые таланты",
      "",
      `Меркурий: ${mercury.signRu}, ${mercury.house} дом`,
      `Юпитер: ${jupiter.signRu}, ${jupiter.house} дом`,
      "",
      `Ваш ум работает через качество ${mercury.signRu}: ${mercury.info.gift}.`,
      `Точки роста открываются через ${jupiter.signRu}: ${jupiter.info.gift}.`,
      "",
      "Скрытый талант карты — видеть связи между внутренним потенциалом и реальными задачами жизни. Чем яснее выбран вектор, тем сильнее раскрывается потенциал."
    ].join("\n"),
    [
      "🪐 9. Главные жизненные уроки",
      "",
      `Сатурн: ${saturn.signRu}, ${saturn.house} дом`,
      "",
      `Сатурн показывает, где жизнь учит зрелости. В вашем случае это тема ${saturn.house} дома: ${HOUSE_TEXT[saturn.house]}.`,
      `Сначала здесь может ощущаться давление или страх ошибки, но со временем именно эта зона становится опорой.`,
      "",
      `Ключ: ${saturn.info.advice}.`
    ].join("\n"),
    [
      "🌌 10. Аспекты и итоговый портрет",
      "",
      formatAspects(aspects),
      "",
      "Если собрать карту целиком, ваш главный вектор — раскрывать личную силу через осознанность, честные выборы и развитие тех сфер, где карта показывает наибольшую концентрацию энергии.",
      "",
      "Эта карта показывает не судьбу, а вашу внутреннюю архитектуру: где сила, где напряжение, как вы любите, зарабатываете, выбираете путь и раскрываете себя."
    ].join("\n")
  ];
}

function buildNatalChartSvg({ birth, chart }) {
  const planets = Object.entries(chart.planets || {});
  const aspectLines = getVisualAspectLines(planets, chart.aspects || []).slice(0, 28);
  const width = 1200;
  const height = 1600;
  const center = { x: 600, y: 675 };
  const outer = 390;
  const zodiacRadius = 350;
  const houseRadius = 296;
  const aspectRadius = 218;
  const planetRadius = 268;

  const planetByLabel = new Map(
    planets.map(([key, value]) => [value.label, { key, ...value }])
  );

  const houses = Array.from({ length: 12 }, (_, index) => {
    const angle = ((chart.ascendant?.longitude || 0) + index * 30 - 90) * Math.PI / 180;
    return line(center.x, center.y, center.x + Math.cos(angle) * outer, center.y + Math.sin(angle) * outer, "house-line");
  }).join("\n");

  const signs = ZODIAC_SYMBOLS.map((symbol, index) => {
    const angle = (index * 30 + 15 - 90) * Math.PI / 180;
    const point = polar(center.x, center.y, zodiacRadius, angle);
    return `<text x="${point.x}" y="${point.y}" class="sign">${symbol}</text>`;
  }).join("\n");

  const houseNumbers = Array.from({ length: 12 }, (_, index) => {
    const angle = ((chart.ascendant?.longitude || 0) + index * 30 + 15 - 90) * Math.PI / 180;
    const point = polar(center.x, center.y, houseRadius, angle);
    return `<text x="${point.x}" y="${point.y}" class="house-number">${index + 1}</text>`;
  }).join("\n");

  const planetNodes = planets.map(([key, value]) => {
    const angle = (value.longitude - 90) * Math.PI / 180;
    const point = polar(center.x, center.y, planetRadius, angle);
    const labelPoint = polar(center.x, center.y, planetRadius + 38, angle);
    const planetLabel = planet(chart, key);
    return `<g>
      <circle cx="${point.x}" cy="${point.y}" r="23" class="planet-dot"/>
      <text x="${point.x}" y="${point.y + 8}" class="planet">${PLANET_SYMBOLS[key] || "•"}</text>
      <text x="${labelPoint.x}" y="${labelPoint.y + 5}" class="planet-label">${escapeXml(planetLabel.signRu)} ${escapeXml(String(value.house))}</text>
    </g>`;
  }).join("\n");

  const aspects = aspectLines.map((aspect) => {
    const from = planetByLabel.get(aspect.from);
    const to = planetByLabel.get(aspect.to);

    if (!from || !to) {
      return "";
    }

    const fromPoint = polar(center.x, center.y, aspectRadius, (from.longitude - 90) * Math.PI / 180);
    const toPoint = polar(center.x, center.y, aspectRadius, (to.longitude - 90) * Math.PI / 180);
    const className = getAspectClass(aspect.type);
    return `<line x1="${fromPoint.x}" y1="${fromPoint.y}" x2="${toPoint.x}" y2="${toPoint.y}" class="${className}"/>`;
  }).join("\n");

  const placementRows = planets.map(([key, value], index) => {
    const item = planet(chart, key);
    const y = 1166 + index * 48;
    return `<g>
      <text x="110" y="${y}" class="table-symbol">${PLANET_SYMBOLS[key] || "•"}</text>
      <text x="155" y="${y}" class="table-text">${escapeXml(value.label)}</text>
      <text x="390" y="${y}" class="table-text">${escapeXml(item.signRu)}</text>
      <text x="590" y="${y}" class="table-text">${escapeXml(String(value.house))} дом</text>
      <text x="750" y="${y}" class="table-muted">${escapeXml(String(value.longitude))}°</text>
    </g>`;
  }).join("\n");

  const aspectRows = (chart.aspects || []).slice(0, 5).map((aspect, index) => {
    const y = 1166 + index * 48;
    return `<text x="805" y="${y}" class="table-muted">${escapeXml(aspect.from)} ${escapeXml(aspectLabel(aspect.type))} ${escapeXml(aspect.to)}</text>`;
  }).join("\n") || `<text x="805" y="1166" class="table-muted">Мажорные аспекты не выделены</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="36%" r="72%">
      <stop offset="0%" stop-color="#2c1b65"/>
      <stop offset="52%" stop-color="#100b2b"/>
      <stop offset="100%" stop-color="#050713"/>
    </radialGradient>
    <linearGradient id="panel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#17113a" stop-opacity="0.96"/>
      <stop offset="100%" stop-color="#070917" stop-opacity="0.96"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="1200" height="1600" fill="url(#bg)"/>
  <rect x="34" y="34" width="1132" height="1532" rx="42" class="page-border"/>
  <circle cx="135" cy="155" r="2" fill="#fff"/><circle cx="1045" cy="190" r="2" fill="#fff"/><circle cx="980" cy="910" r="2" fill="#fff"/><circle cx="210" cy="965" r="1.6" fill="#fff"/>
  <circle cx="1020" cy="420" r="75" fill="none" stroke="#725cff" stroke-width="1.2" opacity=".4"/>
  <circle cx="185" cy="425" r="42" fill="none" stroke="#57d6ff" stroke-width="1.2" opacity=".35"/>

  <text x="600" y="118" class="title">Натальная карта</text>
  <text x="600" y="166" class="subtitle">${escapeXml(birth.date)} • ${escapeXml(birth.time)} • ${escapeXml(shortPlace(birth.place))}</text>
  <text x="600" y="200" class="subtitle small">Часовой пояс: ${escapeXml(birth.timezone)} • Асцендент: ${escapeXml(signInfo(chart.ascendant.sign).ru)}</text>

  <rect x="70" y="245" width="1060" height="860" rx="34" class="panel"/>
  <circle cx="600" cy="675" r="390" class="ring"/>
  <circle cx="600" cy="675" r="334" class="ring thin"/>
  <circle cx="600" cy="675" r="278" class="ring thin"/>
  <circle cx="600" cy="675" r="218" class="ring inner"/>
  ${houses}
  ${signs}
  ${houseNumbers}
  ${aspects}
  ${planetNodes}

  <rect x="70" y="1090" width="1060" height="410" rx="28" class="panel"/>
  <text x="110" y="1132" class="section-title">Положения планет</text>
  <text x="805" y="1132" class="section-title">Ключевые аспекты</text>
  ${placementRows}
  ${aspectRows}

  <rect x="70" y="1525" width="1060" height="1" fill="#f7d783" opacity=".45"/>
  <text x="600" y="1562" class="footer">Голубой: гармоничные аспекты • Розовый: напряжение • Золотой: соединения</text>
  <style>
    .title{fill:#f7d783;font:700 56px Georgia,serif;text-anchor:middle;letter-spacing:1px}
    .subtitle,.footer{fill:#d8c7ff;font:500 24px Arial,sans-serif;text-anchor:middle}
    .small{font-size:20px;opacity:.82}
    .page-border{fill:none;stroke:#f7d783;stroke-width:1.4;opacity:.55}
    .panel{fill:url(#panel);stroke:#f7d783;stroke-width:1.4;opacity:.95}
    .ring{fill:none;stroke:#f7d783;stroke-width:3;filter:url(#glow)}
    .thin{stroke-width:1.3;opacity:.65}
    .inner{stroke-width:1.1;opacity:.45}
    .house-line{stroke:#8f7cff;stroke-width:1.15;opacity:.5}
    .sign{fill:#f7d783;font:38px Arial,sans-serif;text-anchor:middle;dominant-baseline:middle}
    .house-number{fill:#d8c7ff;font:700 22px Arial,sans-serif;text-anchor:middle;dominant-baseline:middle;opacity:.82}
    .planet-dot{fill:#151032;stroke:#f7d783;stroke-width:2;filter:url(#glow)}
    .planet{fill:#fff6c7;font:31px Arial,sans-serif;text-anchor:middle}
    .planet-label{fill:#d8c7ff;font:700 13px Arial,sans-serif;text-anchor:middle;opacity:.92}
    .aspect-soft{stroke:#57d6ff;stroke-width:2.2;opacity:.68}
    .aspect-strong{stroke:#ff5fb7;stroke-width:2.2;opacity:.62}
    .aspect-conjunction{stroke:#f7d783;stroke-width:2.5;opacity:.78}
    .section-title{fill:#f7d783;font:700 25px Arial,sans-serif}
    .table-symbol{fill:#f7d783;font:30px Arial,sans-serif;text-anchor:middle}
    .table-text{fill:#fff6c7;font:500 22px Arial,sans-serif}
    .table-muted{fill:#d8c7ff;font:500 18px Arial,sans-serif;opacity:.86}
  </style>
</svg>`;
}

function planet(chart, key) {
  const value = chart.planets[key];
  const info = signInfo(value.sign);

  return {
    ...value,
    signRu: info.ru,
    info
  };
}

function signInfo(sign) {
  return SIGN_TEXT[sign] || SIGN_TEXT.Aries;
}

function getStrongHouses(chart) {
  const counts = {};

  for (const planetValue of Object.values(chart.planets || {})) {
    counts[planetValue.house] = (counts[planetValue.house] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([house]) => Number(house));
}

function formatAspects(aspects) {
  if (!aspects.length) {
    return "В базовом орбе нет ярко выраженных мажорных аспектов. Это делает карту более свободной: многое зависит от осознанного выбора и личной дисциплины.";
  }

  return aspects
    .slice(0, 6)
    .map((aspect) => `• ${aspect.from} ${aspect.type} ${aspect.to}, орб ${aspect.orb}°`)
    .join("\n");
}

function getVisualAspectLines(planets, aspects) {
  const result = [...aspects];
  const existing = new Set(
    aspects.map((aspect) => [aspect.from, aspect.to].sort().join("|"))
  );
  const planetValues = planets.map(([, value]) => value);

  for (let i = 0; i < planetValues.length; i += 1) {
    for (let j = i + 1; j < planetValues.length; j += 1) {
      const from = planetValues[i];
      const to = planetValues[j];
      const key = [from.label, to.label].sort().join("|");

      if (existing.has(key)) {
        continue;
      }

      const delta = Math.abs(from.longitude - to.longitude);
      const distance = Math.min(delta, 360 - delta);

      result.push({
        from: from.label,
        to: to.label,
        type: inferVisualAspectType(distance),
        orb: 0
      });
      existing.add(key);
    }
  }

  return result;
}

function inferVisualAspectType(distance) {
  if (distance <= 18 || distance >= 342) {
    return "соединение";
  }

  if (distance > 45 && distance < 75) {
    return "секстиль";
  }

  if (distance > 105 && distance < 135) {
    return "трин";
  }

  return "квадрат";
}

function getAspectClass(type) {
  if (type === "соединение") {
    return "aspect-conjunction";
  }

  if (type === "трин" || type === "секстиль") {
    return "aspect-soft";
  }

  return "aspect-strong";
}

function aspectLabel(type) {
  const labels = {
    соединение: "☌",
    секстиль: "✶",
    квадрат: "□",
    трин: "△",
    оппозиция: "☍"
  };

  return labels[type] || type;
}

function polar(cx, cy, radius, angle) {
  return {
    x: Math.round((cx + Math.cos(angle) * radius) * 10) / 10,
    y: Math.round((cy + Math.sin(angle) * radius) * 10) / 10
  };
}

function line(x1, y1, x2, y2, className = "") {
  const classAttribute = className ? ` class="${className}"` : "";
  return `<line x1="${Math.round(x1)}" y1="${Math.round(y1)}" x2="${Math.round(x2)}" y2="${Math.round(y2)}"${classAttribute}/>`;
}

function shortPlace(place) {
  return String(place || "").split(",").slice(0, 2).join(",").trim();
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  buildFullReport,
  buildNatalChartSvg
};
