import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Markdown from 'react-markdown';
import {
  Box,
  Text,
  Title,
  Paper,
  ActionIcon,
  Center,
  Loader,
  Group,
  Stack,
  Badge,
  Progress,
  RingProgress,
  SimpleGrid,
  Tooltip,
  ScrollArea,
  TextInput,
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
  IconMicrophone,
  IconPlayerStop,
  IconCalendar,
  IconTrophy,
  IconChevronRight,
  IconSparkles,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import * as api from '../api';
import { celebrateCompletion, playSuccess } from '../utils/effects';
import { Avatar } from '../components/Avatar';

// Inject CSS animations
const styleId = 'home-animations';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.3); }
      50% { box-shadow: 0 0 30px rgba(6, 182, 212, 0.5); }
    }
    .float-animation { animation: float 3s ease-in-out infinite; }
    .pulse-animation { animation: pulse 2s ease-in-out infinite; }
    .glow-animation { animation: glow 2s ease-in-out infinite; }
    .shimmer-bg {
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
      background-size: 200% 100%;
      animation: shimmer 2s infinite;
    }
    .markdown-content p { margin: 0 0 0.5em 0; }
    .markdown-content p:last-child { margin-bottom: 0; }
    .markdown-content ul, .markdown-content ol { margin: 0.5em 0; padding-left: 1.5em; }
    .markdown-content li { margin: 0.25em 0; }
    .markdown-content strong { font-weight: 700; }
    .markdown-content em { font-style: italic; }
    .markdown-content code { background: #e2e8f0; padding: 0.1em 0.3em; border-radius: 4px; font-size: 0.9em; }
    .markdown-content h1, .markdown-content h2, .markdown-content h3 { margin: 0.5em 0 0.25em 0; font-weight: 700; }
    .markdown-content h1 { font-size: 1.25em; }
    .markdown-content h2 { font-size: 1.1em; }
    .markdown-content h3 { font-size: 1em; }
  `;
  document.head.appendChild(style);
}

// TypeScript declarations for Web Speech API
interface SpeechRecognitionResult {
  [index: number]: { transcript: string };
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionEvent {
  results: { [index: number]: SpeechRecognitionResult; length: number };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface FamilyMemberStats {
  id: number;
  name: string;
  avatar: string;
  color: string;
  todayTotal: number;
  todayComplete: number;
  totalStars: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  allDay: boolean;
}

interface DashboardData {
  familyStats: FamilyMemberStats[];
  todayDinner: { title: string; icon: string } | null;
  upcomingEvents: CalendarEvent[];
  totalChoresComplete: number;
  totalChoresTotal: number;
}

function getGreeting(): { text: string; icon: typeof IconSun } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: IconSunrise };
  if (hour < 17) return { text: 'Good afternoon', icon: IconSun };
  return { text: 'Good evening', icon: IconMoon };
}

export default function HomeView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingVoiceRef = useRef<string | null>(null);

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-AU';
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[event.results.length - 1];
        const text = result[0].transcript;
        setTranscript(text);
        
        if (result.isFinal) {
          pendingVoiceRef.current = text;
          setInput(text);
          setIsListening(false);
        }
      };
      
      recognition.onerror = () => {
        setIsListening(false);
        setTranscript('');
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
    
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [kioskData, dinnerData, leaderboard, calendarData] = await Promise.all([
        api.getKioskData(),
        api.getDinnerPlan(),
        api.getStarLeaderboard(),
        fetch('/api/calendar/today').then(r => r.json()),
      ]);

      const today = dayjs().day();
      
      // Calculate stats per family member
      const familyStats: FamilyMemberStats[] = kioskData.members.map(member => {
        const memberAssignments = kioskData.assignments.filter(
          a => a.member_id === member.id && a.day_of_week === today
        );
        const memberComplete = memberAssignments.filter(
          a => kioskData.completions.includes(a.id)
        ).length;
        
        return {
          id: member.id,
          name: member.name,
          avatar: member.avatar,
          color: member.color,
          todayTotal: memberAssignments.length,
          todayComplete: memberComplete,
          totalStars: member.total_stars || 0,
        };
      });

      const todayPlan = dinnerData.plans.find((p: any) => p.day_of_week === today);
      
      const totalComplete = familyStats.reduce((sum, m) => sum + m.todayComplete, 0);
      const totalTotal = familyStats.reduce((sum, m) => sum + m.todayTotal, 0);

      setData({
        familyStats,
        todayDinner: todayPlan?.recipe_title ? { title: todayPlan.recipe_title, icon: todayPlan.recipe_icon || '🍽️' } : null,
        upcomingEvents: calendarData.events?.slice(0, 4) || [],
        totalChoresComplete: totalComplete,
        totalChoresTotal: totalTotal,
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Scroll chat to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Handle voice auto-send
  useEffect(() => {
    if (pendingVoiceRef.current && !sending && !isListening) {
      const text = pendingVoiceRef.current;
      pendingVoiceRef.current = null;
      setTimeout(() => sendMessage(text), 300);
    }
  }, [sending, isListening]);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\*\*/g, '').replace(/[#*_~`]/g, '').replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en-AU')) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setIsListening(true);
      setChatOpen(true);
      recognitionRef.current.start();
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setTranscript('');
    setSending(true);

    try {
      const recentHistory = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      
      const response = await fetch('/api/chat/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content, voice: true, history: recentHistory }),
      });

      const result = await response.json();
      const replyText = result.reply || "I'm here to help!";

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: replyText,
        timestamp: new Date(),
      }]);
      
      if (result.actionPerformed) {
        celebrateCompletion();
        playSuccess();
        loadData();
      }
      
      if (result.audioUrl) {
        setIsSpeaking(true);
        const audio = new Audio(result.audioUrl);
        audioRef.current = audio;
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => { setIsSpeaking(false); speak(replyText); };
        audio.play().catch(() => { setIsSpeaking(false); speak(replyText); });
      } else {
        speak(replyText);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, something went wrong!",
        timestamp: new Date(),
      }]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Center h="100%">
        <Stack align="center" gap="md">
          <Loader size="xl" color="orange" />
          <Text c="dimmed">Loading dashboard...</Text>
        </Stack>
      </Center>
    );
  }

  const overallProgress = data && data.totalChoresTotal > 0 
    ? Math.round((data.totalChoresComplete / data.totalChoresTotal) * 100) 
    : 0;

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <Paper
        p="lg"
        radius="xl"
        shadow="md"
        style={{
          background: 'linear-gradient(135deg, #f97316 0%, #fb923c 30%, #fbbf24 70%, #facc15 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box className="shimmer-bg" style={{ position: 'absolute', inset: 0, opacity: 0.4 }} />
        <Group justify="space-between" align="center" style={{ position: 'relative' }}>
          <Group gap="lg">
            <Box
              className="float-animation"
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GreetingIcon size={32} color="white" />
            </Box>
            <Box>
              <Text c="white" size="sm" style={{ opacity: 0.8 }}>
                {dayjs().format('dddd, MMMM D')}
              </Text>
              <Title order={2} c="white" fw={800}>
                {greeting.text}!
              </Title>
            </Box>
          </Group>
          
          {/* Overall Progress */}
          <Group gap="lg">
            <Box ta="right">
              <Text c="white" size="sm" style={{ opacity: 0.8 }}>Today's Progress</Text>
              <Text c="white" size="xl" fw={800}>
                {data?.totalChoresComplete || 0} / {data?.totalChoresTotal || 0}
              </Text>
            </Box>
            <RingProgress
              size={70}
              thickness={8}
              roundCaps
              sections={[{ value: overallProgress, color: overallProgress === 100 ? '#22c55e' : 'white' }]}
              label={
                overallProgress === 100 ? (
                  <Center><Text size="xl">🎉</Text></Center>
                ) : (
                  <Text c="white" fw={700} ta="center" size="sm">
                    {overallProgress}%
                  </Text>
                )
              }
            />
          </Group>
        </Group>
      </Paper>

      {/* Main Content Grid */}
      <Box style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, minHeight: 0, padding: 4, margin: -4 }}>
        {/* Left Column */}
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'visible' }}>
          {/* Family Progress Cards */}
          <Paper p="md" radius="xl" shadow="sm" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Group justify="space-between" mb="md">
              <Group gap="sm">
                <IconChecklist size={22} color="#3b82f6" />
                <Text fw={700} size="lg">Family Chores</Text>
              </Group>
              <ActionIcon component={Link} to="/chores" variant="light" color="blue" radius="xl">
                <IconChevronRight size={18} />
              </ActionIcon>
            </Group>
            
            <ScrollArea style={{ flex: 1 }}>
              <Stack gap="sm">
                {data?.familyStats.map(member => {
                  const progress = member.todayTotal > 0 
                    ? Math.round((member.todayComplete / member.todayTotal) * 100) 
                    : 0;
                  const isComplete = progress === 100;
                  
                  return (
                    <Paper
                      key={member.id}
                      p="sm"
                      radius="lg"
                      component={Link}
                      to={`/my/${member.id}`}
                      style={{
                        background: isComplete ? '#dcfce7' : '#f8fafc',
                        border: `2px solid ${isComplete ? '#22c55e' : member.color}20`,
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Group justify="space-between">
                        <Group gap="md">
                          <Box
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: '50%',
                              background: `${member.color}20`,
                              border: `3px solid ${member.color}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            }}
                          >
                            <Avatar avatar={member.avatar} size={32} />
                          </Box>
                          <Box>
                            <Text fw={700}>{member.name}</Text>
                            <Group gap="xs">
                              <Text size="sm" c="dimmed">
                                {member.todayComplete}/{member.todayTotal} chores
                              </Text>
                              {member.totalStars > 0 && (
                                <Badge size="sm" color="yellow" variant="light" leftSection="⭐">
                                  {member.totalStars}
                                </Badge>
                              )}
                            </Group>
                          </Box>
                        </Group>
                        
                        <RingProgress
                          size={50}
                          thickness={5}
                          roundCaps
                          sections={[{ value: progress, color: isComplete ? 'green' : member.color }]}
                          label={
                            isComplete ? (
                              <Center>
                                <Text size="lg">✓</Text>
                              </Center>
                            ) : (
                              <Text c={member.color} fw={700} ta="center" size="xs">
                                {progress}%
                              </Text>
                            )
                          }
                        />
                      </Group>
                    </Paper>
                  );
                })}
                
                {(!data?.familyStats || data.familyStats.length === 0) && (
                  <Center py="xl">
                    <Stack align="center" gap="xs">
                      <Text size="3rem">👨‍👩‍👧‍👦</Text>
                      <Text c="dimmed">No family members yet</Text>
                    </Stack>
                  </Center>
                )}
              </Stack>
            </ScrollArea>
          </Paper>
        </Box>

        {/* Right Column */}
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'visible' }}>
          {/* Today's Events & Dinner */}
          <SimpleGrid cols={2} spacing="md">
            {/* Tonight's Dinner */}
            <Paper
              p="md"
              radius="xl"
              shadow="sm"
              component={Link}
              to="/dinner"
              style={{
                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                border: '2px solid #fed7aa',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              <Group gap="sm" mb="xs">
                <IconChefHat size={20} color="#ea580c" />
                <Text fw={600} size="sm" c="orange.8">Tonight's Dinner</Text>
              </Group>
              {data?.todayDinner ? (
                <Group gap="sm">
                  <Text style={{ fontSize: '2rem' }}>{data.todayDinner.icon}</Text>
                  <Text fw={700} size="md" lineClamp={2}>{data.todayDinner.title}</Text>
                </Group>
              ) : (
                <Text c="dimmed" size="sm">Not planned yet</Text>
              )}
            </Paper>

            {/* Star Leader */}
            <Paper
              p="md"
              radius="xl"
              shadow="sm"
              component={Link}
              to="/rewards"
              style={{
                background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                border: '2px solid #fde047',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              <Group gap="sm" mb="xs">
                <IconTrophy size={20} color="#ca8a04" />
                <Text fw={600} size="sm" c="yellow.8">Star Leader</Text>
              </Group>
              {data?.familyStats && data.familyStats.length > 0 ? (
                (() => {
                  const leader = [...data.familyStats].sort((a, b) => b.totalStars - a.totalStars)[0];
                  return leader.totalStars > 0 ? (
                    <Group gap="sm">
                      <Avatar avatar={leader.avatar} size={36} />
                      <Box>
                        <Text fw={700}>{leader.name}</Text>
                        <Badge color="yellow" variant="light">⭐ {leader.totalStars}</Badge>
                      </Box>
                    </Group>
                  ) : (
                    <Text c="dimmed" size="sm">No stars yet</Text>
                  );
                })()
              ) : (
                <Text c="dimmed" size="sm">No stars yet</Text>
              )}
            </Paper>
          </SimpleGrid>

          {/* Calendar Events */}
          <Paper p="md" radius="xl" shadow="sm" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Group justify="space-between" mb="md">
              <Group gap="sm">
                <IconCalendar size={22} color="#0891b2" />
                <Text fw={700} size="lg">Today's Events</Text>
              </Group>
              <ActionIcon component={Link} to="/calendar" variant="light" color="cyan" radius="xl">
                <IconChevronRight size={18} />
              </ActionIcon>
            </Group>
            
            <ScrollArea style={{ flex: 1 }}>
              <Stack gap="sm">
                {data?.upcomingEvents && data.upcomingEvents.length > 0 ? (
                  data.upcomingEvents.map(event => (
                    <Paper
                      key={event.id}
                      p="sm"
                      radius="lg"
                      style={{
                        background: '#f0fdfa',
                        borderLeft: '4px solid #06b6d4',
                      }}
                    >
                      <Text fw={600} lineClamp={1}>{event.title}</Text>
                      <Text size="xs" c="dimmed">
                        {event.allDay ? 'All day' : dayjs(event.start).format('h:mm A')}
                      </Text>
                    </Paper>
                  ))
                ) : (
                  <Center py="xl">
                    <Stack align="center" gap="xs">
                      <Text size="2rem">📅</Text>
                      <Text c="dimmed" size="sm">No events today</Text>
                    </Stack>
                  </Center>
                )}
              </Stack>
            </ScrollArea>
          </Paper>
        </Box>
      </Box>

      {/* Bottom Assistant Bar */}
      <Paper
        p="md"
        radius="xl"
        shadow="md"
        style={{
          background: chatOpen ? 'white' : 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
          border: chatOpen ? '2px solid #e9ecef' : 'none',
          transition: 'all 0.3s',
        }}
      >
        {chatOpen ? (
          <Box>
            {/* Chat Messages */}
            <ScrollArea h={200} viewportRef={scrollRef} mb="md">
              <Stack gap="sm">
                {messages.length === 0 && (
                  <Center py="md">
                    <Group gap="sm">
                      <IconSparkles size={20} color="#f97316" />
                      <Text c="dimmed">Ask me about chores, dinner, or stars!</Text>
                    </Group>
                  </Center>
                )}
                {messages.map(msg => (
                  <Box
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <Paper
                      p="sm"
                      radius="lg"
                      maw="80%"
                      style={{
                        background: msg.role === 'user' 
                          ? 'linear-gradient(135deg, #3b82f6, #06b6d4)' 
                          : '#f1f5f9',
                      }}
                      className={msg.role === 'assistant' ? 'assistant-message' : ''}
                    >
                      {msg.role === 'user' ? (
                        <Text c="white" size="sm">{msg.content}</Text>
                      ) : (
                        <Box className="markdown-content" style={{ fontSize: '0.875rem', color: '#1a1a1a' }}>
                          <Markdown>{msg.content}</Markdown>
                        </Box>
                      )}
                    </Paper>
                  </Box>
                ))}
                {sending && (
                  <Group gap="xs">
                    <Loader size="xs" color="orange" />
                    <Text size="sm" c="dimmed">Thinking...</Text>
                  </Group>
                )}
              </Stack>
            </ScrollArea>
            
            {/* Input Area */}
            <Group gap="sm">
              <ActionIcon
                size={44}
                radius="xl"
                color={isListening ? 'red' : isSpeaking ? 'green' : 'orange'}
                variant="filled"
                onClick={isSpeaking ? stopSpeaking : toggleListening}
              >
                {isSpeaking ? <IconPlayerStop size={22} /> : <IconMicrophone size={22} />}
              </ActionIcon>
              <TextInput
                placeholder={isListening ? transcript || 'Listening...' : 'Type a message...'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                disabled={sending || isListening}
                style={{ flex: 1 }}
                radius="xl"
                size="md"
              />
              <ActionIcon
                size={44}
                radius="xl"
                color="blue"
                variant="filled"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || sending}
              >
                <IconSend size={20} />
              </ActionIcon>
              <ActionIcon
                size={44}
                radius="xl"
                variant="light"
                color="gray"
                onClick={() => setChatOpen(false)}
              >
                ✕
              </ActionIcon>
            </Group>
          </Box>
        ) : (
          <Group justify="space-between" align="center">
            <Group gap="md">
              <Box
                className="glow-animation"
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconRobot size={28} color="white" />
              </Box>
              <Box>
                <Text c="white" fw={700}>Family Assistant</Text>
                <Text c="white" size="sm" style={{ opacity: 0.8 }}>
                  Tap to ask me anything!
                </Text>
              </Box>
            </Group>
            
            <Group gap="sm">
              <Tooltip label="Voice command">
                <ActionIcon
                  size={50}
                  radius="xl"
                  variant="white"
                  color="dark"
                  onClick={toggleListening}
                >
                  <IconMicrophone size={24} />
                </ActionIcon>
              </Tooltip>
              <ActionIcon
                size={50}
                radius="xl"
                variant="white"
                color="dark"
                onClick={() => setChatOpen(true)}
              >
                <IconChevronRight size={24} />
              </ActionIcon>
            </Group>
          </Group>
        )}
      </Paper>
    </Box>
  );
}
