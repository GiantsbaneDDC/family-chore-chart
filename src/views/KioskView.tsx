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
} from '@mantine/core';
import { IconSettings, IconCheck, IconRefresh, IconTrophy } from '@tabler/icons-react';
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
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
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
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadData = useCallback(async () => {
    try {
      const kioskData = await api.getKioskData();
      setData(kioskData);
      setLastUpdate(new Date());
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
      <Center h="100vh" bg="gray.0">
        <Stack align="center" gap="md">
          <Loader size="xl" color="blue" />
          <Text c="dimmed" fw={500}>Loading chores...</Text>
        </Stack>
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
      
      // Fire confetti if completing (not uncompleting)
      if (result.completed && !wasCompleted) {
        fireSmallConfetti();
        
        // Get the assignment to check if all chores for the day are now complete
        const assignment = assignments.find(a => a.id === assignmentId);
        if (assignment) {
          const today = dayjs().day();
          const dayAssignments = assignments.filter(a => a.day_of_week === today);
          const dayCompletedCount = dayAssignments.filter(a => 
            a.id === assignmentId || completions.includes(a.id)
          ).length;
          
          // If all day's chores are now complete, big celebration
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

  // Calculate day stats
  const getDayStats = (dayIndex: number) => {
    const dayAssignments = assignments.filter(a => a.day_of_week === dayIndex);
    const completed = dayAssignments.filter(a => completions.includes(a.id)).length;
    return { total: dayAssignments.length, completed };
  };

  return (
    <Box className="kiosk-container safe-area-padding">
      {/* Desktop Header */}
      <Paper 
        p="lg" 
        mb="xl" 
        radius="xl" 
        shadow="md"
        visibleFrom="sm"
        style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0'
        }}
      >
        <Group justify="space-between" wrap="wrap" gap="md">
          <div>
            <Title 
              order={1} 
              fw={900} 
              size="h2"
              style={{ 
                background: 'linear-gradient(135deg, #1e40af, #7c3aed)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              ✨ Family Chore Chart
            </Title>
            <Text size="sm" c="dimmed" fw={500} mt={4}>
              Week of {dayjs(data.weekStart).format('MMMM D, YYYY')}
            </Text>
          </div>
          <Group gap="sm">
            <Tooltip label={`Updated ${dayjs(lastUpdate).format('h:mm:ss A')}`}>
              <ActionIcon 
                variant="light" 
                onClick={loadData} 
                size="xl" 
                radius="xl"
                color="gray"
              >
                <IconRefresh size={22} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Rewards & Achievements">
              <ActionIcon 
                component={Link} 
                to="/rewards" 
                variant="light" 
                size="xl" 
                radius="xl"
                color="yellow"
              >
                <IconTrophy size={22} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Admin Settings">
              <ActionIcon 
                component={Link} 
                to="/admin" 
                variant="light" 
                size="xl" 
                radius="xl"
                color="gray"
              >
                <IconSettings size={22} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Paper>

      {/* Mobile Compact Header */}
      <Group justify="space-between" align="center" mb="md" hiddenFrom="sm">
        <Title 
          order={2} 
          fw={900} 
          size="h4"
          style={{ 
            background: 'linear-gradient(135deg, #1e40af, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          ✨ Chores
        </Title>
        <Group gap="xs">
          <ActionIcon 
            variant="light" 
            onClick={loadData} 
            size="lg" 
            radius="xl"
            color="gray"
          >
            <IconRefresh size={18} />
          </ActionIcon>
          <ActionIcon 
            component={Link} 
            to="/rewards" 
            variant="light" 
            size="lg" 
            radius="xl"
            color="yellow"
          >
            <IconTrophy size={18} />
          </ActionIcon>
          <ActionIcon 
            component={Link} 
            to="/admin" 
            variant="light" 
            size="lg" 
            radius="xl"
            color="gray"
          >
            <IconSettings size={18} />
          </ActionIcon>
        </Group>
      </Group>

      {members.length === 0 ? (
        <Center h="50vh">
          <Paper p="xl" radius="xl" shadow="sm" className="empty-state">
            <Text size="4rem" mb="md">👨‍👩‍👧‍👦</Text>
            <Title order={3} mb="xs">No family members yet!</Title>
            <Text c="dimmed" mb="lg">
              Add family members to start tracking chores.
            </Text>
            <ActionIcon
              component={Link}
              to="/admin"
              variant="filled"
              size={60}
              radius="xl"
              color="blue"
            >
              <IconSettings size={28} />
            </ActionIcon>
          </Paper>
        </Center>
      ) : (
        <>
          {/* Mobile Quick Access Avatars - at top */}
          <Box hiddenFrom="sm" mb="md">
            <Group justify="center" gap="md">
              {members.map(member => (
                <Link key={member.id} to={`/my/${member.id}`} style={{ textDecoration: 'none' }}>
                  <Stack align="center" gap={4}>
                    <div 
                      className="quick-access-avatar"
                      style={{ background: member.color, width: 52, height: 52, fontSize: '1.6rem' }}
                    >
                      {member.avatar}
                    </div>
                    <Text size="xs" fw={600} c="dimmed" style={{ maxWidth: 60, textAlign: 'center' }} lineClamp={1}>
                      {member.name.split(' ')[0]}
                    </Text>
                  </Stack>
                </Link>
              ))}
            </Group>
          </Box>

          {/* Desktop Table View */}
          <Box className="kiosk-table-wrapper" visibleFrom="sm">
            <table className="swim-lane-table">
              <thead>
                <tr>
                  <th>
                    <Text fw={800} size="sm" c="dimmed">Family</Text>
                  </th>
                  {DAYS.map((day, i) => {
                    const stats = getDayStats(i);
                    const isToday = i === today;
                    return (
                      <th key={day}>
                        <div className={`day-header ${isToday ? 'day-header-today' : ''}`}>
                          <Text fw={800} size="lg">
                            {SHORT_DAYS[i]}
                          </Text>
                          {isToday && (
                            <Badge size="sm" variant="white" color="white" c="blue">
                              TODAY
                            </Badge>
                          )}
                          {stats.total > 0 && (
                            <Text size="xs" fw={600} style={{ opacity: 0.8 }}>
                              {stats.completed}/{stats.total}
                            </Text>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id}>
                    <td>
                      <Paper
                        className="member-cell"
                        component={Link}
                        to={`/my/${member.id}`}
                        style={{ 
                          textDecoration: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <div 
                          style={{ 
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 5,
                            background: member.color,
                            borderRadius: '4px 0 0 4px'
                          }} 
                        />
                        <Group gap="md" wrap="nowrap">
                          <Text size="2.5rem">{member.avatar}</Text>
                          <div>
                            <Text fw={800} size="md" c="dark" lineClamp={1}>
                              {member.name}
                            </Text>
                            <Text size="xs" c="blue" fw={600}>
                              View chores →
                            </Text>
                          </div>
                        </Group>
                      </Paper>
                    </td>
                    {DAYS.map((_, dayIndex) => {
                      const dayAssignments = getAssignmentsForMemberDay(member.id, dayIndex);
                      const isToday = dayIndex === today;
                      
                      return (
                        <td key={dayIndex}>
                          <div className={`swim-cell ${isToday ? 'swim-cell-today' : ''}`}>
                            <Stack gap={8}>
                              {dayAssignments.length === 0 ? (
                                <Text size="sm" c="dimmed" ta="center" py="md">—</Text>
                              ) : (
                                dayAssignments.map(assignment => {
                                  const completed = isCompleted(assignment.id);
                                  return (
                                    <div
                                      key={assignment.id}
                                      className={`chore-item ${completed ? 'chore-item-done' : ''}`}
                                      onClick={() => handleToggle(assignment.id)}
                                      role="button"
                                      tabIndex={0}
                                    >
                                      <Text size="xl">{assignment.chore_icon}</Text>
                                      <Text 
                                        size="sm" 
                                        fw={700}
                                        td={completed ? 'line-through' : undefined}
                                        style={{ opacity: completed ? 0.7 : 1 }}
                                        lineClamp={1}
                                      >
                                        {assignment.chore_title}
                                      </Text>
                                      {completed && (
                                        <div className="chore-checkmark checkmark-pop">
                                          <IconCheck size={14} color="white" stroke={3} />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </Stack>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>

          {/* Mobile Vertical View - sorted so today is first */}
          <Box className="mobile-kiosk" hiddenFrom="sm">
            <Stack gap="md">
              {[...Array(7)].map((_, i) => {
                // Start from today and wrap around
                const dayIndex = (today + i) % 7;
                const day = DAYS[dayIndex];
                const isToday = dayIndex === today;
                const dayHasChores = members.some(m => 
                  getAssignmentsForMemberDay(m.id, dayIndex).length > 0
                );
                
                if (!dayHasChores) return null;
                
                const stats = getDayStats(dayIndex);
                
                return (
                  <div 
                    key={day} 
                    className="mobile-day-section slide-up"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className={`mobile-day-header ${isToday ? 'mobile-day-header-today' : ''}`}>
                      <Group gap="sm">
                        <Text fw={800}>{day}</Text>
                        {isToday && (
                          <Badge 
                            size="sm" 
                            variant={isToday ? 'white' : 'filled'} 
                            color={isToday ? 'white' : 'blue'}
                            c={isToday ? 'blue' : undefined}
                          >
                            TODAY
                          </Badge>
                        )}
                      </Group>
                      {stats.total > 0 && (
                        <Badge 
                          variant="light" 
                          color={stats.completed === stats.total ? 'green' : 'gray'}
                          size="lg"
                        >
                          {stats.completed}/{stats.total}
                        </Badge>
                      )}
                    </div>
                    
                    {members.map(member => {
                      const memberChores = getAssignmentsForMemberDay(member.id, dayIndex);
                      if (memberChores.length === 0) return null;
                      
                      return (
                        <div key={member.id} className="mobile-member-row">
                          <div 
                            className="mobile-member-avatar"
                            style={{ background: `${member.color}20` }}
                          >
                            {member.avatar}
                          </div>
                          <div className="mobile-chores-list">
                            {memberChores.map(assignment => {
                              const completed = isCompleted(assignment.id);
                              return (
                                <div
                                  key={assignment.id}
                                  className={`mobile-chore-chip ${completed ? 'mobile-chore-chip-done' : ''}`}
                                  onClick={() => handleToggle(assignment.id)}
                                  role="button"
                                  tabIndex={0}
                                >
                                  <Text>{assignment.chore_icon}</Text>
                                  <Text fw={600}>{assignment.chore_title}</Text>
                                  {completed && (
                                    <ThemeIcon size="sm" radius="xl" color="green" ml={4}>
                                      <IconCheck size={12} stroke={3} />
                                    </ThemeIcon>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </Stack>
          </Box>

          {/* Quick Access Avatars - tablets only, hidden on large screens for no-scroll */}
          <Paper 
            p="md" 
            radius="xl" 
            mt="xl" 
            shadow="sm"
            visibleFrom="sm"
            hiddenFrom="lg"
            style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #fdf4ff 50%, #fef3c7 100%)' }}
          >
            <Text ta="center" fw={700} c="dimmed" size="sm" mb="md">
              Tap to view individual chores
            </Text>
            <div className="quick-access-grid">
              {members.map(member => (
                <Tooltip key={member.id} label={`${member.name}'s Chores`} position="bottom">
                  <Link to={`/my/${member.id}`} style={{ textDecoration: 'none' }}>
                    <div 
                      className="quick-access-avatar"
                      style={{ background: member.color }}
                    >
                      {member.avatar}
                    </div>
                  </Link>
                </Tooltip>
              ))}
            </div>
          </Paper>
        </>
      )}
    </Box>
  );
}
