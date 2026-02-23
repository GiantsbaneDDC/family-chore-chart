import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Text,
  Title,
  Paper,
  ActionIcon,
  Center,
  Group,
  Stack,
  Badge,
  Progress,
  RingProgress,
  SimpleGrid,
  ScrollArea,
} from '@mantine/core';
import { 
  IconChecklist,
  IconStar,
  IconChefHat,
  IconSun,
  IconMoon,
  IconSunrise,
  IconCalendar,
  IconTrophy,
  IconChevronRight,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import * as api from '../api';
import { celebrateCompletion, playSuccess } from '../utils/effects';
import { Avatar } from '../components/Avatar';

// Inject CSS animations
const styleId = 'home-animations';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.3); }
      50% { box-shadow: 0 0 30px rgba(6, 182, 212, 0.5); }
    }
    .float-animation { animation: float 3s ease-in-out infinite; }
    .pulse-animation { animation: pulse 2s ease-in-out infinite; }
    .glow-animation { animation: glow 2s ease-in-out infinite; }
    .shimmer-bg {
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
      background-size: 200% 100%;
      animation: shimmer 2s infinite;
    }
  `;
  document.head.appendChild(style);
}

// --- Laundry Types & Hook ---
type ApplianceStatus = 'idle' | 'running' | 'done';

interface ApplianceState {
  status: ApplianceStatus;
  cycle?: string;
  timeRemaining?: number; // minutes
}

interface LaundryState {
  washer: ApplianceState;
  dryer: ApplianceState;
}

function useLaundry(): LaundryState {
  const [laundry, setLaundry] = useState<LaundryState>({
    washer: { status: 'idle' },
    dryer: { status: 'idle' },
  });

  useEffect(() => {
    const fetchLaundry = async () => {
      try {
        const res = await fetch('/api/laundry');
        if (!res.ok) return;
        const data = await res.json();
        setLaundry({
          washer: {
            status: data.washer?.status || 'idle',
            cycle: data.washer?.program || data.washer?.cyclePhase || undefined,
            timeRemaining: data.washer?.timeRemaining || undefined,
          },
          dryer: {
            status: data.dryer?.status || 'idle',
            cycle: data.dryer?.program || data.dryer?.cyclePhase || undefined,
            timeRemaining: data.dryer?.timeRemaining || undefined,
          },
        });
      } catch {
        // silently fail — laundry widget just shows idle
      }
    };

    fetchLaundry();
    const interval = setInterval(fetchLaundry, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return laundry;
}

// --- Laundry Widget ---
function ApplianceCard({ icon, name, state, href }: { icon: string; name: string; state: ApplianceState; href: string }) {
  const statusColor = state.status === 'running' ? 'blue' : state.status === 'done' ? 'green' : 'gray';
  const statusLabel = state.status === 'running' ? 'Running' : state.status === 'done' ? 'Done' : 'Idle';

  return (
    <Paper
      p="md"
      radius="xl"
      component={Link}
      to={href}
      style={{
        flex: 1,
        background: state.status === 'done' ? '#dcfce7' : state.status === 'running' ? '#eff6ff' : '#f8fafc',
        border: `2px solid ${state.status === 'done' ? '#22c55e' : state.status === 'running' ? '#93c5fd' : '#e2e8f0'}`,
        textDecoration: 'none',
        transition: 'all 0.15s',
      }}
    >
      <Group gap="md" align="center">
        <Text style={{ fontSize: '2rem', lineHeight: 1 }}>{icon}</Text>
        <Box style={{ flex: 1 }}>
          <Group gap="xs" mb={2}>
            <Text fw={700} size="sm">{name}</Text>
            <Badge size="sm" color={statusColor} variant="light">{statusLabel}</Badge>
          </Group>
          {state.status === 'running' && state.timeRemaining !== undefined && (
            <Text size="xs" c="blue.6" fw={600}>{state.cycle} · {state.timeRemaining} min left</Text>
          )}
          {state.status === 'done' && (
            <Text size="xs" c="green.7" fw={600}>Done! Hang it out 👕</Text>
          )}
          {state.status === 'idle' && (
            <Text size="xs" c="dimmed">Not running</Text>
          )}
        </Box>
        <IconChevronRight size={16} color="#94a3b8" />
      </Group>
    </Paper>
  );
}

function LaundryWidget() {
  const laundry = useLaundry();
  return (
    <Paper p="md" radius="xl" shadow="sm" style={{ background: 'white' }}>
      <Group gap="sm" mb="sm">
        <Text size="lg">🧺</Text>
        <Text fw={700} size="md">Laundry</Text>
      </Group>
      <Group gap="md" grow>
        <ApplianceCard icon="🫧" name="Washer" state={laundry.washer} href="/appliance/washer" />
        <ApplianceCard icon="🌀" name="Dryer" state={laundry.dryer} href="/appliance/dryer" />
      </Group>
    </Paper>
  );
}

// --- Main Types ---
interface FamilyMemberStats {
  id: number;
  name: string;
  avatar: string;
  color: string;
  todayTotal: number;
  todayComplete: number;
  totalStars: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  allDay: boolean;
}

interface DashboardData {
  familyStats: FamilyMemberStats[];
  todayDinner: { title: string; icon: string } | null;
  upcomingEvents: CalendarEvent[];
  totalChoresComplete: number;
  totalChoresTotal: number;
}

function getGreeting(): { text: string; icon: typeof IconSun } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: IconSunrise };
  if (hour < 17) return { text: 'Good afternoon', icon: IconSun };
  return { text: 'Good evening', icon: IconMoon };
}

export default function HomeView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  const loadData = useCallback(async () => {
    try {
      const [effectiveStats, kioskData, dinnerData, calendarData] = await Promise.all([
        api.getEffectiveTodayStats(),
        api.getKioskData(),
        api.getDinnerPlan(),
        fetch('/api/calendar/today').then(r => r.json()),
      ]);

      const today = dayjs().day();
      
      const familyStats: FamilyMemberStats[] = effectiveStats.map(stat => {
        const member = kioskData.members.find((m: any) => m.id === stat.member_id);
        return {
          id: stat.member_id,
          name: stat.name,
          avatar: stat.avatar,
          color: stat.color,
          todayTotal: Number(stat.total_today) || 0,
          todayComplete: Number(stat.completed_today) || 0,
          totalStars: member?.total_stars || 0,
        };
      });

      const todayPlan = dinnerData.plans.find((p: any) => p.day_of_week === today);
      
      const totalComplete = familyStats.reduce((sum, m) => sum + m.todayComplete, 0);
      const totalTotal = familyStats.reduce((sum, m) => sum + m.todayTotal, 0);

      setData({
        familyStats,
        todayDinner: todayPlan?.recipe_title ? { title: todayPlan.recipe_title, icon: todayPlan.recipe_icon || '🍽️' } : null,
        upcomingEvents: calendarData.events?.slice(0, 4) || [],
        totalChoresComplete: totalComplete,
        totalChoresTotal: totalTotal,
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    return (
      <Center h="100%">
        <Stack align="center" gap="md">
          <Text size="xl">⏳</Text>
          <Text c="dimmed">Loading dashboard...</Text>
        </Stack>
      </Center>
    );
  }

  const overallProgress = data && data.totalChoresTotal > 0 
    ? Math.round((data.totalChoresComplete / data.totalChoresTotal) * 100) 
    : 0;

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <Paper
        p="lg"
        radius="xl"
        shadow="md"
        style={{
          background: 'linear-gradient(135deg, #f97316 0%, #fb923c 30%, #fbbf24 70%, #facc15 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box className="shimmer-bg" style={{ position: 'absolute', inset: 0, opacity: 0.4 }} />
        <Group justify="space-between" align="center" style={{ position: 'relative' }}>
          <Group gap="lg">
            <Box
              className="float-animation"
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GreetingIcon size={32} color="white" />
            </Box>
            <Box>
              <Text c="white" size="sm" style={{ opacity: 0.8 }}>
                {dayjs().format('dddd, MMMM D')}
              </Text>
              <Title order={2} c="white" fw={800}>
                {greeting.text}!
              </Title>
            </Box>
          </Group>
          
          {/* Overall Progress */}
          <Group gap="lg">
            <Box ta="right">
              <Text c="white" size="sm" style={{ opacity: 0.8 }}>Today's Progress</Text>
              <Text c="white" size="xl" fw={800}>
                {data?.totalChoresComplete || 0} / {data?.totalChoresTotal || 0}
              </Text>
            </Box>
            <RingProgress
              size={70}
              thickness={8}
              roundCaps
              sections={[{ value: overallProgress, color: overallProgress === 100 ? '#22c55e' : 'white' }]}
              label={
                overallProgress === 100 ? (
                  <Center><Text size="xl">🎉</Text></Center>
                ) : (
                  <Text c="white" fw={700} ta="center" size="sm">
                    {overallProgress}%
                  </Text>
                )
              }
            />
          </Group>
        </Group>
      </Paper>

      {/* Main Content Grid */}
      <Box style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, minHeight: 0, padding: 4, margin: -4 }}>
        {/* Left Column */}
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'visible' }}>
          {/* Family Progress Cards */}
          <Paper p="md" radius="xl" shadow="sm" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Group justify="space-between" mb="md">
              <Group gap="sm">
                <IconChecklist size={22} color="#3b82f6" />
                <Text fw={700} size="lg">Family Chores</Text>
              </Group>
              <ActionIcon component={Link} to="/chores" variant="light" color="blue" radius="xl">
                <IconChevronRight size={18} />
              </ActionIcon>
            </Group>
            
            <ScrollArea style={{ flex: 1 }}>
              <Stack gap="sm">
                {data?.familyStats.map(member => {
                  const progress = member.todayTotal > 0 
                    ? Math.round((member.todayComplete / member.todayTotal) * 100) 
                    : 0;
                  const isComplete = progress === 100;
                  
                  return (
                    <Paper
                      key={member.id}
                      p="sm"
                      radius="lg"
                      component={Link}
                      to={`/my/${member.id}`}
                      style={{
                        background: isComplete ? '#dcfce7' : '#f8fafc',
                        border: `2px solid ${isComplete ? '#22c55e' : member.color}20`,
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Group justify="space-between">
                        <Group gap="md">
                          <Box
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: '50%',
                              background: `${member.color}20`,
                              border: `3px solid ${member.color}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            }}
                          >
                            <Avatar avatar={member.avatar} size={32} />
                          </Box>
                          <Box>
                            <Text fw={700}>{member.name}</Text>
                            <Group gap="xs">
                              <Text size="sm" c="dimmed">
                                {member.todayComplete}/{member.todayTotal} chores
                              </Text>
                              {member.totalStars > 0 && (
                                <Badge size="sm" color="yellow" variant="light" leftSection="⭐">
                                  {member.totalStars}
                                </Badge>
                              )}
                            </Group>
                          </Box>
                        </Group>
                        
                        <RingProgress
                          size={50}
                          thickness={5}
                          roundCaps
                          sections={[{ value: progress, color: isComplete ? 'green' : member.color }]}
                          label={
                            isComplete ? (
                              <Center>
                                <Text size="lg">✓</Text>
                              </Center>
                            ) : (
                              <Text c={member.color} fw={700} ta="center" size="xs">
                                {progress}%
                              </Text>
                            )
                          }
                        />
                      </Group>
                    </Paper>
                  );
                })}
                
                {(!data?.familyStats || data.familyStats.length === 0) && (
                  <Center py="xl">
                    <Stack align="center" gap="xs">
                      <Text size="3rem">👨‍👩‍👧‍👦</Text>
                      <Text c="dimmed">No family members yet</Text>
                    </Stack>
                  </Center>
                )}
              </Stack>
            </ScrollArea>
          </Paper>
        </Box>

        {/* Right Column */}
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'visible' }}>
          {/* Today's Events & Dinner */}
          <SimpleGrid cols={2} spacing="md">
            {/* Tonight's Dinner */}
            <Paper
              p="md"
              radius="xl"
              shadow="sm"
              component={Link}
              to="/dinner"
              style={{
                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                border: '2px solid #fed7aa',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              <Group gap="sm" mb="xs">
                <IconChefHat size={20} color="#ea580c" />
                <Text fw={600} size="sm" c="orange.8">Tonight's Dinner</Text>
              </Group>
              {data?.todayDinner ? (
                <Group gap="sm">
                  <Text style={{ fontSize: '2rem' }}>{data.todayDinner.icon}</Text>
                  <Text fw={700} size="md" lineClamp={2}>{data.todayDinner.title}</Text>
                </Group>
              ) : (
                <Text c="dimmed" size="sm">Not planned yet</Text>
              )}
            </Paper>

            {/* Star Leader */}
            <Paper
              p="md"
              radius="xl"
              shadow="sm"
              component={Link}
              to="/rewards"
              style={{
                background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                border: '2px solid #fde047',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              <Group gap="sm" mb="xs">
                <IconTrophy size={20} color="#ca8a04" />
                <Text fw={600} size="sm" c="yellow.8">Star Leader</Text>
              </Group>
              {data?.familyStats && data.familyStats.length > 0 ? (
                (() => {
                  const leader = [...data.familyStats].sort((a, b) => b.totalStars - a.totalStars)[0];
                  return leader.totalStars > 0 ? (
                    <Group gap="sm">
                      <Avatar avatar={leader.avatar} size={36} />
                      <Box>
                        <Text fw={700}>{leader.name}</Text>
                        <Badge color="yellow" variant="light">⭐ {leader.totalStars}</Badge>
                      </Box>
                    </Group>
                  ) : (
                    <Text c="dimmed" size="sm">No stars yet</Text>
                  );
                })()
              ) : (
                <Text c="dimmed" size="sm">No stars yet</Text>
              )}
            </Paper>
          </SimpleGrid>

          {/* Calendar Events */}
          <Paper p="md" radius="xl" shadow="sm" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Group justify="space-between" mb="md">
              <Group gap="sm">
                <IconCalendar size={22} color="#0891b2" />
                <Text fw={700} size="lg">Today's Events</Text>
              </Group>
              <ActionIcon component={Link} to="/calendar" variant="light" color="cyan" radius="xl">
                <IconChevronRight size={18} />
              </ActionIcon>
            </Group>
            
            <ScrollArea style={{ flex: 1 }}>
              <Stack gap="sm">
                {data?.upcomingEvents && data.upcomingEvents.length > 0 ? (
                  data.upcomingEvents.map(event => (
                    <Paper
                      key={event.id}
                      p="sm"
                      radius="lg"
                      style={{
                        background: '#f0fdfa',
                        borderLeft: '4px solid #06b6d4',
                      }}
                    >
                      <Text fw={600} lineClamp={1}>{event.title}</Text>
                      <Text size="xs" c="dimmed">
                        {event.allDay ? 'All day' : dayjs(event.start).format('h:mm A')}
                      </Text>
                    </Paper>
                  ))
                ) : (
                  <Center py="xl">
                    <Stack align="center" gap="xs">
                      <Text size="2rem">📅</Text>
                      <Text c="dimmed" size="sm">No events today</Text>
                    </Stack>
                  </Center>
                )}
              </Stack>
            </ScrollArea>
          </Paper>
        </Box>
      </Box>

      {/* Laundry Status Widget */}
      <LaundryWidget />
    </Box>
  );
}
