import { useState, useEffect, useCallback } from 'react';
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
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconCalendar, IconClock, IconMapPin } from '@tabler/icons-react';
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

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const getWeekDates = () => {
    const start = dayjs().startOf('week').add(weekOffset * 7, 'day');
    return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
  };

  const weekDates = getWeekDates();
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const from = weekStart.format('YYYY-MM-DD');
      const to = weekEnd.add(1, 'day').format('YYYY-MM-DD');
      const res = await fetch(`/api/calendar?days=14&from=${from}&to=${to}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to load calendar:', err);
    } finally {
      setLoading(false);
    }
  }, [weekOffset]);

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadEvents]);

  const getEventsForDate = (date: dayjs.Dayjs) => {
    return events.filter(event => {
      const eventStart = dayjs(event.start);
      const eventEnd = dayjs(event.end);
      
      if (event.allDay) {
        // All-day events: check if date falls within range
        return date.isSame(eventStart, 'day') || 
               (date.isAfter(eventStart, 'day') && date.isBefore(eventEnd, 'day'));
      }
      return eventStart.isSame(date, 'day');
    });
  };

  const formatTime = (dateStr: string) => {
    return dayjs(dateStr).format('h:mm A');
  };

  const isToday = (date: dayjs.Dayjs) => date.isSame(dayjs(), 'day');
  const isCurrentWeek = weekOffset === 0;

  const formatWeekRange = () => {
    if (weekStart.month() === weekEnd.month()) {
      return `${weekStart.format('MMM D')} - ${weekEnd.format('D, YYYY')}`;
    }
    return `${weekStart.format('MMM D')} - ${weekEnd.format('MMM D, YYYY')}`;
  };

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
              onClick={() => setWeekOffset(w => w - 1)}
            >
              <IconChevronLeft size={20} />
            </ActionIcon>
            <Box>
              <Title order={3} c="white" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconCalendar size={28} />
                Family Calendar
              </Title>
              <Text size="sm" c="white" style={{ opacity: 0.9 }}>
                {formatWeekRange()}
              </Text>
            </Box>
            <ActionIcon
              variant="white"
              size="lg"
              radius="xl"
              onClick={() => setWeekOffset(w => w + 1)}
            >
              <IconChevronRight size={20} />
            </ActionIcon>
          </Group>
          
          {!isCurrentWeek && (
            <Badge
              size="lg"
              variant="white"
              color="cyan"
              style={{ cursor: 'pointer' }}
              onClick={() => setWeekOffset(0)}
            >
              Back to This Week
            </Badge>
          )}
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
            {weekDates.map((date, idx) => {
              const dayEvents = getEventsForDate(date);
              const today = isToday(date);
              
              return (
                <Box
                  key={idx}
                  style={{
                    minHeight: 180,
                    background: today 
                      ? 'linear-gradient(180deg, #ecfeff 0%, #cffafe 100%)'
                      : '#f8fafc',
                    borderRadius: 16,
                    padding: 12,
                    border: today ? '2px solid #06b6d4' : '1px solid #e2e8f0',
                  }}
                >
                  {/* Day Header */}
                  <Box mb="xs" style={{ textAlign: 'center' }}>
                    <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                      {date.format('ddd')}
                    </Text>
                    <Text 
                      size="xl" 
                      fw={700} 
                      c={today ? 'cyan' : 'dark'}
                      style={{
                        width: 36,
                        height: 36,
                        lineHeight: '36px',
                        borderRadius: '50%',
                        background: today ? '#06b6d4' : 'transparent',
                        color: today ? 'white' : undefined,
                        margin: '0 auto',
                      }}
                    >
                      {date.format('D')}
                    </Text>
                  </Box>

                  {/* Events */}
                  <Stack gap={6}>
                    {dayEvents.length === 0 ? (
                      <Text size="xs" c="dimmed" ta="center" style={{ opacity: 0.5 }}>
                        No events
                      </Text>
                    ) : (
                      dayEvents.slice(0, 4).map(event => (
                        <Box
                          key={event.id}
                          p={6}
                          style={{
                            background: 'white',
                            borderRadius: 8,
                            borderLeft: `3px solid ${event.color ? colorMap[event.color] || '#06b6d4' : '#06b6d4'}`,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                          }}
                        >
                          <Text size="xs" fw={600} lineClamp={1}>
                            {event.title}
                          </Text>
                          {!event.allDay && (
                            <Text size="xs" c="dimmed">
                              {formatTime(event.start)}
                            </Text>
                          )}
                        </Box>
                      ))
                    )}
                    {dayEvents.length > 4 && (
                      <Text size="xs" c="dimmed" ta="center">
                        +{dayEvents.length - 4} more
                      </Text>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </ScrollArea>
      </Paper>

      {/* Today's Events Detail */}
      <Paper p="md" radius="xl" shadow="sm">
        <Title order={5} mb="sm" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconClock size={18} />
          {isCurrentWeek ? "Today's Schedule" : `${weekDates[0].format('MMM D')} Schedule`}
        </Title>
        
        {(() => {
          const todayEvents = getEventsForDate(isCurrentWeek ? dayjs() : weekDates[0]);
          
          if (todayEvents.length === 0) {
            return (
              <Text c="dimmed" size="sm">No events scheduled</Text>
            );
          }
          
          return (
            <Stack gap="xs">
              {todayEvents.map(event => (
                <Group key={event.id} gap="sm" wrap="nowrap">
                  <Box
                    style={{
                      width: 4,
                      height: 40,
                      borderRadius: 2,
                      background: event.color ? colorMap[event.color] || '#06b6d4' : '#06b6d4',
                    }}
                  />
                  <Box style={{ flex: 1 }}>
                    <Text fw={600} size="sm">{event.title}</Text>
                    <Group gap="md">
                      <Text size="xs" c="dimmed">
                        {event.allDay ? 'All day' : `${formatTime(event.start)} - ${formatTime(event.end)}`}
                      </Text>
                      {event.location && (
                        <Group gap={4}>
                          <IconMapPin size={12} color="#6b7280" />
                          <Text size="xs" c="dimmed" lineClamp={1}>{event.location}</Text>
                        </Group>
                      )}
                    </Group>
                  </Box>
                </Group>
              ))}
            </Stack>
          );
        })()}
      </Paper>
    </Box>
  );
}
