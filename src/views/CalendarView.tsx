import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Text,
  Title,
  Paper,
  Group,
  Stack,
  Center,
  Loader,
  ActionIcon,
  Badge,
  ScrollArea,
  SegmentedControl,
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconCalendar } from '@tabler/icons-react';
import dayjs from 'dayjs';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  description: string | null;
  color: string | null;
}

// Google Calendar color mapping
const colorMap: Record<string, string> = {
  '1': '#7986cb',
  '2': '#33b679',
  '3': '#8e24aa',
  '4': '#e67c73',
  '5': '#f6bf26',
  '6': '#f4511e',
  '7': '#039be5',
  '8': '#616161',
  '9': '#3f51b5',
  '10': '#0b8043',
  '11': '#d50000',
};

type ViewMode = '1week' | '2weeks' | 'month';

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Memoize dates calculation
  const { dates, viewStartStr } = useMemo(() => {
    const start = dayjs().startOf('week').add(offset * 7, 'day');
    const numDays = viewMode === '1week' ? 7 : viewMode === '2weeks' ? 14 : 35;
    const dateArray = Array.from({ length: numDays }, (_, i) => start.add(i, 'day'));
    return { 
      dates: dateArray, 
      viewStartStr: start.format('YYYY-MM-DD')
    };
  }, [offset, viewMode]);

  const viewStart = dates[0];
  const viewEnd = dates[dates.length - 1];

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const days = viewMode === '1week' ? 14 : viewMode === '2weeks' ? 21 : 42;
      const res = await fetch(`/api/calendar?days=${days}&from=${viewStartStr}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to load calendar:', err);
    } finally {
      setLoading(false);
    }
  }, [viewMode, viewStartStr]);

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadEvents]);

  const getEventsForDate = (date: dayjs.Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return events.filter(event => {
      // Parse event times and convert to local date strings for comparison
      const eventStartLocal = dayjs(event.start).format('YYYY-MM-DD');
      const eventEndLocal = dayjs(event.end).format('YYYY-MM-DD');
      
      if (event.allDay) {
        // All-day events: check if date falls within range (end date is exclusive)
        return dateStr >= eventStartLocal && dateStr < eventEndLocal;
      }
      return eventStartLocal === dateStr;
    });
  };

  const formatTime = (dateStr: string) => {
    return dayjs(dateStr).format('h:mm A');
  };

  const isToday = (date: dayjs.Dayjs) => date.isSame(dayjs(), 'day');
  const isCurrentView = offset === 0;

  const formatDateRange = () => {
    if (viewStart.month() === viewEnd.month()) {
      return `${viewStart.format('MMM D')} - ${viewEnd.format('D, YYYY')}`;
    }
    return `${viewStart.format('MMM D')} - ${viewEnd.format('MMM D, YYYY')}`;
  };
  
  const getNavStep = () => viewMode === '1week' ? 1 : viewMode === '2weeks' ? 2 : 4;

  if (loading && events.length === 0) {
    return (
      <Center h="100%">
        <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Loader size="xl" color="cyan" />
          <Text c="dimmed" fw={500}>Loading calendar...</Text>
        </Box>
      </Center>
    );
  }

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <Paper
        p="md"
        radius="xl"
        shadow="sm"
        style={{
          background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        }}
      >
        <Group justify="space-between" align="center">
          <Group gap="md">
            <ActionIcon
              variant="white"
              size="lg"
              radius="xl"
              onClick={() => setOffset(o => o - getNavStep())}
            >
              <IconChevronLeft size={20} />
            </ActionIcon>
            <Box>
              <Title order={3} c="white" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconCalendar size={28} />
                Family Calendar
              </Title>
              <Text size="sm" c="white" style={{ opacity: 0.9 }}>
                {formatDateRange()}
              </Text>
            </Box>
            <ActionIcon
              variant="white"
              size="lg"
              radius="xl"
              onClick={() => setOffset(o => o + getNavStep())}
            >
              <IconChevronRight size={20} />
            </ActionIcon>
          </Group>
          
          <Group gap="sm">
            <SegmentedControl
              size="xs"
              value={viewMode}
              onChange={(v) => { setViewMode(v as ViewMode); setOffset(0); }}
              data={[
                { label: '1 Week', value: '1week' },
                { label: '2 Weeks', value: '2weeks' },
                { label: 'Month', value: 'month' },
              ]}
              color="cyan"
              styles={{
                root: { background: 'rgba(255,255,255,0.2)', border: 'none' },
                label: { 
                  fontWeight: 600,
                  color: 'white',
                  '&[dataActive]': { color: '#0891b2' },
                },
                indicator: { background: 'white' },
              }}
            />
            {!isCurrentView && (
              <Badge
                size="lg"
                variant="white"
                color="cyan"
                style={{ cursor: 'pointer' }}
                onClick={() => setOffset(0)}
              >
                Today
              </Badge>
            )}
          </Group>
        </Group>
      </Paper>

      {/* Calendar Grid */}
      <Paper p="md" radius="xl" shadow="sm" style={{ flex: 1, overflow: 'hidden' }}>
        <ScrollArea h="100%">
          <Box
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 8,
            }}
          >
            {dates.map((date, idx) => {
              const dayEvents = getEventsForDate(date);
              const today = isToday(date);
              const isWeekend = date.day() === 0 || date.day() === 6;
              
              const compact = viewMode !== '1week';
              
              return (
                <Box
                  key={idx}
                  style={{
                    minHeight: compact ? 120 : 180,
                    background: today 
                      ? 'linear-gradient(180deg, #ecfeff 0%, #cffafe 100%)'
                      : isWeekend ? '#f1f5f9' : '#f8fafc',
                    borderRadius: compact ? 12 : 16,
                    padding: compact ? 8 : 12,
                    border: today ? '2px solid #06b6d4' : '1px solid #e2e8f0',
                  }}
                >
                  {/* Day Header */}
                  <Box mb={compact ? 4 : 'xs'} style={{ textAlign: 'center' }}>
                    <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                      {date.format('ddd')}
                    </Text>
                    <Text 
                      size={compact ? 'md' : 'xl'}
                      fw={700} 
                      style={{
                        width: compact ? 28 : 36,
                        height: compact ? 28 : 36,
                        lineHeight: compact ? '28px' : '36px',
                        borderRadius: '50%',
                        background: today ? '#06b6d4' : 'transparent',
                        color: today ? '#ffffff' : '#1e293b',
                        margin: '0 auto',
                        fontSize: compact ? 14 : undefined,
                      }}
                    >
                      {date.format('D')}
                    </Text>
                  </Box>

                  {/* Events */}
                  <Stack gap={compact ? 3 : 6}>
                    {dayEvents.length === 0 ? (
                      !compact && (
                        <Text size="xs" c="dimmed" ta="center" style={{ opacity: 0.5 }}>
                          No events
                        </Text>
                      )
                    ) : (
                      dayEvents.slice(0, compact ? 3 : 4).map(event => (
                        <Box
                          key={event.id}
                          p={compact ? 4 : 6}
                          style={{
                            background: today ? '#ffffff' : '#f8fafc',
                            borderRadius: compact ? 6 : 8,
                            borderLeft: `3px solid ${event.color ? colorMap[event.color] || '#06b6d4' : '#06b6d4'}`,
                            boxShadow: today 
                              ? '0 2px 6px rgba(0,0,0,0.15)' 
                              : '0 1px 3px rgba(0,0,0,0.08)',
                          }}
                        >
                          <Text size="xs" fw={600} lineClamp={1} style={{ fontSize: compact ? 11 : 12 }}>
                            {event.title}
                          </Text>
                          {!event.allDay && !compact && (
                            <Text size="xs" c="dimmed">
                              {formatTime(event.start)}
                            </Text>
                          )}
                        </Box>
                      ))
                    )}
                    {dayEvents.length > (compact ? 3 : 4) && (
                      <Text size="xs" c="dimmed" ta="center" style={{ fontSize: 10 }}>
                        +{dayEvents.length - (compact ? 3 : 4)} more
                      </Text>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </ScrollArea>
      </Paper>
    </Box>
  );
}
