import { fetchCurrentWeather, fetchWaveData } from "../utils/weatherAPI";
import { getWeatherDescription } from "../utils/weatherUtils";

// Enhanced thresholds for different vessel types
const VESSEL_THRESHOLDS = {
  fishing: {
    wind_speed_kmh: 35,
    wind_gust_kmh: 50,
    wave_height_m: 1.5,
    precipitation_mm_h: 10,
  },
  commercial: {
    wind_speed_kmh: 50,
    wind_gust_kmh: 70,
    wave_height_m: 2.5,
    precipitation_mm_h: 15,
  },
};

// Alert severity levels
export const SEVERITY = {
  SAFE: "safe",
  CAUTION: "caution",
  WARNING: "warning",
  DANGER: "danger",
};

// Severity configuration
const SEVERITY_CONFIG = {
  [SEVERITY.SAFE]: {
    color: "#10b981",
    bgColor: "#ecfdf5",
    borderColor: "#6ee7b7",
    icon: "✓",
    label: "Safe",
  },
  [SEVERITY.CAUTION]: {
    color: "#f59e0b",
    bgColor: "#fffbeb",
    borderColor: "#fcd34d",
    icon: "⚠",
    label: "Caution",
  },
  [SEVERITY.WARNING]: {
    color: "#f97316",
    bgColor: "#fff7ed",
    borderColor: "#fdba74",
    icon: "⚠",
    label: "Warning",
  },
  [SEVERITY.DANGER]: {
    color: "#ef4444",
    bgColor: "#fef2f2",
    borderColor: "#fca5a5",
    icon: "⚠",
    label: "Danger",
  },
};

export const getSeverityConfig = (severity) => SEVERITY_CONFIG[severity];

/**
 * Analyze weather conditions and determine severity
 */
const analyzeWeatherConditions = (weatherData) => {
  if (!weatherData?.current) return null;

  const { current } = weatherData;
  const issues = [];
  let maxSeverity = SEVERITY.SAFE;

  // Wind analysis
  if (current.wind_speed_10m >= VESSEL_THRESHOLDS.commercial.wind_speed_kmh) {
    issues.push({
      type: "wind",
      severity: SEVERITY.DANGER,
      message: `Very high winds: ${Math.round(current.wind_speed_10m)} km/h`,
    });
    maxSeverity = SEVERITY.DANGER;
  } else if (
    current.wind_speed_10m >= VESSEL_THRESHOLDS.fishing.wind_speed_kmh
  ) {
    issues.push({
      type: "wind",
      severity:
        current.wind_speed_10m >= 45 ? SEVERITY.WARNING : SEVERITY.CAUTION,
      message: `High winds: ${Math.round(current.wind_speed_10m)} km/h`,
    });
    if (current.wind_speed_10m >= 45 && maxSeverity === SEVERITY.SAFE) {
      maxSeverity = SEVERITY.WARNING;
    } else if (maxSeverity === SEVERITY.SAFE) {
      maxSeverity = SEVERITY.CAUTION;
    }
  }

  // Wind gust analysis
  if (current.wind_gusts_10m >= VESSEL_THRESHOLDS.commercial.wind_gust_kmh) {
    issues.push({
      type: "gust",
      severity: SEVERITY.DANGER,
      message: `Dangerous wind gusts: ${Math.round(
        current.wind_gusts_10m
      )} km/h`,
    });
    maxSeverity = SEVERITY.DANGER;
  } else if (
    current.wind_gusts_10m >= VESSEL_THRESHOLDS.fishing.wind_gust_kmh
  ) {
    issues.push({
      type: "gust",
      severity: SEVERITY.WARNING,
      message: `Strong wind gusts: ${Math.round(current.wind_gusts_10m)} km/h`,
    });
    if (maxSeverity !== SEVERITY.DANGER) {
      maxSeverity = SEVERITY.WARNING;
    }
  }

  // Precipitation analysis
  if (
    current.precipitation >= VESSEL_THRESHOLDS.commercial.precipitation_mm_h
  ) {
    issues.push({
      type: "precipitation",
      severity: SEVERITY.WARNING,
      message: `Heavy rainfall: ${current.precipitation.toFixed(1)} mm/h`,
    });
    if (maxSeverity === SEVERITY.SAFE || maxSeverity === SEVERITY.CAUTION) {
      maxSeverity = SEVERITY.WARNING;
    }
  } else if (
    current.precipitation >= VESSEL_THRESHOLDS.fishing.precipitation_mm_h
  ) {
    issues.push({
      type: "precipitation",
      severity: SEVERITY.CAUTION,
      message: `Moderate rainfall: ${current.precipitation.toFixed(1)} mm/h`,
    });
    if (maxSeverity === SEVERITY.SAFE) {
      maxSeverity = SEVERITY.CAUTION;
    }
  }

  // Weather code analysis (storms, fog, etc.)
  const weatherCode = current.weather_code;
  if ([95, 96, 99].includes(weatherCode)) {
    issues.push({
      type: "storm",
      severity: SEVERITY.DANGER,
      message: "Thunderstorm detected",
    });
    maxSeverity = SEVERITY.DANGER;
  } else if ([82].includes(weatherCode)) {
    issues.push({
      type: "storm",
      severity: SEVERITY.WARNING,
      message: "Violent rain showers",
    });
    if (maxSeverity !== SEVERITY.DANGER) {
      maxSeverity = SEVERITY.WARNING;
    }
  } else if ([45, 48].includes(weatherCode)) {
    issues.push({
      type: "visibility",
      severity: SEVERITY.CAUTION,
      message: "Fog - reduced visibility",
    });
    if (maxSeverity === SEVERITY.SAFE) {
      maxSeverity = SEVERITY.CAUTION;
    }
  }

  return {
    severity: maxSeverity,
    issues,
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    weatherDescription: getWeatherDescription(weatherCode),
  };
};

/**
 * Analyze wave conditions and determine severity
 */
const analyzeWaveConditions = (waveData) => {
  if (!waveData?.current) return null;

  const { current } = waveData;
  const issues = [];
  let maxSeverity = SEVERITY.SAFE;

  // Wave height analysis
  const waveHeight = current.wave_height || 0;

  if (waveHeight >= VESSEL_THRESHOLDS.commercial.wave_height_m) {
    issues.push({
      type: "wave",
      severity: SEVERITY.DANGER,
      message: `Very high waves: ${waveHeight.toFixed(1)}m`,
    });
    maxSeverity = SEVERITY.DANGER;
  } else if (waveHeight >= VESSEL_THRESHOLDS.fishing.wave_height_m) {
    issues.push({
      type: "wave",
      severity: waveHeight >= 2.0 ? SEVERITY.WARNING : SEVERITY.CAUTION,
      message: `High waves: ${waveHeight.toFixed(1)}m`,
    });
    maxSeverity = waveHeight >= 2.0 ? SEVERITY.WARNING : SEVERITY.CAUTION;
  }

  // Swell analysis
  const swellHeight = current.swell_wave_height || 0;
  if (swellHeight >= 2.0) {
    issues.push({
      type: "swell",
      severity: swellHeight >= 3.0 ? SEVERITY.WARNING : SEVERITY.CAUTION,
      message: `Significant swell: ${swellHeight.toFixed(1)}m`,
    });
    if (swellHeight >= 3.0 && maxSeverity === SEVERITY.SAFE) {
      maxSeverity = SEVERITY.WARNING;
    } else if (maxSeverity === SEVERITY.SAFE) {
      maxSeverity = SEVERITY.CAUTION;
    }
  }

  return {
    severity: maxSeverity,
    issues,
    waveHeight,
    swellHeight,
    waveDirection: current.wave_direction,
  };
};

/**
 * Generate maritime safety recommendations
 */
const generateRecommendations = (weatherAnalysis, waveAnalysis) => {
  const recommendations = {
    fishing: [],
    commercial: [],
    general: [],
  };

  const combinedSeverity =
    weatherAnalysis?.severity === SEVERITY.DANGER ||
    waveAnalysis?.severity === SEVERITY.DANGER
      ? SEVERITY.DANGER
      : weatherAnalysis?.severity === SEVERITY.WARNING ||
        waveAnalysis?.severity === SEVERITY.WARNING
      ? SEVERITY.WARNING
      : weatherAnalysis?.severity === SEVERITY.CAUTION ||
        waveAnalysis?.severity === SEVERITY.CAUTION
      ? SEVERITY.CAUTION
      : SEVERITY.SAFE;

  // Fishing boat recommendations
  if (combinedSeverity === SEVERITY.DANGER) {
    recommendations.fishing.push(
      "⛔ DO NOT SAIL - Conditions are dangerous for fishing vessels"
    );
    recommendations.fishing.push("Seek immediate shelter if already at sea");
    recommendations.fishing.push("Secure all equipment and vessels in port");
  } else if (combinedSeverity === SEVERITY.WARNING) {
    recommendations.fishing.push(
      "⚠️ NOT RECOMMENDED - Conditions are hazardous for small vessels"
    );
    recommendations.fishing.push(
      "Only experienced crews with proper equipment should consider sailing"
    );
    recommendations.fishing.push(
      "Stay close to shore and monitor weather closely"
    );
  } else if (combinedSeverity === SEVERITY.CAUTION) {
    recommendations.fishing.push("⚠️ CAUTION ADVISED - Exercise extreme care");
    recommendations.fishing.push("Ensure all safety equipment is functional");
    recommendations.fishing.push("Monitor weather updates regularly");
    recommendations.fishing.push("Avoid venturing too far from shore");
  } else {
    recommendations.fishing.push("✓ Conditions are generally safe for fishing");
    recommendations.fishing.push("Maintain standard safety precautions");
  }

  // Commercial vessel recommendations
  if (combinedSeverity === SEVERITY.DANGER) {
    recommendations.commercial.push(
      "⚠️ EXTREME CAUTION - Hazardous conditions present"
    );
    recommendations.commercial.push("Consider delaying departure if possible");
    recommendations.commercial.push("Ensure all cargo is properly secured");
    recommendations.commercial.push("Brief crew on emergency procedures");
  } else if (combinedSeverity === SEVERITY.WARNING) {
    recommendations.commercial.push(
      "⚠️ PROCEED WITH CAUTION - Challenging conditions"
    );
    recommendations.commercial.push("Reduce speed and maintain safe distances");
    recommendations.commercial.push("Secure all loose items on deck");
    recommendations.commercial.push("Monitor weather updates continuously");
  } else if (combinedSeverity === SEVERITY.CAUTION) {
    recommendations.commercial.push(
      "⚠️ MINOR CAUTION - Some challenging conditions"
    );
    recommendations.commercial.push("Maintain normal safety protocols");
    recommendations.commercial.push("Monitor weather for changes");
  } else {
    recommendations.commercial.push("✓ Conditions are favorable for sailing");
    recommendations.commercial.push("Maintain standard operational procedures");
  }

  // General recommendations
  if (weatherAnalysis?.issues.length > 0 || waveAnalysis?.issues.length > 0) {
    recommendations.general.push("Stay informed of weather updates");
    recommendations.general.push(
      "Ensure communication equipment is operational"
    );
    recommendations.general.push("Have emergency contacts readily available");
  }

  if (waveAnalysis && waveAnalysis.waveHeight >= 1.5) {
    recommendations.general.push(
      "Expect rough seas - secure all cargo and equipment"
    );
  }

  if (weatherAnalysis?.issues.some((i) => i.type === "visibility")) {
    recommendations.general.push("Use navigation lights and sound signals");
    recommendations.general.push("Reduce speed in low visibility");
  }

  return {
    fishing: recommendations.fishing,
    commercial: recommendations.commercial,
    general: recommendations.general,
    overallSeverity: combinedSeverity,
  };
};

/**
 * Fetch and analyze conditions for a single location
 */
export const analyzeLocation = async (lat, lng, locationName) => {
  try {
    const [weatherData, waveData] = await Promise.all([
      fetchCurrentWeather(lat, lng),
      fetchWaveData(lat, lng),
    ]);

    const weatherAnalysis = analyzeWeatherConditions(weatherData);
    const waveAnalysis = analyzeWaveConditions(waveData);
    const recommendations = generateRecommendations(
      weatherAnalysis,
      waveAnalysis
    );

    return {
      location: locationName,
      lat,
      lng,
      timestamp: new Date().toISOString(),
      weather: weatherAnalysis,
      waves: waveAnalysis,
      recommendations,
      overallSeverity: recommendations.overallSeverity,
    };
  } catch (error) {
    console.error(`Failed to analyze location ${locationName}:`, error);
    return null;
  }
};

/**
 * Fetch and analyze conditions for multiple ports
 */
export const analyzeMultipleLocations = async (locations) => {
  const results = await Promise.all(
    locations.map((loc) =>
      analyzeLocation(
        loc.latitude,
        loc.longitude,
        loc.port_name || loc.location
      )
    )
  );

  return results.filter((r) => r !== null);
};

/**
 * Get summary statistics from multiple location analyses
 */
export const getAlertSummary = (analyses) => {
  const summary = {
    total: analyses.length,
    safe: 0,
    caution: 0,
    warning: 0,
    danger: 0,
    criticalLocations: [],
  };

  analyses.forEach((analysis) => {
    const severity = analysis.overallSeverity;
    summary[severity]++;

    if (severity === SEVERITY.DANGER || severity === SEVERITY.WARNING) {
      summary.criticalLocations.push({
        name: analysis.location,
        severity: severity,
        lat: analysis.lat,
        lng: analysis.lng,
      });
    }
  });

  return summary;
};
