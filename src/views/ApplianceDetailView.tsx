import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box, Text, Title, Paper, Group, Stack, Badge, RingProgress,
  SimpleGrid, Center, ActionIcon, Progress, Divider, Skeleton,
} from '@mantine/core';
import { IconArrowLeft, IconDroplet, IconWind, IconClock, IconRepeat, IconAlertCircle } from '@tabler/icons-react';
import dayjs from 'dayjs';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApplianceState {
  status: 'idle' | 'running' | 'done' | 'error';
  connected: boolean;
  doorState: string;
  cyclePhase: string;
  timeRemaining: number | null;
  program: string | null;
  totalCycles: number;
  temperature?: string | null;
  spinSpeed?: string | null;
  error?: string;
}

interface LaundryData {
  washer: ApplianceState;
  dryer: ApplianceState;
  updatedAt: string;
}

interface CycleRecord {
  id: number;
  appliance_type: string;
  program: string;
  cycle_phase: string;
  started_at: string;
  completed_at: string;
  duration_minutes: number;
  temperature: string;
  spin_speed: string;
  total_cycles_at_log: number;
}

interface DayCount {
  day: string;
  cycles: string;
}

interface HistoryData {
  cycles: CycleRecord[];
  weekly: DayCount[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function phaseLabel(phase: string | null): string {
  if (!phase) return '—';
  const map: Record<string, string> = {
    WASH: '🧼 Washing', RINSE: '💧 Rinsing', SPIN: '🌀 Spinning',
    DRY: '🌬️ Drying', COOL_DOWN: '❄️ Cooling', ANTI_CREASE: '👕 Anti-crease',
    UNAVAILABLE: '—',
  };
  return map[phase] || phase.replace(/_/g, ' ');
}

function formatWorkingTime(totalCycles: number, type: 'WM' | 'TD'): string {
  // Estimate avg cycle time (WM ~60min, TD ~75min)
  const avgMin = type === 'WM' ? 60 : 75;
  const hours = Math.round((totalCycles * avgMin) / 60);
  return `~${hours} hrs total`;
}

function statusColor(status: string) {
  if (status === 'running') return '#3b82f6';
  if (status === 'done') return '#22c55e';
  return '#94a3b8';
}

function statusLabel(status: string) {
  if (status === 'running') return 'Running';
  if (status === 'done') return 'Done';
  if (status === 'error') return 'Error';
  return 'Idle';
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────

function WeeklyChart({ data }: { data: DayCount[] }) {
  if (!data || data.length === 0) {
    return (
      <Center py="xl">
        <Stack align="center" gap="xs">
          <Text size="2rem">📊</Text>
          <Text c="dimmed" size="sm">No history yet — tracking starts now</Text>
        </Stack>
      </Center>
    );
  }

  const max = Math.max(...data.map(d => parseInt(d.cycles)), 1);

  // Build last 30 days scaffold
  const days: { label: string; count: number; dateStr: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = dayjs().subtract(i, 'day');
    const dateStr = d.format('YYYY-MM-DD');
    const found = data.find(x => dayjs(x.day).format('YYYY-MM-DD') === dateStr);
    days.push({ label: d.format('D'), count: found ? parseInt(found.cycles) : 0, dateStr });
  }

  return (
    <Box>
      <Text size="xs" c="dimmed" mb="xs">Cycles per day — last 30 days</Text>
      <Box style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
        {days.map((d, i) => (
          <Box
            key={i}
            title={`${d.dateStr}: ${d.count} cycle${d.count !== 1 ? 's' : ''}`}
            style={{
              flex: 1,
              height: d.count === 0 ? 4 : Math.max(8, (d.count / max) * 76),
              background: d.count === 0 ? '#e2e8f0' : '#3b82f6',
              borderRadius: 3,
              opacity: d.count === 0 ? 0.4 : 1,
              transition: 'all 0.2s',
              cursor: 'default',
            }}
          />
        ))}
      </Box>
      <Group justify="space-between" mt={4}>
        <Text size="xs" c="dimmed">30 days ago</Text>
        <Text size="xs" c="dimmed">Today</Text>
      </Group>
    </Box>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function ApplianceDetailView() {
  const { type } = useParams<{ type: string }>(); // 'washer' or 'dryer'
  const appType = type === 'washer' ? 'WM' : 'TD';
  const icon = type === 'washer' ? '🫧' : '🌀';
  const name = type === 'washer' ? 'Washing Machine' : 'Dryer';
  const accentColor = type === 'washer' ? '#3b82f6' : '#8b5cf6';

  const [live, setLive] = useState<ApplianceState | null>(null);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchLive = async () => {
    try {
      const res = await fetch('/api/laundry');
      if (!res.ok) return;
      const data: LaundryData = await res.json();
      setLive(type === 'washer' ? data.washer : data.dryer);
      setLastUpdated(data.updatedAt);
    } catch { /* silent */ }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/laundry/history/${appType}`);
      if (!res.ok) return;
      setHistory(await res.json());
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchLive();
    fetchHistory();
    const interval = setInterval(fetchLive, 30000);
    return () => clearInterval(interval);
  }, [type]);

  const appliance = live;
  const isRunning = appliance?.status === 'running';
  const isDone = appliance?.status === 'done';
  const color = statusColor(appliance?.status || 'idle');

  // Progress ring: estimate from a typical cycle (~90 mins)
  const typicalCycleMin = appType === 'WM' ? 90 : 90;
  const timeLeft = appliance?.timeRemaining || 0;
  const progressPct = isRunning && timeLeft > 0
    ? Math.max(5, Math.round(((typicalCycleMin - timeLeft) / typicalCycleMin) * 100))
    : isRunning ? 50 : isDone ? 100 : 0;

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
      {/* Header */}
      <Paper p="lg" radius="xl" shadow="md" style={{
        background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}99 100%)`,
        flexShrink: 0,
      }}>
        <Group justify="space-between" align="center">
          <Group gap="md">
            <ActionIcon component={Link} to="/" variant="white" radius="xl" size="lg" color="dark">
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Text style={{ fontSize: '2.5rem' }}>{icon}</Text>
            <Box>
              <Title order={2} c="white" fw={800}>{name}</Title>
              <Group gap="xs">
                <Badge
                  color={appliance?.status === 'running' ? 'yellow' : appliance?.status === 'done' ? 'green' : 'gray'}
                  variant="filled"
                  size="sm"
                >
                  {statusLabel(appliance?.status || 'idle')}
                </Badge>
                {appliance?.connected !== false && (
                  <Badge color="teal" variant="light" size="sm">🟢 Connected</Badge>
                )}
              </Group>
            </Box>
          </Group>

          {/* Progress Ring */}
          {(isRunning || isDone) && (
            <RingProgress
              size={90}
              thickness={9}
              roundCaps
              sections={[{ value: progressPct, color: isDone ? '#22c55e' : 'white' }]}
              label={
                isDone ? (
                  <Center><Text size="xl">✓</Text></Center>
                ) : (
                  <Stack gap={0} align="center">
                    <Text c="white" fw={800} size="sm">{timeLeft}m</Text>
                    <Text c="white" size="xs" style={{ opacity: 0.8 }}>left</Text>
                  </Stack>
                )
              }
            />
          )}
        </Group>
      </Paper>

      {/* Content Grid */}
      <Box style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, minHeight: 0 }}>

        {/* Left column */}
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Current cycle */}
          <Paper p="md" radius="xl" shadow="sm" style={{
            background: isRunning ? '#eff6ff' : isDone ? '#f0fdf4' : '#f8fafc',
            border: `2px solid ${isRunning ? '#93c5fd' : isDone ? '#86efac' : '#e2e8f0'}`,
          }}>
            <Text fw={700} size="md" mb="sm">Current Cycle</Text>
            {appliance ? (
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Program</Text>
                  <Text size="sm" fw={600}>{appliance.program || '—'}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Phase</Text>
                  <Text size="sm" fw={600}>{phaseLabel(appliance.cyclePhase)}</Text>
                </Group>
                {appType === 'WM' && (
                  <>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Temperature</Text>
                      <Text size="sm" fw={600}>{appliance.temperature?.replace(/_/g, ' ') || '—'}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Spin Speed</Text>
                      <Text size="sm" fw={600}>{appliance.spinSpeed || '—'}</Text>
                    </Group>
                  </>
                )}
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Door</Text>
                  <Badge size="sm" color={appliance.doorState === 'OPEN' ? 'orange' : 'gray'} variant="light">
                    {appliance.doorState === 'OPEN' ? '🔓 Open' : '🔒 Closed'}
                  </Badge>
                </Group>
                {isRunning && appliance.timeRemaining && (
                  <>
                    <Divider />
                    <Box>
                      <Group justify="space-between" mb={6}>
                        <Text size="sm" c="dimmed">Time remaining</Text>
                        <Text size="sm" fw={700} c="blue">{appliance.timeRemaining} min</Text>
                      </Group>
                      <Progress value={progressPct} color="blue" radius="xl" size="md" animated />
                    </Box>
                  </>
                )}
                {isDone && (
                  <Paper p="sm" radius="lg" style={{ background: '#dcfce7', border: '2px solid #22c55e' }}>
                    <Text fw={700} c="green.7" ta="center">✅ Done! Hang it out 👕</Text>
                  </Paper>
                )}
                {!isRunning && !isDone && (
                  <Text c="dimmed" size="sm" ta="center" py="xs">Not currently running</Text>
                )}
              </Stack>
            ) : (
              <Stack gap="xs">
                <Skeleton height={16} radius="sm" />
                <Skeleton height={16} radius="sm" />
                <Skeleton height={16} radius="sm" />
              </Stack>
            )}
          </Paper>

          {/* Stats */}
          <SimpleGrid cols={2} spacing="sm">
            <Paper p="md" radius="xl" shadow="sm" style={{ background: '#f0f9ff', border: '2px solid #bae6fd' }}>
              <Group gap="sm" mb={4}>
                <IconRepeat size={18} color="#0891b2" />
                <Text size="xs" c="cyan.7" fw={600}>Total Cycles</Text>
              </Group>
              <Text fw={800} size="xl">{appliance?.totalCycles ?? '—'}</Text>
              <Text size="xs" c="dimmed">{appType === 'WM' ? 'washes' : 'dry runs'}</Text>
            </Paper>

            <Paper p="md" radius="xl" shadow="sm" style={{ background: '#fdf4ff', border: '2px solid #e9d5ff' }}>
              <Group gap="sm" mb={4}>
                <IconClock size={18} color="#7c3aed" />
                <Text size="xs" c="violet.7" fw={600}>Est. Hours</Text>
              </Group>
              <Text fw={800} size="xl">
                {appliance ? Math.round(((appliance.totalCycles || 0) * (appType === 'WM' ? 60 : 75)) / 60) : '—'}
              </Text>
              <Text size="xs" c="dimmed">lifetime running</Text>
            </Paper>

            <Paper p="md" radius="xl" shadow="sm" style={{ background: '#f0fdf4', border: '2px solid #bbf7d0' }}>
              <Group gap="sm" mb={4}>
                {appType === 'WM' ? <IconDroplet size={18} color="#16a34a" /> : <IconWind size={18} color="#16a34a" />}
                <Text size="xs" c="green.7" fw={600}>This Month</Text>
              </Group>
              <Text fw={800} size="xl">
                {history ? history.weekly.filter(d =>
                  dayjs(d.day).isAfter(dayjs().subtract(30, 'day'))
                ).reduce((sum, d) => sum + parseInt(d.cycles), 0) : '—'}
              </Text>
              <Text size="xs" c="dimmed">cycles</Text>
            </Paper>

            <Paper p="md" radius="xl" shadow="sm" style={{ background: '#fff7ed', border: '2px solid #fed7aa' }}>
              <Group gap="sm" mb={4}>
                <IconClock size={18} color="#ea580c" />
                <Text size="xs" c="orange.7" fw={600}>Last Updated</Text>
              </Group>
              <Text fw={700} size="sm">
                {lastUpdated ? dayjs(lastUpdated).format('h:mm A') : '—'}
              </Text>
              <Text size="xs" c="dimmed">auto-refreshes</Text>
            </Paper>
          </SimpleGrid>
        </Box>

        {/* Right column */}
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Usage chart */}
          <Paper p="md" radius="xl" shadow="sm" style={{ flex: 1 }}>
            <Text fw={700} size="md" mb="md">Usage History</Text>
            {history ? (
              <WeeklyChart data={history.weekly} />
            ) : (
              <Stack gap="xs">
                <Skeleton height={80} radius="sm" />
              </Stack>
            )}
          </Paper>

          {/* Recent cycles */}
          <Paper p="md" radius="xl" shadow="sm" style={{ flex: 1, overflow: 'hidden' }}>
            <Text fw={700} size="md" mb="sm">Recent Cycles</Text>
            {history && history.cycles.length > 0 ? (
              <Stack gap="xs" style={{ overflow: 'hidden' }}>
                {history.cycles.slice(0, 5).map(cycle => (
                  <Paper key={cycle.id} p="sm" radius="lg" style={{ background: '#f8fafc' }}>
                    <Group justify="space-between">
                      <Box>
                        <Text size="sm" fw={600}>{cycle.program || 'Unknown'}</Text>
                        <Text size="xs" c="dimmed">
                          {dayjs(cycle.completed_at).format('ddd D MMM, h:mm A')}
                          {cycle.duration_minutes ? ` · ${cycle.duration_minutes} min` : ''}
                        </Text>
                      </Box>
                      {cycle.temperature && (
                        <Badge size="xs" variant="light" color="blue">{cycle.temperature.replace(/_/g, ' ')}</Badge>
                      )}
                    </Group>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Center py="md">
                <Stack align="center" gap="xs">
                  <Text size="2rem">🕐</Text>
                  <Text c="dimmed" size="sm" ta="center">
                    {history ? 'No cycles logged yet' : 'Loading...'}
                  </Text>
                  <Text c="dimmed" size="xs" ta="center">History tracks from today onwards</Text>
                </Stack>
              </Center>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
