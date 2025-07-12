import React, { useState, useEffect } from 'react';

const WeatherWidget = ({ siteName = "London" }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        // Using a free weather API (you can replace with your preferred API)
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${siteName}&appid=YOUR_API_KEY&units=metric`
        );
        
        if (!response.ok) {
          throw new Error('Weather data not available');
        }
        
        const data = await response.json();
        setWeather(data);
      } catch (err) {
        console.error('Error fetching weather:', err);
        setError('Weather data not available');
        // Fallback to mock data for demo
        setWeather({
          main: { temp: 18, humidity: 65 },
          weather: [{ main: 'Clouds', description: 'scattered clouds' }],
          wind: { speed: 3.5 }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [siteName]);

  const getWeatherIcon = (weatherMain) => {
    const icons = {
      Clear: '☀️',
      Clouds: '☁️',
      Rain: '🌧️',
      Snow: '❄️',
      Thunderstorm: '⛈️',
      Drizzle: '🌦️',
      Mist: '🌫️',
      Fog: '🌫️',
      Haze: '🌫️'
    };
    return icons[weatherMain] || '🌤️';
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl shadow-md">
        <div className="animate-pulse">
          <div className="h-4 bg-blue-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-blue-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-blue-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl shadow-md">
        <div className="text-center">
          <div className="text-2xl mb-2">🌤️</div>
          <div className="text-sm text-gray-600">Weather data not available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-blue-800 mb-1">📍 {siteName}</h3>
          <div className="text-2xl font-bold text-blue-900">
            {Math.round(weather.main.temp)}°C
          </div>
          <div className="text-xs text-blue-700 capitalize">
            {weather.weather[0].description}
          </div>
        </div>
        <div className="text-4xl">
          {getWeatherIcon(weather.weather[0].main)}
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-blue-200">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span>💨</span>
            <span className="text-blue-700">{weather.wind.speed} m/s</span>
          </div>
          <div className="flex items-center gap-1">
            <span>💧</span>
            <span className="text-blue-700">{weather.main.humidity}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;