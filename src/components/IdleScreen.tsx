import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, Title, Group, Stack, Paper } from '@mantine/core';
import { IconSun, IconCloud, IconCloudRain, IconMoon } from '@tabler/icons-react';
import dayjs from 'dayjs';

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

interface IdleScreenProps {
  onWake: () => void;
  familyAvatars?: string[];
}

export function IdleScreen({ onWake, familyAvatars = ['👦', '👧', '👨', '👩'] }: IdleScreenProps) {
  const [time, setTime] = useState(dayjs());
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null);
  const [todayDinner, setTodayDinner] = useState<{ title: string; icon: string } | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
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
      .catch(() => {});

    // Get today's events
    fetch('/api/calendar/today')
      .then(r => r.json())
      .then(data => setEvents(data.events?.slice(0, 3) || []))
      .catch(() => {});

    // Get real weather from Open-Meteo (Ourimbah, NSW)
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-33.36&longitude=151.37&current=temperature_2m,weather_code&timezone=Australia%2FSydney'
        );
        const data = await res.json();
        const temp = Math.round(data.current.temperature_2m);
        const code = data.current.weather_code;
        
        // Map weather codes to conditions
        // https://open-meteo.com/en/docs#weathervariables
        let condition = 'sunny';
        const hour = new Date().getHours();
        if (hour >= 20 || hour < 6) {
          condition = 'night';
        } else if (code >= 61 && code <= 67 || code >= 80 && code <= 82) {
          condition = 'rainy';
        } else if (code >= 1 && code <= 3 || code >= 45 && code <= 48) {
          condition = 'cloudy';
        }
        
        setWeather({ temp, condition });
      } catch {
        // Fallback to simple display
        const hour = new Date().getHours();
        setWeather({
          temp: 22,
          condition: hour >= 6 && hour < 18 ? 'sunny' : 'night',
        });
      }
    };
    fetchWeather();
  }, []);

  const getWeatherIcon = () => {
    if (!weather) return <IconSun size={32} />;
    switch (weather.condition) {
      case 'sunny': return <IconSun size={32} color="#fbbf24" />;
      case 'cloudy': return <IconCloud size={32} color="#94a3b8" />;
      case 'rainy': return <IconCloudRain size={32} color="#60a5fa" />;
      case 'night': return <IconMoon size={32} color="#a78bfa" />;
      default: return <IconSun size={32} />;
    }
  };

  const isNight = time.hour() >= 20 || time.hour() < 6;

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
      className="idle-gradient"
    >
      {/* Twinkling Stars (night) or Floating particles (day) */}
      {stars.map(star => (
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
            background: isNight ? 'white' : 'rgba(255,255,255,0.5)',
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      {/* Floating Emojis */}
      {floatingEmojis.map(item => (
        <Text
          key={item.id}
          className="idle-float-slow"
          style={{
            position: 'absolute',
            left: `${item.x}%`,
            top: `${item.y}%`,
            fontSize: `${item.size}rem`,
            opacity: 0.7,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
          }}
        >
          {item.emoji}
        </Text>
      ))}

      {/* Main Content */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
        }}
      >
        {/* Animated Robot Mascot */}
        <Box className="robot-body" style={{ marginBottom: 20 }}>
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
              <Group gap="sm">
                {getWeatherIcon()}
                <Text c="white" size="xl" fw={700}>{weather.temp}°C</Text>
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
                fontSize: '3rem',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              }}
            >
              {avatar}
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
      </Box>
    </Box>
  );
}
