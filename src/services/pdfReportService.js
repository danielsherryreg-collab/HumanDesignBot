const path = require("path");
const PDFDocument = require("pdfkit");
const { buildFullReport } = require("./fullReportService");

const FONT_DIR = path.dirname(require.resolve("dejavu-fonts-ttf/package.json"));
const REGULAR_FONT = path.join(FONT_DIR, "ttf", "DejaVuSans.ttf");
const BOLD_FONT = path.join(FONT_DIR, "ttf", "DejaVuSans-Bold.ttf");

function buildNatalReportPdf({ birth, chart }) {
  const doc = new PDFDocument({
    size: "A4",
    margins: {
      top: 54,
      bottom: 54,
      left: 48,
      right: 48
    },
    info: {
      Title: "Полный персональный натальный отчет",
      Author: "Human Design Natal Bot"
    }
  });
  const chunks = [];

  doc.on("data", (chunk) => chunks.push(chunk));
  doc.registerFont("Regular", REGULAR_FONT);
  doc.registerFont("Bold", BOLD_FONT);

  drawCover(doc, birth, chart);

  const parts = buildFullReport({ birth, chart });
  for (const [index, part] of parts.entries()) {
    if (index === 0) {
      continue;
    }

    addTextSection(doc, part);
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function drawCover(doc, birth, chart) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#070917");
  doc.fillColor("#f7d783").font("Bold").fontSize(26).text("Полный персональный отчёт", 48, 68, {
    align: "center"
  });
  doc.moveDown(0.5);
  doc.fillColor("#d8c7ff").font("Regular").fontSize(13).text("Натальная карта по дате, времени и месту рождения", {
    align: "center"
  });

  doc.roundedRect(58, 160, doc.page.width - 116, 160, 16).strokeColor("#f7d783").lineWidth(1).stroke();
  doc.fillColor("#fff6c7").font("Bold").fontSize(15).text("Данные рождения", 82, 188);
  doc.fillColor("#ffffff").font("Regular").fontSize(12);
  doc.text(`Дата: ${birth.date}`, 82, 224);
  doc.text(`Время: ${birth.time}`, 82, 248);
  doc.text(`Место: ${birth.place}`, 82, 272, { width: doc.page.width - 164 });
  doc.text(`Часовой пояс: ${birth.timezone}`, 82, 296);

  doc.roundedRect(58, 360, doc.page.width - 116, 230, 16).strokeColor("#57d6ff").lineWidth(1).stroke();
  doc.fillColor("#fff6c7").font("Bold").fontSize(15).text("Ключевые положения", 82, 388);
  doc.fillColor("#ffffff").font("Regular").fontSize(12);
  const rows = [
    ["Солнце", chart.planets.sun],
    ["Луна", chart.planets.moon],
    ["Меркурий", chart.planets.mercury],
    ["Венера", chart.planets.venus],
    ["Марс", chart.planets.mars],
    ["Юпитер", chart.planets.jupiter],
    ["Сатурн", chart.planets.saturn]
  ];

  rows.forEach(([label, planet], index) => {
    doc.text(`${label}: ${planet.sign}, ${planet.house} дом`, 82, 424 + index * 22);
  });
  doc.text(`Асцендент: ${chart.ascendant.sign}`, 320, 424);

  doc.fillColor("#d8c7ff").font("Regular").fontSize(11).text(
    "Этот PDF создан автоматически на основе сохранённой карты. Используйте его как персональный ориентир для самонаблюдения и развития.",
    58,
    660,
    { width: doc.page.width - 116, align: "center" }
  );

  doc.addPage();
}

function addTextSection(doc, text) {
  const lines = text.split("\n");
  const title = lines.shift();
  const body = lines.join("\n").trim();

  ensureSpace(doc, 110);
  doc.fillColor("#17113a").font("Bold").fontSize(16).text(title);
  doc.moveDown(0.5);
  doc.fillColor("#222222").font("Regular").fontSize(11).text(body, {
    lineGap: 4,
    paragraphGap: 8
  });
  doc.moveDown(1);
}

function ensureSpace(doc, needed) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

module.exports = { buildNatalReportPdf };
