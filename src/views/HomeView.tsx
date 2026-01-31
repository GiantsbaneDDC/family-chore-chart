import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Text,
  Title,
  Paper,
  TextInput,
  ActionIcon,
  Center,
  Loader,
  Group,
  Stack,
  Badge,
  ScrollArea,
  Transition,
} from '@mantine/core';
import { 
  IconSend, 
  IconRobot,
  IconUser,
  IconChecklist,
  IconStar,
  IconChefHat,
  IconSun,
  IconMoon,
  IconSunrise,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import * as api from '../api';

// Inject CSS animations
const styleId = 'assistant-animations';
if (!document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(124, 58, 237, 0.4), 0 0 40px rgba(124, 58, 237, 0.2); }
      50% { box-shadow: 0 0 30px rgba(124, 58, 237, 0.6), 0 0 60px rgba(124, 58, 237, 0.3); }
    }
    @keyframes thinkingPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
    @keyframes wave {
      0% { transform: rotate(0deg); }
      10% { transform: rotate(14deg); }
      20% { transform: rotate(-8deg); }
      30% { transform: rotate(14deg); }
      40% { transform: rotate(-4deg); }
      50% { transform: rotate(10deg); }
      60%, 100% { transform: rotate(0deg); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .assistant-idle { animation: pulseGlow 3s ease-in-out infinite; }
    .assistant-thinking { animation: bounce 0.6s ease-in-out infinite; }
    .thinking-ring { animation: spin 1.5s linear infinite; }
    .status-bounce { animation: bounce 0.4s ease-in-out infinite; }
    .wave-hand { animation: wave 2s ease-in-out infinite; transform-origin: 70% 70%; }
  `;
  document.head.appendChild(style);
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DashboardStats {
  todayChoresTotal: number;
  todayChoresComplete: number;
  todayDinner: string | null;
  todayDinnerIcon: string | null;
  totalStars: number;
  topMember: { name: string; avatar: string; stars: number } | null;
}

function getGreeting(): { text: string; icon: typeof IconSun } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: IconSunrise };
  if (hour < 17) return { text: 'Good afternoon', icon: IconSun };
  return { text: 'Good evening', icon: IconMoon };
}

function getTimeBasedMessage(): string {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 6;
  
  if (hour < 9) return "Early bird! Ready to tackle the day?";
  if (hour < 12) return isWeekend ? "Enjoy your weekend!" : "Let's make today productive!";
  if (hour < 14) return "Hope everyone's having a good lunch!";
  if (hour < 17) return "Afternoon check-in – how's everyone doing?";
  if (hour < 19) return "Almost dinner time! Check today's meal plan.";
  if (hour < 21) return "Winding down for the evening.";
  return "Getting late! Time to finish up those chores.";
}

export default function HomeView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);

  const greeting = getGreeting();
  
  // Determine assistant state
  const assistantState = sending ? 'thinking' : isListening ? 'listening' : messages.length > 0 ? 'active' : 'idle';
  const GreetingIcon = greeting.icon;

  const loadStats = useCallback(async () => {
    try {
      const [kioskData, dinnerData, leaderboard] = await Promise.all([
        api.getKioskData(),
        api.getDinnerPlan(),
        api.getStarLeaderboard(),
      ]);

      const today = dayjs().day();
      const todayAssignments = kioskData.assignments.filter(a => a.day_of_week === today);
      const todayComplete = todayAssignments.filter(a => kioskData.completions.includes(a.id)).length;
      
      const todayPlan = dinnerData.plans.find(p => p.day_of_week === today);
      
      const totalStars = leaderboard.reduce((sum, m) => sum + (m.total_stars || 0), 0);
      const topMember = leaderboard.length > 0 && leaderboard[0].total_stars ? {
        name: leaderboard[0].name,
        avatar: leaderboard[0].avatar,
        stars: leaderboard[0].total_stars,
      } : null;

      setStats({
        todayChoresTotal: todayAssignments.length,
        todayChoresComplete: todayComplete,
        todayDinner: todayPlan?.recipe_title || null,
        todayDinnerIcon: todayPlan?.recipe_icon || null,
        totalStars,
        topMember,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);
    setShowWelcome(false);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || "I'm here to help! Try asking about chores, dinner plans, or stars.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I couldn't process that. Try again in a moment!",
        timestamp: new Date(),
      }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  if (loading) {
    return (
      <Center h="100%">
        <Loader size="xl" color="violet" />
      </Center>
    );
  }

  return (
    <Box style={{ height: '100%', display: 'flex', gap: 16, overflow: 'hidden' }}>
      {/* Left Side - Dashboard */}
      <Box style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
        {/* Greeting Card */}
        <Paper
          p="xl"
          radius="xl"
          shadow="md"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)',
          }}
        >
          <Group gap="md" mb="sm">
            <GreetingIcon size={32} color="white" />
            <Box>
              <Text c="white" size="sm" style={{ opacity: 0.8 }}>
                {dayjs().format('dddd, MMMM D')}
              </Text>
              <Title order={2} c="white" fw={800}>
                {greeting.text}!
              </Title>
            </Box>
          </Group>
          <Text c="white" size="lg" style={{ opacity: 0.9 }}>
            {getTimeBasedMessage()}
          </Text>
        </Paper>

        {/* Stats Cards */}
        <Paper p="lg" radius="xl" shadow="sm">
          <Group gap="sm" mb="md">
            <IconChecklist size={24} color="#3b82f6" />
            <Text fw={700} size="lg">Today's Chores</Text>
          </Group>
          <Group justify="space-between" align="flex-end">
            <Box>
              <Text size="3rem" fw={900} c="blue" style={{ lineHeight: 1 }}>
                {stats?.todayChoresComplete || 0}
              </Text>
              <Text c="dimmed">of {stats?.todayChoresTotal || 0} complete</Text>
            </Box>
            {stats && stats.todayChoresTotal > 0 && (
              <Badge 
                size="xl" 
                color={stats.todayChoresComplete === stats.todayChoresTotal ? 'green' : 'blue'}
                variant="light"
              >
                {Math.round((stats.todayChoresComplete / stats.todayChoresTotal) * 100)}%
              </Badge>
            )}
          </Group>
        </Paper>

        <Paper p="lg" radius="xl" shadow="sm">
          <Group gap="sm" mb="md">
            <IconChefHat size={24} color="#ea580c" />
            <Text fw={700} size="lg">Tonight's Dinner</Text>
          </Group>
          {stats?.todayDinner ? (
            <Group gap="md">
              <Text style={{ fontSize: '2.5rem' }}>{stats.todayDinnerIcon}</Text>
              <Text size="xl" fw={600}>{stats.todayDinner}</Text>
            </Group>
          ) : (
            <Text c="dimmed">No dinner planned yet</Text>
          )}
        </Paper>

        <Paper p="lg" radius="xl" shadow="sm">
          <Group gap="sm" mb="md">
            <IconStar size={24} color="#f59e0b" fill="#f59e0b" />
            <Text fw={700} size="lg">Star Leader</Text>
          </Group>
          {stats?.topMember ? (
            <Group gap="md">
              <Text style={{ fontSize: '2rem' }}>{stats.topMember.avatar}</Text>
              <Box>
                <Text size="lg" fw={700}>{stats.topMember.name}</Text>
                <Badge color="yellow" variant="light" size="lg">
                  ⭐ {stats.topMember.stars} stars
                </Badge>
              </Box>
            </Group>
          ) : (
            <Text c="dimmed">No stars earned yet</Text>
          )}
        </Paper>
      </Box>

      {/* Right Side - Chat Interface */}
      <Paper 
        radius="xl" 
        shadow="sm" 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          border: '2px solid #e9ecef',
        }}
      >
        {/* Chat Header with Animated Avatar */}
        <Box
          p="lg"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            borderRadius: '22px 22px 0 0',
            position: 'relative',
            overflow: 'visible',
          }}
        >
          <Group gap="lg" align="center">
            {/* Animated Assistant Head */}
            <Box
              style={{
                position: 'relative',
                width: 70,
                height: 70,
              }}
            >
              {/* Glow ring */}
              <Box
                className={assistantState === 'thinking' ? 'thinking-ring' : undefined}
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  background: assistantState === 'thinking' 
                    ? 'conic-gradient(from 0deg, #a78bfa, #7c3aed, #5b21b6, #7c3aed, #a78bfa)'
                    : 'transparent',
                  opacity: assistantState === 'thinking' ? 1 : 0,
                  transition: 'opacity 0.3s',
                }}
              />
              
              {/* Main head */}
              <Box
                className={assistantState === 'idle' ? 'assistant-idle' : assistantState === 'thinking' ? 'assistant-thinking' : undefined}
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: '50%',
                  background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.8)',
                }}
              >
                {/* Face */}
                <Box style={{ position: 'relative', width: 50, height: 50 }}>
                  {/* Eyes */}
                  <Box
                    style={{
                      position: 'absolute',
                      top: 14,
                      left: 8,
                      width: 12,
                      height: assistantState === 'thinking' ? 4 : 12,
                      borderRadius: assistantState === 'thinking' ? 2 : '50%',
                      background: '#7c3aed',
                      transition: 'all 0.2s',
                    }}
                  />
                  <Box
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 8,
                      width: 12,
                      height: assistantState === 'thinking' ? 4 : 12,
                      borderRadius: assistantState === 'thinking' ? 2 : '50%',
                      background: '#7c3aed',
                      transition: 'all 0.2s',
                    }}
                  />
                  {/* Eye shine */}
                  {assistantState !== 'thinking' && (
                    <>
                      <Box style={{ position: 'absolute', top: 16, left: 12, width: 4, height: 4, borderRadius: '50%', background: 'white' }} />
                      <Box style={{ position: 'absolute', top: 16, right: 12, width: 4, height: 4, borderRadius: '50%', background: 'white' }} />
                    </>
                  )}
                  {/* Mouth */}
                  <Box
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: assistantState === 'thinking' ? 8 : 20,
                      height: assistantState === 'thinking' ? 8 : 10,
                      borderRadius: assistantState === 'thinking' ? '50%' : '0 0 10px 10px',
                      background: '#7c3aed',
                      transition: 'all 0.2s',
                    }}
                  />
                </Box>
              </Box>
              
              {/* Status indicator */}
              <Box
                className={assistantState === 'thinking' ? 'status-bounce' : undefined}
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: assistantState === 'thinking' ? '#f59e0b' : '#22c55e',
                  border: '3px solid white',
                  boxShadow: `0 0 8px ${assistantState === 'thinking' ? '#f59e0b' : '#22c55e'}`,
                }}
              />
            </Box>
            
            <Box style={{ flex: 1 }}>
              <Title order={3} c="white">Family Assistant</Title>
              <Text c="white" size="sm" style={{ opacity: 0.9 }}>
                {assistantState === 'thinking' 
                  ? "🤔 Thinking..." 
                  : assistantState === 'active'
                    ? "💬 Here to help!"
                    : "Ask me anything about chores, meals, or stars!"}
              </Text>
            </Box>
            
            {/* Waving hand when idle and no messages */}
            {messages.length === 0 && !sending && (
              <Text 
                className="wave-hand"
                style={{ fontSize: '2rem' }}
              >
                👋
              </Text>
            )}
          </Group>
        </Box>

        {/* Chat Messages */}
        <ScrollArea 
          style={{ flex: 1, background: '#f8f9fa' }} 
          p="lg"
          viewportRef={scrollRef}
        >
          <Transition mounted={showWelcome && messages.length === 0} transition="fade" duration={300}>
            {(styles) => (
              <Center style={{ ...styles, height: '100%', minHeight: 300 }}>
                <Stack align="center" gap="md">
                  <Box
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconRobot size={50} color="white" />
                  </Box>
                  <Title order={2} ta="center">Hi! I'm your Family Assistant</Title>
                  <Text c="dimmed" ta="center" size="lg" maw={400}>
                    Ask me about today's chores, what's for dinner, 
                    or how many stars everyone has earned!
                  </Text>
                  <Group gap="sm" mt="md">
                    {['Who has the most stars?', "What's for dinner?", 'How are the chores going?'].map(q => (
                      <Badge 
                        key={q}
                        size="lg" 
                        variant="light" 
                        color="violet"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setInput(q);
                          inputRef.current?.focus();
                        }}
                      >
                        {q}
                      </Badge>
                    ))}
                  </Group>
                </Stack>
              </Center>
            )}
          </Transition>

          <Stack gap="md">
            {messages.map(msg => (
              <Box
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Paper
                  p="md"
                  radius="lg"
                  shadow="xs"
                  maw="75%"
                  style={{
                    background: msg.role === 'user' 
                      ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' 
                      : 'white',
                    borderBottomRightRadius: msg.role === 'user' ? 4 : undefined,
                    borderBottomLeftRadius: msg.role === 'assistant' ? 4 : undefined,
                  }}
                >
                  <Group gap="xs" mb={4}>
                    {msg.role === 'assistant' ? (
                      <IconRobot size={16} color="#7c3aed" />
                    ) : (
                      <IconUser size={16} color="white" />
                    )}
                    <Text size="xs" c={msg.role === 'user' ? 'white' : 'dimmed'} style={{ opacity: 0.7 }}>
                      {msg.role === 'user' ? 'You' : 'Assistant'} · {dayjs(msg.timestamp).format('h:mm A')}
                    </Text>
                  </Group>
                  <Text 
                    c={msg.role === 'user' ? 'white' : 'dark'}
                    size="md"
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {msg.content}
                  </Text>
                </Paper>
              </Box>
            ))}
            
            {sending && (
              <Box style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Paper p="md" radius="lg" shadow="xs">
                  <Group gap="xs">
                    <Loader size="xs" color="violet" />
                    <Text size="sm" c="dimmed">Thinking...</Text>
                  </Group>
                </Paper>
              </Box>
            )}
          </Stack>
        </ScrollArea>

        {/* Chat Input */}
        <Box p="lg" style={{ borderTop: '2px solid #e9ecef', background: 'white' }}>
          <Group gap="sm">
            <TextInput
              ref={inputRef}
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={sending}
              size="lg"
              radius="xl"
              style={{ flex: 1 }}
              styles={{
                input: {
                  border: '2px solid #e9ecef',
                  '&:focus': {
                    borderColor: '#7c3aed',
                  },
                },
              }}
            />
            <ActionIcon 
              size={50} 
              radius="xl" 
              color="violet"
              variant="filled"
              onClick={sendMessage}
              disabled={!input.trim() || sending}
            >
              <IconSend size={24} />
            </ActionIcon>
          </Group>
        </Box>
      </Paper>
    </Box>
  );
}
