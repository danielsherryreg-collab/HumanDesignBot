const axios = require("axios");
const { find } = require("geo-tz");
const { config } = require("../config/config");

async function geocodePlace(place) {
  const response = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: {
      q: place,
      format: "jsonv2",
      limit: 1,
      addressdetails: 1
    },
    headers: {
      "User-Agent": config.nominatimUserAgent,
      "From": config.nominatimEmail || undefined
    },
    timeout: 12000
  });

  const [result] = response.data || [];

  if (!result) {
    throw new Error("PLACE_NOT_FOUND");
  }

  return {
    place: result.display_name,
    lat: Number(result.lat),
    lon: Number(result.lon)
  };
}

function getTimezone(lat, lon) {
  const [timezone] = find(lat, lon);

  if (!timezone) {
    throw new Error("TIMEZONE_NOT_FOUND");
  }

  return timezone;
}

module.exports = { geocodePlace, getTimezone };
