import fetch from 'node-fetch';

const ORIGIN = 'open-meteo';

/**
 * Fetch weather data for a location
 * @param {Object} params - Query parameters
 * @param {string} params.city - City name (optional, defaults to San Francisco)
 * @param {number} params.lat - Latitude (optional)
 * @param {number} params.lon - Longitude (optional)
 * @returns {Object} Normalized adapter response
 */
export async function query(params) {
  try {
    let lat = params.lat;
    let lon = params.lon;
    let locationName = params.city || 'San Francisco, CA';

    // 1. Geocoding if city provided and no coords
    if (!lat && !lon && params.city) {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(params.city)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();

      if (geoData.results && geoData.results.length > 0) {
        lat = geoData.results[0].latitude;
        lon = geoData.results[0].longitude;
        locationName = `${geoData.results[0].name}, ${geoData.results[0].country}`;
      } else {
        // Fallback to SF
        lat = 37.7749;
        lon = -122.4194;
        locationName = 'San Francisco (Fallback)';
      }
    } else if (!lat && !lon) {
      // Default to SF
      lat = 37.7749;
      lon = -122.4194;
    }

    // 2. Fetch Weather Data
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`open-meteo-http-${res.status}`);

    const data = await res.json();

    return {
      source: 'OpenMeteo',
      value: {
        location: locationName,
        current: {
          temp: data.current.temperature_2m,
          feelsLike: data.current.apparent_temperature,
          humidity: data.current.relative_humidity_2m,
          windSpeed: data.current.wind_speed_10m,
          conditionCode: data.current.weather_code,
          isDay: data.current.is_day
        },
        daily: {
          max: data.daily.temperature_2m_max[0],
          min: data.daily.temperature_2m_min[0],
          conditionCode: data.daily.weather_code[0]
        },
        units: data.current_units
      },
      verifiedAt: new Date().toISOString(),
      origin: ORIGIN,
      raw: data
    };

  } catch (e) {
    return {
      source: 'OpenMeteo',
      value: null,
      verifiedAt: new Date().toISOString(),
      origin: ORIGIN,
      raw: { error: e.message }
    };
  }
}

export async function status() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0');
    return { ok: res.ok, message: res.ok ? 'Open-Meteo API reachable' : `http ${res.status}` };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}
