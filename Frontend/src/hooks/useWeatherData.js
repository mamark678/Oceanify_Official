import { useEffect, useState } from "react";
import {
  fetchCurrentWeather,
  fetchForecastData,
  fetchWaveData,
} from "../utils/weatherAPI";
import { getWeatherDescription, getWeatherIcon } from "../utils/weatherUtils";

export const useWeatherData = () => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

  // Add automatic location loading on mount
  useEffect(() => {
    const loadDefaultLocationForecast = async () => {
      // FIXED: Only load once
      if (hasLoadedInitial) return;

      if (!currentLocation && !forecastData) {
        setLoading(true);
        try {
          // Try to get user's location
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 10000,
              maximumAge: 600000,
              enableHighAccuracy: true,
            });
          });

          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;

          const newLocation = {
            lat: userLat,
            lng: userLng,
            name: "Your Location",
          };

          setCurrentLocation(newLocation);

          const data = await fetchForecastData(userLat, userLng);
          if (data) {
            setForecastData(data);
          }
        } catch (error) {
          console.log("Could not get user location, using default:", error);
          // Fallback to default location (Cagayan de Oro)
          const defaultLat = 8.4822;
          const defaultLng = 124.6472;

          const defaultLocation = {
            lat: defaultLat,
            lng: defaultLng,
            name: "Default Location",
          };

          setCurrentLocation(defaultLocation);

          const data = await fetchForecastData(defaultLat, defaultLng);
          if (data) {
            setForecastData(data);
          }
        } finally {
          setLoading(false);
          setHasLoadedInitial(true); // FIXED: Mark as loaded
        }
      }
    };

    loadDefaultLocationForecast();
  }, []); // Run when these change

  const fetchLocationData = async (lat, lng, dataType) => {
    setLoading(true);
    setLoadingType(dataType);

    const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

    const cacheKey = `weather-cache-${lat}-${lng}-${dataType}`;
    let cached = null;
    let cacheTime = null;
    try {
      cached = JSON.parse(localStorage.getItem(cacheKey));
      cacheTime = localStorage.getItem(`${cacheKey}-time`);
    } catch (error) {
      console.error("Cache read error:", error);
    }

    if (cached && cacheTime && Date.now() - cacheTime < CACHE_DURATION) {
      setLoading(false);
      setLoadingType(null);
      return cached;
    }

    try {
      // Always refresh forecast data for the location (separate from cache of current data)
      const forecast = await fetchForecastData(lat, lng);
      setForecastData(forecast);

      let result = null;
      if (dataType === "weather") {
        result = await fetchCurrentWeather(lat, lng);
      } else if (dataType === "waves") {
        result = await fetchWaveData(lat, lng);
      }

      // Cache only if we actually fetched something
      if (result) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(result));
          localStorage.setItem(`${cacheKey}-time`, Date.now());
        } catch (_) {
          // ignore quota errors
        }
      }

      return result;
    } catch (error) {
      console.error("Weather data fetch failed:", error);
      return null;
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  return {
    currentLocation,
    setCurrentLocation,
    forecastData,
    setForecastData,
    loading,
    loadingType,
    fetchLocationData,
    getWeatherIcon,
    getWeatherDescription,
  };
};
