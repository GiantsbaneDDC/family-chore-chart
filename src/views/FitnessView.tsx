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
  ActionIcon,
  Paper,
  RingProgress,
  ThemeIcon,
  Box,
  Center,
  CloseButton,
  ScrollArea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconFlame, IconTrophy, IconTrash, IconActivity, IconArrowLeft } from '@tabler/icons-react';
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
  
  // POS picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

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

  const handleLogActivity = async (activityId: number) => {
    if (!selectedMember) return;

    try {
      const res = await fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: selectedMember.id,
          activity_id: activityId,
        }),
      });

      if (res.ok) {
        const activity = activities.find(a => a.id === activityId);
        notifications.show({
          title: '🎉 Activity Logged!',
          message: `${activity?.icon} ${activity?.name} - Great job ${selectedMember.name}!`,
          color: 'green',
        });
        setPickerOpen(false);
        setSelectedMember(null);
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

  const categoryOrder = ['cardio', 'sports', 'strength', 'flexibility', 'play', 'general'];
  const sortedCategories = Object.keys(groupedActivities).sort((a, b) => {
    return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
  });

  const weeklyGoal = 30;
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
          onClick={() => setPickerOpen(true)}
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
              {weeklyStats?.members.map((member) => (
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

      {/* POS-Style Activity Picker */}
      <Modal
        opened={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setSelectedMember(null);
        }}
        fullScreen
        withCloseButton={false}
        padding={0}
        styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column' } }}
      >
        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
          {/* Header */}
          <Paper 
            p="md" 
            radius={0}
            style={{ background: 'linear-gradient(135deg, #20c997 0%, #12b886 100%)', flexShrink: 0 }}
          >
            <Group justify="space-between">
              <Group gap="md">
                {selectedMember && (
                  <ActionIcon 
                    variant="white" 
                    size="lg" 
                    onClick={() => setSelectedMember(null)}
                  >
                    <IconArrowLeft size={20} />
                  </ActionIcon>
                )}
                <Text style={{ fontSize: '2rem' }}>🏃</Text>
                <Box>
                  <Title order={3} c="white">
                    {selectedMember ? `Log Activity for ${selectedMember.name}` : 'Who did the activity?'}
                  </Title>
                  <Text size="sm" c="white" style={{ opacity: 0.9 }}>
                    {selectedMember ? 'Tap an activity to log it' : 'Tap a family member to start'}
                  </Text>
                </Box>
              </Group>
              <CloseButton 
                size="xl" 
                variant="white" 
                onClick={() => {
                  setPickerOpen(false);
                  setSelectedMember(null);
                }}
                style={{ color: 'white' }}
              />
            </Group>
          </Paper>

          {/* Content */}
          <ScrollArea style={{ flex: 1 }} p="lg">
            {!selectedMember ? (
              /* Step 1: Select Family Member */
              <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="lg">
                {members.map(member => (
                  <Paper
                    key={member.id}
                    p="xl"
                    radius="xl"
                    shadow="md"
                    style={{ 
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: '3px solid transparent',
                      background: 'white',
                    }}
                    onClick={() => setSelectedMember(member)}
                    className="pos-card-hover"
                  >
                    <Center>
                      <Stack align="center" gap="md">
                        <Box style={{ 
                          width: 100, 
                          height: 100, 
                          borderRadius: '50%', 
                          background: `${member.color}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Avatar avatar={member.avatar} size={70} />
                        </Box>
                        <Text fw={700} size="xl">{member.name}</Text>
                      </Stack>
                    </Center>
                  </Paper>
                ))}
              </SimpleGrid>
            ) : (
              /* Step 2: Select Activity */
              <Stack gap="xl">
                {sortedCategories.map(category => (
                  <Box key={category}>
                    <Text fw={700} size="lg" mb="md" tt="capitalize" c="dimmed">
                      {category}
                    </Text>
                    <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
                      {groupedActivities[category].map(activity => (
                        <Paper
                          key={activity.id}
                          p="lg"
                          radius="lg"
                          shadow="sm"
                          style={{ 
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            border: '2px solid transparent',
                            background: 'white',
                          }}
                          onClick={() => handleLogActivity(activity.id)}
                          className="pos-card-hover"
                        >
                          <Center mb="sm">
                            <Text style={{ fontSize: '3rem' }}>{activity.icon}</Text>
                          </Center>
                          <Text fw={600} ta="center" size="md" mb="xs">
                            {activity.name}
                          </Text>
                          <Center>
                            <Badge color="teal" variant="light" size="lg">
                              +{activity.points} pts
                            </Badge>
                          </Center>
                        </Paper>
                      ))}
                    </SimpleGrid>
                  </Box>
                ))}
              </Stack>
            )}
          </ScrollArea>
        </Box>
      </Modal>

      <style>{`
        .pos-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.15);
          border-color: #20c997 !important;
        }
      `}</style>
    </Container>
  );
}
