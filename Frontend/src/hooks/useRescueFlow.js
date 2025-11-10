// useRescueFlow.js - Updated with better state management
import { useState } from 'react';
import supabase from '../supabaseClient';
import { fetchCurrentWeather, fetchWaveData } from '../utils/weatherAPI';

export const useRescueFlow = (mapRef) => {
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [rescueLocation, setRescueLocation] = useState(null);
  const [rescueReason, setRescueReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLat, setSelectedLat] = useState(null);
  const [selectedLng, setSelectedLng] = useState(null);

  const requestRescueAt = (lat, lng, reason = "") => {
    setRescueLocation({ lat, lng });
    setRescueReason(reason);
    setShowRescueModal(true);
  };

  const submitRescue = async () => {
    if (!rescueLocation || !rescueReason.trim()) {
      alert("⚠️ Please select a reason for the rescue request.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Fetch weather and marine data
      const [weatherData, waveData] = await Promise.all([
        fetchCurrentWeather(rescueLocation.lat, rescueLocation.lng),
        fetchWaveData(rescueLocation.lat, rescueLocation.lng)
      ]);

      // Prepare rescue request
      const rescueRequest = {
        latitude: rescueLocation.lat,
        longitude: rescueLocation.lng,
        reason: rescueReason.toLowerCase().replace(/\s+/g, "_"),
        status: "pending",
        timestamp: new Date().toISOString(),
        read: false,
        weather: weatherData?.current ? {
          temperature_2m: weatherData.current.temperature_2m,
          wind_speed_10m: weatherData.current.wind_speed_10m,
          precipitation: weatherData.current.precipitation,
          weather_code: weatherData.current.weather_code,
        } : null,
        marine: waveData?.current ? {
          wave_height: waveData.current.wave_height,
          wave_direction: waveData.current.wave_direction,
        } : null,
      };

      // Save to Supabase
      const { data, error } = await supabase
        .from("rescue_requests")
        .insert([rescueRequest])
        .select();

      if (error) throw error;

      console.log("Rescue request saved:", data);

      // Place SOS marker on map
      if (mapRef.current && window.L) {
        const L = window.L;
        const sosIcon = L.divIcon({
          html: `<div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color:white; border-radius:50%; width:48px; height:48px; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:bold; border:4px solid white; box-shadow:0 4px 12px rgba(220,38,38,0.5); animation: pulse 2s infinite;">🆘</div>`,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        });

        L.marker([rescueLocation.lat, rescueLocation.lng], { icon: sosIcon })
          .addTo(mapRef.current)
          .bindPopup(
            `<div class="p-4 bg-gradient-to-br from-red-900/90 to-orange-900/70 rounded-xl border border-red-500/30 backdrop-blur-sm min-w-[200px]">
              <div class="text-white font-bold text-lg mb-2">🆘 EMERGENCY RESCUE</div>
              <div class="text-red-200 text-sm mb-1">Reason: ${rescueReason.replace(/_/g, ' ').toUpperCase()}</div>
              <div class="text-orange-200 text-xs">${new Date().toLocaleString()}</div>
              <div class="mt-2 text-xs text-yellow-200">Status: PENDING</div>
            </div>`
          )
          .openPopup();
      }

      // Close modal and reset
      setShowRescueModal(false);
      setRescueLocation(null);
      setRescueReason('');

    } catch (error) {
      console.error("Failed to submit rescue request:", error);
      alert(
        "❌ Failed to submit rescue request. Please try again.\n\n" +
        "Error: " + error.message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelRescue = () => {
    setShowRescueModal(false);
    setRescueLocation(null);
    setRescueReason('');
  };

  return {
    showRescueModal,
    rescueLocation,
    rescueReason,
    setRescueReason,
    isSubmitting,
    selectedLat,
    selectedLng,
    setSelectedLat,
    setSelectedLng,
    requestRescueAt,
    submitRescue,
    cancelRescue
  };
};