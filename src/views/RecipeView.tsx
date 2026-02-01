import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Text,
  Title,
  Paper,
  ActionIcon,
  Center,
  Loader,
  Badge,
  Group,
  Stack,
  ScrollArea,
  Button,
  Drawer,
  Tooltip,
} from '@mantine/core';
import { 
  IconArrowLeft,
  IconClock, 
  IconFlame,
  IconUsers,
  IconWorld,
  IconExternalLink,
} from '@tabler/icons-react';
import * as api from '../api';
import type { Recipe } from '../types';

export default function RecipeView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceOpen, setSourceOpen] = useState(false);

  useEffect(() => {
    if (id) {
      api.getRecipe(parseInt(id))
        .then(setRecipe)
        .catch(err => console.error('Failed to load recipe:', err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <Center h="100%">
        <Loader size="xl" color="orange" />
      </Center>
    );
  }

  if (!recipe) {
    return (
      <Center h="100%">
        <Text c="dimmed">Recipe not found</Text>
      </Center>
    );
  }

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <Paper 
        p="md" 
        radius="xl" 
        shadow="sm"
        style={{
          background: 'linear-gradient(135deg, #ff922b 0%, #fd7e14 100%)',
          flexShrink: 0,
        }}
      >
        <Group justify="space-between" align="center">
          <Group gap="md">
            <ActionIcon 
              variant="white" 
              size="lg" 
              radius="xl"
              onClick={() => navigate('/dinner')}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Text style={{ fontSize: '2rem' }}>{recipe.icon}</Text>
            <Box>
              <Title order={3} c="white">{recipe.title}</Title>
              {recipe.description && (
                <Text c="white" size="sm" style={{ opacity: 0.9 }}>{recipe.description}</Text>
              )}
            </Box>
          </Group>
          <Group gap="sm">
            {recipe.prep_time && (
              <Badge size="lg" variant="white" color="orange" leftSection={<IconClock size={14} />}>
                {recipe.prep_time}m prep
              </Badge>
            )}
            {recipe.cook_time && (
              <Badge size="lg" variant="white" color="orange" leftSection={<IconFlame size={14} />}>
                {recipe.cook_time}m cook
              </Badge>
            )}
            {recipe.servings && (
              <Badge size="lg" variant="white" color="orange" leftSection={<IconUsers size={14} />}>
                Serves {recipe.servings}
              </Badge>
            )}
            {recipe.source_url && (
              <Tooltip label="View original recipe">
                <ActionIcon 
                  variant="white" 
                  size="lg" 
                  radius="xl"
                  onClick={() => setSourceOpen(true)}
                >
                  <IconWorld size={20} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
      </Paper>

      {/* Content */}
      <Box 
        style={{ 
          flex: 1,
          display: 'grid', 
          gridTemplateColumns: '1fr 1.5fr', 
          gap: 16,
          marginTop: 16,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Left Column - Ingredients */}
        <Paper 
          p="xl" 
          radius="xl"
          shadow="sm"
          style={{ 
            background: '#fff',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Group gap="sm" mb="lg" style={{ flexShrink: 0 }}>
            <Text style={{ fontSize: '2.5rem' }}>🥬</Text>
            <Title order={2} c="dark">Ingredients</Title>
          </Group>
          
          <ScrollArea style={{ flex: 1 }}>
            <Stack gap="md" pr="md">
              {recipe.ingredients && recipe.ingredients.map((ing, i) => (
                <Paper 
                  key={i} 
                  p="md" 
                  radius="lg" 
                  style={{ 
                    background: '#f8f9fa',
                    border: '2px solid #e9ecef',
                  }}
                >
                  <Group gap="md">
                    <Box 
                      style={{ 
                        width: 44, 
                        height: 44, 
                        borderRadius: '50%', 
                        background: '#fd7e14',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1.3rem',
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </Box>
                    <Text size="xl" fw={500} style={{ flex: 1 }}>{ing}</Text>
                  </Group>
                </Paper>
              ))}

              {/* Tags at bottom */}
              {recipe.tags && recipe.tags.length > 0 && (
                <Box mt="xl" pt="lg" style={{ borderTop: '2px solid #e9ecef' }}>
                  <Group gap="sm">
                    {recipe.tags.map((tag, i) => (
                      <Badge key={i} size="lg" variant="light" color="orange" style={{ fontSize: '0.95rem' }}>
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                </Box>
              )}
            </Stack>
          </ScrollArea>
        </Paper>

        {/* Right Column - Instructions */}
        <Paper 
          p="xl" 
          radius="xl"
          shadow="sm"
          style={{ 
            background: '#fff',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Group gap="sm" mb="lg" style={{ flexShrink: 0 }}>
            <Text style={{ fontSize: '2.5rem' }}>👨‍🍳</Text>
            <Title order={2} c="dark">Instructions</Title>
          </Group>

          <ScrollArea style={{ flex: 1 }}>
            <Stack gap="lg" pr="md">
              {recipe.instructions && recipe.instructions.map((step, i) => (
                <Paper 
                  key={i} 
                  p="lg" 
                  radius="xl" 
                  shadow="xs"
                  style={{ 
                    background: i % 2 === 0 ? '#fff4e6' : '#fff',
                    border: '2px solid #ffe8cc',
                  }}
                >
                  <Group gap="lg" align="flex-start">
                    <Box 
                      style={{ 
                        width: 64, 
                        height: 64, 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #ff922b 0%, #fd7e14 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '1.6rem',
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </Box>
                    <Text size="xl" fw={500} style={{ flex: 1, lineHeight: 1.6 }}>{step}</Text>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </ScrollArea>
        </Paper>
      </Box>

      {/* Source Viewer Drawer */}
      <Drawer
        opened={sourceOpen}
        onClose={() => setSourceOpen(false)}
        title={
          <Group gap="sm">
            <IconWorld size={20} />
            <Text fw={700} lineClamp={1}>Original Recipe</Text>
          </Group>
        }
        position="right"
        size="xl"
        padding={0}
        styles={{
          body: { height: 'calc(100% - 60px)', padding: 0 },
          header: { padding: '12px 16px', borderBottom: '1px solid #e9ecef' },
        }}
      >
        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Paper p="md" style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa', flexShrink: 0 }}>
            <Group justify="space-between" align="center">
              <Box>
                <Text size="sm" fw={500}>Page not loading?</Text>
                <Text size="xs" c="dimmed">Some sites block embedding. Open in a new tab instead.</Text>
              </Box>
              <Button 
                color="orange"
                component="a"
                href={recipe.source_url || ''}
                target="_blank"
                leftSection={<IconExternalLink size={16} />}
              >
                Open in New Tab
              </Button>
            </Group>
          </Paper>
          <Text size="xs" c="dimmed" p="xs" ta="center" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
            {recipe.source_url}
          </Text>
          {recipe.source_url && (
            <iframe
              src={recipe.source_url}
              style={{ 
                flex: 1, 
                width: '100%', 
                border: 'none',
              }}
              title="Recipe Source"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          )}
        </Box>
      </Drawer>
    </Box>
  );
}
