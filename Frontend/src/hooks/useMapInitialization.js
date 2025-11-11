import { useEffect } from "react";
import { GRID_STEP, THRESHOLDS } from "../utils/constants";
import { fetchCurrentWeather, fetchMarineData } from "../utils/weatherAPI";
import {
  degToCompass,
  formatValue
} from "../utils/weatherUtils";

export const useMapInitialization = (
  mapRef,
  markerRef,
  warningMarkersRef,
  setMapLoaded,
  setShowForecastPanel,
  requestRescueAt
) => {
  useEffect(() => {
    const API_KEY = "60b8ffcce91b8ebdc127d1219e56e0f5";

    const loadLeaflet = async () => {
      try {
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href =
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
          document.head.appendChild(link);
        }

        if (!window.L) {
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
          script.onload = initializeMap;
          document.head.appendChild(script);
        } else {
          initializeMap();
        }
      } catch (err) {
        console.error("Failed to load Leaflet", err);
      }
    };

    const clearWarningMarkers = () => {
      if (!mapRef.current) return;
      const L = window.L;
      (warningMarkersRef.current || []).forEach((m) => {
        try {
          if (mapRef.current.hasLayer(m)) mapRef.current.removeLayer(m);
        } catch (e) {}
      });
      warningMarkersRef.current = [];
    };

    const addWarningMarker = (lat, lng, summary, details = {}) => {
      if (!mapRef.current || !window.L) return;
      const L = window.L;

      const marker = L.circleMarker([lat, lng], {
        radius: 16,
        color: "#ff8c00",
        fillColor: "#ffb86b",
        fillOpacity: 0.8,
        weight: 3,
      }).addTo(mapRef.current);

      const popupHtml = `
        <div class="min-w-[240px] p-3 bg-gradient-to-br from-orange-900/90 to-yellow-900/70 rounded-xl border border-orange-500/30 backdrop-blur-sm">
          <h3 class="text-white font-bold mb-2 flex items-center gap-2">
            <span>⚠️</span>
            Strong Storm Area
          </h3>
          <div class="text-orange-200 text-sm mb-3">
            ${summary}
          </div>
          <div class="text-orange-300 text-xs mb-3 space-y-1">
            <div><b>Wind:</b> ${details.wind_speed ?? "N/A"} km/h</div>
            <div><b>Gust:</b> ${details.wind_gust ?? "N/A"} km/h</div>
            <div><b>Wave:</b> ${details.wave_height ?? "N/A"} m</div>
            <div><b>Precip:</b> ${details.precipitation ?? "N/A"} mm</div>
          </div>
          <div class="flex gap-2">
            <button 
              onclick="window.viewStormDetails(${lat}, ${lng})"
              class="flex-1 px-3 py-2 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 text-white border-none cursor-pointer transition-all hover:scale-105"
            >
              View Details
            </button>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
      warningMarkersRef.current.push(marker);
    };

    // Function to create detailed popup for storm markers
    const createStormDetailsPopup = async (lat, lng) => {
      try {
        const [weatherData, marineData] = await Promise.all([
          fetchCurrentWeather(lat, lng),
          fetchMarineData(lat, lng),
        ]);

        if (!weatherData?.current && !marineData?.current) {
          return `
            <div style="min-width: 280px; padding: 16px;">
              <h3 style="margin: 0 0 12px 0; color: #2c3e50; font-size: 18px; font-weight: bold;">
                ⚠️ Storm Details
              </h3>
              <div style="color: #7f8c8d; text-align: center; padding: 20px;">
                No detailed data available for this location.
              </div>
            </div>
          `;
        }

        return `
          <div style="min-width: 300px; padding: 16px;">
            <div style="text-align: center; margin-bottom: 16px;">
              <h3 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 18px; font-weight: bold;">
                ⚠️ Storm Conditions
              </h3>
              <div style="color: #7f8c8d; font-size: 12px;">
                ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E
              </div>
            </div>

            <div style="display: grid; gap: 12px;">
              ${
                weatherData?.current
                  ? `
                <div style="background: linear-gradient(135deg, #ff6b6b, #ee5a52); padding: 12px; border-radius: 8px;">
                  <div style="color: white; font-weight: bold; margin-bottom: 8px;">Weather</div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; color: white; font-size: 12px;">
                    <div>Wind: ${formatValue(
                      weatherData.current.wind_speed_10m,
                      " km/h",
                      0
                    )}</div>
                    <div>Gust: ${formatValue(
                      weatherData.current.wind_gusts_10m,
                      " km/h",
                      0
                    )}</div>
                    <div>Direction: ${degToCompass(
                      weatherData.current.wind_direction_10m
                    )}</div>
                    <div>Precip: ${formatValue(
                      weatherData.current.precipitation,
                      " mm",
                      1
                    )}</div>
                  </div>
                </div>
              `
                  : ""
              }

              ${
                marineData?.current
                  ? `
                <div style="background: linear-gradient(135deg, #74b9ff, #0984e3); padding: 12px; border-radius: 8px;">
                  <div style="color: white; font-weight: bold; margin-bottom: 8px;">Marine</div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; color: white; font-size: 12px;">
                    <div>Wave: ${formatValue(
                      marineData.current.wave_height,
                      " m",
                      1
                    )}</div>
                    <div>Direction: ${degToCompass(
                      marineData.current.wave_direction
                    )}</div>
                    ${
                      marineData.current.swell_wave_height
                        ? `<div>Swell: ${formatValue(
                            marineData.current.swell_wave_height,
                            " m",
                            1
                          )}</div>`
                        : ""
                    }
                    ${
                      marineData.current.swell_wave_direction
                        ? `<div>Swell Dir: ${degToCompass(
                            marineData.current.swell_wave_direction
                          )}</div>`
                        : ""
                    }
                  </div>
                </div>
              `
                  : ""
              }
            </div>

            <div style="display: flex; gap: 8px; margin-top: 16px;">
              <button 
                onclick="window.viewFullWeatherData(${lat}, ${lng})"
                style="flex: 1; padding: 8px 12px; background: linear-gradient(135deg, #ff6b6b, #ee5a52); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600;"
              >
                Full Weather
              </button>
              <button 
                onclick="window.viewFullWaveData(${lat}, ${lng})"
                style="flex: 1; padding: 8px 12px; background: linear-gradient(135deg, #74b9ff, #0984e3); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600;"
              >
                Full Waves
              </button>
            </div>
          </div>
        `;
      } catch (error) {
        console.error("Error creating storm details popup:", error);
        return `
          <div style="min-width: 280px; padding: 16px;">
            <div style="color: #dc2626; text-align: center;">
              Error loading storm details
            </div>
          </div>
        `;
      }
    };

    const scanStormsInBounds = async () => {
      if (!mapRef.current || !window.L) return;
      const map = mapRef.current;
      clearWarningMarkers();

      const bounds = map.getBounds();
      const north = bounds.getNorth();
      const south = bounds.getSouth();
      const west = bounds.getWest();
      const east = bounds.getEast();

      const latSteps = [];
      for (
        let lat = Math.max(-89.5, south);
        lat <= Math.min(89.5, north);
        lat = +(lat + GRID_STEP).toFixed(6)
      ) {
        latSteps.push(lat);
      }

      const lngSteps = [];
      let normalizedWest = west;
      let normalizedEast = east;
      if (east < west) normalizedEast = east + 360;
      for (
        let lng = normalizedWest;
        lng <= normalizedEast;
        lng = +(lng + GRID_STEP).toFixed(6)
      ) {
        const normalizedLng = ((lng + 540) % 360) - 180;
        lngSteps.push(normalizedLng);
      }

      const points = [];
      for (const lat of latSteps) {
        for (const lng of lngSteps) {
          points.push({ lat, lng });
        }
      }

      const MAX_POINTS = 80;
      const chunked = points.slice(0, MAX_POINTS);

      const concurrency = 5;
      for (let i = 0; i < chunked.length; i += concurrency) {
        const batch = chunked.slice(i, i + concurrency);
        await Promise.all(
          batch.map(async (pt) => {
            try {
              const marineData = await fetchMarineData(pt.lat, pt.lng);
              if (
                !marineData?.current ||
                marineData.current.wave_height == null
              ) {
                return;
              }

              const weatherData = await fetchCurrentWeather(pt.lat, pt.lng);
              const w = weatherData?.current || {};

              const wave_h = Number(marineData.current.wave_height ?? 0);
              const wind_s = Number(w.wind_speed_10m ?? 0);
              const wind_g = Number(w.wind_gusts_10m ?? 0);
              const precip = Number(w.precipitation ?? 0);

              const isSevere =
                wave_h >= THRESHOLDS.wave_height_m ||
                wind_s >= THRESHOLDS.wind_speed_kmh ||
                wind_g >= THRESHOLDS.wind_gust_kmh ||
                precip >= THRESHOLDS.precipitation_mm_h;

              if (isSevere) {
                const summaryParts = [];
                if (wind_s >= THRESHOLDS.wind_speed_kmh)
                  summaryParts.push(`Wind ${Math.round(wind_s)} km/h`);
                if (wind_g >= THRESHOLDS.wind_gust_kmh)
                  summaryParts.push(`Gust ${Math.round(wind_g)} km/h`);
                if (wave_h >= THRESHOLDS.wave_height_m)
                  summaryParts.push(`Wave ${wave_h.toFixed(1)} m`);
                if (precip >= THRESHOLDS.precipitation_mm_h)
                  summaryParts.push(`Precip ${precip} mm`);
                const summary =
                  summaryParts.join(" • ") || "Strong marine conditions";

                addWarningMarker(pt.lat, pt.lng, summary, {
                  wind_speed: Math.round(wind_s),
                  wind_gust: Math.round(wind_g),
                  wave_height: wave_h,
                  precipitation: precip,
                });
              }
            } catch (err) {
              // ignore per-point errors
            }
          })
        );
      }
    };

    const initializeMap = () => {
      const L = window.L;
      if (!L) return console.error("Leaflet failed to load");

      const map = L.map("map").setView([8.0, 125.0], 6);
      mapRef.current = map;

      // Base tiles with dark theme
        const STADIA_API_KEY = import.meta.env.VITE_STADIA_API_KEY;

        L.tileLayer(
          `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=${VITE_STADIA_API_KEY}`,
          {
            attribution:
              '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
          }
        ).addTo(map);

      // Weather layers
      const tempLayer = L.tileLayer(
        `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
        { opacity: 0.6 }
      );
      const pressureLayer = L.tileLayer(
        `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
        { opacity: 0.6 }
      );
      const precipitationLayer = L.tileLayer(
        `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
        { opacity: 0.6 }
      );

      tempLayer.addTo(map);
      map.tempLayer = tempLayer;
      map.pressureLayer = pressureLayer;
      map.precipitationLayer = precipitationLayer;

      setMapLoaded(true);

      // Set global functions for storm markers
      window.viewStormDetails = async (lat, lng) => {
        const popupContent = await createStormDetailsPopup(lat, lng);
        const L = window.L;

        // Create a temporary marker for the detailed popup
        const tempMarker = L.marker([lat, lng])
          .addTo(map)
          .bindPopup(popupContent, {
            maxWidth: 320,
            className: "storm-details-popup",
          })
          .openPopup();

        // Remove the temporary marker when popup closes
        tempMarker.on("popupclose", function () {
          map.removeLayer(tempMarker);
        });
      };

      window.viewFullWeatherData = (lat, lng) => {
        window.viewWeatherData?.(lat, lng, "Storm Location");
      };

      window.viewFullWaveData = (lat, lng) => {
        window.viewWaveData?.(lat, lng, "Storm Location");
      };

      // Center on user if available
      navigator.geolocation.getCurrentPosition(
        ({ coords: { latitude, longitude } }) => {
          const userIcon = L.divIcon({
            html: `<div class="user-location-marker"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
          L.marker([latitude, longitude], { icon: userIcon }).addTo(map)
            .bindPopup(`
              <div class="p-3 bg-gradient-to-br from-blue-900/90 to-purple-900/70 rounded-xl border border-blue-500/30 backdrop-blur-sm">
                <div class="text-white font-bold flex items-center gap-2">
                  <span>📍</span>
                  Your Location
                </div>
                <div class="text-blue-200 text-sm mt-1">
                  ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E
                </div>
                <div class="flex gap-2 mt-3">
                  <button 
                    onclick="window.viewWeatherData(${latitude}, ${longitude}, 'Your Location')"
                    class="flex-1 px-3 py-2 rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white border-none cursor-pointer text-xs font-semibold"
                  >
                    View Weather
                  </button>
                  <button 
                    onclick="window.viewWaveData(${latitude}, ${longitude}, 'Your Location')"
                    class="flex-1 px-3 py-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none cursor-pointer text-xs font-semibold"
                  >
                    View Waves
                  </button>
                </div>
              </div>
            `);

          map.setView([latitude, longitude], 7);
        },
        (err) => console.warn("Geolocation error:", err),
        { enableHighAccuracy: true, timeout: 10000 }
      );

      // Map click handler
      map.on("click", async (e) => {
        const { lat, lng } = e.latlng;

        // Create data selection popup
        const selectionPopupContent = `
          <div style="min-width: 280px; padding: 16px;">
            <div style="text-align: center; margin-bottom: 16px;">
              <h3 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 18px; font-weight: bold;">
                📍 Location Data
              </h3>
              <div style="color: #7f8c8d; font-size: 12px;">
                ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E
              </div>
            </div>

            <div style="display: grid; gap: 10px; margin-bottom: 16px;">
              <button 
                onclick="window.selectDataType(${lat}, ${lng}, 'weather')"
                style="
                  padding: 12px 16px;
                  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
                  color: white;
                  border: none;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 600;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                "
                onmouseover="this.style.transform='scale(1.02)'"
                onmouseout="this.style.transform='scale(1)'"
              >
                🌤️ View Weather Data
              </button>
              
              <button 
                onclick="window.selectDataType(${lat}, ${lng}, 'waves')"
                style="
                  padding: 12px 16px;
                  background: linear-gradient(135deg, #74b9ff, #0984e3);
                  color: white;
                  border: none;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 600;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                "
                onmouseover="this.style.transform='scale(1.02)'"
                onmouseout="this.style.transform='scale(1)'"
              >
                🌊 View Wave Data
              </button>
            </div>

            <div style="border-top: 1px solid #e9ecef; padding-top: 12px;">
              <button 
                onclick="window.requestRescueAtLocation(${lat}, ${lng})"
                style="
                  width: 100%;
                  padding: 10px 16px;
                  background: linear-gradient(135deg, #dc2626, #b91c1c);
                  color: white;
                  border: none;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 13px;
                  font-weight: 600;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 6px;
                "
                onmouseover="this.style.transform='scale(1.02)'"
                onmouseout="this.style.transform='scale(1)'"
              >
                🆘 Request Emergency Rescue
              </button>
              <div style="font-size: 10px; color: #6c757d; text-align: center; margin-top: 6px;">
                For genuine emergencies only
              </div>
            </div>
          </div>
        `;

        const selectionIcon = L.divIcon({
          html: `<div style="background: linear-gradient(135deg, #10b981, #059669); color:white; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:bold; border:3px solid white; box-shadow:0 3px 10px rgba(0,0,0,0.3);">📍</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
        });

        // Remove previous marker
        if (markerRef.current && map.hasLayer(markerRef.current)) {
          map.removeLayer(markerRef.current);
        }

        markerRef.current = L.marker([lat, lng], { icon: selectionIcon })
          .addTo(map)
          .bindPopup(selectionPopupContent, {
            maxWidth: 320,
            className: "selection-popup",
            autoPan: true
          })
          .openPopup();
      });

      // Initial scan and movement handlers
      setTimeout(() => {
        scanStormsInBounds();
      }, 1200);

      map.on("moveend", () => {
        clearWarningMarkers();
        scanStormsInBounds();
      });
    };

    loadLeaflet();

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
      }
    };
  }, []);
};
