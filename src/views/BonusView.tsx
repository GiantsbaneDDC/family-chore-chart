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
} from '@mantine/core';
import { IconStar } from '@tabler/icons-react';
import * as api from '../api';
import type { ExtraTask, FamilyMember } from '../types';

export default function BonusView() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ExtraTask[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<ExtraTask | null>(null);
  const [claiming, setClaiming] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [tasksData, membersData] = await Promise.all([
        api.getAvailableExtraTasks(),
        api.getMembers(),
      ]);
      setTasks(tasksData);
      setMembers(membersData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClaim = async (memberId: number) => {
    if (!selectedTask || claiming) return;
    
    setClaiming(true);
    try {
      await api.claimExtraTask(selectedTask.id, memberId);
      setSelectedTask(null);
      // Redirect to main page to see the claimed task
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
      <Center h="100%" style={{ background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)' }}>
        <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Loader size="xl" color="orange" />
          <Text c="dimmed" fw={500}>Loading bonus tasks...</Text>
        </Box>
      </Center>
    );
  }

  return (
    <Box
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        style={{
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <IconStar size={32} color="white" />
        <Title order={2} c="white" fw={800}>Bonus Tasks</Title>
        <Text c="white" style={{ opacity: 0.9, marginLeft: 'auto' }}>
          Pick a task to earn extra stars!
        </Text>
      </Box>

      {/* Tasks Grid */}
      <Box style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        {tasks.length === 0 ? (
          <Center h="100%">
            <Box style={{ textAlign: 'center' }}>
              <Text size="4rem" mb="md">🎉</Text>
              <Title order={3} mb="xs">All tasks claimed!</Title>
              <Text c="dimmed">Check back later for more bonus tasks.</Text>
            </Box>
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="lg">
            {tasks.map(task => (
              <Box
                key={task.id}
                onClick={() => setSelectedTask(task)}
                style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '2px solid #fed7aa',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(249,115,22,0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                }}
              >
                <Text style={{ fontSize: '3rem' }}>{task.icon}</Text>
                <Text fw={700} ta="center" lineClamp={2}>{task.title}</Text>
                <Badge 
                  size="lg" 
                  color="orange" 
                  variant="light"
                  leftSection={<IconStar size={14} />}
                >
                  {task.stars} {task.stars === 1 ? 'star' : 'stars'}
                </Badge>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Box>

      {/* Member Selection Modal */}
      <Modal
        opened={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        title={<Text fw={700}>Who's doing this task?</Text>}
        centered
        size="lg"
      >
        {selectedTask && (
          <Box>
            <Box
              style={{
                background: '#fff7ed',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <Text style={{ fontSize: '2.5rem' }}>{selectedTask.icon}</Text>
              <Box>
                <Text fw={700} size="lg">{selectedTask.title}</Text>
                <Badge color="orange" variant="light" leftSection={<IconStar size={12} />}>
                  {selectedTask.stars} {selectedTask.stars === 1 ? 'star' : 'stars'}
                </Badge>
              </Box>
            </Box>

            <Text fw={600} mb="md">Select who will do this task:</Text>
            
            <SimpleGrid cols={3} spacing="md">
              {members.map(member => (
                <Box
                  key={member.id}
                  onClick={() => handleClaim(member.id)}
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    cursor: claiming ? 'wait' : 'pointer',
                    transition: 'all 0.2s',
                    border: `2px solid ${member.color}40`,
                    opacity: claiming ? 0.6 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!claiming) {
                      e.currentTarget.style.borderColor = member.color;
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = `${member.color}40`;
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <Text style={{ fontSize: '2.5rem' }}>{member.avatar}</Text>
                  <Text fw={700} ta="center">{member.name}</Text>
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        )}
      </Modal>
    </Box>
  );
}
