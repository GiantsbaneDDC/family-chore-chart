import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Text,
  Title,
  Paper,
  ActionIcon,
  Center,
  Loader,
  Badge,
  Tooltip,
} from '@mantine/core';
import { IconSettings, IconCheck } from '@tabler/icons-react';
import confetti from 'canvas-confetti';
import dayjs from 'dayjs';
import * as api from '../api';
import type { KioskData, Assignment } from '../types';
import { DAYS, SHORT_DAYS } from '../types';

function fireSmallConfetti() {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.6 },
    colors: ['#FFD700', '#FFA500', '#4dabf7', '#69db7c'],
  });
}

function fireBigCelebration() {
  const count = 200;
  const defaults = { origin: { y: 0.7 }, zIndex: 9999 };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

export default function KioskView() {
  const [data, setData] = useState<KioskData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const kioskData = await api.getKioskData();
      setData(kioskData);
    } catch (err) {
      console.error('Failed to load kiosk data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const today = dayjs().day();

  if (loading || !data) {
    return (
      <Center h="100%" style={{ background: 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)' }}>
        <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Loader size="xl" color="blue" />
          <Text c="dimmed" fw={500}>Loading chores...</Text>
        </Box>
      </Center>
    );
  }

  const { members, assignments, completions } = data;

  const getAssignmentsForMemberDay = (memberId: number, dayOfWeek: number): Assignment[] => {
    return assignments.filter(a => a.member_id === memberId && a.day_of_week === dayOfWeek);
  };

  const isCompleted = (assignmentId: number): boolean => {
    return completions.includes(assignmentId);
  };

  const handleToggle = async (assignmentId: number) => {
    try {
      const wasCompleted = isCompleted(assignmentId);
      const result = await api.toggleCompletion(assignmentId);
      
      if (result.completed && !wasCompleted) {
        fireSmallConfetti();
        
        const assignment = assignments.find(a => a.id === assignmentId);
        if (assignment) {
          const todayDay = dayjs().day();
          const dayAssignments = assignments.filter(a => a.day_of_week === todayDay);
          const dayCompletedCount = dayAssignments.filter(a => 
            a.id === assignmentId || completions.includes(a.id)
          ).length;
          
          if (dayCompletedCount === dayAssignments.length) {
            setTimeout(fireBigCelebration, 300);
          }
        }
      }
      
      loadData();
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  const getDayStats = (dayIndex: number) => {
    const dayAssignments = assignments.filter(a => a.day_of_week === dayIndex);
    const completed = dayAssignments.filter(a => completions.includes(a.id)).length;
    return { total: dayAssignments.length, completed };
  };

  if (members.length === 0) {
    return (
      <Center h="100%">
        <Paper p="xl" radius="xl" shadow="sm">
          <Text size="4rem" mb="md" ta="center">👨‍👩‍👧‍👦</Text>
          <Title order={3} mb="xs" ta="center">No family members yet!</Title>
          <Text c="dimmed" mb="lg" ta="center">Add family members to start tracking chores.</Text>
          <Center>
            <ActionIcon component={Link} to="/admin" variant="filled" size={60} radius="xl" color="blue">
              <IconSettings size={28} />
            </ActionIcon>
          </Center>
        </Paper>
      </Center>
    );
  }

  return (
    <Box
      style={{
        height: '100%',
        display: 'grid',
        gridTemplateColumns: `80px repeat(7, 1fr)`,
        gridTemplateRows: `50px repeat(${members.length}, 1fr)`,
        gap: 2,
        background: '#e2e8f0',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Header Row */}
      <Box style={{ background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text size="xs" fw={700} c="dimmed">FAMILY</Text>
      </Box>
      
      {DAYS.map((_, i) => {
        const isToday = i === today;
        const stats = getDayStats(i);
        
        return (
          <Box
            key={i}
            style={{
              background: isToday 
                ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' 
                : '#f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: 4,
            }}
          >
            <Text size="sm" fw={800} c={isToday ? 'white' : 'dark'}>
              {SHORT_DAYS[i]}
            </Text>
            {isToday && (
              <Badge size="xs" variant="white" color="white" c="blue">TODAY</Badge>
            )}
            {stats.total > 0 && (
              <Text size="xs" fw={600} c={isToday ? 'white' : 'dimmed'} style={{ opacity: 0.8 }}>
                {stats.completed}/{stats.total}
              </Text>
            )}
          </Box>
        );
      })}

      {/* Member Rows */}
      {members.map(member => (
        <>
          {/* Member Avatar Cell */}
          <Tooltip key={`avatar-${member.id}`} label={`${member.name}'s Chores`} position="right">
            <Box
              component={Link}
              to={`/my/${member.id}`}
              style={{
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s',
                borderLeft: `4px solid ${member.color}`,
              }}
            >
              <Text style={{ fontSize: '2rem' }}>{member.avatar}</Text>
              <Text size="xs" fw={700} c="dark" ta="center" lineClamp={1} style={{ maxWidth: 70 }}>
                {member.name.split(' ')[0]}
              </Text>
            </Box>
          </Tooltip>

          {/* Chore Cells for each day */}
          {DAYS.map((_, dayIndex) => {
            const dayAssignments = getAssignmentsForMemberDay(member.id, dayIndex);
            const isToday = dayIndex === today;

            return (
              <Box
                key={`${member.id}-${dayIndex}`}
                style={{
                  background: isToday ? '#eff6ff' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  padding: 6,
                  overflow: 'hidden',
                }}
              >
                {dayAssignments.map(assignment => {
                  const completed = isCompleted(assignment.id);
                  return (
                    <Tooltip 
                      key={assignment.id} 
                      label={assignment.chore_title}
                      position="top"
                      withArrow
                    >
                      <Box
                        onClick={() => handleToggle(assignment.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 10px',
                          borderRadius: 8,
                          background: completed ? '#dcfce7' : '#f1f5f9',
                          border: completed ? '2px solid #22c55e' : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          position: 'relative',
                          opacity: completed ? 0.85 : 1,
                          width: '100%',
                        }}
                      >
                        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{assignment.chore_icon}</span>
                        <span 
                          style={{ 
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textDecoration: completed ? 'line-through' : 'none',
                          }}
                        >
                          {assignment.chore_title}
                        </span>
                        {completed && (
                          <Box
                            style={{
                              width: 18,
                              height: 18,
                              background: '#22c55e',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <IconCheck size={10} color="white" stroke={3} />
                          </Box>
                        )}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            );
          })}
        </>
      ))}
    </Box>
  );
}
