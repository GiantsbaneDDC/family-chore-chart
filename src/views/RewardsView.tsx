import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Text,
  Title,
  Paper,
  Group,
  Stack,
  ActionIcon,
  Tooltip,
  Center,
  Loader,
  Badge,
  ThemeIcon,
  SimpleGrid,
  Progress,
  Card,
  RingProgress,
} from '@mantine/core';
import { IconHome, IconRefresh, IconTrophy, IconFlame, IconStar, IconMedal } from '@tabler/icons-react';
import dayjs from 'dayjs';
import * as api from '../api';
import type { RewardsData, MemberAchievement, Achievement } from '../types';
import { FitToScreen } from '../components/FitToScreen';

const CONFETTI_COLORS = ['#ffd700', '#ff6b6b', '#4ecdc4', '#a855f7', '#3b82f6', '#22c55e'];

export default function RewardsView() {
  const [data, setData] = useState<RewardsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const rewardsData = await api.getRewardsData();
      setData(rewardsData);
    } catch (err) {
      console.error('Failed to load rewards data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !data) {
    return (
      <Center h="100vh" bg="gray.0">
        <Stack align="center" gap="md">
          <Loader size="xl" color="yellow" />
          <Text c="dimmed" fw={500}>Loading rewards...</Text>
        </Stack>
      </Center>
    );
  }

  const { leaderboard, streaks, achievements, allAchievements, funStats } = data;
  
  // Sort leaderboard by points
  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.weekly_points - a.weekly_points);
  const maxPoints = Math.max(...sortedLeaderboard.map(m => m.weekly_points), 1);

  // Sort streaks by streak count
  const sortedStreaks = [...streaks].sort((a, b) => b.streak - a.streak);

  return (
    <FitToScreen
      background="linear-gradient(135deg, #fef3c7 0%, #fce7f3 50%, #ddd6fe 100%)"
      padding={16}
      minScreenWidth={768}
    >
    <Box className="kiosk-container safe-area-padding" style={{ background: 'transparent' }}>
      {/* Header */}
      <Paper 
        p="lg" 
        mb="xl" 
        radius="xl" 
        shadow="md"
        style={{ 
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          border: 'none'
        }}
      >
        <Group justify="space-between" wrap="wrap" gap="md">
          <div>
            <Title 
              order={1} 
              fw={900} 
              size="h2"
              c="white"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}
            >
              🏆 Rewards & Achievements
            </Title>
            <Text size="sm" c="white" fw={500} mt={4} style={{ opacity: 0.9 }}>
              Week of {dayjs(data.weekStart).format('MMMM D, YYYY')}
            </Text>
          </div>
          <Group gap="sm">
            <Tooltip label="Refresh">
              <ActionIcon 
                variant="white" 
                onClick={loadData} 
                size="xl" 
                radius="xl"
                color="yellow"
              >
                <IconRefresh size={22} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Back to Chores">
              <ActionIcon 
                component={Link} 
                to="/" 
                variant="white" 
                size="xl" 
                radius="xl"
                color="yellow"
              >
                <IconHome size={22} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Paper>

      <div className="rewards-content">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        {/* Weekly Leaderboard */}
        <Paper 
          p="xl" 
          radius="xl" 
          shadow="md"
          style={{ background: 'white' }}
        >
          <Group gap="sm" mb="lg">
            <ThemeIcon size="xl" radius="xl" color="yellow" variant="light">
              <IconTrophy size={24} />
            </ThemeIcon>
            <Title order={3} fw={800}>Weekly Leaderboard</Title>
          </Group>
          
          <Stack gap="md">
            {sortedLeaderboard.map((member, index) => (
              <div 
                key={member.id} 
                className="slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Paper
                  p="md"
                  radius="lg"
                  style={{ 
                    background: index === 0 && member.weekly_points > 0 
                      ? 'linear-gradient(135deg, #fef3c7, #fde68a)' 
                      : '#f8fafc',
                    border: index === 0 && member.weekly_points > 0 
                      ? '2px solid #fbbf24' 
                      : '1px solid #e2e8f0',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="md" wrap="nowrap">
                      <Text size="xl" fw={900} c={index === 0 ? 'yellow.7' : 'dimmed'}>
                        #{index + 1}
                      </Text>
                      <div 
                        style={{ 
                          width: 48, 
                          height: 48, 
                          borderRadius: '50%', 
                          background: member.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                      >
                        {member.avatar}
                      </div>
                      <div>
                        <Text fw={700} size="lg">{member.name}</Text>
                        <Progress 
                          value={(member.weekly_points / maxPoints) * 100} 
                          color={CONFETTI_COLORS[index % CONFETTI_COLORS.length]} 
                          size="sm" 
                          radius="xl"
                          style={{ width: 100 }}
                          mt={4}
                        />
                      </div>
                    </Group>
                    <Badge 
                      size="xl" 
                      variant="filled" 
                      color={index === 0 && member.weekly_points > 0 ? 'yellow' : 'blue'}
                      style={{ minWidth: 60 }}
                    >
                      {member.weekly_points} pts
                    </Badge>
                  </Group>
                  {index === 0 && member.weekly_points > 0 && (
                    <Text 
                      size="2rem" 
                      style={{ 
                        position: 'absolute', 
                        right: -5, 
                        top: -5, 
                        opacity: 0.3,
                        transform: 'rotate(15deg)'
                      }}
                    >
                      👑
                    </Text>
                  )}
                </Paper>
              </div>
            ))}
          </Stack>
        </Paper>

        {/* Streaks */}
        <Paper 
          p="xl" 
          radius="xl" 
          shadow="md"
          style={{ background: 'white' }}
        >
          <Group gap="sm" mb="lg">
            <ThemeIcon size="xl" radius="xl" color="orange" variant="light">
              <IconFlame size={24} />
            </ThemeIcon>
            <Title order={3} fw={800}>Weekly Streaks</Title>
          </Group>
          
          <Stack gap="md">
            {sortedStreaks.map((member, index) => (
              <div 
                key={member.id} 
                className="slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Paper
                  p="md"
                  radius="lg"
                  style={{ 
                    background: member.streak >= 3 
                      ? 'linear-gradient(135deg, #fef2f2, #fee2e2)' 
                      : '#f8fafc',
                    border: member.streak >= 3 
                      ? '2px solid #f87171' 
                      : '1px solid #e2e8f0'
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="md" wrap="nowrap">
                      <div 
                        style={{ 
                          width: 48, 
                          height: 48, 
                          borderRadius: '50%', 
                          background: member.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                      >
                        {member.avatar}
                      </div>
                      <Text fw={700} size="lg">{member.name}</Text>
                    </Group>
                    <Group gap="xs">
                      {member.streak > 0 ? (
                        <>
                          <Text size="2rem">
                            {member.streak >= 5 ? '💪' : member.streak >= 3 ? '🔥' : '⭐'}
                          </Text>
                          <Badge 
                            size="xl" 
                            variant="filled" 
                            color={member.streak >= 5 ? 'red' : member.streak >= 3 ? 'orange' : 'blue'}
                          >
                            {member.streak} week{member.streak !== 1 ? 's' : ''}
                          </Badge>
                        </>
                      ) : (
                        <Badge size="xl" variant="light" color="gray">
                          No streak yet
                        </Badge>
                      )}
                    </Group>
                  </Group>
                </Paper>
              </div>
            ))}
          </Stack>
        </Paper>

        {/* Achievements Showcase */}
        <Paper 
          p="xl" 
          radius="xl" 
          shadow="md"
          style={{ background: 'white' }}
        >
          <Group gap="sm" mb="lg">
            <ThemeIcon size="xl" radius="xl" color="purple" variant="light">
              <IconMedal size={24} />
            </ThemeIcon>
            <Title order={3} fw={800}>Badges Earned</Title>
          </Group>
          
          {Object.keys(achievements).length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="md">
                <Text size="4rem">🎯</Text>
                <Text c="dimmed" ta="center">
                  No badges earned yet!<br/>
                  Complete chores to earn badges.
                </Text>
              </Stack>
            </Center>
          ) : (
            <Stack gap="lg">
              {leaderboard.map(member => {
                const memberAchievements = achievements[member.id] || [];
                if (memberAchievements.length === 0) return null;
                
                return (
                  <div key={member.id}>
                    <Group gap="sm" mb="sm">
                      <div 
                        style={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: '50%', 
                          background: member.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem'
                        }}
                      >
                        {member.avatar}
                      </div>
                      <Text fw={700}>{member.name}</Text>
                      <Badge color="purple" variant="light">
                        {memberAchievements.length} badge{memberAchievements.length !== 1 ? 's' : ''}
                      </Badge>
                    </Group>
                    <Group gap="xs">
                      {memberAchievements.map((ach, i) => (
                        <Tooltip 
                          key={i} 
                          label={
                            <div>
                              <Text fw={700}>{ach.title}</Text>
                              <Text size="sm">{ach.description}</Text>
                              <Text size="xs" c="dimmed">
                                Earned {dayjs(ach.earned_at).format('MMM D, YYYY')}
                              </Text>
                            </div>
                          }
                          multiline
                          w={200}
                        >
                          <div 
                            className="achievement-badge pulse-on-hover"
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                              border: '3px solid #fbbf24',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.5rem',
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)'
                            }}
                          >
                            {ach.icon}
                          </div>
                        </Tooltip>
                      ))}
                    </Group>
                  </div>
                );
              })}
            </Stack>
          )}
        </Paper>

        {/* All Achievements */}
        <Paper 
          p="xl" 
          radius="xl" 
          shadow="md"
          style={{ background: 'white' }}
        >
          <Group gap="sm" mb="lg">
            <ThemeIcon size="xl" radius="xl" color="blue" variant="light">
              <IconStar size={24} />
            </ThemeIcon>
            <Title order={3} fw={800}>All Badges</Title>
          </Group>
          
          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
            {allAchievements.map((ach: Achievement) => {
              // Check if anyone has earned this
              const earnedBy = leaderboard.filter(m => 
                achievements[m.id]?.some(a => a.achievement_key === ach.key)
              );
              const isEarned = earnedBy.length > 0;
              
              return (
                <Card 
                  key={ach.key}
                  radius="lg"
                  padding="md"
                  style={{ 
                    background: isEarned 
                      ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' 
                      : '#f8fafc',
                    border: isEarned 
                      ? '2px solid #22c55e' 
                      : '1px solid #e2e8f0',
                    opacity: isEarned ? 1 : 0.7,
                    textAlign: 'center'
                  }}
                >
                  <Text size="2rem" mb="xs">{ach.icon}</Text>
                  <Text fw={700} size="sm" lineClamp={1}>{ach.title}</Text>
                  <Text size="xs" c="dimmed" lineClamp={2}>{ach.description}</Text>
                  <Badge 
                    mt="xs" 
                    variant={isEarned ? 'filled' : 'light'} 
                    color={isEarned ? 'green' : 'gray'}
                    size="sm"
                  >
                    {ach.points_value} pts
                  </Badge>
                  {isEarned && (
                    <Group gap={2} justify="center" mt="xs">
                      {earnedBy.map(m => (
                        <div 
                          key={m.id}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: m.color,
                            fontSize: '0.6rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {m.avatar}
                        </div>
                      ))}
                    </Group>
                  )}
                </Card>
              );
            })}
          </SimpleGrid>
        </Paper>

        {/* Fun Stats */}
        <Paper 
          p="xl" 
          radius="xl" 
          shadow="md"
          style={{ 
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            gridColumn: '1 / -1'
          }}
        >
          <Title order={3} fw={800} mb="lg" ta="center">
            📊 Fun Stats
          </Title>
          
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
            <Card radius="lg" padding="xl" style={{ background: 'white', textAlign: 'center' }}>
              <RingProgress
                size={100}
                thickness={12}
                roundCaps
                sections={[{ value: Math.min(funStats.totalCompletions, 100), color: 'blue' }]}
                label={
                  <Text fw={700} size="lg" ta="center">
                    {funStats.totalCompletions}
                  </Text>
                }
                mx="auto"
              />
              <Text fw={700} mt="md">Total Chores Done</Text>
              <Text size="sm" c="dimmed">All time</Text>
            </Card>
            
            {funStats.mostCompletedChore && (
              <Card radius="lg" padding="xl" style={{ background: 'white', textAlign: 'center' }}>
                <Text size="4rem">{funStats.mostCompletedChore.icon}</Text>
                <Text fw={700} mt="md">Most Done Chore</Text>
                <Text size="sm" c="dimmed">
                  {funStats.mostCompletedChore.title} ({funStats.mostCompletedChore.count}x)
                </Text>
              </Card>
            )}
            
            {funStats.busiestDay && (
              <Card radius="lg" padding="xl" style={{ background: 'white', textAlign: 'center' }}>
                <Text size="4rem">📅</Text>
                <Text fw={700} mt="md">Busiest Day</Text>
                <Text size="sm" c="dimmed">
                  {funStats.busiestDay.day_name} ({funStats.busiestDay.count} completions)
                </Text>
              </Card>
            )}
          </SimpleGrid>
        </Paper>
      </SimpleGrid>
      </div>

      <style>{`
        .pulse-on-hover:hover {
          animation: pulse 0.3s ease-in-out;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        .achievement-badge {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .achievement-badge:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(251, 191, 36, 0.4);
        }
      `}</style>
    </Box>
    </FitToScreen>
  );
}
