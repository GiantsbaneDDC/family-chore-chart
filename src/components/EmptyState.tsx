import { Box, Text, Stack } from '@mantine/core';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <Box
      py="xl"
      px="md"
      style={{
        textAlign: 'center',
        opacity: 0.8,
      }}
    >
      <Text 
        size="3rem" 
        mb="md"
        style={{
          animation: 'float 3s ease-in-out infinite',
        }}
      >
        {icon}
      </Text>
      <Text fw={600} size="lg" c="dimmed" mb={4}>
        {title}
      </Text>
      {description && (
        <Text size="sm" c="dimmed" style={{ opacity: 0.7 }}>
          {description}
        </Text>
      )}
    </Box>
  );
}

// Pre-configured empty states
export const emptyStates = {
  noChores: {
    icon: '🏖️',
    title: 'No chores today!',
    description: 'Enjoy your free time',
  },
  noDinner: {
    icon: '🤔',
    title: 'No dinner planned',
    description: 'Tap to pick something yummy',
  },
  noRecipes: {
    icon: '📝',
    title: 'No recipes yet',
    description: 'Add your family favorites',
  },
  allDone: {
    icon: '🎉',
    title: 'All done!',
    description: 'Great job today!',
  },
  noMessages: {
    icon: '👋',
    title: 'Say hello!',
    description: 'Ask me anything about chores or dinner',
  },
  loading: {
    icon: '⏳',
    title: 'Loading...',
    description: '',
  },
  error: {
    icon: '😕',
    title: 'Oops!',
    description: 'Something went wrong. Try again?',
  },
};
