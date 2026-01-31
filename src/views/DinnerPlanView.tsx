import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Text,
  Title,
  Paper,
  ActionIcon,
  Center,
  Loader,
  Badge,
  Modal,
  Button,
  Group,
  Stack,
  Select,
  Textarea,
  Tooltip,
  ScrollArea,
  Divider,
  List,
} from '@mantine/core';
import { 
  IconChevronLeft, 
  IconChevronRight, 
  IconPlus, 
  IconClock, 
  IconFlame,
  IconUsers,
  IconX,
  IconCopy,
  IconChefHat
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import * as api from '../api';
import type { Recipe, DinnerPlan, DinnerPlanData } from '../types';
import { DAYS, SHORT_DAYS } from '../types';

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function formatWeekRange(weekStart: string): string {
  const start = dayjs(weekStart);
  const end = start.add(6, 'day');
  if (start.month() === end.month()) {
    return `${start.format('MMM D')} - ${end.format('D, YYYY')}`;
  }
  return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;
}

export default function DinnerPlanView() {
  const [data, setData] = useState<DinnerPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [assignRecipeId, setAssignRecipeId] = useState<string | null>(null);
  const [assignNotes, setAssignNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const planData = await api.getDinnerPlan(weekStart);
      setData(planData);
    } catch (err) {
      console.error('Failed to load dinner plan:', err);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const today = dayjs().day();
  const isCurrentWeek = weekStart === getWeekStart();

  const getPlanForDay = (dayOfWeek: number): DinnerPlan | undefined => {
    return data?.plans.find(p => p.day_of_week === dayOfWeek);
  };

  const getRecipeById = (id: number): Recipe | undefined => {
    return data?.recipes.find(r => r.id === id);
  };

  const handlePrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next.toISOString().split('T')[0]);
  };

  const handleDayClick = (dayIndex: number) => {
    const plan = getPlanForDay(dayIndex);
    if (plan) {
      const recipe = getRecipeById(plan.recipe_id);
      if (recipe) {
        setSelectedRecipe(recipe);
        setRecipeModalOpen(true);
      }
    } else {
      setSelectedDay(dayIndex);
      setAssignRecipeId(null);
      setAssignNotes('');
      setAssignModalOpen(true);
    }
  };

  const handleAssignRecipe = async () => {
    if (selectedDay === null || !assignRecipeId) return;
    
    try {
      await api.setDinnerPlan({
        recipe_id: parseInt(assignRecipeId),
        day_of_week: selectedDay,
        week_start: weekStart,
        notes: assignNotes || undefined
      });
      setAssignModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to assign recipe:', err);
    }
  };

  const handleClearDay = async (dayIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.clearDinnerPlan(dayIndex, weekStart);
      loadData();
    } catch (err) {
      console.error('Failed to clear day:', err);
    }
  };

  const handleCopyLastWeek = async () => {
    try {
      await api.copyLastWeekPlan();
      loadData();
    } catch (err) {
      console.error('Failed to copy last week:', err);
    }
  };

  const handleEditDay = (dayIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const plan = getPlanForDay(dayIndex);
    setSelectedDay(dayIndex);
    setAssignRecipeId(plan?.recipe_id?.toString() || null);
    setAssignNotes(plan?.notes || '');
    setAssignModalOpen(true);
  };

  if (loading || !data) {
    return (
      <Center h="100%">
        <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Loader size="xl" color="orange" />
          <Text c="dimmed" fw={500}>Loading dinner plan...</Text>
        </Box>
      </Center>
    );
  }

  const plannedDays = data.plans.length;
  const totalDays = 7;

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <Paper 
        p="md" 
        radius="xl" 
        shadow="sm"
        style={{
          background: 'linear-gradient(135deg, #ff922b 0%, #fd7e14 100%)',
        }}
      >
        <Group justify="space-between" align="center">
          <Group gap="md">
            <ActionIcon 
              variant="white" 
              size="lg" 
              radius="xl"
              onClick={handlePrevWeek}
            >
              <IconChevronLeft size={20} />
            </ActionIcon>
            <Box>
              <Title order={3} c="white" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconChefHat size={28} />
                Dinner Plan
              </Title>
              <Text size="sm" c="white" style={{ opacity: 0.9 }}>
                {formatWeekRange(weekStart)}
              </Text>
            </Box>
            <ActionIcon 
              variant="white" 
              size="lg" 
              radius="xl"
              onClick={handleNextWeek}
            >
              <IconChevronRight size={20} />
            </ActionIcon>
          </Group>

          <Group gap="sm">
            {isCurrentWeek && (
              <Badge size="lg" variant="white" color="orange">
                This Week
              </Badge>
            )}
            <Badge size="lg" variant="white" color="orange" leftSection="🍽️">
              {plannedDays}/{totalDays} Planned
            </Badge>
            {plannedDays < totalDays && (
              <Tooltip label="Copy last week's plan">
                <ActionIcon 
                  variant="white" 
                  size="lg" 
                  radius="xl"
                  onClick={handleCopyLastWeek}
                >
                  <IconCopy size={20} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
      </Paper>

      {/* Week Grid */}
      <Box
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 8,
          minHeight: 0,
        }}
      >
        {DAYS.map((day, dayIndex) => {
          const plan = getPlanForDay(dayIndex);
          const isToday = isCurrentWeek && dayIndex === today;
          const recipe = plan ? getRecipeById(plan.recipe_id) : null;
          
          return (
            <Paper
              key={dayIndex}
              p="md"
              radius="lg"
              shadow="sm"
              onClick={() => handleDayClick(dayIndex)}
              style={{
                cursor: 'pointer',
                background: isToday 
                  ? 'linear-gradient(180deg, #fff4e6 0%, #ffe8cc 100%)'
                  : plan 
                    ? '#ffffff'
                    : '#f8f9fa',
                border: isToday 
                  ? '3px solid #fd7e14'
                  : plan
                    ? '2px solid #ffe8cc'
                    : '2px dashed #dee2e6',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {/* Day Header */}
              <Group justify="space-between" mb="sm">
                <Box>
                  <Text size="xs" fw={700} c={isToday ? 'orange' : 'dimmed'} tt="uppercase">
                    {SHORT_DAYS[dayIndex]}
                  </Text>
                  <Text size="lg" fw={800} c={isToday ? 'orange.7' : 'dark'}>
                    {day}
                  </Text>
                </Box>
                {isToday && (
                  <Badge size="sm" color="orange" variant="filled">
                    TODAY
                  </Badge>
                )}
              </Group>

              {/* Meal Content */}
              {plan && recipe ? (
                <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Recipe Icon */}
                  <Center mb="sm">
                    <Text style={{ fontSize: '3rem' }}>{recipe.icon}</Text>
                  </Center>
                  
                  {/* Recipe Title */}
                  <Text 
                    size="md" 
                    fw={700} 
                    ta="center"
                    lineClamp={2}
                    style={{ flex: 1 }}
                  >
                    {recipe.title}
                  </Text>

                  {/* Time Info */}
                  {(recipe.prep_time || recipe.cook_time) && (
                    <Group gap="xs" justify="center" mt="xs">
                      {recipe.prep_time && (
                        <Badge size="xs" variant="light" color="gray" leftSection={<IconClock size={10} />}>
                          {recipe.prep_time}m prep
                        </Badge>
                      )}
                      {recipe.cook_time && (
                        <Badge size="xs" variant="light" color="orange" leftSection={<IconFlame size={10} />}>
                          {recipe.cook_time}m cook
                        </Badge>
                      )}
                    </Group>
                  )}

                  {/* Notes */}
                  {plan.notes && (
                    <Text size="xs" c="dimmed" ta="center" mt="xs" lineClamp={1}>
                      📝 {plan.notes}
                    </Text>
                  )}

                  {/* Action Buttons */}
                  <Group gap="xs" justify="center" mt="sm">
                    <Tooltip label="Change meal">
                      <ActionIcon 
                        size="sm" 
                        variant="light" 
                        color="blue"
                        onClick={(e) => handleEditDay(dayIndex, e)}
                      >
                        <IconPlus size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Clear">
                      <ActionIcon 
                        size="sm" 
                        variant="light" 
                        color="red"
                        onClick={(e) => handleClearDay(dayIndex, e)}
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Box>
              ) : (
                <Center style={{ flex: 1, flexDirection: 'column', gap: 8 }}>
                  <ActionIcon 
                    size={60} 
                    variant="light" 
                    color="gray" 
                    radius="xl"
                  >
                    <IconPlus size={30} />
                  </ActionIcon>
                  <Text size="sm" c="dimmed" fw={500}>
                    Add meal
                  </Text>
                </Center>
              )}
            </Paper>
          );
        })}
      </Box>

      {/* Assign Recipe Modal */}
      <Modal
        opened={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={
          <Group gap="sm">
            <Text style={{ fontSize: '1.5rem' }}>🍽️</Text>
            <Text fw={700}>
              {selectedDay !== null ? `${DAYS[selectedDay]}'s Dinner` : 'Assign Recipe'}
            </Text>
          </Group>
        }
        size="md"
        radius="lg"
      >
        <Stack gap="md">
          <Select
            label="Choose a recipe"
            placeholder="Select a recipe..."
            data={data.recipes.map(r => ({ 
              value: r.id.toString(), 
              label: `${r.icon} ${r.title}` 
            }))}
            value={assignRecipeId}
            onChange={setAssignRecipeId}
            searchable
            size="md"
          />

          <Textarea
            label="Notes (optional)"
            placeholder="e.g., Use leftover chicken, make extra rice..."
            value={assignNotes}
            onChange={(e) => setAssignNotes(e.target.value)}
            rows={2}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              color="orange" 
              onClick={handleAssignRecipe}
              disabled={!assignRecipeId}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Recipe Detail Modal - Large & Kid-Friendly */}
      <Modal
        opened={recipeModalOpen}
        onClose={() => setRecipeModalOpen(false)}
        size="100%"
        fullScreen
        radius={0}
        styles={{
          header: { 
            background: 'linear-gradient(135deg, #ff922b 0%, #fd7e14 100%)',
            padding: '20px 24px',
          },
          title: { width: '100%' },
          body: { padding: 0 },
        }}
        title={
          selectedRecipe && (
            <Group gap="md" justify="space-between" w="100%">
              <Group gap="md">
                <Text style={{ fontSize: '3rem' }}>{selectedRecipe.icon}</Text>
                <Box>
                  <Title order={1} c="white" style={{ fontSize: '2rem' }}>{selectedRecipe.title}</Title>
                  {selectedRecipe.description && (
                    <Text c="white" size="lg" style={{ opacity: 0.9 }}>{selectedRecipe.description}</Text>
                  )}
                </Box>
              </Group>
              <Group gap="md">
                {selectedRecipe.prep_time && (
                  <Badge size="xl" variant="white" color="orange" leftSection={<IconClock size={18} />} style={{ fontSize: '1rem', padding: '12px 16px' }}>
                    {selectedRecipe.prep_time} min prep
                  </Badge>
                )}
                {selectedRecipe.cook_time && (
                  <Badge size="xl" variant="white" color="orange" leftSection={<IconFlame size={18} />} style={{ fontSize: '1rem', padding: '12px 16px' }}>
                    {selectedRecipe.cook_time} min cook
                  </Badge>
                )}
                {selectedRecipe.servings && (
                  <Badge size="xl" variant="white" color="orange" leftSection={<IconUsers size={18} />} style={{ fontSize: '1rem', padding: '12px 16px' }}>
                    Serves {selectedRecipe.servings}
                  </Badge>
                )}
              </Group>
            </Group>
          )
        }
      >
        {selectedRecipe && (
          <Box 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1.5fr', 
              height: 'calc(100vh - 100px)',
              background: '#f8f9fa',
            }}
          >
            {/* Left Column - Ingredients */}
            <Box 
              p="xl" 
              style={{ 
                background: '#fff',
                borderRight: '2px solid #e9ecef',
                overflow: 'auto',
              }}
            >
              <Group gap="sm" mb="lg">
                <Text style={{ fontSize: '2.5rem' }}>🥬</Text>
                <Title order={2} c="dark">Ingredients</Title>
              </Group>
              
              <Stack gap="md">
                {selectedRecipe.ingredients && selectedRecipe.ingredients.map((ing, i) => (
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
                          width: 40, 
                          height: 40, 
                          borderRadius: '50%', 
                          background: '#fd7e14',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '1.2rem',
                        }}
                      >
                        {i + 1}
                      </Box>
                      <Text size="xl" fw={500} style={{ flex: 1 }}>{ing}</Text>
                    </Group>
                  </Paper>
                ))}
              </Stack>

              {/* Tags at bottom */}
              {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
                <Box mt="xl" pt="lg" style={{ borderTop: '2px solid #e9ecef' }}>
                  <Group gap="sm">
                    {selectedRecipe.tags.map((tag, i) => (
                      <Badge key={i} size="lg" variant="light" color="orange" style={{ fontSize: '0.9rem' }}>
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                </Box>
              )}
            </Box>

            {/* Right Column - Instructions */}
            <ScrollArea p="xl" style={{ background: '#fff' }}>
              <Group gap="sm" mb="lg">
                <Text style={{ fontSize: '2.5rem' }}>👨‍🍳</Text>
                <Title order={2} c="dark">Instructions</Title>
              </Group>

              <Stack gap="lg">
                {selectedRecipe.instructions && selectedRecipe.instructions.map((step, i) => (
                  <Paper 
                    key={i} 
                    p="lg" 
                    radius="xl" 
                    shadow="sm"
                    style={{ 
                      background: i % 2 === 0 ? '#fff4e6' : '#fff',
                      border: '2px solid #ffe8cc',
                    }}
                  >
                    <Group gap="lg" align="flex-start">
                      <Box 
                        style={{ 
                          width: 60, 
                          height: 60, 
                          borderRadius: '50%', 
                          background: 'linear-gradient(135deg, #ff922b 0%, #fd7e14 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 800,
                          fontSize: '1.5rem',
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
          </Box>
        )}
      </Modal>
    </Box>
  );
}
