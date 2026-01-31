import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Text,
  Title,
  ActionIcon,
  Center,
  Loader,
  Badge,
  Tooltip,
  RingProgress,
} from '@mantine/core';
import { IconArrowLeft, IconCheck, IconCoin } from '@tabler/icons-react';
import confetti from 'canvas-confetti';
import dayjs from 'dayjs';
import * as api from '../api';
import type { FamilyMember, Assignment, Completion, StreakData } from '../types';
import { DAYS, SHORT_DAYS } from '../types';

function fireConfetti() {
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

function fireStars() {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.6 },
    shapes: ['star'],
    colors: ['#FFD700', '#FFA500', '#FF6347'],
  });
}

export default function KidView() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [allowanceEnabled, setAllowanceEnabled] = useState(false);
  const [allowanceBalance, setAllowanceBalance] = useState(0);
  const [coinPopup, setCoinPopup] = useState<{ amount: number; id: number } | null>(null);

  const loadData = useCallback(async () => {
    if (!memberId) return;
    try {
      const [memberData, assignmentsData, completionsData, streakData, allowanceSettings, allowanceData] = await Promise.all([
        api.getMember(parseInt(memberId)),
        api.getMemberAssignments(parseInt(memberId)),
        api.getMemberCompletions(parseInt(memberId)),
        api.getMemberStreak(parseInt(memberId)),
        api.getAllowanceSettings(),
        api.getMemberAllowance(parseInt(memberId)),
      ]);
      setMember(memberData);
      setAssignments(assignmentsData);
      setCompletions(completionsData);
      setStreak(streakData);
      setAllowanceEnabled(allowanceSettings.enabled);
      setAllowanceBalance(Number(allowanceData.balance) || 0);
    } catch (err) {
      console.error('Failed to load data:', err);
      navigate('/my');
    } finally {
      setLoading(false);
    }
  }, [memberId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const today = dayjs().day();

  const isCompleted = (assignmentId: number): boolean => {
    return completions.some(c => c.assignment_id === assignmentId);
  };

  const handleToggle = async (assignment: Assignment) => {
    try {
      const wasCompleted = isCompleted(assignment.id);
      const result = await api.toggleCompletion(assignment.id);
      
      if (result.completed && !wasCompleted) {
        fireStars();
        
        if (result.moneyEarned && result.moneyEarned > 0) {
          const earned = result.moneyEarned;
          setCoinPopup({ amount: earned, id: assignment.id });
          setAllowanceBalance(prev => prev + earned);
          setTimeout(() => setCoinPopup(null), 1500);
        }
        
        const dayAssignments = assignments.filter(a => a.day_of_week === assignment.day_of_week);
        const dayCompletions = completions.filter(c => 
          dayAssignments.some(a => a.id === c.assignment_id)
        ).length;
        
        if (dayCompletions + 1 === dayAssignments.length) {
          setTimeout(fireConfetti, 300);
        }
      }
      
      loadData();
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  if (loading || !member) {
    return (
      <Center h="100%" style={{ background: 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)' }}>
        <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Loader size="xl" color="blue" />
          <Text c="dimmed" fw={500}>Loading chores...</Text>
        </Box>
      </Center>
    );
  }

  // Calculate stats
  const totalChores = assignments.length;
  const completedCount = completions.length;
  const progressPercent = totalChores > 0 ? Math.round((completedCount / totalChores) * 100) : 100;

  // Group assignments by day
  const assignmentsByDay = DAYS.map((_, i) => 
    assignments.filter(a => a.day_of_week === i)
  );

  // Find max chores in any day for row count
  const maxChoresPerDay = Math.max(...assignmentsByDay.map(a => a.length), 1);

  return (
    <Box
      style={{
        height: '100%',
        display: 'grid',
        gridTemplateRows: '70px 1fr',
        gap: 2,
        background: '#e2e8f0',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Coin popup */}
      {coinPopup && (
        <Box
          style={{
            position: 'fixed',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
            animation: 'coinPop 1.5s ease-out forwards',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            padding: '16px 24px',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(34, 197, 94, 0.4)',
          }}
        >
          <span style={{ fontSize: 40 }}>🪙</span>
          <Text size="xl" fw={900} c="white">+${coinPopup.amount.toFixed(2)}</Text>
        </Box>
      )}

      {/* Header Row */}
      <Box
        style={{
          background: `linear-gradient(135deg, ${member.color}, ${member.color}dd)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          gap: 16,
        }}
      >
        {/* Back button + Avatar + Name */}
        <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ActionIcon 
            component={Link} 
            to="/" 
            variant="white"
            size={40}
            radius="xl"
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Text style={{ fontSize: '2.5rem' }}>{member.avatar}</Text>
          <Title order={2} c="white" fw={800}>{member.name}'s Chores</Title>
        </Box>

        {/* Stats */}
        <Box style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Streak */}
          {streak && streak.streak > 0 && (
            <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '1.8rem' }}>🔥</span>
              <Box>
                <Text size="lg" fw={900} c="white" style={{ lineHeight: 1 }}>{streak.streak}</Text>
                <Text size="xs" c="white" style={{ opacity: 0.8 }}>week streak</Text>
              </Box>
            </Box>
          )}

          {/* Balance */}
          {allowanceEnabled && (
            <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '1.8rem' }}>💰</span>
              <Box>
                <Text size="lg" fw={900} c="white" style={{ lineHeight: 1 }}>${allowanceBalance.toFixed(2)}</Text>
                <Text size="xs" c="white" style={{ opacity: 0.8 }}>saved</Text>
              </Box>
            </Box>
          )}

          {/* Progress */}
          <RingProgress
            size={55}
            thickness={6}
            roundCaps
            sections={[{ value: progressPercent, color: 'white' }]}
            label={
              <Center>
                <Text size="sm" fw={800} c="white">{progressPercent}%</Text>
              </Center>
            }
          />
        </Box>
      </Box>

      {/* Main Grid - Days as columns */}
      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridTemplateRows: `40px repeat(${maxChoresPerDay}, 1fr)`,
          gap: 2,
          background: '#e2e8f0',
        }}
      >
        {/* Day Headers */}
        {DAYS.map((_, dayIndex) => {
          const isToday = dayIndex === today;
          const dayAssignments = assignmentsByDay[dayIndex];
          const dayCompleted = dayAssignments.filter(a => isCompleted(a.id)).length;
          
          return (
            <Box
              key={`header-${dayIndex}`}
              style={{
                background: isToday 
                  ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' 
                  : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text size="sm" fw={800} c={isToday ? 'white' : 'dark'}>
                {SHORT_DAYS[dayIndex]}
              </Text>
              {isToday && <Badge size="xs" variant="white" color="white" c="blue">TODAY</Badge>}
              {dayAssignments.length > 0 && (
                <Text size="xs" fw={600} c={isToday ? 'white' : 'dimmed'}>
                  {dayCompleted}/{dayAssignments.length}
                </Text>
              )}
            </Box>
          );
        })}

        {/* Chore Cells - Fill grid by row */}
        {Array.from({ length: maxChoresPerDay }).map((_, rowIndex) => (
          DAYS.map((_, dayIndex) => {
            const dayAssignments = assignmentsByDay[dayIndex];
            const assignment = dayAssignments[rowIndex];
            const isToday = dayIndex === today;
            
            if (!assignment) {
              return (
                <Box
                  key={`empty-${dayIndex}-${rowIndex}`}
                  style={{ background: isToday ? '#eff6ff' : '#ffffff' }}
                />
              );
            }
            
            const completed = isCompleted(assignment.id);
            const hasMoney = allowanceEnabled && assignment.chore_money_value && assignment.chore_money_value > 0;
            
            return (
              <Tooltip 
                key={assignment.id}
                label={
                  <Box>
                    <Text fw={600}>{assignment.chore_title}</Text>
                    {hasMoney && <Text size="sm">💰 ${Number(assignment.chore_money_value).toFixed(2)}</Text>}
                  </Box>
                }
                position="top"
              >
                <Box
                  onClick={() => handleToggle(assignment)}
                  style={{
                    background: completed 
                      ? '#dcfce7' 
                      : isToday 
                        ? '#eff6ff' 
                        : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    position: 'relative',
                    border: completed ? '2px solid #22c55e' : '2px solid transparent',
                  }}
                >
                  <span style={{ fontSize: '1.8rem' }}>{assignment.chore_icon}</span>
                  <Text 
                    size="xs" 
                    fw={600} 
                    ta="center"
                    style={{ 
                      maxWidth: '90%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textDecoration: completed ? 'line-through' : 'none',
                      opacity: completed ? 0.7 : 1,
                    }}
                  >
                    {assignment.chore_title}
                  </Text>
                  {hasMoney && !completed && (
                    <Badge size="xs" color="green" variant="light">
                      <IconCoin size={10} style={{ marginRight: 2 }} />
                      ${Number(assignment.chore_money_value).toFixed(2)}
                    </Badge>
                  )}
                  {completed && (
                    <Box
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 20,
                        height: 20,
                        background: '#22c55e',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconCheck size={12} color="white" stroke={3} />
                    </Box>
                  )}
                </Box>
              </Tooltip>
            );
          })
        ))}
      </Box>
    </Box>
  );
}
