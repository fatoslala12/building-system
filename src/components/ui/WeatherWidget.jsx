import React, { useState, useEffect } from 'react';
import { FiSun, FiCloud, FiCloudRain, FiCloudSnow, FiWind } from 'react-icons/fi';

const WeatherIcon = ({ condition }) => {
  const getIcon = (condition) => {
    switch (condition?.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <FiSun className="w-8 h-8 text-yellow-500" />;
      case 'cloudy':
      case 'partly cloudy':
        return <FiCloud className="w-8 h-8 text-gray-500" />;
      case 'rainy':
      case 'rain':
        return <FiCloudRain className="w-8 h-8 text-blue-500" />;
      case 'snowy':
      case 'snow':
        return <FiCloudSnow className="w-8 h-8 text-blue-300" />;
      case 'windy':
        return <FiWind className="w-8 h-8 text-gray-400" />;
      default:
        return <FiSun className="w-8 h-8 text-yellow-500" />;
    }
  };

  return getIcon(condition);
};

export const WeatherWidget = ({ siteName = "London" }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate weather data - in real app, you'd call a weather API
    const mockWeather = {
      temperature: 18,
      condition: 'Partly Cloudy',
      humidity: 65,
      windSpeed: 12,
      forecast: [
        { day: 'Sot', temp: 18, condition: 'Partly Cloudy' },
        { day: 'Hënë', temp: 16, condition: 'Rainy' },
        { day: 'Mar', temp: 20, condition: 'Sunny' },
        { day: 'Mër', temp: 22, condition: 'Sunny' },
        { day: 'Enj', temp: 19, condition: 'Cloudy' }
      ]
    };

    setTimeout(() => {
      setWeather(mockWeather);
      setLoading(false);
    }, 1000);
  }, [siteName]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl shadow-md">
        <div className="animate-pulse">
          <div className="h-6 bg-blue-200 rounded w-32 mb-4"></div>
          <div className="h-12 bg-blue-200 rounded w-24 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-blue-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🌤️ Motet për {siteName}</h3>
        <WeatherIcon condition={weather.condition} />
      </div>
      
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-gray-800 mb-2">
          {weather.temperature}°C
        </div>
        <div className="text-gray-600">{weather.condition}</div>
        <div className="text-sm text-gray-500 mt-2">
          Lagështia: {weather.humidity}% | Era: {weather.windSpeed} km/h
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-gray-700 mb-3">Parashikimi 5-ditor</h4>
        {weather.forecast.map((day, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm">
            <span className="font-medium text-gray-700">{day.day}</span>
            <div className="flex items-center gap-2">
              <WeatherIcon condition={day.condition} />
              <span className="font-semibold text-gray-800">{day.temp}°C</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-200 rounded-lg">
        <div className="text-sm text-blue-800">
          <strong>💡 Këshillë:</strong> Motet e mira për punë në vendin e ndërtimit!
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;