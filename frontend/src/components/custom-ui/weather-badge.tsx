// src/components/WeatherBadge.tsx
import { useQuery } from '@tanstack/react-query';
import { 
  Cloud, Sun, CloudRain, Snowflake, CloudLightning, Wind 
} from 'lucide-react';

// 1. Cấu hình màu sắc và icon
const getWeatherConfig = (condition: string) => {
  const lowercaseCondition = condition.toLowerCase();
  if (lowercaseCondition.includes('clear') || lowercaseCondition.includes('sun')) 
    return { icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' };
  if (lowercaseCondition.includes('rain') || lowercaseCondition.includes('drizzle')) 
    return { icon: CloudRain, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' };
  if (lowercaseCondition.includes('thunderstorm') || lowercaseCondition.includes('lightning')) 
    return { icon: CloudLightning, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' };
  if (lowercaseCondition.includes('snow')) 
    return { icon: Snowflake, color: 'text-sky-400', bg: 'bg-sky-50', border: 'border-sky-100' };
  if (lowercaseCondition.includes('wind')) 
    return { icon: Wind, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-100' };
  
  return { icon: Cloud, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' };
};

// 2. Custom Hook gọi API thời tiết
function useEventWeather(event: any, defaultLocation: {lat: number, lng: number}) {
  const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
  
  return useQuery({
    queryKey: ['event-weather', event?.id, event?.latitude, event?.longitude, event?.date, event?.start_time],
    queryFn: async () => {
      if (!OPENWEATHER_API_KEY || !event) return null;
      
      const targetLat = event.latitude || defaultLocation.lat;
      const targetLng = event.longitude || defaultLocation.lng;
      
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${targetLat}&lon=${targetLng}&units=metric&appid=${OPENWEATHER_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const data = await response.json();
      
      const eventDateStr = event.date.split('T')[0];
      const targetTime = event.start_time ? `${event.start_time}:00` : '12:00:00';
      const targetDateTimeStr = `${eventDateStr} ${targetTime}`;
      
      let bestMatch = data.list.find((item: any) => item.dt_txt === targetDateTimeStr);
      if (!bestMatch) {
        bestMatch = data.list.find((item: any) => item.dt_txt.startsWith(eventDateStr));
      }

      if (bestMatch) {
        return {
          temp: Math.round(bestMatch.main.temp),
          condition: bestMatch.weather[0].main
        };
      }
      return null;
    },
    enabled: !!OPENWEATHER_API_KEY && !!event,
    staleTime: 1000 * 60 * 30, // 30 phút cache
  });
}

// 3. Định nghĩa Props cho Component
interface WeatherBadgeProps {
  event: any;
  defaultLocation: { lat: number; lng: number };
  variant?: 'card' | 'popup' | 'detail';
}

// 4. Main Component
export default function WeatherBadge({ event, defaultLocation, variant = 'card' }: WeatherBadgeProps) {
  const { data: eventWeather } = useEventWeather(event, defaultLocation);
  
  if (!eventWeather) return null;
  const config = getWeatherConfig(eventWeather.condition);

  if (variant === 'popup') {
    return (
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} border ${config.border}`}>
        <config.icon className={`w-3 h-3 ${config.color}`} />
        <span className={`text-[10px] font-bold ${config.color}`}>{eventWeather.temp}°C</span>
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-lg border border-white/20 w-max mt-3">
        <config.icon className="w-4 h-4 text-white" />
        <span className="text-sm font-bold text-white">{eventWeather.temp}°C</span>
        <span className="text-sm text-white/90 font-medium capitalize">{eventWeather.condition}</span>
      </div>
    );
  }

  // Default 'card' variant
  return (
    <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-full">
      <config.icon className={`w-3.5 h-3.5 ${config.color}`} />
      <span className="text-xs font-medium text-slate-600">{eventWeather.temp}°C</span>
    </div>
  );
}