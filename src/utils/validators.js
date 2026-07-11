function parseDate(input) {
  const value = String(input || "").trim();
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const date = new Date(`${value}T00:00:00Z`);
  const isValid =
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3]);

  return isValid ? value : null;
}

function parseTime(input) {
  const value = String(input || "").trim();
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? value : null;
}

module.exports = { parseDate, parseTime };
