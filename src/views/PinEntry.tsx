import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Text,
  Title,
  Paper,
  Group,
  Stack,
  Center,
  Button,
  PinInput,
  Loader,
  ActionIcon,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconUser } from '@tabler/icons-react';
import * as api from '../api';
import { Avatar } from '../components/Avatar';
import type { FamilyMember } from '../types';

export default function PinEntry() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    api.getMembers()
      .then(setMembers)
      .catch(err => {
        console.error('Failed to load members:', err);
        notifications.show({
          title: 'Error',
          message: 'Failed to load family members',
          color: 'red',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleMemberSelect = (member: FamilyMember) => {
    setSelectedMember(member);
    setPin('');
  };

  const handlePinComplete = async (value: string) => {
    if (!selectedMember || value.length !== 4) return;
    
    setVerifying(true);
    try {
      await api.verifyMemberPin(selectedMember.id, value);
      navigate(`/my/${selectedMember.id}`);
    } catch {
      notifications.show({
        title: 'Wrong PIN',
        message: 'Please try again',
        color: 'red',
      });
      setPin('');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <Center h="100vh" bg="gray.0">
        <Stack align="center" gap="md">
          <Loader size="xl" color="blue" />
          <Text c="dimmed" fw={500}>Loading...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Box 
      mih="100vh" 
      p="xl"
      className="safe-area-padding"
      style={{ 
        background: 'linear-gradient(180deg, #f0f9ff 0%, #fdf4ff 50%, #fffbeb 100%)' 
      }}
    >
      <ActionIcon
        component={Link}
        to="/"
        variant="white"
        size={50}
        radius="xl"
        mb="xl"
        style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}
      >
        <IconArrowLeft size={24} />
      </ActionIcon>

      {!selectedMember ? (
        <Box maw={500} mx="auto">
          <Stack align="center" mb="xl">
            <ThemeIcon size={80} radius="xl" variant="light" color="blue">
              <IconUser size={40} />
            </ThemeIcon>
            <Title order={1} ta="center" fw={900}>
              Who are you? 👋
            </Title>
            <Text c="dimmed" ta="center">
              Select your name to view your chores
            </Text>
          </Stack>
          
          <Stack gap="md">
            {members.map((member, index) => (
              <Paper
                key={member.id}
                p="lg"
                radius="xl"
                shadow="sm"
                onClick={() => handleMemberSelect(member)}
                className="slide-up"
                style={{
                  cursor: 'pointer',
                  border: '1px solid #e2e8f0',
                  animationDelay: `${index * 50}ms`,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(8px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                  e.currentTarget.style.borderColor = member.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <Group gap="lg">
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: `${member.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `3px solid ${member.color}`,
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    <Avatar avatar={member.avatar} size={48} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text size="xl" fw={800}>{member.name}</Text>
                    <Text size="sm" c="dimmed" fw={500}>Tap to continue →</Text>
                  </div>
                </Group>
              </Paper>
            ))}
            
            {members.length === 0 && (
              <Paper p="xl" radius="xl" ta="center" className="empty-state">
                <Text size="4rem" mb="md">👨‍👩‍👧‍👦</Text>
                <Title order={3} mb="xs">No family members yet!</Title>
                <Text c="dimmed" mb="lg">
                  Ask a parent to add family members
                </Text>
                <Button 
                  component={Link} 
                  to="/admin" 
                  radius="xl"
                  size="lg"
                >
                  Go to Admin Panel
                </Button>
              </Paper>
            )}
          </Stack>
        </Box>
      ) : (
        <Center mih="70vh">
          <Paper 
            p="xl" 
            radius="xl" 
            shadow="lg" 
            maw={400} 
            w="100%"
            className="slide-up"
            style={{ border: '1px solid #e2e8f0' }}
          >
            <Stack align="center" gap="lg">
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: `${selectedMember.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `4px solid ${selectedMember.color}`,
                  overflow: 'hidden',
                }}
              >
                <Avatar avatar={selectedMember.avatar} size={64} />
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <Title order={2} fw={900}>Hi, {selectedMember.name}!</Title>
                <Text c="dimmed" mt={4}>Enter your 4-digit PIN</Text>
              </div>
              
              <PinInput
                length={4}
                type="number"
                size="xl"
                value={pin}
                onChange={setPin}
                onComplete={handlePinComplete}
                disabled={verifying}
                autoFocus
                styles={{
                  input: {
                    fontSize: 28,
                    fontWeight: 800,
                    width: 60,
                    height: 68,
                    borderRadius: 12,
                  },
                }}
              />
              
              {verifying && <Loader size="md" color={selectedMember.color} />}
              
              <Button
                variant="subtle"
                color="gray"
                radius="xl"
                onClick={() => setSelectedMember(null)}
                leftSection={<IconArrowLeft size={18} />}
              >
                Not you? Go back
              </Button>
            </Stack>
          </Paper>
        </Center>
      )}
    </Box>
  );
}
