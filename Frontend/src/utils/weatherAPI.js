import { MARINE_API_BASE, WEATHER_API_BASE } from './constants';

export const fetchForecastData = async (lat, lng) => {
  try {
    const forecastUrl = `${WEATHER_API_BASE}/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;
    const response = await fetch(forecastUrl);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch forecast data:", error);
    return null;
  }
};

export const fetchCurrentWeather = async (lat, lng) => {
  try {
    const weatherUrl = `${WEATHER_API_BASE}/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto&wind_speed_unit=kmh&precipitation_unit=mm`;
    const response = await fetch(weatherUrl);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch current weather:", error);
    return null;
  }
};

export const fetchWaveData = async (lat, lng) => {
  try {
    const waveUrl = `${MARINE_API_BASE}/marine?latitude=${lat}&longitude=${lng}&current=wave_height,wave_direction,swell_wave_height,swell_wave_direction,secondary_swell_wave_height,secondary_swell_wave_period&timezone=auto`;
    const response = await fetch(waveUrl);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch wave data:", error);
    return null;
  }
};

export const fetchMarineData = async (lat, lng) => {
  try {
    const marineUrl = `${WEATHER_API_BASE}/marine?latitude=${lat}&longitude=${lng}&current=wave_height&timezone=auto`;
    const response = await fetch(marineUrl);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch marine data:", error);
    return null;
  }
};