import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
import { IconArrowLeft, IconCalendar, IconClock, IconMapPin } from '@tabler/icons-react';
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
  '1': '#7986cb', // Lavender
  '2': '#33b679', // Sage
  '3': '#8e24aa', // Grape
  '4': '#e67c73', // Flamingo
  '5': '#f6bf26', // Banana
  '6': '#f4511e', // Tangerine
  '7': '#039be5', // Peacock
  '8': '#616161', // Graphite
  '9': '#3f51b5', // Blueberry
  '10': '#0b8043', // Basil
  '11': '#d50000', // Tomato
};

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar?days=14');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to load calendar:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    // Refresh every 5 minutes
    const interval = setInterval(loadEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadEvents]);

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const date = dayjs(event.start).format('YYYY-MM-DD');
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  // Sort dates
  const sortedDates = Object.keys(eventsByDate).sort();

  const formatTime = (dateStr: string, allDay: boolean) => {
    if (allDay) return 'All day';
    return dayjs(dateStr).format('h:mm A');
  };

  const isToday = (date: string) => dayjs(date).isSame(dayjs(), 'day');
  const isTomorrow = (date: string) => dayjs(date).isSame(dayjs().add(1, 'day'), 'day');

  const getDateLabel = (date: string) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return dayjs(date).format('dddd, MMMM D');
  };

  if (loading) {
    return (
      <Center h="100vh" style={{ background: 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)' }}>
        <Stack align="center" gap="md">
          <Loader size="xl" color="blue" />
          <Text c="dimmed">Loading calendar...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Box style={{ height: '100vh', background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)' }}>
      {/* Header */}
      <Box
        p="lg"
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
        }}
      >
        <Group justify="space-between" align="center">
          <Group gap="md">
            <ActionIcon
              component={Link}
              to="/"
              variant="white"
              size={44}
              radius="xl"
            >
              <IconArrowLeft size={22} />
            </ActionIcon>
            <Group gap="xs">
              <IconCalendar size={28} />
              <Title order={2} fw={700}>Family Calendar</Title>
            </Group>
          </Group>
          <Text size="lg" style={{ opacity: 0.9 }}>
            {dayjs().format('dddd, MMMM D')}
          </Text>
        </Group>
      </Box>

      {/* Calendar Content */}
      <ScrollArea h="calc(100vh - 88px)" p="lg">
        {sortedDates.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="md">
              <Text size="4rem">📅</Text>
              <Text size="xl" fw={600} c="dimmed">No upcoming events</Text>
              <Text c="dimmed">Your calendar is clear for the next 2 weeks</Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap="lg">
            {sortedDates.map(date => (
              <Box key={date}>
                {/* Date Header */}
                <Group gap="sm" mb="sm">
                  <Badge
                    size="lg"
                    radius="md"
                    color={isToday(date) ? 'blue' : 'gray'}
                    variant={isToday(date) ? 'filled' : 'light'}
                  >
                    {getDateLabel(date)}
                  </Badge>
                  {!isToday(date) && !isTomorrow(date) && (
                    <Text size="sm" c="dimmed">
                      {dayjs(date).format('MMM D')}
                    </Text>
                  )}
                </Group>

                {/* Events for this date */}
                <Stack gap="sm">
                  {eventsByDate[date]
                    .sort((a, b) => {
                      if (a.allDay && !b.allDay) return -1;
                      if (!a.allDay && b.allDay) return 1;
                      return dayjs(a.start).unix() - dayjs(b.start).unix();
                    })
                    .map(event => (
                      <Paper
                        key={event.id}
                        p="md"
                        radius="lg"
                        shadow="sm"
                        style={{
                          borderLeft: `4px solid ${event.color ? colorMap[event.color] || '#3b82f6' : '#3b82f6'}`,
                          background: 'white',
                        }}
                        className="card-hover"
                      >
                        <Group justify="space-between" align="flex-start">
                          <Box style={{ flex: 1 }}>
                            <Text fw={600} size="lg" mb={4}>
                              {event.title}
                            </Text>
                            <Group gap="md">
                              <Group gap={4}>
                                <IconClock size={16} color="#6b7280" />
                                <Text size="sm" c="dimmed">
                                  {formatTime(event.start, event.allDay)}
                                  {!event.allDay && event.end && (
                                    <> – {dayjs(event.end).format('h:mm A')}</>
                                  )}
                                </Text>
                              </Group>
                              {event.location && (
                                <Group gap={4}>
                                  <IconMapPin size={16} color="#6b7280" />
                                  <Text size="sm" c="dimmed" lineClamp={1}>
                                    {event.location}
                                  </Text>
                                </Group>
                              )}
                            </Group>
                          </Box>
                          {event.allDay && (
                            <Badge variant="light" color="gray" size="sm">
                              All Day
                            </Badge>
                          )}
                        </Group>
                      </Paper>
                    ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </ScrollArea>
    </Box>
  );
}
