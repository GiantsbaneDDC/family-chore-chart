import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Grid,
  Card,
  Text,
  Group,
  Button,
  Badge,
  Stack,
  SimpleGrid,
  Modal,
  Select,
  NumberInput,
  Textarea,
  ActionIcon,
  Paper,
  RingProgress,
  ThemeIcon,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconFlame, IconTrophy, IconTrash, IconActivity } from '@tabler/icons-react';
import { Avatar } from '../components/Avatar';

interface Activity {
  id: number;
  name: string;
  icon: string;
  points: number;
  category: string;
}

interface ActivityLog {
  id: number;
  member_id: number;
  activity_id: number;
  log_date: string;
  duration_mins: number | null;
  notes: string | null;
  activity_name: string;
  activity_icon: string;
  activity_points: number;
  member_name?: string;
  member_avatar?: string;
}

interface Member {
  id: number;
  name: string;
  avatar: string;
  color: string;
}

interface WeeklyStats {
  week_start: string;
  total_activities: number;
  total_points: number;
  active_days: number;
  members: {
    id: number;
    name: string;
    avatar: string;
    color: string;
    activity_count: number;
    points: number;
  }[];
}

interface Streak {
  member_id: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  name?: string;
  avatar?: string;
  color?: string;
}

export default function FitnessView() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [todayLogs, setTodayLogs] = useState<ActivityLog[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  
  // Form state
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    try {
      const [activitiesRes, todayRes, membersRes, statsRes, streaksRes] = await Promise.all([
        fetch('/api/activities'),
        fetch('/api/activity-logs/today'),
        fetch('/api/members'),
        fetch('/api/fitness/weekly-stats'),
        fetch('/api/fitness/streaks'),
      ]);
      
      setActivities(await activitiesRes.json());
      setTodayLogs(await todayRes.json());
      setMembers(await membersRes.json());
      setWeeklyStats(await statsRes.json());
      setStreaks(await streaksRes.json());
    } catch (err) {
      console.error('Error fetching fitness data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogActivity = async () => {
    if (!selectedMember || !selectedActivity) {
      notifications.show({
        title: 'Missing Info',
        message: 'Please select a family member and activity',
        color: 'red',
      });
      return;
    }

    try {
      const res = await fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: parseInt(selectedMember),
          activity_id: parseInt(selectedActivity),
          duration_mins: duration || null,
          notes: notes || null,
        }),
      });

      if (res.ok) {
        const activity = activities.find(a => a.id === parseInt(selectedActivity));
        notifications.show({
          title: '🎉 Activity Logged!',
          message: `${activity?.icon} ${activity?.name} - Great job staying active!`,
          color: 'green',
        });
        close();
        setSelectedMember(null);
        setSelectedActivity(null);
        setDuration('');
        setNotes('');
        fetchData();
      }
    } catch (err) {
      console.error('Error logging activity:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to log activity',
        color: 'red',
      });
    }
  };

  const handleDeleteLog = async (id: number) => {
    try {
      await fetch(`/api/activity-logs/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('Error deleting log:', err);
    }
  };

  // Group activities by category
  const groupedActivities = activities.reduce((acc, activity) => {
    if (!acc[activity.category]) acc[activity.category] = [];
    acc[activity.category].push(activity);
    return acc;
  }, {} as Record<string, Activity[]>);

  const weeklyGoal = 30; // activities per week
  const progress = weeklyStats ? (weeklyStats.total_activities / weeklyGoal) * 100 : 0;

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="lg">
        <Group>
          <ThemeIcon size={50} radius="xl" variant="gradient" gradient={{ from: 'teal', to: 'lime' }}>
            <IconActivity size={30} />
          </ThemeIcon>
          <div>
            <Title order={2}>Family Fitness</Title>
            <Text c="dimmed" size="sm">Stay active together!</Text>
          </div>
        </Group>
        <Button 
          leftSection={<IconPlus size={18} />} 
          size="lg"
          variant="gradient"
          gradient={{ from: 'teal', to: 'green' }}
          onClick={open}
        >
          Log Activity
        </Button>
      </Group>

      <Grid>
        {/* Weekly Progress Card */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
            <Text fw={500} size="lg" mb="md">Weekly Goal</Text>
            <Group justify="center" mb="md">
              <RingProgress
                size={150}
                thickness={14}
                roundCaps
                sections={[{ value: Math.min(progress, 100), color: progress >= 100 ? 'green' : 'teal' }]}
                label={
                  <Text ta="center" size="xl" fw={700}>
                    {weeklyStats?.total_activities || 0}
                    <Text size="xs" c="dimmed">/ {weeklyGoal}</Text>
                  </Text>
                }
              />
            </Group>
            <Text ta="center" c="dimmed" size="sm">
              {weeklyStats?.active_days || 0} active days this week
            </Text>
            <Text ta="center" fw={500} c="teal" mt="xs">
              {weeklyStats?.total_points || 0} points earned! 💪
            </Text>
          </Card>
        </Grid.Col>

        {/* Family Leaderboard */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
            <Group mb="md">
              <IconTrophy size={20} color="gold" />
              <Text fw={500} size="lg">This Week</Text>
            </Group>
            <Stack gap="sm">
              {weeklyStats?.members.map((member, index) => (
                <Group key={member.id} justify="space-between">
                  <Group gap="sm">
                    <Avatar avatar={member.avatar} size={28} />
                    <Text size="sm">{member.name}</Text>
                  </Group>
                  <Group gap="xs">
                    <Badge color="teal" variant="light">{member.activity_count}</Badge>
                    <Badge color="yellow" variant="light">{member.points} pts</Badge>
                  </Group>
                </Group>
              ))}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Streaks */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
            <Group mb="md">
              <IconFlame size={20} color="orange" />
              <Text fw={500} size="lg">Streaks</Text>
            </Group>
            <Stack gap="sm">
              {streaks.length > 0 ? streaks.map(streak => (
                <Group key={streak.member_id} justify="space-between">
                  <Group gap="sm">
                    <Avatar avatar={streak.avatar || '👤'} size={28} />
                    <Text size="sm">{streak.name}</Text>
                  </Group>
                  <Group gap="xs">
                    {streak.current_streak > 0 && (
                      <Badge color="orange" variant="filled" leftSection="🔥">
                        {streak.current_streak} day{streak.current_streak !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {streak.longest_streak > streak.current_streak && (
                      <Badge color="gray" variant="light" size="xs">
                        Best: {streak.longest_streak}
                      </Badge>
                    )}
                  </Group>
                </Group>
              )) : (
                <Text c="dimmed" size="sm" ta="center">Log activities to build streaks!</Text>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Today's Activities */}
        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text fw={500} size="lg" mb="md">Today's Activities</Text>
            {todayLogs.length > 0 ? (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                {todayLogs.map(log => (
                  <Paper key={log.id} p="md" radius="md" withBorder>
                    <Group justify="space-between" mb="xs">
                      <Group gap="sm">
                        <Text size="xl">{log.activity_icon}</Text>
                        <div>
                          <Text fw={500} size="sm">{log.activity_name}</Text>
                          <Text size="xs" c="dimmed">{log.member_name}</Text>
                        </div>
                      </Group>
                      <ActionIcon 
                        variant="subtle" 
                        color="red" 
                        size="sm"
                        onClick={() => handleDeleteLog(log.id)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                    <Group gap="xs">
                      <Badge color="green" variant="light" size="sm">
                        +{log.activity_points} pts
                      </Badge>
                      {log.duration_mins && (
                        <Badge color="blue" variant="light" size="sm">
                          {log.duration_mins} mins
                        </Badge>
                      )}
                    </Group>
                  </Paper>
                ))}
              </SimpleGrid>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No activities logged today yet. Get moving! 🏃
              </Text>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      {/* Log Activity Modal */}
      <Modal opened={opened} onClose={close} title="Log Activity" size="md" centered>
        <Stack>
          <Select
            label="Who did the activity?"
            placeholder="Select family member"
            data={members.map(m => ({ value: m.id.toString(), label: m.name }))}
            value={selectedMember}
            onChange={setSelectedMember}
            size="md"
            renderOption={({ option }) => {
              const member = members.find(m => m.id.toString() === option.value);
              return (
                <Group gap="sm">
                  {member && <Avatar avatar={member.avatar} size={24} />}
                  <Text size="sm">{option.label}</Text>
                </Group>
              );
            }}
          />
          
          <Select
            label="What activity?"
            placeholder="Select activity"
            data={Object.entries(groupedActivities).flatMap(([category, acts]) => [
              { value: `cat-${category}`, label: category.charAt(0).toUpperCase() + category.slice(1), disabled: true },
              ...acts.map(a => ({ value: a.id.toString(), label: `${a.icon} ${a.name} (+${a.points} pts)` }))
            ])}
            value={selectedActivity}
            onChange={setSelectedActivity}
            size="md"
            searchable
          />
          
          <NumberInput
            label="Duration (optional)"
            placeholder="Minutes"
            value={duration}
            onChange={(val) => setDuration(val as number | '')}
            min={1}
            max={480}
            suffix=" mins"
          />
          
          <Textarea
            label="Notes (optional)"
            placeholder="How was it?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            minRows={2}
          />
          
          <Button 
            fullWidth 
            size="lg"
            variant="gradient"
            gradient={{ from: 'teal', to: 'green' }}
            onClick={handleLogActivity}
          >
            Log Activity 💪
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
