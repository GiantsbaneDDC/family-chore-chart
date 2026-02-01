import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Text,
  Title,
  Center,
  Loader,
  Badge,
  Modal,
  SimpleGrid,
  Paper,
  Group,
  Stack,
} from '@mantine/core';
import { IconStar, IconTrophy } from '@tabler/icons-react';
import * as api from '../api';
import { Avatar } from '../components/Avatar';
import type { ExtraTask, FamilyMember, StarHistory } from '../types';

export default function RewardsView() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ExtraTask[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<ExtraTask | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [starHistory, setStarHistory] = useState<StarHistory[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [tasksData, leaderboard] = await Promise.all([
        api.getAvailableExtraTasks(),
        api.getStarLeaderboard(),
      ]);
      setTasks(tasksData);
      setMembers(leaderboard);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMemberHistory = useCallback(async (memberId: number) => {
    try {
      const data = await api.getMemberStars(memberId);
      setStarHistory(data.history);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedMember) {
      loadMemberHistory(selectedMember);
    }
  }, [selectedMember, loadMemberHistory]);

  const handleClaim = async (memberId: number) => {
    if (!selectedTask || claiming) return;
    
    setClaiming(true);
    try {
      await api.claimExtraTask(selectedTask.id, memberId);
      setSelectedTask(null);
      navigate('/');
    } catch (err) {
      console.error('Failed to claim task:', err);
      alert('Failed to claim task. It may have already been claimed.');
      loadData();
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <Center h="100%">
        <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Loader size="xl" color="orange" />
          <Text c="dimmed" fw={500}>Loading rewards...</Text>
        </Box>
      </Center>
    );
  }

  const topMember = members.length > 0 ? members[0] : null;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
      {/* Header */}
      <Paper 
        p="lg" 
        radius="xl" 
        shadow="sm"
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          flexShrink: 0,
        }}
      >
        <Group justify="space-between" align="center">
          <Group gap="md">
            <IconTrophy size={36} color="white" />
            <Title order={2} c="white" fw={800}>Rewards & Bonus Tasks</Title>
          </Group>
          {topMember && topMember.total_stars && topMember.total_stars > 0 && (
            <Paper px="md" py="xs" radius="xl" style={{ background: 'white' }}>
              <Text size="lg" fw={700} c="orange.7">
                👑 {topMember.name} leads with {topMember.total_stars} stars!
              </Text>
            </Paper>
          )}
        </Group>
      </Paper>

      {/* Main Content - Two Column Layout */}
      <Box style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, minHeight: 0, overflow: 'hidden' }}>
        
        {/* Left Column - Bonus Tasks */}
        <Paper p="lg" radius="xl" shadow="sm" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Group gap="sm" mb="lg" style={{ flexShrink: 0 }}>
            <IconStar size={28} color="#f97316" />
            <Title order={3}>Bonus Tasks</Title>
            <Text size="sm" c="dimmed" ml="auto">Tap to claim!</Text>
          </Group>
          
          <Box style={{ flex: 1, overflow: 'auto' }}>
            {tasks.length === 0 ? (
              <Center h="100%">
                <Box style={{ textAlign: 'center' }}>
                  <Text size="4rem" mb="md">🎉</Text>
                  <Title order={4} mb="xs">All tasks claimed!</Title>
                  <Text c="dimmed" size="sm">Check back later for more.</Text>
                </Box>
              </Center>
            ) : (
              <SimpleGrid cols={2} spacing="md">
                {tasks.map(task => (
                  <Paper
                    key={task.id}
                    p="md"
                    radius="lg"
                    onClick={() => setSelectedTask(task)}
                    style={{
                      background: '#fff7ed',
                      border: '2px solid #fed7aa',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: '2.5rem' }}>{task.icon}</Text>
                    <Text fw={700} ta="center" size="sm" lineClamp={2}>{task.title}</Text>
                    <Badge size="md" color="orange" variant="light" leftSection={<IconStar size={12} />}>
                      {task.stars} {task.stars === 1 ? 'star' : 'stars'}
                    </Badge>
                  </Paper>
                ))}
              </SimpleGrid>
            )}
          </Box>
        </Paper>

        {/* Right Column - Leaderboard */}
        <Paper p="lg" radius="xl" shadow="sm" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Group gap="sm" mb="lg" style={{ flexShrink: 0 }}>
            <IconTrophy size={28} color="#f59e0b" />
            <Title order={3}>Star Leaderboard</Title>
          </Group>
          
          <Box style={{ flex: 1, overflow: 'auto' }}>
            {members.length === 0 ? (
              <Center h="100%">
                <Box style={{ textAlign: 'center' }}>
                  <Text size="4rem" mb="md">⭐</Text>
                  <Title order={4} mb="xs">No stars yet!</Title>
                  <Text c="dimmed" size="sm">Complete tasks to earn stars.</Text>
                </Box>
              </Center>
            ) : (
              <Stack gap="md">
                {members.map((member, index) => {
                  const isTop3 = index < 3;
                  const isSelected = selectedMember === member.id;
                  
                  return (
                    <Box key={member.id}>
                      <Paper
                        p="md"
                        radius="lg"
                        onClick={() => setSelectedMember(isSelected ? null : member.id)}
                        style={{
                          background: isSelected 
                            ? 'linear-gradient(135deg, #fef3c7, #fde68a)' 
                            : isTop3 ? '#fffbeb' : 'white',
                          border: isSelected 
                            ? '3px solid #f59e0b' 
                            : `2px solid ${member.color}40`,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Group justify="space-between" align="center">
                          <Group gap="md">
                            {/* Rank */}
                            <Box
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: isTop3 ? 'transparent' : '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: isTop3 ? '1.8rem' : '1rem',
                                fontWeight: 700,
                                color: '#64748b',
                              }}
                            >
                              {isTop3 ? medals[index] : index + 1}
                            </Box>
                            
                            {/* Avatar */}
                            <Box
                              style={{
                                width: 50,
                                height: 50,
                                borderRadius: '50%',
                                background: `linear-gradient(135deg, ${member.color}, ${member.color}aa)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                              }}
                            >
                              <Avatar avatar={member.avatar} size={36} />
                            </Box>
                            
                            {/* Name */}
                            <Text fw={700} size="lg">{member.name}</Text>
                          </Group>
                          
                          {/* Stars */}
                          <Paper px="md" py="xs" radius="xl" style={{ background: '#fef3c7' }}>
                            <Group gap={6}>
                              <IconStar size={20} color="#f59e0b" fill="#f59e0b" />
                              <Text size="lg" fw={800} c="orange.8">
                                {member.total_stars || 0}
                              </Text>
                            </Group>
                          </Paper>
                        </Group>
                      </Paper>
                      
                      {/* History Panel */}
                      {isSelected && (
                        <Paper p="md" mt="xs" radius="lg" style={{ background: '#f8fafc', marginLeft: 20 }}>
                          <Text fw={600} size="sm" mb="sm">⭐ Recent History</Text>
                          {starHistory.length === 0 ? (
                            <Text c="dimmed" size="sm">No history yet</Text>
                          ) : (
                            <Stack gap="xs">
                              {starHistory.slice(0, 5).map(entry => (
                                <Group key={entry.id} justify="space-between">
                                  <Text size="sm">{entry.description}</Text>
                                  <Badge 
                                    color={entry.stars > 0 ? 'green' : 'red'} 
                                    size="sm"
                                    variant="light"
                                  >
                                    {entry.stars > 0 ? '+' : ''}{entry.stars}
                                  </Badge>
                                </Group>
                              ))}
                            </Stack>
                          )}
                        </Paper>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Member Selection Modal */}
      <Modal
        opened={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        title={<Text fw={700} size="lg">Who's doing this task?</Text>}
        centered
        size="lg"
        radius="lg"
      >
        {selectedTask && (
          <Box>
            <Paper
              p="md"
              radius="lg"
              mb="lg"
              style={{ background: '#fff7ed', border: '2px solid #fed7aa' }}
            >
              <Group gap="md">
                <Text style={{ fontSize: '2.5rem' }}>{selectedTask.icon}</Text>
                <Box>
                  <Text fw={700} size="lg">{selectedTask.title}</Text>
                  <Badge color="orange" variant="light" leftSection={<IconStar size={12} />}>
                    {selectedTask.stars} {selectedTask.stars === 1 ? 'star' : 'stars'}
                  </Badge>
                </Box>
              </Group>
            </Paper>

            <Text fw={600} mb="md">Select who will do this task:</Text>
            
            <SimpleGrid cols={3} spacing="md">
              {members.map(member => (
                <Paper
                  key={member.id}
                  p="md"
                  radius="lg"
                  onClick={() => handleClaim(member.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    cursor: claiming ? 'wait' : 'pointer',
                    transition: 'all 0.2s',
                    border: `2px solid ${member.color}40`,
                    opacity: claiming ? 0.6 : 1,
                  }}
                >
                  <Avatar avatar={member.avatar} size={48} />
                  <Text fw={700} ta="center">{member.name}</Text>
                </Paper>
              ))}
            </SimpleGrid>
          </Box>
        )}
      </Modal>
    </Box>
  );
}
