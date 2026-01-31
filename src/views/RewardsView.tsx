import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Text,
  Title,
  Center,
  Loader,
  Badge,
} from '@mantine/core';
import { IconStar, IconTrophy } from '@tabler/icons-react';
import * as api from '../api';
import type { FamilyMember, StarHistory } from '../types';

export default function RewardsView() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [starHistory, setStarHistory] = useState<StarHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const leaderboard = await api.getStarLeaderboard();
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

  if (loading) {
    return (
      <Center h="100%" style={{ background: 'linear-gradient(180deg, #fef3c7 0%, #ffffff 100%)' }}>
        <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Loader size="xl" color="yellow" />
          <Text c="dimmed" fw={500}>Loading rewards...</Text>
        </Box>
      </Center>
    );
  }

  // Find member with most stars
  const topMember = members.length > 0 ? members[0] : null;

  return (
    <Box
      style={{
        height: '100%',
        display: 'grid',
        gridTemplateRows: '80px 1fr',
        gridTemplateColumns: selectedMember ? '1fr 300px' : '1fr',
        gap: 2,
        background: '#e2e8f0',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        style={{
          gridColumn: selectedMember ? '1 / -1' : '1',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '0 24px',
        }}
      >
        <IconTrophy size={40} color="white" />
        <Title order={1} c="white" fw={900}>Star Leaderboard</Title>
        {topMember && topMember.total_stars && topMember.total_stars > 0 && (
          <Badge size="xl" color="white" variant="white" c="orange" ml="auto">
            👑 {topMember.name} leads with {topMember.total_stars} stars!
          </Badge>
        )}
      </Box>

      {/* Leaderboard Grid */}
      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          padding: 24,
          overflow: 'auto',
          alignContent: 'start',
          background: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)',
        }}
      >
        {members.length === 0 ? (
          <Box style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48 }}>
            <Text size="4rem" mb="md">⭐</Text>
            <Title order={3} mb="xs">No stars yet!</Title>
            <Text c="dimmed">Complete bonus tasks to earn stars.</Text>
          </Box>
        ) : (
          members.map((member, index) => {
            const isTop3 = index < 3;
            const medals = ['🥇', '🥈', '🥉'];
            const isSelected = selectedMember === member.id;
            
            return (
              <Box
                key={member.id}
                onClick={() => setSelectedMember(isSelected ? null : member.id)}
                style={{
                  background: isSelected 
                    ? 'linear-gradient(135deg, #fef3c7, #fde68a)' 
                    : 'white',
                  borderRadius: 16,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: isSelected 
                    ? '3px solid #f59e0b' 
                    : `3px solid ${member.color}40`,
                  boxShadow: isTop3 
                    ? '0 4px 12px rgba(245, 158, 11, 0.3)' 
                    : '0 2px 8px rgba(0,0,0,0.05)',
                  position: 'relative',
                }}
              >
                {/* Rank badge */}
                {isTop3 && (
                  <Box
                    style={{
                      position: 'absolute',
                      top: -10,
                      left: -10,
                      fontSize: '2rem',
                    }}
                  >
                    {medals[index]}
                  </Box>
                )}

                {/* Avatar */}
                <Box
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${member.color}, ${member.color}aa)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '3rem',
                    boxShadow: isTop3 ? '0 4px 12px rgba(0,0,0,0.15)' : undefined,
                  }}
                >
                  {member.avatar}
                </Box>

                {/* Name */}
                <Text fw={800} size="lg" ta="center">{member.name}</Text>

                {/* Stars */}
                <Box
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#fef3c7',
                    padding: '8px 16px',
                    borderRadius: 20,
                  }}
                >
                  <IconStar size={24} color="#f59e0b" fill="#f59e0b" />
                  <Text size="xl" fw={900} c="orange.8">
                    {member.total_stars || 0}
                  </Text>
                </Box>

                {/* Click hint */}
                <Text size="xs" c="dimmed">
                  {isSelected ? 'Click to hide history' : 'Click for history'}
                </Text>
              </Box>
            );
          })
        )}
      </Box>

      {/* History Panel */}
      {selectedMember && (
        <Box
          style={{
            background: 'white',
            padding: 16,
            overflow: 'auto',
            borderLeft: '2px solid #e2e8f0',
          }}
        >
          <Text fw={700} size="lg" mb="md">
            ⭐ Star History
          </Text>
          
          {starHistory.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              No star history yet
            </Text>
          ) : (
            <Box style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {starHistory.map(entry => (
                <Box
                  key={entry.id}
                  style={{
                    background: entry.stars > 0 ? '#dcfce7' : '#fee2e2',
                    padding: '10px 12px',
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Text size="sm" fw={600}>{entry.description}</Text>
                    <Text size="xs" c="dimmed">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </Text>
                  </Box>
                  <Badge 
                    color={entry.stars > 0 ? 'green' : 'red'} 
                    size="lg"
                    variant="light"
                  >
                    {entry.stars > 0 ? '+' : ''}{entry.stars} ⭐
                  </Badge>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
