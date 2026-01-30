import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Text,
  Title,
  Paper,
  Group,
  Stack,
  ActionIcon,
  Center,
  Loader,
  Badge,
  Button,
  Progress,
  ThemeIcon,
  RingProgress,
  Tooltip,
} from '@mantine/core';
import { IconArrowLeft, IconCheck, IconStar, IconTrophy, IconSparkles, IconCoin } from '@tabler/icons-react';
import confetti from 'canvas-confetti';
import dayjs from 'dayjs';
import * as api from '../api';
import type { FamilyMember, Assignment, Completion, StreakData } from '../types';
import { DAYS } from '../types';

// Money Jar Component
function MoneyJar({ balance, max, color }: { balance: number; max: number; color: string }) {
  const fillPercent = Math.min(100, Math.max(0, (balance / max) * 100));
  
  return (
    <Tooltip label={`$${balance.toFixed(2)} saved`}>
      <div style={{ 
        position: 'relative', 
        width: 70, 
        height: 90,
        cursor: 'pointer'
      }}>
        {/* Jar SVG */}
        <svg viewBox="0 0 70 90" style={{ width: '100%', height: '100%' }}>
          {/* Jar lid */}
          <rect x="15" y="0" width="40" height="10" rx="3" fill="#94a3b8" />
          <rect x="20" y="8" width="30" height="5" rx="2" fill="#64748b" />
          
          {/* Jar body outline */}
          <path 
            d="M 12 15 
               Q 5 20 5 35 
               L 5 75 
               Q 5 85 15 85 
               L 55 85 
               Q 65 85 65 75 
               L 65 35 
               Q 65 20 58 15 
               Z"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="3"
          />
          
          {/* Jar fill (money level) */}
          <defs>
            <clipPath id="jarClip">
              <path 
                d="M 12 15 
                   Q 5 20 5 35 
                   L 5 75 
                   Q 5 85 15 85 
                   L 55 85 
                   Q 65 85 65 75 
                   L 65 35 
                   Q 65 20 58 15 
                   Z"
              />
            </clipPath>
          </defs>
          
          <rect 
            x="5" 
            y={85 - (70 * fillPercent / 100)} 
            width="60" 
            height={70 * fillPercent / 100}
            fill={color}
            opacity="0.6"
            clipPath="url(#jarClip)"
            style={{ transition: 'all 0.5s ease' }}
          />
          
          {/* Coins at bottom */}
          {fillPercent > 10 && (
            <>
              <circle cx="20" cy="78" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
              <circle cx="35" cy="80" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
              <circle cx="50" cy="78" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
            </>
          )}
          {fillPercent > 30 && (
            <>
              <circle cx="25" cy="70" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
              <circle cx="45" cy="72" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
            </>
          )}
          {fillPercent > 60 && (
            <>
              <circle cx="30" cy="62" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
              <circle cx="42" cy="60" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
            </>
          )}
          
          {/* Shine effect */}
          <ellipse cx="18" cy="45" rx="3" ry="15" fill="white" opacity="0.3" />
        </svg>
        
        {/* Amount label */}
        <div style={{
          position: 'absolute',
          bottom: -20,
          left: '50%',
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap'
        }}>
          <Text fw={700} size="sm" c="green">${balance.toFixed(2)}</Text>
        </div>
      </div>
    </Tooltip>
  );
}

// Coin animation for earning money
function CoinPopup({ amount, onComplete }: { amount: number; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <div style={{
      position: 'fixed',
      top: '40%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 9999,
      animation: 'coinPop 1.5s ease-out forwards',
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
        padding: '16px 24px',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(34, 197, 94, 0.4)',
      }}>
        <span style={{ fontSize: 40 }}>🪙</span>
        <Text size="xl" fw={900} c="white">+${amount.toFixed(2)}</Text>
      </div>
    </div>
  );
}

function fireConfetti() {
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
  const [celebratingId, setCelebratingId] = useState<number | null>(null);
  
  // Allowance state
  const [allowanceEnabled, setAllowanceEnabled] = useState(false);
  const [allowanceBalance, setAllowanceBalance] = useState(0);
  const [jarMax, setJarMax] = useState(10);
  const [coinPopup, setCoinPopup] = useState<number | null>(null);

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
      setJarMax(Number(allowanceSettings.jarMax) || 10);
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
        setCelebratingId(assignment.id);
        fireStars();
        
        // Show coin popup if money was earned
        if (result.moneyEarned && result.moneyEarned > 0) {
          const earned = result.moneyEarned;
          setCoinPopup(earned);
          setAllowanceBalance(prev => prev + earned);
        }
        
        // Check if all chores for the day are now complete
        const dayAssignments = assignments.filter(a => a.day_of_week === assignment.day_of_week);
        const dayCompletions = completions.filter(c => 
          dayAssignments.some(a => a.id === c.assignment_id)
        ).length;
        
        if (dayCompletions + 1 === dayAssignments.length) {
          setTimeout(fireConfetti, 300);
        }
        
        setTimeout(() => setCelebratingId(null), 800);
      }
      
      loadData();
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  if (loading || !member) {
    return (
      <Center h="100vh" bg="gray.0">
        <Stack align="center" gap="md">
          <Loader size="xl" color="blue" />
          <Text c="dimmed" fw={500}>Loading your chores...</Text>
        </Stack>
      </Center>
    );
  }

  const assignmentsByDay = DAYS.map((_, i) => 
    assignments.filter(a => a.day_of_week === i)
  );

  const totalChores = assignments.length;
  const completedCount = completions.length;
  const progressPercent = totalChores > 0 ? Math.round((completedCount / totalChores) * 100) : 0;
  const allDone = progressPercent === 100;

  // Get today's stats
  const todayAssignments = assignmentsByDay[today];
  const todayCompleted = todayAssignments.filter(a => isCompleted(a.id)).length;
  const todayPercent = todayAssignments.length > 0 
    ? Math.round((todayCompleted / todayAssignments.length) * 100) 
    : 100;

  return (
    <Box 
      className="kid-container safe-area-padding"
      style={{ 
        background: `linear-gradient(180deg, ${member.color}15 0%, ${member.color}05 30%, white 100%)` 
      }}
    >
      {/* Coin popup animation */}
      {coinPopup !== null && (
        <CoinPopup amount={coinPopup} onComplete={() => setCoinPopup(null)} />
      )}
      
      {/* Back button - floating */}
      <ActionIcon 
        component={Link} 
        to="/" 
        variant="white"
        size={50}
        radius="xl"
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}
      >
        <IconArrowLeft size={24} />
      </ActionIcon>

      {/* Header */}
      <div className="kid-header">
        <Group justify="center" gap="xl" wrap="nowrap" align="flex-start">
          <div style={{ textAlign: 'center' }}>
            <div 
              className={`kid-avatar ${celebratingId ? 'wiggle' : ''}`}
            >
              {member.avatar}
            </div>
            <Title order={1} fw={900} size="h2" mb="xs">
              {member.name}'s Chores
            </Title>
          </div>
          
          {/* Money Jar */}
          {allowanceEnabled && (
            <div style={{ marginTop: 20 }}>
              <MoneyJar balance={allowanceBalance} max={jarMax} color={member.color} />
            </div>
          )}
        </Group>
        
        {/* Streak Badge */}
        {streak && streak.streak > 0 && (
          <div className="streak-badge">
            <span className="flame-dance" style={{ fontSize: 28 }}>🔥</span>
            <div>
              <div className="streak-number">{streak.streak}</div>
              <div className="streak-label">Week Streak!</div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Section */}
      <Paper 
        className={`progress-card ${allDone ? 'progress-complete' : ''}`}
        mb="xl"
      >
        <Group justify="space-between" align="flex-start" mb="md">
          <div>
            <Text fw={700} size="lg" mb={4}>
              {allDone ? '🎉 All Done This Week!' : "This Week's Progress"}
            </Text>
            <Text size="sm" c="dimmed">
              {completedCount} of {totalChores} chores completed
            </Text>
          </div>
          
          <RingProgress
            size={80}
            thickness={8}
            roundCaps
            sections={[{ value: progressPercent, color: allDone ? 'green' : member.color }]}
            label={
              <Center>
                {allDone ? (
                  <ThemeIcon color="green" variant="light" radius="xl" size="xl">
                    <IconTrophy size={24} />
                  </ThemeIcon>
                ) : (
                  <Text fw={800} size="lg">{progressPercent}%</Text>
                )}
              </Center>
            }
          />
        </Group>

        <Progress 
          value={progressPercent} 
          size="lg" 
          radius="xl"
          color={allDone ? 'green' : member.color}
          animated={!allDone && progressPercent > 0}
          striped={!allDone && progressPercent > 0}
        />

        {allDone && (
          <Group justify="center" mt="lg">
            <Badge 
              size="xl" 
              variant="filled" 
              color="green"
              leftSection={<IconSparkles size={16} />}
              style={{ padding: '12px 20px', fontSize: 16 }}
            >
              Amazing Job! 🌟
            </Badge>
          </Group>
        )}
      </Paper>

      {/* Today's Quick Stats */}
      {todayAssignments.length > 0 && (
        <Paper 
          p="lg" 
          radius="xl" 
          mb="xl"
          style={{ 
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white'
          }}
        >
          <Group justify="space-between" align="center">
            <div>
              <Text fw={600} size="sm" style={{ opacity: 0.9 }}>TODAY</Text>
              <Text fw={800} size="xl">
                {todayCompleted === todayAssignments.length 
                  ? "All done for today! 🎊" 
                  : `${todayAssignments.length - todayCompleted} chore${todayAssignments.length - todayCompleted !== 1 ? 's' : ''} left`
                }
              </Text>
            </div>
            <RingProgress
              size={70}
              thickness={6}
              roundCaps
              sections={[{ value: todayPercent, color: 'white' }]}
              label={
                <Center>
                  <Text fw={800} size="md" c="white" style={{ lineHeight: 1 }}>{todayPercent}%</Text>
                </Center>
              }
            />
          </Group>
        </Paper>
      )}

      {/* Chores by Day - sorted so today is first */}
      <Stack gap="lg">
        {[...Array(7)].map((_, i) => {
          // Start from today and wrap around
          const dayIndex = (today + i) % 7;
          const day = DAYS[dayIndex];
          const dayAssignments = assignmentsByDay[dayIndex];
          if (dayAssignments.length === 0) return null;
          
          const isToday = dayIndex === today;
          const dayCompletedCount = dayAssignments.filter(a => isCompleted(a.id)).length;
          const dayComplete = dayCompletedCount === dayAssignments.length;
          
          return (
            <div 
              key={day} 
              className={`kid-day-section slide-up ${isToday ? 'kid-day-section-today' : ''}`}
              style={{ 
                animationDelay: `${dayIndex * 50}ms`,
                borderColor: isToday ? member.color : undefined
              }}
            >
              <div className={`kid-day-header ${isToday ? 'kid-day-today' : ''}`}>
                <Group gap="sm">
                  <Text fw={800} size="lg">{day}</Text>
                  {isToday && (
                    <Badge variant="white" color="white" c="blue" size="md">
                      TODAY
                    </Badge>
                  )}
                </Group>
                <Group gap="xs">
                  {dayComplete ? (
                    <Badge 
                      size="lg" 
                      color="green" 
                      variant={isToday ? 'white' : 'filled'}
                      leftSection={<IconCheck size={14} />}
                    >
                      Done!
                    </Badge>
                  ) : (
                    <Badge 
                      size="lg" 
                      color={isToday ? 'white' : 'gray'}
                      variant="light"
                      c={isToday ? 'white' : undefined}
                    >
                      {dayCompletedCount}/{dayAssignments.length}
                    </Badge>
                  )}
                </Group>
              </div>
              
              {dayAssignments.map(assignment => {
                const completed = isCompleted(assignment.id);
                const isCelebrating = celebratingId === assignment.id;
                const hasMoney = allowanceEnabled && assignment.chore_money_value && assignment.chore_money_value > 0;
                
                return (
                  <button
                    key={assignment.id}
                    className={`kid-chore-btn ${completed ? 'kid-chore-btn-done' : ''} ${isCelebrating ? 'bounce' : ''}`}
                    onClick={() => handleToggle(assignment)}
                  >
                    <span className="kid-chore-icon">
                      {assignment.chore_icon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span className={`kid-chore-title ${completed ? 'kid-chore-title-done' : ''}`}>
                        {assignment.chore_title}
                      </span>
                      <Group gap="xs">
                        {assignment.chore_points && assignment.chore_points > 1 && (
                          <Text size="sm" c="dimmed" fw={600}>
                            <IconStar size={14} style={{ verticalAlign: 'middle' }} /> {assignment.chore_points} pts
                          </Text>
                        )}
                        {hasMoney && (
                          <Text size="sm" c="green" fw={700}>
                            <IconCoin size={14} style={{ verticalAlign: 'middle' }} /> ${Number(assignment.chore_money_value).toFixed(2)}
                          </Text>
                        )}
                      </Group>
                    </div>
                    <div className={`kid-chore-check ${completed ? 'kid-chore-check-done' : ''}`}>
                      {completed && (
                        <IconCheck size={24} color="white" stroke={3} className="checkmark-pop" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </Stack>

      {assignments.length === 0 && (
        <Center py={80}>
          <Paper p="xl" radius="xl" shadow="sm" className="empty-state">
            <Text size="5rem" mb="md">🎮</Text>
            <Title order={3} mb="xs">No chores yet!</Title>
            <Text c="dimmed" maw={280}>
              Ask your parents to add some chores for you.
            </Text>
          </Paper>
        </Center>
      )}

      {/* Back button at bottom */}
      <Center mt="xl" pb="xl">
        <Button
          component={Link}
          to="/"
          variant="light"
          size="lg"
          radius="xl"
          leftSection={<IconArrowLeft size={20} />}
          style={{ paddingLeft: 20, paddingRight: 28 }}
        >
          Back to Family View
        </Button>
      </Center>
    </Box>
  );
}
