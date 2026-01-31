import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TextInput,
  Tabs,
  ScrollArea,
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { 
  IconChevronLeft, 
  IconChevronRight, 
  IconPlus, 
  IconClock, 
  IconFlame,
  IconX,
  IconCopy,
  IconChefHat,
  IconSearch,
  IconLink,
  IconExternalLink,
  IconDownload,
  IconCheck,
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
  const navigate = useNavigate();
  const [data, setData] = useState<DinnerPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignRecipeId, setAssignRecipeId] = useState<string | null>(null);
  const [assignNotes, setAssignNotes] = useState('');
  
  // Recipe search/import state
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{title: string; url: string; description: string; source: string}>>([]);
  const [searching, setSearching] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [previewRecipe, setPreviewRecipe] = useState<any>(null);
  const [existingUrls, setExistingUrls] = useState<Set<string>>(new Set());

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
      // Navigate to recipe page
      navigate(`/recipe/${plan.recipe_id}`);
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

  // Fetch existing recipe source URLs for duplicate detection
  const fetchExistingUrls = async () => {
    try {
      const res = await fetch('/api/recipes/source-urls');
      const data = await res.json();
      setExistingUrls(new Set(data.urls || []));
    } catch (err) {
      console.error('Failed to fetch existing URLs:', err);
    }
  };

  // Check if URL already exists (normalize for comparison)
  const isUrlExisting = (url: string) => {
    // Normalize URL for comparison (remove trailing slashes, protocol variations)
    const normalize = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
    const normalized = normalize(url);
    return Array.from(existingUrls).some(existing => normalize(existing) === normalized);
  };

  // Recipe search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    // Fetch existing URLs before showing results
    await fetchExistingUrls();
    try {
      const res = await fetch('/api/recipes/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
      notifications.show({ title: 'Error', message: 'Search failed', color: 'red' });
    } finally {
      setSearching(false);
    }
  };

  // Import recipe from URL
  const handleImport = async (url: string) => {
    setImporting(true);
    setPreviewRecipe(null);
    try {
      const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPreviewRecipe(data.recipe);
    } catch (err: any) {
      console.error('Import failed:', err);
      notifications.show({ title: 'Import Failed', message: err.message || 'Could not import recipe', color: 'red' });
    } finally {
      setImporting(false);
    }
  };

  // Save imported recipe
  const handleSaveRecipe = async () => {
    if (!previewRecipe) return;
    try {
      await api.createRecipe({
        title: previewRecipe.title,
        icon: previewRecipe.icon || '🍽️',
        description: previewRecipe.description,
        prep_time: previewRecipe.prep_time,
        cook_time: previewRecipe.cook_time,
        servings: previewRecipe.servings,
        ingredients: previewRecipe.ingredients || [],
        instructions: previewRecipe.instructions || [],
        tags: previewRecipe.tags || [],
        source_url: previewRecipe.source_url,
      });
      notifications.show({ title: 'Saved!', message: `${previewRecipe.title} added to recipes`, color: 'green' });
      setPreviewRecipe(null);
      setSearchModalOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      setImportUrl('');
      loadData();
    } catch (err) {
      console.error('Save failed:', err);
      notifications.show({ title: 'Error', message: 'Failed to save recipe', color: 'red' });
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
            <Tooltip label="Find new recipe">
              <ActionIcon 
                variant="white" 
                size="lg" 
                radius="xl"
                onClick={() => {
                  setSearchModalOpen(true);
                  fetchExistingUrls();
                }}
              >
                <IconSearch size={20} />
              </ActionIcon>
            </Tooltip>
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

      {/* Recipe Search/Import Modal */}
      <Modal
        opened={searchModalOpen}
        onClose={() => {
          setSearchModalOpen(false);
          setPreviewRecipe(null);
          setSearchQuery('');
          setSearchResults([]);
          setImportUrl('');
        }}
        title={
          <Group gap="sm">
            <IconSearch size={24} color="#fd7e14" />
            <Text fw={700} size="lg">Find New Recipe</Text>
          </Group>
        }
        size="lg"
        radius="lg"
      >
        {previewRecipe ? (
          // Recipe Preview
          <Stack gap="md">
            <Paper p="md" radius="lg" style={{ background: '#fff7ed', border: '2px solid #fed7aa' }}>
              <Group gap="md" mb="sm">
                <Text style={{ fontSize: '2.5rem' }}>{previewRecipe.icon}</Text>
                <Box style={{ flex: 1 }}>
                  <Text fw={700} size="xl">{previewRecipe.title}</Text>
                  {previewRecipe.description && (
                    <Text c="dimmed" size="sm">{previewRecipe.description}</Text>
                  )}
                </Box>
              </Group>
              <Group gap="md">
                {previewRecipe.prep_time && (
                  <Badge leftSection={<IconClock size={12} />} color="orange" variant="light">
                    {previewRecipe.prep_time}m prep
                  </Badge>
                )}
                {previewRecipe.cook_time && (
                  <Badge leftSection={<IconFlame size={12} />} color="orange" variant="light">
                    {previewRecipe.cook_time}m cook
                  </Badge>
                )}
                {previewRecipe.servings && (
                  <Badge color="orange" variant="light">Serves {previewRecipe.servings}</Badge>
                )}
              </Group>
            </Paper>

            <Box>
              <Text fw={600} mb="xs">Ingredients ({previewRecipe.ingredients?.length || 0})</Text>
              <ScrollArea h={120}>
                <Stack gap={4}>
                  {previewRecipe.ingredients?.map((ing: string, i: number) => (
                    <Text key={i} size="sm">• {ing}</Text>
                  ))}
                </Stack>
              </ScrollArea>
            </Box>

            <Box>
              <Text fw={600} mb="xs">Instructions ({previewRecipe.instructions?.length || 0} steps)</Text>
              <ScrollArea h={120}>
                <Stack gap={4}>
                  {previewRecipe.instructions?.map((step: string, i: number) => (
                    <Text key={i} size="sm">{i + 1}. {step}</Text>
                  ))}
                </Stack>
              </ScrollArea>
            </Box>

            <Group justify="space-between" mt="md">
              <Button variant="light" onClick={() => setPreviewRecipe(null)}>
                ← Back
              </Button>
              <Button color="green" leftSection={<IconDownload size={18} />} onClick={handleSaveRecipe}>
                Save Recipe
              </Button>
            </Group>
          </Stack>
        ) : (
          // Search/Import UI
          <Tabs defaultValue="search">
            <Tabs.List mb="md">
              <Tabs.Tab value="search" leftSection={<IconSearch size={16} />}>
                Search Web
              </Tabs.Tab>
              <Tabs.Tab value="url" leftSection={<IconLink size={16} />}>
                Paste URL
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="search">
              <Stack gap="md">
                <Group gap="sm">
                  <TextInput
                    placeholder="Search for recipes... (e.g., chicken parma)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    style={{ flex: 1 }}
                    size="md"
                    radius="md"
                  />
                  <Button 
                    color="orange" 
                    onClick={handleSearch} 
                    loading={searching}
                    leftSection={<IconSearch size={18} />}
                  >
                    Search
                  </Button>
                </Group>

                {searching && (
                  <Center py="xl">
                    <Stack align="center" gap="sm">
                      <Loader color="orange" size="lg" />
                      <Text fw={600} c="orange">🔍 Searching the web...</Text>
                      <Text size="sm" c="dimmed">This may take a few seconds</Text>
                    </Stack>
                  </Center>
                )}

                {!searching && searchResults.length > 0 && (
                  <ScrollArea h={350}>
                    <Stack gap="sm">
                      {searchResults.map((result, i) => {
                        const alreadyExists = isUrlExisting(result.url);
                        return (
                          <Paper 
                            key={i} 
                            p="md" 
                            radius="md" 
                            withBorder
                            style={{ 
                              cursor: alreadyExists ? 'default' : 'pointer',
                              background: alreadyExists ? '#f0fdf4' : undefined,
                              borderColor: alreadyExists ? '#86efac' : undefined,
                            }}
                            onClick={() => !alreadyExists && handleImport(result.url)}
                          >
                            <Group justify="space-between" align="flex-start">
                              <Box style={{ flex: 1 }}>
                                <Group gap="xs">
                                  <Text fw={600} lineClamp={1}>{result.title}</Text>
                                  {alreadyExists && (
                                    <Tooltip label="Already in your recipes">
                                      <Badge size="sm" color="green" variant="filled" leftSection={<IconCheck size={12} />}>
                                        Saved
                                      </Badge>
                                    </Tooltip>
                                  )}
                                </Group>
                                <Text size="sm" c="dimmed" lineClamp={2}>{result.description}</Text>
                                <Group gap="xs" mt="xs">
                                  <Badge size="sm" variant="light" color="gray">
                                    {result.source}
                                  </Badge>
                                  <ActionIcon 
                                    size="sm" 
                                    variant="subtle" 
                                    component="a" 
                                    href={result.url} 
                                    target="_blank"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <IconExternalLink size={14} />
                                  </ActionIcon>
                                </Group>
                              </Box>
                              {alreadyExists ? (
                                <ActionIcon size="lg" color="green" variant="light" radius="xl">
                                  <IconCheck size={20} />
                                </ActionIcon>
                              ) : (
                                <Button 
                                  size="xs" 
                                  color="orange" 
                                  variant="light"
                                  loading={importing}
                                >
                                  Import
                                </Button>
                              )}
                            </Group>
                          </Paper>
                        );
                      })}
                    </Stack>
                  </ScrollArea>
                )}

                {!searching && searchResults.length === 0 && !searchQuery && (
                  <Center py="xl">
                    <Stack align="center" gap="xs">
                      <Text size="2rem">🍳</Text>
                      <Text c="dimmed">Type a dish and click Search</Text>
                    </Stack>
                  </Center>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="url">
              <Stack gap="md">
                <TextInput
                  label="Recipe URL"
                  placeholder="https://example.com/recipe..."
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  size="md"
                  radius="md"
                />
                <Button 
                  color="orange" 
                  onClick={() => handleImport(importUrl)}
                  disabled={!importUrl.trim()}
                  loading={importing}
                  leftSection={<IconDownload size={18} />}
                >
                  Import Recipe
                </Button>

                {importing && (
                  <Center py="xl">
                    <Stack align="center" gap="sm">
                      <Loader color="orange" />
                      <Text c="dimmed">Fetching and parsing recipe...</Text>
                    </Stack>
                  </Center>
                )}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        )}
      </Modal>

    </Box>
  );
}
