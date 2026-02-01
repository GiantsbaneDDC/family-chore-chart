import { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Text, 
  Title, 
  Group, 
  Stack, 
  SimpleGrid,
  Skeleton,
  ScrollArea,
  Center,
  Loader,
} from '@mantine/core';
import { 
  IconSunFilled, 
  IconCloudFilled, 
  IconCloudRain, 
  IconMoonFilled,
  IconSnowflake,
  IconCloudStorm,
  IconDroplet,
  IconWind,
  IconSunrise,
  IconSunset,
  IconUvIndex,
  IconCloudFog,
  IconMist,
} from '@tabler/icons-react';
import dayjs from 'dayjs';

interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  isDay: boolean;
  uvIndex: number;
}

interface HourlyForecast {
  time: string;
  temperature: number;
  weatherCode: number;
  precipitationProbability: number;
}

interface DailyForecast {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
}

interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  location: string;
}

// Weather code descriptions and icons
const weatherConditions: Record<number, { label: string; icon: typeof IconSunFilled; color: string }> = {
  0: { label: 'Clear', icon: IconSunFilled, color: '#fbbf24' },
  1: { label: 'Clear', icon: IconSunFilled, color: '#fbbf24' },
  2: { label: 'Partly Cloudy', icon: IconCloudFilled, color: '#94a3b8' },
  3: { label: 'Overcast', icon: IconCloudFilled, color: '#64748b' },
  45: { label: 'Fog', icon: IconCloudFog, color: '#94a3b8' },
  48: { label: 'Fog', icon: IconMist, color: '#94a3b8' },
  51: { label: 'Drizzle', icon: IconCloudRain, color: '#60a5fa' },
  53: { label: 'Drizzle', icon: IconCloudRain, color: '#3b82f6' },
  55: { label: 'Drizzle', icon: IconCloudRain, color: '#2563eb' },
  61: { label: 'Rain', icon: IconCloudRain, color: '#60a5fa' },
  63: { label: 'Rain', icon: IconCloudRain, color: '#3b82f6' },
  65: { label: 'Heavy Rain', icon: IconCloudRain, color: '#1d4ed8' },
  66: { label: 'Freezing Rain', icon: IconCloudRain, color: '#06b6d4' },
  67: { label: 'Freezing Rain', icon: IconCloudRain, color: '#0891b2' },
  71: { label: 'Snow', icon: IconSnowflake, color: '#e0f2fe' },
  73: { label: 'Snow', icon: IconSnowflake, color: '#bae6fd' },
  75: { label: 'Heavy Snow', icon: IconSnowflake, color: '#7dd3fc' },
  77: { label: 'Snow', icon: IconSnowflake, color: '#e0f2fe' },
  80: { label: 'Showers', icon: IconCloudRain, color: '#60a5fa' },
  81: { label: 'Showers', icon: IconCloudRain, color: '#3b82f6' },
  82: { label: 'Heavy Showers', icon: IconCloudRain, color: '#1d4ed8' },
  85: { label: 'Snow Showers', icon: IconSnowflake, color: '#bae6fd' },
  86: { label: 'Snow Showers', icon: IconSnowflake, color: '#7dd3fc' },
  95: { label: 'Thunderstorm', icon: IconCloudStorm, color: '#8b5cf6' },
  96: { label: 'Thunderstorm', icon: IconCloudStorm, color: '#7c3aed' },
  99: { label: 'Thunderstorm', icon: IconCloudStorm, color: '#6d28d9' },
};

function getWeatherInfo(code: number, isDay: boolean = true) {
  const info = weatherConditions[code] || weatherConditions[0];
  if (!isDay && code <= 1) {
    return { ...info, icon: IconMoonFilled, color: '#a78bfa', label: 'Clear' };
  }
  return info;
}

function getWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

function getUvLabel(uv: number): { label: string; color: string } {
  if (uv <= 2) return { label: 'Low', color: '#22c55e' };
  if (uv <= 5) return { label: 'Moderate', color: '#eab308' };
  if (uv <= 7) return { label: 'High', color: '#f97316' };
  if (uv <= 10) return { label: 'Very High', color: '#ef4444' };
  return { label: 'Extreme', color: '#dc2626' };
}

export default function WeatherView() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const lat = -33.36;
        const lon = 151.37;
        
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?` +
          `latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day,uv_index` +
          `&hourly=temperature_2m,weather_code,precipitation_probability` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max` +
          `&timezone=Australia%2FSydney` +
          `&forecast_days=7`
        );
        
        if (!res.ok) throw new Error('Failed to fetch weather');
        
        const data = await res.json();
        
        const current: CurrentWeather = {
          temperature: Math.round(data.current.temperature_2m),
          apparentTemperature: Math.round(data.current.apparent_temperature),
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          windDirection: data.current.wind_direction_10m,
          weatherCode: data.current.weather_code,
          isDay: data.current.is_day === 1,
          uvIndex: Math.round(data.current.uv_index),
        };
        
        const now = new Date();
        const currentHour = now.getHours();
        const hourly: HourlyForecast[] = data.hourly.time
          .slice(currentHour, currentHour + 24)
          .map((time: string, i: number) => ({
            time,
            temperature: Math.round(data.hourly.temperature_2m[currentHour + i]),
            weatherCode: data.hourly.weather_code[currentHour + i],
            precipitationProbability: data.hourly.precipitation_probability[currentHour + i] || 0,
          }));
        
        const daily: DailyForecast[] = data.daily.time.map((date: string, i: number) => ({
          date,
          weatherCode: data.daily.weather_code[i],
          tempMax: Math.round(data.daily.temperature_2m_max[i]),
          tempMin: Math.round(data.daily.temperature_2m_min[i]),
          precipitationProbability: data.daily.precipitation_probability_max[i] || 0,
          sunrise: data.daily.sunrise[i],
          sunset: data.daily.sunset[i],
          uvIndexMax: Math.round(data.daily.uv_index_max[i]),
        }));
        
        setWeather({ current, hourly, daily, location: 'Ourimbah' });
      } catch (err) {
        setError('Failed to load weather data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Center h="100%">
        <Stack align="center" gap="md">
          <Loader size="xl" color="blue" />
          <Text c="dimmed" fw={500}>Loading weather...</Text>
        </Stack>
      </Center>
    );
  }

  if (error || !weather) {
    return (
      <Center h="100%">
        <Text size="xl" c="dimmed">⛈️ {error || 'Weather unavailable'}</Text>
      </Center>
    );
  }

  const currentInfo = getWeatherInfo(weather.current.weatherCode, weather.current.isDay);
  const CurrentIcon = currentInfo.icon;
  const uvInfo = getUvLabel(weather.current.uvIndex);
  const today = weather.daily[0];

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <Paper
        p="md"
        radius="xl"
        shadow="sm"
        style={{
          background: weather.current.isDay
            ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)'
            : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
          color: 'white',
          flexShrink: 0,
        }}
      >
        <Group justify="space-between" align="center">
          <Group gap="lg">
            <CurrentIcon 
              size={64} 
              color={currentInfo.color}
              style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }} 
            />
            <Box>
              <Group gap="xs" align="baseline">
                <Title order={1} style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1 }}>
                  {weather.current.temperature}°
                </Title>
                <Text size="xl" fw={600}>{currentInfo.label}</Text>
              </Group>
              <Text size="sm" style={{ opacity: 0.9 }}>
                Feels like {weather.current.apparentTemperature}° · H: {today.tempMax}° L: {today.tempMin}°
              </Text>
            </Box>
          </Group>
          
          <Group gap="xl">
            <Box ta="center">
              <IconDroplet size={24} style={{ opacity: 0.9 }} />
              <Text fw={700}>{weather.current.humidity}%</Text>
              <Text size="xs" style={{ opacity: 0.8 }}>Humidity</Text>
            </Box>
            <Box ta="center">
              <IconWind size={24} style={{ opacity: 0.9 }} />
              <Text fw={700}>{weather.current.windSpeed} km/h</Text>
              <Text size="xs" style={{ opacity: 0.8 }}>{getWindDirection(weather.current.windDirection)}</Text>
            </Box>
            <Box ta="center">
              <IconUvIndex size={24} style={{ opacity: 0.9 }} />
              <Text fw={700}>{weather.current.uvIndex}</Text>
              <Text size="xs" style={{ opacity: 0.8 }}>{uvInfo.label}</Text>
            </Box>
            <Box ta="center">
              <Group gap={4}>
                <IconSunrise size={18} />
                <Text size="sm" fw={600}>{dayjs(today.sunrise).format('h:mm')}</Text>
              </Group>
              <Group gap={4}>
                <IconSunset size={18} />
                <Text size="sm" fw={600}>{dayjs(today.sunset).format('h:mm')}</Text>
              </Group>
            </Box>
          </Group>
        </Group>
      </Paper>

      {/* Main Content */}
      <Box style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
        {/* Hourly - Left side */}
        <Paper p="sm" radius="lg" withBorder style={{ width: 130, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <Text size="xs" fw={600} c="dimmed" mb={4}>HOURLY</Text>
          <Stack gap={2} style={{ flex: 1 }}>
            {weather.hourly.slice(0, 10).map((hour, i) => {
              const info = getWeatherInfo(hour.weatherCode, true);
              const HourIcon = info.icon;
              const isNow = i === 0;
              return (
                <Group 
                  key={hour.time} 
                  gap={4} 
                  justify="space-between"
                  px={6}
                  py={2}
                  style={{ 
                    flex: 1,
                    borderRadius: 6,
                    background: isNow ? 'rgba(99, 102, 241, 0.1)' : undefined,
                  }}
                >
                  <Text size="xs" fw={isNow ? 700 : 500} c={isNow ? 'violet' : undefined} w={32}>
                    {isNow ? 'Now' : dayjs(hour.time).format('hA')}
                  </Text>
                  <HourIcon size={16} color={info.color} />
                  <Text size="xs" fw={600} w={28} ta="right">{hour.temperature}°</Text>
                  {hour.precipitationProbability > 10 ? (
                    <Text size="xs" c="blue" w={24} ta="right" style={{ fontSize: 10 }}>{hour.precipitationProbability}%</Text>
                  ) : (
                    <Box w={24} />
                  )}
                </Group>
              );
            })}
          </Stack>
        </Paper>

        {/* 7-Day Forecast - Main area */}
        <Paper p="md" radius="lg" withBorder style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Text size="sm" fw={600} c="dimmed" mb="sm">7-DAY FORECAST</Text>
          <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weather.daily.map((day, i) => {
              const info = getWeatherInfo(day.weatherCode, true);
              const DayIcon = info.icon;
              const isToday = i === 0;
              
              return (
                <Paper
                  key={day.date}
                  p="sm"
                  radius="md"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    background: isToday ? 'rgba(99, 102, 241, 0.08)' : undefined,
                    border: isToday ? '2px solid rgba(99, 102, 241, 0.3)' : '1px solid #e9ecef',
                  }}
                >
                  <Group justify="space-between" style={{ flex: 1 }}>
                    <Box w={100}>
                      <Text fw={isToday ? 700 : 600} size="lg">
                        {isToday ? 'Today' : dayjs(day.date).format('ddd')}
                      </Text>
                      <Text size="xs" c="dimmed">{dayjs(day.date).format('MMM D')}</Text>
                    </Box>
                    
                    <Group gap="sm">
                      <DayIcon size={36} color={info.color} />
                      <Text w={90}>{info.label}</Text>
                    </Group>
                    
                    {day.precipitationProbability > 0 ? (
                      <Text size="sm" c="blue" w={60} ta="center">
                        💧 {day.precipitationProbability}%
                      </Text>
                    ) : (
                      <Box w={60} />
                    )}
                    
                    <Group gap="sm" w={80} justify="flex-end">
                      <Text fw={700} size="lg">{day.tempMax}°</Text>
                      <Text c="dimmed" size="lg">{day.tempMin}°</Text>
                    </Group>
                  </Group>
                </Paper>
              );
            })}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
