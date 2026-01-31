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
  Textarea,
  Tooltip,
  TextInput,
  Tabs,
  ScrollArea,
  SimpleGrid,
  Drawer,
  CloseButton,
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
  IconWorld,
  IconNote,
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
  
  // POS-style picker modal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [pendingRecipeId, setPendingRecipeId] = useState<number | null>(null);
  
  // Recipe search/import state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{title: string; url: string; description: string; source: string}>>([]);
  const [searching, setSearching] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [previewRecipe, setPreviewRecipe] = useState<any>(null);
  const [existingUrls, setExistingUrls] = useState<Set<string>>(new Set());
  
  // Source viewer
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState<string>('');

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
      navigate(`/recipe/${plan.recipe_id}`);
    } else {
      openPicker(dayIndex);
    }
  };

  const openPicker = (dayIndex: number) => {
    setSelectedDay(dayIndex);
    setPickerSearch('');
    setAssignNotes('');
    setSearchQuery('');
    setSearchResults([]);
    setPreviewRecipe(null);
    setPickerOpen(true);
    fetchExistingUrls();
  };

  const handleSelectRecipe = async (recipeId: number) => {
    if (selectedDay === null) return;
    
    try {
      await api.setDinnerPlan({
        recipe_id: recipeId,
        day_of_week: selectedDay,
        week_start: weekStart,
        notes: assignNotes || undefined
      });
      setPickerOpen(false);
      loadData();
      notifications.show({ 
        title: 'Done!', 
        message: `Recipe assigned to ${DAYS[selectedDay]}`,
        color: 'green' 
      });
    } catch (err) {
      console.error('Failed to assign recipe:', err);
      notifications.show({ title: 'Error', message: 'Failed to assign recipe', color: 'red' });
    }
  };

  const handleSelectWithNotes = (recipeId: number) => {
    setPendingRecipeId(recipeId);
    setNotesModalOpen(true);
  };

  const handleConfirmWithNotes = async () => {
    if (pendingRecipeId) {
      await handleSelectRecipe(pendingRecipeId);
    }
    setNotesModalOpen(false);
    setPendingRecipeId(null);
  };

  // Fetch existing recipe source URLs for duplicate detection
  const fetchExistingUrls = async () => {
    try {
      const res = await fetch('/api/recipes/source-urls');
      const urlData = await res.json();
      setExistingUrls(new Set(urlData.urls || []));
    } catch (err) {
      console.error('Failed to fetch existing URLs:', err);
    }
  };

  const isUrlExisting = (url: string) => {
    const normalize = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
    const normalized = normalize(url);
    return Array.from(existingUrls).some(existing => normalize(existing) === normalized);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    await fetchExistingUrls();
    try {
      const res = await fetch('/api/recipes/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const searchData = await res.json();
      setSearchResults(searchData.results || []);
    } catch (err) {
      console.error('Search failed:', err);
      notifications.show({ title: 'Error', message: 'Search failed', color: 'red' });
    } finally {
      setSearching(false);
    }
  };

  const handleImport = async (url: string) => {
    setImporting(true);
    setPreviewRecipe(null);
    try {
      const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const importData = await res.json();
      if (importData.error) throw new Error(importData.error);
      setPreviewRecipe(importData.recipe);
    } catch (err: any) {
      console.error('Import failed:', err);
      notifications.show({ title: 'Import Failed', message: err.message || 'Could not import recipe', color: 'red' });
    } finally {
      setImporting(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!previewRecipe) return;
    try {
      const newRecipe = await api.createRecipe({
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
      setSearchQuery('');
      setSearchResults([]);
      setImportUrl('');
      loadData();
      // Auto-select the new recipe
      if (newRecipe?.id) {
        handleSelectRecipe(newRecipe.id);
      }
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
      const result = await api.copyLastWeekPlan();
      loadData();
      notifications.show({ 
        title: 'Copied!', 
        message: `${result.copied} meals copied from last week`,
        color: 'green' 
      });
    } catch (err) {
      console.error('Failed to copy last week:', err);
    }
  };

  const handleEditDay = (dayIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    openPicker(dayIndex);
  };

  const openSourceViewer = (url: string, title: string) => {
    setSourceUrl(url);
    setSourceTitle(title);
  };

  // Filter recipes for picker
  const filteredRecipes = data?.recipes.filter(r => 
    r.title.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    r.tags?.some(t => t.toLowerCase().includes(pickerSearch.toLowerCase()))
  ) || [];

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
            <ActionIcon variant="white" size="lg" radius="xl" onClick={handlePrevWeek}>
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
            <ActionIcon variant="white" size="lg" radius="xl" onClick={handleNextWeek}>
              <IconChevronRight size={20} />
            </ActionIcon>
          </Group>

          <Group gap="sm">
            {isCurrentWeek && (
              <Badge size="lg" variant="white" color="orange">This Week</Badge>
            )}
            <Badge size="lg" variant="white" color="orange" leftSection="🍽️">
              {plannedDays}/{totalDays} Planned
            </Badge>
            {plannedDays < totalDays && (
              <Tooltip label="Copy last week's plan">
                <ActionIcon variant="white" size="lg" radius="xl" onClick={handleCopyLastWeek}>
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
                  : plan ? '#ffffff' : '#f8f9fa',
                border: isToday 
                  ? '3px solid #fd7e14'
                  : plan ? '2px solid #ffe8cc' : '2px dashed #dee2e6',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'all 0.2s',
              }}
            >
              <Group justify="space-between" mb="sm">
                <Box>
                  <Text size="xs" fw={700} c={isToday ? 'orange' : 'dimmed'} tt="uppercase">
                    {SHORT_DAYS[dayIndex]}
                  </Text>
                  <Text size="lg" fw={800} c={isToday ? 'orange.7' : 'dark'}>{day}</Text>
                </Box>
                {isToday && <Badge size="sm" color="orange" variant="filled">TODAY</Badge>}
              </Group>

              {plan && recipe ? (
                <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Center mb="sm">
                    <Text style={{ fontSize: '3rem' }}>{recipe.icon}</Text>
                  </Center>
                  <Text size="md" fw={700} ta="center" lineClamp={2} style={{ flex: 1 }}>
                    {recipe.title}
                  </Text>
                  {(recipe.prep_time || recipe.cook_time) && (
                    <Group gap="xs" justify="center" mt="xs">
                      {recipe.prep_time && (
                        <Badge size="xs" variant="light" color="gray" leftSection={<IconClock size={10} />}>
                          {recipe.prep_time}m
                        </Badge>
                      )}
                      {recipe.cook_time && (
                        <Badge size="xs" variant="light" color="orange" leftSection={<IconFlame size={10} />}>
                          {recipe.cook_time}m
                        </Badge>
                      )}
                    </Group>
                  )}
                  {plan.notes && (
                    <Text size="xs" c="dimmed" ta="center" mt="xs" lineClamp={1}>📝 {plan.notes}</Text>
                  )}
                  <Stack gap="xs" align="center" mt="md">
                    {recipe.source_url && (
                      <Tooltip label="View original recipe" position="left">
                        <ActionIcon 
                          size="xl" 
                          variant="light" 
                          color="gray"
                          radius="xl"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSourceViewer(recipe.source_url!, recipe.title);
                          }}
                        >
                          <IconWorld size={24} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    <Tooltip label="Change meal" position="left">
                      <ActionIcon size="xl" variant="light" color="blue" radius="xl" onClick={(e) => handleEditDay(dayIndex, e)}>
                        <IconPlus size={24} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Clear" position="left">
                      <ActionIcon size="xl" variant="light" color="red" radius="xl" onClick={(e) => handleClearDay(dayIndex, e)}>
                        <IconX size={24} />
                      </ActionIcon>
                    </Tooltip>
                  </Stack>
                </Box>
              ) : (
                <Center style={{ flex: 1, flexDirection: 'column', gap: 8 }}>
                  <ActionIcon size={60} variant="light" color="gray" radius="xl">
                    <IconPlus size={30} />
                  </ActionIcon>
                  <Text size="sm" c="dimmed" fw={500}>Add meal</Text>
                </Center>
              )}
            </Paper>
          );
        })}
      </Box>

      {/* POS-Style Recipe Picker Modal */}
      <Modal
        opened={pickerOpen}
        onClose={() => setPickerOpen(false)}
        fullScreen
        withCloseButton={false}
        padding={0}
        styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column' } }}
      >
        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
          {/* Header */}
          <Paper 
            p="md" 
            radius={0}
            style={{ background: 'linear-gradient(135deg, #ff922b 0%, #fd7e14 100%)', flexShrink: 0 }}
          >
            <Group justify="space-between">
              <Group gap="md">
                <Text style={{ fontSize: '2rem' }}>🍽️</Text>
                <Box>
                  <Title order={3} c="white">
                    {selectedDay !== null ? `${DAYS[selectedDay]}'s Dinner` : 'Choose Recipe'}
                  </Title>
                  <Text size="sm" c="white" style={{ opacity: 0.9 }}>
                    Tap a recipe to select it
                  </Text>
                </Box>
              </Group>
              <CloseButton 
                size="xl" 
                variant="white" 
                onClick={() => setPickerOpen(false)}
                style={{ color: 'white' }}
              />
            </Group>
          </Paper>

          {/* Content */}
          <Box style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Left Panel - Your Recipes */}
            <Box style={{ flex: 2, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e9ecef' }}>
              <Paper p="md" radius={0} style={{ background: 'white', flexShrink: 0 }}>
                <Group gap="md">
                  <TextInput
                    placeholder="Search your recipes..."
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    leftSection={<IconSearch size={18} />}
                    style={{ flex: 1 }}
                    size="lg"
                    radius="xl"
                  />
                  <Badge size="xl" variant="light" color="orange" radius="md">
                    {filteredRecipes.length} recipes
                  </Badge>
                </Group>
              </Paper>

              <ScrollArea style={{ flex: 1 }} p="md">
                {filteredRecipes.length > 0 ? (
                  <SimpleGrid cols={4} spacing="md">
                    {filteredRecipes.map(recipe => (
                      <Paper
                        key={recipe.id}
                        p="lg"
                        radius="lg"
                        shadow="sm"
                        style={{ 
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          border: '2px solid transparent',
                          background: 'white',
                        }}
                        onClick={() => handleSelectRecipe(recipe.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleSelectWithNotes(recipe.id);
                        }}
                        className="recipe-card-hover"
                      >
                        <Center mb="sm">
                          <Text style={{ fontSize: '3rem' }}>{recipe.icon}</Text>
                        </Center>
                        <Text fw={700} ta="center" lineClamp={2} mb="xs">
                          {recipe.title}
                        </Text>
                        <Group gap={4} justify="center">
                          {recipe.prep_time && (
                            <Badge size="xs" variant="light" color="gray">
                              {recipe.prep_time}m prep
                            </Badge>
                          )}
                          {recipe.cook_time && (
                            <Badge size="xs" variant="light" color="orange">
                              {recipe.cook_time}m cook
                            </Badge>
                          )}
                        </Group>
                        {recipe.source_url && (
                          <Center mt="xs">
                            <ActionIcon 
                              size="sm" 
                              variant="subtle" 
                              color="gray"
                              onClick={(e) => {
                                e.stopPropagation();
                                openSourceViewer(recipe.source_url!, recipe.title);
                              }}
                            >
                              <IconExternalLink size={14} />
                            </ActionIcon>
                          </Center>
                        )}
                      </Paper>
                    ))}
                  </SimpleGrid>
                ) : (
                  <Center py="xl">
                    <Stack align="center" gap="md">
                      <Text style={{ fontSize: '4rem' }}>🍳</Text>
                      <Text fw={600} size="lg" c="dimmed">No recipes found</Text>
                      <Text c="dimmed">Try searching the web on the right →</Text>
                    </Stack>
                  </Center>
                )}
              </ScrollArea>

              {/* Quick Notes Button */}
              <Paper p="sm" radius={0} style={{ background: '#fff7ed', borderTop: '1px solid #fed7aa', flexShrink: 0 }}>
                <Group gap="sm" justify="center">
                  <IconNote size={18} color="#f97316" />
                  <Text size="sm" c="orange.7">
                    Right-click a recipe to add notes before selecting
                  </Text>
                </Group>
              </Paper>
            </Box>

            {/* Right Panel - Search & Import */}
            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
              <Paper p="md" radius={0} style={{ background: '#f8f9fa', flexShrink: 0 }}>
                <Text fw={700} size="lg" mb="xs">🔍 Find New Recipes</Text>
                <Text size="sm" c="dimmed">Search the web or paste a URL</Text>
              </Paper>

              <Box style={{ flex: 1, overflow: 'auto' }} p="md">
                {previewRecipe ? (
                  // Recipe Preview
                  <Stack gap="md">
                    <Paper p="md" radius="lg" style={{ background: '#fff7ed', border: '2px solid #fed7aa' }}>
                      <Group gap="md" mb="sm">
                        <Text style={{ fontSize: '2.5rem' }}>{previewRecipe.icon}</Text>
                        <Box style={{ flex: 1 }}>
                          <Text fw={700} size="lg">{previewRecipe.title}</Text>
                          {previewRecipe.description && (
                            <Text c="dimmed" size="sm" lineClamp={2}>{previewRecipe.description}</Text>
                          )}
                        </Box>
                      </Group>
                      <Group gap="xs">
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
                      <Text fw={600} size="sm" mb="xs">
                        Ingredients ({previewRecipe.ingredients?.length || 0})
                      </Text>
                      <Paper p="sm" radius="md" style={{ background: '#f8f9fa', maxHeight: 120, overflow: 'auto' }}>
                        {previewRecipe.ingredients?.slice(0, 8).map((ing: string, i: number) => (
                          <Text key={i} size="xs">• {ing}</Text>
                        ))}
                        {previewRecipe.ingredients?.length > 8 && (
                          <Text size="xs" c="dimmed">...and {previewRecipe.ingredients.length - 8} more</Text>
                        )}
                      </Paper>
                    </Box>

                    <Box>
                      <Text fw={600} size="sm" mb="xs">
                        Instructions ({previewRecipe.instructions?.length || 0} steps)
                      </Text>
                      <Paper p="sm" radius="md" style={{ background: '#f8f9fa', maxHeight: 120, overflow: 'auto' }}>
                        {previewRecipe.instructions?.slice(0, 4).map((step: string, i: number) => (
                          <Text key={i} size="xs" mb={4}>{i + 1}. {step}</Text>
                        ))}
                        {previewRecipe.instructions?.length > 4 && (
                          <Text size="xs" c="dimmed">...and {previewRecipe.instructions.length - 4} more steps</Text>
                        )}
                      </Paper>
                    </Box>

                    {previewRecipe.source_url && (
                      <Button 
                        variant="light" 
                        color="gray"
                        leftSection={<IconWorld size={16} />}
                        onClick={() => openSourceViewer(previewRecipe.source_url, previewRecipe.title)}
                      >
                        View Original Page
                      </Button>
                    )}

                    <Group grow>
                      <Button variant="light" onClick={() => setPreviewRecipe(null)}>
                        ← Back
                      </Button>
                      <Button 
                        color="green" 
                        leftSection={<IconDownload size={18} />} 
                        onClick={handleSaveRecipe}
                      >
                        Save & Select
                      </Button>
                    </Group>
                  </Stack>
                ) : (
                  // Search UI
                  <Tabs defaultValue="search">
                    <Tabs.List mb="md">
                      <Tabs.Tab value="search" leftSection={<IconSearch size={16} />}>
                        Search
                      </Tabs.Tab>
                      <Tabs.Tab value="url" leftSection={<IconLink size={16} />}>
                        URL
                      </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="search">
                      <Stack gap="md">
                        <TextInput
                          placeholder="e.g., chicken parma, beef stew..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          rightSection={
                            <ActionIcon color="orange" onClick={handleSearch} loading={searching}>
                              <IconSearch size={18} />
                            </ActionIcon>
                          }
                          size="md"
                          radius="md"
                        />

                        {searching && (
                          <Center py="xl">
                            <Stack align="center" gap="sm">
                              <Loader color="orange" />
                              <Text size="sm" c="dimmed">Searching...</Text>
                            </Stack>
                          </Center>
                        )}

                        {!searching && searchResults.length > 0 && (
                          <Stack gap="xs">
                            {searchResults.map((result, i) => {
                              const alreadyExists = isUrlExisting(result.url);
                              return (
                                <Paper 
                                  key={i} 
                                  p="sm" 
                                  radius="md" 
                                  withBorder
                                  style={{ 
                                    cursor: alreadyExists ? 'default' : 'pointer',
                                    background: alreadyExists ? '#f0fdf4' : undefined,
                                    borderColor: alreadyExists ? '#86efac' : undefined,
                                  }}
                                  onClick={() => !alreadyExists && handleImport(result.url)}
                                >
                                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                                    <Box style={{ flex: 1, minWidth: 0 }}>
                                      <Group gap="xs" wrap="nowrap">
                                        {alreadyExists && (
                                          <IconCheck size={16} color="#22c55e" style={{ flexShrink: 0 }} />
                                        )}
                                        <Text fw={600} size="sm" lineClamp={1}>{result.title}</Text>
                                      </Group>
                                      <Text size="xs" c="dimmed" lineClamp={1}>{result.source}</Text>
                                    </Box>
                                    {!alreadyExists && (
                                      <ActionIcon 
                                        color="orange" 
                                        variant="light" 
                                        size="sm"
                                        loading={importing}
                                      >
                                        <IconDownload size={14} />
                                      </ActionIcon>
                                    )}
                                  </Group>
                                </Paper>
                              );
                            })}
                          </Stack>
                        )}

                        {!searching && searchResults.length === 0 && (
                          <Center py="lg">
                            <Text size="sm" c="dimmed">Enter a dish name and press Enter</Text>
                          </Center>
                        )}
                      </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="url">
                      <Stack gap="md">
                        <TextInput
                          placeholder="https://..."
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
                      </Stack>
                    </Tabs.Panel>
                  </Tabs>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </Modal>

      {/* Notes Modal */}
      <Modal
        opened={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        title={<Text fw={700}>📝 Add Notes</Text>}
        size="sm"
        radius="lg"
      >
        <Stack gap="md">
          <Textarea
            placeholder="e.g., Use leftover chicken, make extra rice..."
            value={assignNotes}
            onChange={(e) => setAssignNotes(e.target.value)}
            rows={3}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setNotesModalOpen(false)}>
              Cancel
            </Button>
            <Button color="orange" onClick={handleConfirmWithNotes}>
              Select Recipe
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Source Viewer Drawer */}
      <Drawer
        opened={!!sourceUrl}
        onClose={() => setSourceUrl(null)}
        title={
          <Group gap="sm">
            <IconWorld size={20} />
            <Text fw={700} lineClamp={1}>{sourceTitle}</Text>
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
                href={sourceUrl || ''}
                target="_blank"
                leftSection={<IconExternalLink size={16} />}
              >
                Open in New Tab
              </Button>
            </Group>
          </Paper>
          {sourceUrl && (
            <iframe
              src={sourceUrl}
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

      {/* CSS for hover effect */}
      <style>{`
        .recipe-card-hover:hover {
          border-color: #fd7e14 !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(253, 126, 20, 0.2);
        }
      `}</style>
    </Box>
  );
}
