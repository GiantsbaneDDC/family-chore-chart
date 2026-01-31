import { Box } from '@mantine/core';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  mb?: number | string;
}

export function Skeleton({ width = '100%', height = 20, radius = 8, mb = 0 }: SkeletonProps) {
  return (
    <Box
      style={{
        width,
        height,
        borderRadius: radius,
        marginBottom: mb,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <Box
      p="md"
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <Skeleton height={24} width="60%" mb={12} />
      <Skeleton height={16} width="80%" mb={8} />
      <Skeleton height={16} width="40%" />
    </Box>
  );
}

export function SkeletonChoreCard() {
  return (
    <Box
      p="md"
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Skeleton width={48} height={48} radius="50%" />
      <Box style={{ flex: 1 }}>
        <Skeleton height={18} width="70%" mb={8} />
        <Skeleton height={14} width="40%" />
      </Box>
      <Skeleton width={32} height={32} radius="50%" />
    </Box>
  );
}

export function SkeletonMemberCard() {
  return (
    <Box
      p="lg"
      style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(109,40,217,0.2) 100%)',
        borderRadius: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <Skeleton width={80} height={80} radius="50%" />
      <Box style={{ flex: 1 }}>
        <Skeleton height={28} width="50%" mb={12} />
        <Skeleton height={20} width="30%" />
      </Box>
    </Box>
  );
}
