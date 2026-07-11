const SIGN_INFO = {
  Aries: { ru: "Овен", element: "fire", mode: "cardinal" },
  Taurus: { ru: "Телец", element: "earth", mode: "fixed" },
  Gemini: { ru: "Близнецы", element: "air", mode: "mutable" },
  Cancer: { ru: "Рак", element: "water", mode: "cardinal" },
  Leo: { ru: "Лев", element: "fire", mode: "fixed" },
  Virgo: { ru: "Дева", element: "earth", mode: "mutable" },
  Libra: { ru: "Весы", element: "air", mode: "cardinal" },
  Scorpio: { ru: "Скорпион", element: "water", mode: "fixed" },
  Sagittarius: { ru: "Стрелец", element: "fire", mode: "mutable" },
  Capricorn: { ru: "Козерог", element: "earth", mode: "cardinal" },
  Aquarius: { ru: "Водолей", element: "air", mode: "fixed" },
  Pisces: { ru: "Рыбы", element: "water", mode: "mutable" }
};

const ELEMENT_COMPATIBILITY = {
  fire: { fire: 16, air: 15, earth: 7, water: 6 },
  earth: { earth: 16, water: 15, fire: 7, air: 8 },
  air: { air: 16, fire: 15, water: 7, earth: 8 },
  water: { water: 16, earth: 15, air: 7, fire: 6 }
};

function buildCompatibilityReport({ birthA, birthB, chartA, chartB }) {
  const compatibility = calculateCompatibility(chartA, chartB);
  const tone = getScoreTone(compatibility.score);
  const strongest = compatibility.harmoniousAspects.slice(0, 4);
  const tense = compatibility.tenseAspects.slice(0, 4);

  return [
    `💞 Совместимость пары: ${compatibility.score}/100`,
    "",
    tone,
    "",
    "Данные первого человека:",
    `• ${birthA.date} ${birthA.time}`,
    `• ${shortPlace(birthA.place)}`,
    "",
    "Данные второго человека:",
    `• ${birthB.date} ${birthB.time}`,
    `• ${shortPlace(birthB.place)}`,
    "",
    "☀️ Характер и жизненный темп",
    compatibility.sunText,
    "",
    "🌙 Эмоции и бытовой комфорт",
    compatibility.moonText,
    "",
    "❤️ Притяжение и романтика",
    compatibility.attractionText,
    "",
    "⬆️ Первое впечатление",
    compatibility.ascendantText,
    "",
    "✨ Сильные стороны пары",
    formatList(compatibility.strengths),
    "",
    "🪐 Зоны напряжения",
    formatList(compatibility.challenges),
    "",
    "🔗 Гармоничные связи",
    strongest.length ? formatAspectList(strongest) : "• Ярких гармоничных аспектов немного, поэтому отношения больше зависят от осознанного выбора.",
    "",
    "⚡ Напряженные связи",
    tense.length ? formatAspectList(tense) : "• Сильных напряженных аспектов немного, конфликтность может быть умеренной.",
    "",
    "🌱 Рекомендация",
    compatibility.advice
  ].join("\n");
}

function calculateCompatibility(chartA, chartB) {
  const sunScore = signScore(chartA.planets.sun.sign, chartB.planets.sun.sign);
  const moonScore = signScore(chartA.planets.moon.sign, chartB.planets.moon.sign);
  const venusMarsScore = average([
    signScore(chartA.planets.venus.sign, chartB.planets.mars.sign),
    signScore(chartB.planets.venus.sign, chartA.planets.mars.sign)
  ]);
  const ascendantScore = signScore(chartA.ascendant.sign, chartB.ascendant.sign);
  const crossAspects = calculateCrossAspects(chartA, chartB);
  const aspectScore = scoreAspects(crossAspects);
  const score = clamp(Math.round(sunScore * 0.2 + moonScore * 0.25 + venusMarsScore * 0.25 + ascendantScore * 0.1 + aspectScore * 0.2), 0, 100);
  const harmoniousAspects = crossAspects.filter((aspect) => aspect.kind === "soft" || aspect.type === "соединение");
  const tenseAspects = crossAspects.filter((aspect) => aspect.kind === "hard");

  return {
    score,
    harmoniousAspects,
    tenseAspects,
    sunText: describeSigns(chartA.planets.sun.sign, chartB.planets.sun.sign, "Солнце показывает, насколько совпадает жизненный темп и стиль самовыражения."),
    moonText: describeSigns(chartA.planets.moon.sign, chartB.planets.moon.sign, "Луна показывает эмоциональную совместимость, быт и ощущение безопасности рядом друг с другом."),
    attractionText: describeAttraction(chartA, chartB),
    ascendantText: describeSigns(chartA.ascendant.sign, chartB.ascendant.sign, "Асценденты показывают первое впечатление, внешний стиль и то, как пара воспринимает мир."),
    strengths: buildStrengths(chartA, chartB, harmoniousAspects),
    challenges: buildChallenges(chartA, chartB, tenseAspects),
    advice: buildAdvice(score, tenseAspects)
  };
}

function getScoreTone(score) {
  if (score >= 82) {
    return "✨ Очень сильная совместимость: в паре много естественного притяжения, взаимного интереса и потенциала для устойчивого союза.";
  }

  if (score >= 68) {
    return "✨ Хорошая совместимость: между вами есть заметный потенциал, особенно если бережно относиться к различиям.";
  }

  if (score >= 50) {
    return "🌗 Средняя совместимость: связь может быть важной и обучающей, но отношения требуют честного диалога и осознанности.";
  }

  return "🪐 Непростая совместимость: контакт может быть сильным, но различия требуют терпения, уважения границ и зрелого общения.";
}

function calculateCrossAspects(chartA, chartB) {
  const rules = [
    { type: "соединение", angle: 0, orb: 8, kind: "soft", weight: 9 },
    { type: "секстиль", angle: 60, orb: 5, kind: "soft", weight: 7 },
    { type: "квадрат", angle: 90, orb: 6, kind: "hard", weight: -7 },
    { type: "трин", angle: 120, orb: 6, kind: "soft", weight: 8 },
    { type: "оппозиция", angle: 180, orb: 8, kind: "hard", weight: -6 }
  ];
  const result = [];

  for (const planetA of Object.values(chartA.planets || {})) {
    for (const planetB of Object.values(chartB.planets || {})) {
      const distance = angularDistance(planetA.longitude, planetB.longitude);
      const rule = rules.find((item) => Math.abs(distance - item.angle) <= item.orb);

      if (rule) {
        result.push({
          from: planetA.label,
          to: planetB.label,
          type: rule.type,
          kind: rule.kind,
          weight: rule.weight,
          orb: round(Math.abs(distance - rule.angle))
        });
      }
    }
  }

  return result.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}

function signScore(signA, signB) {
  const a = SIGN_INFO[signA];
  const b = SIGN_INFO[signB];
  const elementScore = ELEMENT_COMPATIBILITY[a.element][b.element];
  const modeScore = a.mode === b.mode ? 6 : 10;
  return clamp((elementScore + modeScore) * 4, 20, 100);
}

function describeSigns(signA, signB, intro) {
  const a = SIGN_INFO[signA];
  const b = SIGN_INFO[signB];
  const score = signScore(signA, signB);
  const quality = score >= 78 ? "между вами легко возникает понимание" : score >= 58 ? "есть потенциал, но важны договоренности" : "темп может отличаться, поэтому важно больше проговаривать ожидания";

  return `${intro}\n${a.ru} + ${b.ru}: ${quality}.`;
}

function describeAttraction(chartA, chartB) {
  const direct = signScore(chartA.planets.venus.sign, chartB.planets.mars.sign);
  const reverse = signScore(chartB.planets.venus.sign, chartA.planets.mars.sign);
  const score = average([direct, reverse]);

  if (score >= 78) {
    return "Венера и Марс дают заметное притяжение: в паре может быть яркая симпатия, интерес и желание сближаться.";
  }

  if (score >= 58) {
    return "Притяжение есть, но оно раскрывается постепенно. Важно понимать разные языки любви и инициативы.";
  }

  return "Романтический ритм может отличаться. Одному человеку может хотеться больше мягкости, другому — больше действия или свободы.";
}

function buildStrengths(chartA, chartB, harmoniousAspects) {
  const strengths = [];

  if (signScore(chartA.planets.moon.sign, chartB.planets.moon.sign) >= 70) {
    strengths.push("Эмоциональный контакт может быть теплым и поддерживающим.");
  }

  if (signScore(chartA.planets.sun.sign, chartB.planets.sun.sign) >= 70) {
    strengths.push("Есть сходство в жизненном темпе и взгляде на самовыражение.");
  }

  if (harmoniousAspects.length) {
    strengths.push("Гармоничные аспекты помогают легче договариваться и чувствовать взаимный интерес.");
  }

  strengths.push("Совместимость лучше раскрывается через честный диалог и уважение личного пространства.");
  return strengths.slice(0, 4);
}

function buildChallenges(chartA, chartB, tenseAspects) {
  const challenges = [];

  if (signScore(chartA.planets.moon.sign, chartB.planets.moon.sign) < 58) {
    challenges.push("Эмоциональные реакции могут отличаться: одному важно одно, другому — совсем другое.");
  }

  if (signScore(chartA.planets.sun.sign, chartB.planets.sun.sign) < 58) {
    challenges.push("Может отличаться жизненный темп и способ принимать решения.");
  }

  if (tenseAspects.length) {
    challenges.push("Напряженные аспекты могут давать сильное притяжение, но также споры и борьбу за правоту.");
  }

  challenges.push("Главная зона роста пары — не копить недосказанность и заранее обсуждать ожидания.");
  return challenges.slice(0, 4);
}

function buildAdvice(score, tenseAspects) {
  if (score >= 78) {
    return "У пары высокий потенциал. Главное — не считать гармонию чем-то само собой разумеющимся и регулярно поддерживать живой диалог.";
  }

  if (score >= 58) {
    return "Потенциал хороший, но отношения требуют осознанности. Лучше заранее договариваться о быте, границах и способе решать конфликты.";
  }

  if (tenseAspects.length) {
    return "Связь может быть интенсивной и обучающей. Здесь особенно важны терпение, уважение к различиям и отказ от давления.";
  }

  return "Совместимость раскрывается постепенно. Чем честнее вы проговариваете чувства и ожидания, тем стабильнее становится контакт.";
}

function scoreAspects(aspects) {
  const base = 58;
  const total = aspects.reduce((sum, aspect) => sum + aspect.weight, 0);
  return clamp(base + total, 20, 100);
}

function formatAspectList(aspects) {
  return aspects.map((aspect) => `• ${aspect.from} ${aspect.type} ${aspect.to}, орб ${aspect.orb}°`).join("\n");
}

function formatList(items) {
  return items.map((item) => `• ${item}`).join("\n");
}

function angularDistance(a, b) {
  const delta = Math.abs(a - b);
  return Math.min(delta, 360 - delta);
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}

function shortPlace(place) {
  return String(place || "").split(",").slice(0, 2).join(",").trim();
}

module.exports = {
  buildCompatibilityReport,
  calculateCompatibility
};
