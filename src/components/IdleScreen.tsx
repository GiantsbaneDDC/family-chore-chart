import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, Title, Group, Paper } from '@mantine/core';
import { Avatar } from './Avatar';
import { 
  IconSunFilled, 
  IconCloudFilled, 
  IconCloudRain, 
  IconMoonFilled,
  IconSnowflake,
  IconCloudStorm,
} from '@tabler/icons-react';
import dayjs from 'dayjs';

interface ForecastDay {
  day: string;
  high: number;
  low: number;
  code: number;
}

// Inject animations
const styleId = 'idle-screen-animations';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      25% { transform: translateY(-20px) rotate(5deg); }
      75% { transform: translateY(10px) rotate(-5deg); }
    }
    @keyframes floatSlow {
      0%, 100% { transform: translateY(0) translateX(0); }
      33% { transform: translateY(-30px) translateX(20px); }
      66% { transform: translateY(15px) translateX(-15px); }
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-30px) scale(1.1); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.9; }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes sparkle {
      0%, 100% { opacity: 0; transform: scale(0); }
      50% { opacity: 1; transform: scale(1); }
    }
    @keyframes wave {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(20deg); }
      75% { transform: rotate(-20deg); }
    }
    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(50px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes robotBlink {
      0%, 90%, 100% { transform: scaleY(1); }
      95% { transform: scaleY(0.1); }
    }
    @keyframes robotBounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-15px); }
    }
    @keyframes starTwinkle {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
    }
    .idle-float { animation: float 4s ease-in-out infinite; }
    .idle-float-slow { animation: floatSlow 6s ease-in-out infinite; }
    .idle-bounce { animation: bounce 2s ease-in-out infinite; }
    .idle-pulse { animation: pulse 2s ease-in-out infinite; }
    .idle-spin { animation: spin 8s linear infinite; }
    .idle-wave { animation: wave 1s ease-in-out infinite; }
    .idle-gradient { 
      background-size: 400% 400%;
      animation: gradientShift 15s ease infinite;
    }
    .idle-slide-in { animation: slideIn 0.8s ease-out forwards; }
    .robot-eyes { animation: robotBlink 4s ease-in-out infinite; }
    .robot-body { animation: robotBounce 3s ease-in-out infinite; }
    .star-twinkle { animation: starTwinkle 2s ease-in-out infinite; }
    @keyframes photoKenBurnsA {
      0%   { transform: scale(1)    translate(0,    0);    }
      100% { transform: scale(1.08) translate(-1.5%, -1%); }
    }
    @keyframes photoKenBurnsB {
      0%   { transform: scale(1.05) translate(1%,  0.5%); }
      100% { transform: scale(1)    translate(-0.5%, 1%);  }
    }
    .photo-ken-burns-a { animation: photoKenBurnsA 18s ease-in-out forwards; }
    .photo-ken-burns-b { animation: photoKenBurnsB 18s ease-in-out forwards; }
  `;
  document.head.appendChild(style);
}

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  allDay: boolean;
}

interface GPhoto {
  id: string;
  url: string;
  description: string;
}

interface IdleScreenProps {
  onWake: () => void;
  familyAvatars?: string[];
}

export function IdleScreen({ onWake, familyAvatars = ['👦', '👧', '👨', '👩'] }: IdleScreenProps) {
  const [time, setTime] = useState(dayjs());
  const [weather, setWeather] = useState<{ temp: number; condition: string; high: number; low: number } | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [todayDinner, setTodayDinner] = useState<{ title: string; icon: string } | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Google Photos slideshow — A/B layer crossfade, preloaded
  const PHOTO_INTERVAL = 15000; // ms per photo
  const CROSSFADE_MS   = 1500;  // ms for opacity transition

  const [photos, setPhotos] = useState<GPhoto[]>([]);
  const photosRef = useRef<GPhoto[]>([]);
  const indexRef  = useRef(0);

  // Two layers: A and B, always in DOM, we flip opacity between them
  const [layerA, setLayerA] = useState<{ url: string; kenClass: string } | null>(null);
  const [layerB, setLayerB] = useState<{ url: string; kenClass: string } | null>(null);
  const [activeLayer, setActiveLayer] = useState<'A' | 'B'>('A'); // which layer is visible
  const [displayIndex, setDisplayIndex] = useState(0); // for progress dots + caption

  // Pixel shift to prevent screen burn-in
  const [pixelShift, setPixelShift] = useState({ x: 0, y: 0 });
  
  const [floatingEmojis] = useState<FloatingEmoji[]>(() => {
    const emojis = ['⭐', '🌟', '✨', '💫', '🎯', '🏆', '🎉', '🌈', '🚀', '💪', '🎮', '📚'];
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: Math.random() * 90 + 5,
      y: Math.random() * 80 + 10,
      size: Math.random() * 1.5 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 4,
    }));
  });
  const [stars] = useState<Star[]>(() => 
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 3,
    }))
  );

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setTime(dayjs()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Pixel shift to prevent burn-in - slowly drifts content around
  useEffect(() => {
    const SHIFT_RANGE = 30; // Max pixels to shift in any direction
    const SHIFT_INTERVAL = 30000; // Change position every 30 seconds
    
    const updateShift = () => {
      setPixelShift({
        x: Math.round((Math.random() - 0.5) * 2 * SHIFT_RANGE),
        y: Math.round((Math.random() - 0.5) * 2 * SHIFT_RANGE),
      });
    };
    
    // Initial random position
    updateShift();
    
    const interval = setInterval(updateShift, SHIFT_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Preload an image, resolve with its URL once loaded
  const preload = (url: string): Promise<string> =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => resolve(url); // show it anyway on error
      img.src = url;
    });

  // Show a photo in the inactive layer then fade it in
  const transitionTo = useCallback(async (url: string, showInLayer: 'A' | 'B', newIndex: number) => {
    const kenClass = showInLayer === 'A' ? 'photo-ken-burns-a' : 'photo-ken-burns-b';
    await preload(url);
    if (showInLayer === 'A') setLayerA({ url, kenClass });
    else                     setLayerB({ url, kenClass });
    setActiveLayer(showInLayer);
    setDisplayIndex(newIndex);
  }, []);

  // Fetch photos, shuffle client-side, show first one
  useEffect(() => {
    fetch('/api/photos')
      .then(r => r.json())
      .then(async data => {
        if (!data.photos || data.photos.length === 0) return;
        // Client-side shuffle for variety on each idle session
        const shuffled = [...data.photos].sort(() => Math.random() - 0.5);
        photosRef.current = shuffled;
        setPhotos(shuffled);
        indexRef.current = 0;
        // Load first photo into layer A
        await transitionTo(shuffled[0].url, 'A', 0);
        // Preload second into layer B (ready to go)
        if (shuffled.length > 1) preload(shuffled[1].url);
      })
      .catch(err => console.warn('[IdleScreen] Could not fetch photos:', err));
  }, []);

  // Cycle photos every PHOTO_INTERVAL
  useEffect(() => {
    if (photos.length === 0) return;
    const interval = setInterval(async () => {
      const list = photosRef.current;
      if (list.length === 0) return;
      const nextIndex = (indexRef.current + 1) % list.length;
      indexRef.current = nextIndex;
      const nextUrl  = list[nextIndex].url;
      const showIn   = activeLayer === 'A' ? 'B' : 'A'; // flip to inactive layer
      await transitionTo(nextUrl, showIn, nextIndex);
      // Preload the one after next
      const preloadIndex = (nextIndex + 1) % list.length;
      preload(list[preloadIndex].url);
    }, PHOTO_INTERVAL);
    return () => clearInterval(interval);
  }, [photos, activeLayer, transitionTo]);

  // Fetch data
  useEffect(() => {
    // Get today's dinner
    fetch('/api/dinner-plan')
      .then(r => r.json())
      .then(data => {
        const today = dayjs().day();
        const todayPlan = data.plans?.find((p: any) => p.day_of_week === today);
        if (todayPlan) {
          setTodayDinner({ title: todayPlan.recipe_title, icon: todayPlan.recipe_icon });
        }
      })
      .catch(err => console.warn('Failed to fetch dinner plan:', err));

    // Get today's events
    fetch('/api/calendar/today')
      .then(r => r.json())
      .then(data => setEvents(data.events?.slice(0, 3) || []))
      .catch(err => console.warn('Failed to fetch calendar:', err));

    // Get real weather from Open-Meteo (Ourimbah, NSW)
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-33.36&longitude=151.37&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Australia%2FSydney&forecast_days=5'
        );
        const data = await res.json();
        const temp = Math.round(data.current.temperature_2m);
        const code = data.current.weather_code;
        const todayHigh = Math.round(data.daily.temperature_2m_max[0]);
        const todayLow = Math.round(data.daily.temperature_2m_min[0]);
        
        // Map weather codes to conditions
        const getCondition = (weatherCode: number, isNightTime = false) => {
          if (isNightTime) return 'night';
          if (weatherCode >= 95) return 'storm';
          if (weatherCode >= 71 && weatherCode <= 77) return 'snow';
          if (weatherCode >= 61 && weatherCode <= 67 || weatherCode >= 80 && weatherCode <= 82) return 'rainy';
          if (weatherCode >= 1 && weatherCode <= 3 || weatherCode >= 45 && weatherCode <= 48) return 'cloudy';
          return 'sunny';
        };
        
        const hour = new Date().getHours();
        const isNightTime = hour >= 20 || hour < 6;
        
        setWeather({ 
          temp, 
          condition: getCondition(code, isNightTime),
          high: todayHigh,
          low: todayLow,
        });
        
        // Build forecast for next 4 days
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const forecastDays: ForecastDay[] = [];
        for (let i = 1; i < 5; i++) {
          const date = dayjs().add(i, 'day');
          forecastDays.push({
            day: days[date.day()],
            high: Math.round(data.daily.temperature_2m_max[i]),
            low: Math.round(data.daily.temperature_2m_min[i]),
            code: data.daily.weather_code[i],
          });
        }
        setForecast(forecastDays);
      } catch {
        // Fallback to simple display
        const hour = new Date().getHours();
        setWeather({
          temp: 22,
          condition: hour >= 6 && hour < 18 ? 'sunny' : 'night',
          high: 25,
          low: 18,
        });
      }
    };
    fetchWeather();
  }, []);

  const getWeatherIcon = (condition?: string, size = 32) => {
    const cond = condition || weather?.condition || 'sunny';
    switch (cond) {
      case 'sunny': return <IconSunFilled size={size} color="#fbbf24" />;
      case 'cloudy': return <IconCloudFilled size={size} color="#94a3b8" />;
      case 'rainy': return <IconCloudRain size={size} color="#60a5fa" />;
      case 'storm': return <IconCloudStorm size={size} color="#6366f1" />;
      case 'snow': return <IconSnowflake size={size} color="#e0f2fe" />;
      case 'night': return <IconMoonFilled size={size} color="#a78bfa" />;
      default: return <IconSunFilled size={size} color="#fbbf24" />;
    }
  };

  const getConditionFromCode = (code: number) => {
    if (code >= 95) return 'storm';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 61 && code <= 67 || code >= 80 && code <= 82) return 'rainy';
    if (code >= 1 && code <= 3 || code >= 45 && code <= 48) return 'cloudy';
    return 'sunny';
  };

  const isNight = time.hour() >= 20 || time.hour() < 6;

  const hasPhotos = layerA !== null || layerB !== null;
  const currentDesc = photos[displayIndex]?.description || '';

  // Helper to render one photo layer
  const renderLayer = (layer: { url: string; kenClass: string } | null, name: 'A' | 'B') => {
    if (!layer) return null;
    const isActive = activeLayer === name;
    return (
      <Box
        key={`layer-${name}`}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
          opacity: isActive ? 1 : 0,
          transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
          pointerEvents: 'none',
        }}
      >
        <Box
          className={layer.kenClass}
          style={{
            position: 'absolute',
            inset: '-6%',
            backgroundImage: `url(${layer.url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Gradient overlay for readability */}
        <Box style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.5) 100%)',
        }} />
      </Box>
    );
  };

  return (
    <Box
      onClick={onWake}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        cursor: 'pointer',
        overflow: 'hidden',
        background: isNight
          ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)'
          : 'linear-gradient(135deg, #7c3aed 0%, #6366f1 25%, #3b82f6 50%, #06b6d4 75%, #10b981 100%)',
      }}
      className={hasPhotos ? undefined : 'idle-gradient'}
    >
      {/* A/B photo layers — always mounted, crossfade via opacity */}
      {renderLayer(layerA, 'A')}
      {renderLayer(layerB, 'B')}

      {/* Twinkling Stars (night) or Floating particles (day) — only when no photo */}
      {!hasPhotos && stars.map(star => (
        <Box
          key={star.id}
          className="star-twinkle"
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            borderRadius: '50%',
            zIndex: 1,
            background: isNight ? 'white' : 'rgba(255,255,255,0.5)',
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      {/* Floating Emojis — only when no photo */}
      {!hasPhotos && floatingEmojis.map(item => (
        <Text
          key={item.id}
          className="idle-float-slow"
          style={{
            position: 'absolute',
            left: `${item.x}%`,
            top: `${item.y}%`,
            fontSize: `${item.size}rem`,
            opacity: 0.7,
            zIndex: 1,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
          }}
        >
          {item.emoji}
        </Text>
      ))}

      {/* Main Content - with pixel shift for burn-in prevention */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          zIndex: 2,
          transform: `translate(${pixelShift.x}px, ${pixelShift.y}px)`,
          transition: 'transform 3s ease-in-out',
        }}
      >
        {/* Animated Robot Mascot — hidden during photo slideshow */}
        <Box className="robot-body" style={{ marginBottom: 20, display: hasPhotos ? 'none' : undefined }}>
          <Box
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.8)',
            }}
          >
            {/* Robot Face */}
            <Box style={{ position: 'relative', width: 80, height: 80 }}>
              {/* Eyes */}
              <Box className="robot-eyes" style={{ position: 'absolute', top: 20, left: 10, width: 20, height: 20, borderRadius: '50%', background: '#7c3aed' }}>
                <Box style={{ position: 'absolute', top: 4, left: 6, width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
              </Box>
              <Box className="robot-eyes" style={{ position: 'absolute', top: 20, right: 10, width: 20, height: 20, borderRadius: '50%', background: '#7c3aed' }}>
                <Box style={{ position: 'absolute', top: 4, left: 6, width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
              </Box>
              {/* Smile */}
              <Box style={{ position: 'absolute', bottom: 15, left: '50%', transform: 'translateX(-50%)', width: 30, height: 15, borderRadius: '0 0 15px 15px', background: '#7c3aed' }} />
            </Box>
          </Box>
          {/* Antenna */}
          <Box style={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)', width: 4, height: 20, background: '#94a3b8', borderRadius: 2 }}>
            <Box className="idle-pulse" style={{ position: 'absolute', top: -8, left: -6, width: 16, height: 16, borderRadius: '50%', background: '#fbbf24' }} />
          </Box>
        </Box>

        {/* Time Display */}
        <Box className="idle-slide-in" style={{ textAlign: 'center', marginBottom: 30 }}>
          <Title
            order={1}
            c="white"
            style={{
              fontSize: '8rem',
              fontWeight: 900,
              textShadow: '0 4px 20px rgba(0,0,0,0.3)',
              letterSpacing: '-4px',
              lineHeight: 1,
            }}
          >
            {time.format('h:mm')}
          </Title>
          <Text
            c="white"
            size="xl"
            fw={600}
            style={{ opacity: 0.9, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
          >
            {time.format('dddd, MMMM D')}
          </Text>
        </Box>

        {/* Info Cards */}
        <Group gap="lg" className="idle-slide-in" style={{ animationDelay: '0.2s' }}>
          {/* Weather */}
          {weather && (
            <Paper
              p="lg"
              radius="xl"
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <Group gap="md">
                <Group gap="sm">
                  {getWeatherIcon()}
                  <Box>
                    <Text c="white" size="xl" fw={700}>{weather.temp}°</Text>
                    <Text c="white" size="xs" style={{ opacity: 0.8 }}>
                      H:{weather.high}° L:{weather.low}°
                    </Text>
                  </Box>
                </Group>
                {forecast.length > 0 && (
                  <Group gap="md" ml="md" pl="md" style={{ borderLeft: '1px solid rgba(255,255,255,0.3)' }}>
                    {forecast.map((day) => (
                      <Box key={day.day} ta="center">
                        <Text c="white" size="xs" fw={600} style={{ opacity: 0.8 }}>{day.day}</Text>
                        {getWeatherIcon(getConditionFromCode(day.code), 20)}
                        <Text c="white" size="xs" fw={600}>{day.high}°</Text>
                      </Box>
                    ))}
                  </Group>
                )}
              </Group>
            </Paper>
          )}

          {/* Today's Dinner */}
          {todayDinner && (
            <Paper
              p="lg"
              radius="xl"
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <Group gap="sm">
                <Text style={{ fontSize: '2rem' }}>{todayDinner.icon}</Text>
                <Box>
                  <Text c="white" size="xs" style={{ opacity: 0.8 }}>Tonight's Dinner</Text>
                  <Text c="white" fw={700}>{todayDinner.title}</Text>
                </Box>
              </Group>
            </Paper>
          )}

          {/* Next Event */}
          {events.length > 0 && (
            <Paper
              p="lg"
              radius="xl"
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <Group gap="sm">
                <Text style={{ fontSize: '1.5rem' }}>📅</Text>
                <Box>
                  <Text c="white" size="xs" style={{ opacity: 0.8 }}>
                    {events[0].allDay ? 'Today' : dayjs(events[0].start).format('h:mm A')}
                  </Text>
                  <Text c="white" fw={700} lineClamp={1} maw={200}>{events[0].title}</Text>
                </Box>
              </Group>
            </Paper>
          )}
        </Group>

        {/* Bouncing Family Avatars */}
        <Group gap="md" mt={50} className="idle-slide-in" style={{ animationDelay: '0.4s' }}>
          {familyAvatars.map((avatar, i) => (
            <Box
              key={i}
              className="idle-bounce"
              style={{
                animationDelay: `${i * 0.2}s`,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              }}
            >
              <Avatar avatar={avatar} size={64} />
            </Box>
          ))}
        </Group>

        {/* Tap to Wake */}
        <Text
          c="white"
          size="lg"
          fw={500}
          mt={60}
          className="idle-pulse"
          style={{ opacity: 0.7 }}
        >
          👆 Tap anywhere to wake up
        </Text>

        {/* Photo slideshow indicator */}
        {photos.length > 1 && (
          <Box mt={16} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {/* Progress dots — max 20 shown */}
            <Box style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: Math.min(photos.length, 20) }).map((_, i) => (
                <Box
                  key={i}
                  style={{
                    width: i === displayIndex % Math.min(photos.length, 20) ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === displayIndex % Math.min(photos.length, 20)
                      ? 'rgba(255,255,255,0.95)'
                      : 'rgba(255,255,255,0.3)',
                    transition: 'all 0.4s ease',
                  }}
                />
              ))}
            </Box>
            {/* Caption */}
            {currentDesc && (
              <Text c="white" size="xs" style={{ opacity: 0.6, textAlign: 'center', maxWidth: 400 }}>
                {currentDesc}
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
