const { config } = require("../config/config");

const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces"
];

const PLANETS = [
  { key: "sun", label: "Солнце", sweId: 0 },
  { key: "moon", label: "Луна", sweId: 1 },
  { key: "mercury", label: "Меркурий", sweId: 2 },
  { key: "venus", label: "Венера", sweId: 3 },
  { key: "mars", label: "Марс", sweId: 4 },
  { key: "jupiter", label: "Юпитер", sweId: 5 },
  { key: "saturn", label: "Сатурн", sweId: 6 }
];

function getSign(longitude) {
  return SIGNS[Math.floor(normalize(longitude) / 30)];
}

function getHouse(longitude, ascendant) {
  const shifted = normalize(longitude - ascendant);
  return Math.floor(shifted / 30) + 1;
}

function normalize(value) {
  return ((value % 360) + 360) % 360;
}

function tryLoadSwissEphemeris() {
  try {
    const swisseph = require("swisseph");
    swisseph.swe_set_ephe_path(config.ephemerisPath);
    return swisseph;
  } catch {
    return null;
  }
}

function decimalHour(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours + minutes / 60;
}

function calculateWithSwissEphemeris(birth) {
  const swe = tryLoadSwissEphemeris();

  if (!swe) {
    return null;
  }

  const [year, month, day] = birth.date.split("-").map(Number);
  const hour = decimalHour(birth.time);
  const julianDay = swe.swe_julday(year, month, day, hour, swe.SE_GREG_CAL);
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;

  const planets = {};

  for (const planet of PLANETS) {
    const result = swe.swe_calc_ut(julianDay, planet.sweId, flags);
    const longitude = result.longitude ?? result.xx?.[0];

    planets[planet.key] = {
      label: planet.label,
      longitude: round(longitude),
      sign: getSign(longitude),
      house: null
    };
  }

  const houses = swe.swe_houses(julianDay, birth.lat, birth.lon, "P");
  const ascendant = houses.ascendant ?? houses.ascmc?.[0] ?? 0;

  for (const planet of Object.values(planets)) {
    planet.house = getHouse(planet.longitude, ascendant);
  }

  return {
    engine: "swisseph",
    note: "Расчет выполнен через Swiss Ephemeris. Для высокой точности проверь ephemeris-файлы и timezone-конвертацию UTC.",
    planets,
    ascendant: {
      longitude: round(ascendant),
      sign: getSign(ascendant)
    },
    houses: {
      system: "Placidus",
      cusps: (houses.house || houses.cusps || []).slice(1, 13).map(round)
    },
    aspects: calculateMajorAspects(planets)
  };
}

function calculateDemoChart(birth) {
  const seed =
    Number(birth.date.replaceAll("-", "")) +
    Number(birth.time.replace(":", "")) +
    Math.round(Math.abs(birth.lat * 100)) +
    Math.round(Math.abs(birth.lon * 100));

  const ascendantLongitude = normalize(seed % 360);
  const planets = {};

  PLANETS.forEach((planet, index) => {
    const longitude = normalize(seed * (index + 3) + index * 42.7);
    planets[planet.key] = {
      label: planet.label,
      longitude: round(longitude),
      sign: getSign(longitude),
      house: getHouse(longitude, ascendantLongitude)
    };
  });

  return {
    engine: "demo",
    note: "Это демо-расчет для проверки бота. Для настоящей астрологии установи и настрой Swiss Ephemeris.",
    planets,
    ascendant: {
      longitude: round(ascendantLongitude),
      sign: getSign(ascendantLongitude)
    },
    houses: {
      system: "Equal houses demo",
      cusps: Array.from({ length: 12 }, (_, index) => round(normalize(ascendantLongitude + index * 30)))
    },
    aspects: calculateMajorAspects(planets)
  };
}

function calculateMajorAspects(planets) {
  const aspects = [
    { name: "соединение", angle: 0, orb: 8 },
    { name: "секстиль", angle: 60, orb: 5 },
    { name: "квадрат", angle: 90, orb: 6 },
    { name: "трин", angle: 120, orb: 6 },
    { name: "оппозиция", angle: 180, orb: 8 }
  ];

  const entries = Object.values(planets);
  const result = [];

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const delta = Math.abs(entries[i].longitude - entries[j].longitude);
      const distance = Math.min(delta, 360 - delta);
      const aspect = aspects.find((item) => Math.abs(distance - item.angle) <= item.orb);

      if (aspect) {
        result.push({
          from: entries[i].label,
          to: entries[j].label,
          type: aspect.name,
          orb: round(Math.abs(distance - aspect.angle))
        });
      }
    }
  }

  return result;
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}

async function calculateNatalChart(birth) {
  return calculateWithSwissEphemeris(birth) || calculateDemoChart(birth);
}

module.exports = { calculateNatalChart };
