import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Text,
  Title,
  Paper,
  Group,
  Stack,
  ActionIcon,
  Center,
  Loader,
  Button,
  TextInput,
  NumberInput,
  Modal,
  Tabs,
  Table,
  Checkbox,
  Badge,
  PinInput,
  Tooltip,
  ThemeIcon,
  ScrollArea,
  Switch,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconEdit,
  IconUsers,
  IconChecklist,
  IconCalendar,
  IconHistory,
  IconLock,
  IconCheck,
  IconSettings,
  IconStar,
  IconToolsKitchen2,
  IconExternalLink,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import * as api from '../api';
import type { FamilyMember, Chore, Assignment, ExtraTask, Recipe } from '../types';
import { DAYS, SHORT_DAYS, MEMBER_COLORS, CHORE_ICONS, AVATAR_EMOJIS, EXTRA_TASK_ICONS, RECIPE_ICONS } from '../types';

export default function AdminView() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [history, setHistory] = useState<unknown[]>([]);

  const [memberModalOpened, { open: openMemberModal, close: closeMemberModal }] = useDisclosure();
  const [choreModalOpened, { open: openChoreModal, close: closeChoreModal }] = useDisclosure();
  const [extraTaskModalOpened, { open: openExtraTaskModal, close: closeExtraTaskModal }] = useDisclosure();
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);

  const [memberForm, setMemberForm] = useState({
    name: '',
    color: MEMBER_COLORS[0],
    avatar: '👤',
    pin: '',
  });
  const [choreForm, setChoreForm] = useState({
    title: '',
    icon: '📋',
    points: 1,
  });

  // Extra tasks
  const [extraTasks, setExtraTasks] = useState<ExtraTask[]>([]);
  const [editingExtraTask, setEditingExtraTask] = useState<ExtraTask | null>(null);
  const [extraTaskForm, setExtraTaskForm] = useState({
    title: '',
    icon: '⭐',
    stars: 1,
  });

  // Recipes
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeModalOpened, { open: openRecipeModal, close: closeRecipeModal }] = useDisclosure();
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeForm, setRecipeForm] = useState({
    title: '',
    icon: '🍽️',
    description: '',
  });
  const [recipeSearch, setRecipeSearch] = useState('');

  // Search filters
  const [choreSearch, setChoreSearch] = useState('');
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  const isMobile = useMediaQuery('(max-width: 767px)');

  const checkAdminStatus = useCallback(async () => {
    try {
      const status = await api.getAdminStatus();
      setIsAdmin(status.isAdmin);
      if (status.isAdmin) {
        loadAllData();
      }
    } catch {
      console.error('Failed to check admin status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  const loadAllData = async () => {
    try {
      const [membersData, choresData, assignmentsData, historyData, extraTasksData, recipesData] = await Promise.all([
        api.getMembers(),
        api.getChores(),
        api.getAssignments(),
        api.getHistory(4),
        api.getExtraTasks(),
        api.getRecipes(),
      ]);
      setMembers(membersData);
      setChores(choresData);
      setAssignments(assignmentsData);
      setHistory(historyData);
      setExtraTasks(extraTasksData);
      setRecipes(recipesData);
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to load data',
        color: 'red',
      });
    }
  };

  const handlePinSubmit = async (value: string) => {
    setVerifying(true);
    try {
      await api.verifyAdmin(value);
      setIsAdmin(true);
      loadAllData();
    } catch {
      notifications.show({
        title: 'Wrong PIN',
        message: 'Invalid admin PIN',
        color: 'red',
      });
      setPin('');
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = async () => {
    await api.logoutAdmin();
    setIsAdmin(false);
    setPin('');
  };

  const handleSaveMember = async () => {
    try {
      if (editingMember) {
        await api.updateMember(editingMember.id, memberForm);
      } else {
        if (memberForm.pin.length !== 4) {
          notifications.show({ title: 'Error', message: 'PIN must be 4 digits', color: 'red' });
          return;
        }
        await api.createMember(memberForm);
      }
      loadAllData();
      closeMemberModal();
      resetMemberForm();
      notifications.show({ 
        title: 'Success', 
        message: editingMember ? 'Member updated' : 'Member added',
        color: 'green' 
      });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to save member', color: 'red' });
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('Delete this family member? This will also delete their assignments.')) return;
    try {
      await api.deleteMember(id);
      loadAllData();
      notifications.show({ title: 'Deleted', message: 'Member removed', color: 'gray' });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to delete member', color: 'red' });
    }
  };

  const openEditMember = (member: FamilyMember) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name,
      color: member.color,
      avatar: member.avatar,
      pin: '',
    });
    openMemberModal();
  };

  const resetMemberForm = () => {
    setEditingMember(null);
    setMemberForm({ name: '', color: MEMBER_COLORS[0], avatar: '👤', pin: '' });
  };

  const handleSaveChore = async () => {
    try {
      if (editingChore) {
        await api.updateChore(editingChore.id, choreForm);
      } else {
        await api.createChore(choreForm);
      }
      loadAllData();
      closeChoreModal();
      resetChoreForm();
      notifications.show({ 
        title: 'Success', 
        message: editingChore ? 'Chore updated' : 'Chore added',
        color: 'green' 
      });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to save chore', color: 'red' });
    }
  };

  // Extra Tasks handlers
  const handleSaveExtraTask = async () => {
    try {
      if (editingExtraTask) {
        await api.updateExtraTask(editingExtraTask.id, extraTaskForm);
      } else {
        await api.createExtraTask(extraTaskForm);
      }
      loadAllData();
      closeExtraTaskModal();
      resetExtraTaskForm();
      notifications.show({ 
        title: 'Success', 
        message: editingExtraTask ? 'Bonus task updated' : 'Bonus task added',
        color: 'green' 
      });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to save bonus task', color: 'red' });
    }
  };

  const handleDeleteExtraTask = async (id: number) => {
    if (!confirm('Delete this bonus task?')) return;
    try {
      await api.deleteExtraTask(id);
      loadAllData();
      notifications.show({ title: 'Deleted', message: 'Bonus task removed', color: 'gray' });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to delete bonus task', color: 'red' });
    }
  };

  const openEditExtraTask = (task: ExtraTask) => {
    setEditingExtraTask(task);
    setExtraTaskForm({ 
      title: task.title, 
      icon: task.icon, 
      stars: task.stars,
    });
    openExtraTaskModal();
  };

  const resetExtraTaskForm = () => {
    setEditingExtraTask(null);
    setExtraTaskForm({ title: '', icon: '⭐', stars: 1 });
  };

  // Recipe handlers
  const handleSaveRecipe = async () => {
    try {
      if (editingRecipe) {
        await api.updateRecipe(editingRecipe.id, {
          ...editingRecipe,
          title: recipeForm.title,
          icon: recipeForm.icon,
          description: recipeForm.description,
        });
      } else {
        await api.createRecipe({
          title: recipeForm.title,
          icon: recipeForm.icon,
          description: recipeForm.description,
          ingredients: [],
          instructions: [],
          tags: [],
        });
      }
      loadAllData();
      closeRecipeModal();
      resetRecipeForm();
      notifications.show({ 
        title: 'Success', 
        message: editingRecipe ? 'Recipe updated' : 'Recipe added',
        color: 'green' 
      });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to save recipe', color: 'red' });
    }
  };

  const handleDeleteRecipe = async (id: number) => {
    if (!confirm('Delete this recipe? This will also remove it from any dinner plans.')) return;
    try {
      await api.deleteRecipe(id);
      loadAllData();
      notifications.show({ title: 'Deleted', message: 'Recipe removed', color: 'gray' });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to delete recipe', color: 'red' });
    }
  };

  const openEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setRecipeForm({ 
      title: recipe.title, 
      icon: recipe.icon, 
      description: recipe.description || '',
    });
    openRecipeModal();
  };

  const resetRecipeForm = () => {
    setEditingRecipe(null);
    setRecipeForm({ title: '', icon: '🍽️', description: '' });
  };

  const handleDeleteChore = async (id: number) => {
    if (!confirm('Delete this chore? This will also delete all assignments.')) return;
    try {
      await api.deleteChore(id);
      loadAllData();
      notifications.show({ title: 'Deleted', message: 'Chore removed', color: 'gray' });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to delete chore', color: 'red' });
    }
  };

  const openEditChore = (chore: Chore) => {
    setEditingChore(chore);
    setChoreForm({ 
      title: chore.title, 
      icon: chore.icon, 
      points: chore.points,
    });
    openChoreModal();
  };

  const resetChoreForm = () => {
    setEditingChore(null);
    setChoreForm({ title: '', icon: '📋', points: 1 });
  };

  const hasAssignment = (choreId: number, memberId: number, dayOfWeek: number): number | null => {
    const a = assignments.find(
      a => a.chore_id === choreId && a.member_id === memberId && a.day_of_week === dayOfWeek
    );
    return a ? a.id : null;
  };

  const toggleAssignment = async (choreId: number, memberId: number, dayOfWeek: number) => {
    const existingId = hasAssignment(choreId, memberId, dayOfWeek);
    try {
      if (existingId) {
        await api.deleteAssignment(existingId);
      } else {
        await api.createAssignment({ chore_id: choreId, member_id: memberId, day_of_week: dayOfWeek });
      }
      loadAllData();
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to update assignment', color: 'red' });
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

  if (!isAdmin) {
    return (
      <div className="pin-container">
        <div className="pin-card slide-up">
          <ActionIcon 
            component={Link} 
            to="/" 
            variant="subtle" 
            size="lg"
            radius="xl"
            mb="xl"
            style={{ position: 'absolute', top: 20, left: 20 }}
          >
            <IconArrowLeft />
          </ActionIcon>
          
          <ThemeIcon size={80} radius="xl" variant="light" color="blue" mb="lg">
            <IconLock size={40} />
          </ThemeIcon>
          
          <Title order={2} mb="xs">Admin Access</Title>
          <Text c="dimmed" mb="xl">
            Enter the admin PIN to manage the chore chart
          </Text>
          
          <PinInput
            length={4}
            type="number"
            size="xl"
            value={pin}
            onChange={setPin}
            onComplete={handlePinSubmit}
            disabled={verifying}
            autoFocus
            styles={{
              input: { 
                fontSize: 24, 
                fontWeight: 700,
                width: 56,
                height: 64,
              }
            }}
          />
          
          {verifying && <Loader size="sm" mt="lg" />}
          
          <Text size="xs" c="dimmed" mt="xl">Default PIN: 1234</Text>
        </div>
      </div>
    );
  }

  return (
    <Box 
      style={{ 
        height: '100%', 
        display: 'grid',
        gridTemplateRows: '70px auto 1fr',
        gap: 2,
        background: '#e2e8f0',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        style={{
          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
        }}
      >
        <Group gap="md">
          <ActionIcon 
            component={Link} 
            to="/" 
            variant="white"
            size={40}
            radius="xl"
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Title order={2} c="white" fw={800}>⚙️ Admin Panel</Title>
        </Group>
        <Button 
          variant="white" 
          color="dark"
          onClick={handleLogout}
          radius="xl"
          size="sm"
        >
          Logout
        </Button>
      </Box>

      {/* Tab Navigation */}
      <Tabs defaultValue="members" variant="pills" radius="xl" style={{ display: 'contents' }}>
        <Box style={{ background: '#f8fafc', padding: '12px 16px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          <Tabs.List style={{ flexWrap: 'nowrap', gap: 8 }}>
            <Tabs.Tab value="members" leftSection={<IconUsers size={16} />}>Family</Tabs.Tab>
            <Tabs.Tab value="chores" leftSection={<IconChecklist size={16} />}>Chores</Tabs.Tab>
            <Tabs.Tab value="assignments" leftSection={<IconCalendar size={16} />}>Schedule</Tabs.Tab>
            <Tabs.Tab value="recipes" leftSection={<IconToolsKitchen2 size={16} />}>Recipes</Tabs.Tab>
            <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>History</Tabs.Tab>
            <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>Bonus Tasks</Tabs.Tab>
          </Tabs.List>
        </Box>

        <ScrollArea style={{ background: '#ffffff', padding: 16 }} scrollbarSize={8}>
        {/* FAMILY MEMBERS TAB */}
        <Tabs.Panel value="members">
          <Group justify="space-between" mb="lg">
            <Text fw={700} size="lg">Family Members ({members.length})</Text>
            <Button 
              leftSection={<IconPlus size={18} />}
              onClick={() => { resetMemberForm(); openMemberModal(); }}
              radius="xl"
            >
              Add Member
            </Button>
          </Group>

          <div className="admin-grid">
            {members.map(member => (
              <div key={member.id} className="admin-card">
                <Group gap="md">
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: `${member.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                      border: `3px solid ${member.color}`
                    }}
                  >
                    {member.avatar}
                  </div>
                  <div>
                    <Text fw={700} size="lg">{member.name}</Text>
                    <Badge 
                      size="sm" 
                      variant="light"
                      style={{ background: `${member.color}20`, color: member.color }}
                    >
                      {member.color}
                    </Badge>
                  </div>
                </Group>
                <Group gap="xs">
                  <ActionIcon 
                    variant="light" 
                    size="lg"
                    radius="xl"
                    onClick={() => openEditMember(member)}
                  >
                    <IconEdit size={18} />
                  </ActionIcon>
                  <ActionIcon 
                    variant="light" 
                    color="red" 
                    size="lg"
                    radius="xl"
                    onClick={() => handleDeleteMember(member.id)}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </div>
            ))}
            
            {members.length === 0 && (
              <Paper p="xl" ta="center" radius="lg" className="empty-state">
                <Text size="3rem" mb="sm">👨‍👩‍👧‍👦</Text>
                <Text fw={600}>No family members yet</Text>
                <Text size="sm" c="dimmed">Add your first family member to get started</Text>
              </Paper>
            )}
          </div>
        </Tabs.Panel>

        {/* CHORES TAB */}
        <Tabs.Panel value="chores">
          <Group justify="space-between" mb="lg">
            <Text fw={700} size="lg">Chores ({chores.length})</Text>
            <Group gap="md">
              <TextInput
                placeholder="Search chores..."
                value={choreSearch}
                onChange={(e) => setChoreSearch(e.target.value)}
                radius="xl"
                style={{ width: 200 }}
              />
              <Button 
                leftSection={<IconPlus size={18} />}
                onClick={() => { resetChoreForm(); openChoreModal(); }}
                radius="xl"
              >
                Add Chore
              </Button>
            </Group>
          </Group>

          <div className="admin-grid">
            {chores
              .filter(c => c.title.toLowerCase().includes(choreSearch.toLowerCase()))
              .map(chore => (
              <div key={chore.id} className="admin-card">
                <Group gap="md">
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28
                    }}
                  >
                    {chore.icon}
                  </div>
                  <div>
                    <Text fw={700} size="lg">{chore.title}</Text>
                  </div>
                </Group>
                <Group gap="xs">
                  <ActionIcon 
                    variant="light" 
                    size="lg"
                    radius="xl"
                    onClick={() => openEditChore(chore)}
                  >
                    <IconEdit size={18} />
                  </ActionIcon>
                  <ActionIcon 
                    variant="light" 
                    color="red" 
                    size="lg"
                    radius="xl"
                    onClick={() => handleDeleteChore(chore.id)}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </div>
            ))}
            
            {chores.length === 0 && (
              <Paper p="xl" ta="center" radius="lg" className="empty-state">
                <Text size="3rem" mb="sm">📋</Text>
                <Text fw={600}>No chores yet</Text>
                <Text size="sm" c="dimmed">Add some chores to assign to family members</Text>
              </Paper>
            )}
          </div>
        </Tabs.Panel>

        {/* ASSIGNMENTS TAB */}
        <Tabs.Panel value="assignments">
          <Group justify="space-between" mb="lg">
            <Text fw={700} size="lg">Weekly Schedule</Text>
            <TextInput
              placeholder="Search chores or members..."
              value={scheduleSearch}
              onChange={(e) => setScheduleSearch(e.target.value)}
              radius="xl"
              style={{ width: 250 }}
            />
          </Group>
          
          {members.length === 0 || chores.length === 0 ? (
            <Paper p="xl" ta="center" radius="lg" className="empty-state">
              <Text size="3rem" mb="sm">📅</Text>
              <Text fw={600}>
                Add some {members.length === 0 ? 'family members' : 'chores'} first
              </Text>
              <Text size="sm" c="dimmed">
                You need both family members and chores to create a schedule
              </Text>
            </Paper>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="assignment-table-wrapper">
                <ScrollArea>
                  <table className="assignment-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: 180 }}>Chore</th>
                        <th style={{ minWidth: 120 }}>Person</th>
                        {SHORT_DAYS.map((day, i) => (
                          <th key={i} style={{ width: 50 }}>{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chores
                        .filter(c => c.title.toLowerCase().includes(scheduleSearch.toLowerCase()))
                        .flatMap(chore => 
                        members
                          .filter(m => !scheduleSearch || m.name.toLowerCase().includes(scheduleSearch.toLowerCase()) || chore.title.toLowerCase().includes(scheduleSearch.toLowerCase()))
                          .map((member, mIdx) => (
                          <tr key={`${chore.id}-${member.id}`}>
                            {mIdx === 0 && (
                              <td rowSpan={members.length} style={{ textAlign: 'left' }}>
                                <Group gap="sm" wrap="nowrap">
                                  <Text size="xl">{chore.icon}</Text>
                                  <Text fw={600}>{chore.title}</Text>
                                </Group>
                              </td>
                            )}
                            <td style={{ textAlign: 'left' }}>
                              <Group gap="xs" wrap="nowrap">
                                <Text>{member.avatar}</Text>
                                <Text size="sm" fw={500}>{member.name}</Text>
                              </Group>
                            </td>
                            {DAYS.map((_, dayIdx) => (
                              <td key={dayIdx}>
                                <Checkbox
                                  checked={!!hasAssignment(chore.id, member.id, dayIdx)}
                                  onChange={() => toggleAssignment(chore.id, member.id, dayIdx)}
                                  size="md"
                                  styles={{ 
                                    input: { cursor: 'pointer' },
                                    root: { display: 'flex', justifyContent: 'center' }
                                  }}
                                />
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>

              {/* Mobile Cards */}
              <div className="mobile-assignments">
                <Stack gap="lg">
                  {chores.map(chore => (
                    <div key={chore.id} className="mobile-assignment-card">
                      <div className="mobile-assignment-header">
                        <Text size="xl">{chore.icon}</Text>
                        <Text fw={700}>{chore.title}</Text>
                      </div>
                      
                      {members.map(member => (
                        <div key={member.id} style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>
                          <Group gap="sm" mb="sm">
                            <Text>{member.avatar}</Text>
                            <Text fw={600} size="sm">{member.name}</Text>
                          </Group>
                          <div className="mobile-assignment-grid">
                            {SHORT_DAYS.map((day, dayIdx) => (
                              <div key={dayIdx} className="mobile-assignment-day">
                                <div className="mobile-assignment-day-label">{day}</div>
                                <Checkbox
                                  checked={!!hasAssignment(chore.id, member.id, dayIdx)}
                                  onChange={() => toggleAssignment(chore.id, member.id, dayIdx)}
                                  size="md"
                                  styles={{ 
                                    input: { cursor: 'pointer' },
                                    root: { display: 'flex', justifyContent: 'center' }
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </Stack>
              </div>
            </>
          )}
        </Tabs.Panel>

        {/* RECIPES TAB */}
        <Tabs.Panel value="recipes">
          <Group justify="space-between" mb="lg">
            <Text fw={700} size="lg">Recipes ({recipes.length})</Text>
            <Group gap="md">
              <TextInput
                placeholder="Search recipes..."
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                radius="xl"
                style={{ width: 200 }}
              />
              <Button 
                leftSection={<IconPlus size={18} />}
                onClick={() => { resetRecipeForm(); openRecipeModal(); }}
                radius="xl"
                color="orange"
              >
                Add Recipe
              </Button>
            </Group>
          </Group>

          <div className="admin-grid">
            {recipes
              .filter(r => r.title.toLowerCase().includes(recipeSearch.toLowerCase()))
              .map(recipe => (
              <div key={recipe.id} className="admin-card">
                <Group gap="md" style={{ flex: 1 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      background: '#fff7ed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28
                    }}
                  >
                    {recipe.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={700} size="lg" lineClamp={1}>{recipe.title}</Text>
                    <Group gap="xs">
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
                      {recipe.source_url && (
                        <Tooltip label="Imported from web">
                          <ActionIcon 
                            size="xs" 
                            variant="subtle" 
                            component="a" 
                            href={recipe.source_url} 
                            target="_blank"
                          >
                            <IconExternalLink size={12} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </div>
                </Group>
                <Group gap="xs">
                  <ActionIcon 
                    variant="light" 
                    size="lg"
                    radius="xl"
                    color="orange"
                    onClick={() => openEditRecipe(recipe)}
                  >
                    <IconEdit size={18} />
                  </ActionIcon>
                  <ActionIcon 
                    variant="light" 
                    color="red" 
                    size="lg"
                    radius="xl"
                    onClick={() => handleDeleteRecipe(recipe.id)}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </div>
            ))}
            
            {recipes.length === 0 && (
              <Paper p="xl" ta="center" radius="lg" className="empty-state">
                <Text size="3rem" mb="sm">🍽️</Text>
                <Text fw={600}>No recipes yet</Text>
                <Text size="sm" c="dimmed">Add recipes or import them from the Dinner Plan page</Text>
              </Paper>
            )}
          </div>
        </Tabs.Panel>

        {/* HISTORY TAB */}
        <Tabs.Panel value="history">
          <Group justify="space-between" mb="lg">
            <Text fw={700} size="lg">Recent Completions</Text>
            <TextInput
              placeholder="Search by name or chore..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              radius="xl"
              style={{ width: 250 }}
            />
          </Group>
          
          {history.length === 0 ? (
            <Paper p="xl" ta="center" radius="lg" className="empty-state">
              <Text size="3rem" mb="sm">📊</Text>
              <Text fw={600}>No completions yet</Text>
              <Text size="sm" c="dimmed">Completed chores will appear here</Text>
            </Paper>
          ) : (
            <Paper radius="lg" shadow="sm" style={{ overflow: 'hidden' }}>
              <ScrollArea>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Person</Table.Th>
                      <Table.Th>Chore</Table.Th>
                      <Table.Th visibleFrom="sm">Day</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {(history as Array<{
                      completed_at: string;
                      member_name: string;
                      member_color: string;
                      chore_title: string;
                      chore_icon: string;
                      day_of_week: number;
                    }>)
                      .filter(h => 
                        h.member_name.toLowerCase().includes(historySearch.toLowerCase()) ||
                        h.chore_title.toLowerCase().includes(historySearch.toLowerCase())
                      )
                      .slice(0, 50).map((h, i) => (
                      <Table.Tr key={i}>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {dayjs(h.completed_at).format(isMobile ? 'MMM D' : 'MMM D, h:mm A')}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge 
                            variant="light"
                            style={{ background: `${h.member_color}20`, color: h.member_color }}
                          >
                            {h.member_name}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <Text>{h.chore_icon}</Text>
                            <Text size="sm" fw={500} lineClamp={1}>{h.chore_title}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td visibleFrom="sm">
                          <Text size="sm" c="dimmed">{DAYS[h.day_of_week]}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          )}
        </Tabs.Panel>

        {/* SETTINGS TAB */}
        <Tabs.Panel value="settings">
          <Text fw={700} size="lg" mb="lg">Bonus Tasks</Text>
          <Text size="sm" c="dimmed" mb="lg">
            Extra tasks that anyone can claim and complete for bonus stars. Only one person can claim each task per day - they reset daily!
          </Text>
          
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={() => { resetExtraTaskForm(); openExtraTaskModal(); }}
            mb="lg"
            color="orange"
          >
            Add Bonus Task
          </Button>
          
          <Stack gap="md" mb="xl">
            {extraTasks.length === 0 ? (
              <Paper p="xl" radius="lg" shadow="sm" withBorder ta="center">
                <Text size="3rem" mb="md">⭐</Text>
                <Text c="dimmed">No bonus tasks yet. Add some to let kids earn extra stars!</Text>
              </Paper>
            ) : (
              extraTasks.map(task => (
                <Paper key={task.id} p="md" radius="lg" shadow="sm" withBorder>
                  <Group justify="space-between">
                    <Group gap="md">
                      <Text size="2rem">{task.icon}</Text>
                      <div>
                        <Text fw={700} size="lg">{task.title}</Text>
                        <Badge color="orange" size="sm" variant="light" leftSection={<IconStar size={12} />}>
                          {task.stars} {task.stars === 1 ? 'star' : 'stars'}
                        </Badge>
                      </div>
                    </Group>
                    <Group gap="xs">
                      <ActionIcon 
                        variant="light" 
                        size="lg"
                        radius="xl"
                        color="orange"
                        onClick={() => openEditExtraTask(task)}
                      >
                        <IconEdit size={18} />
                      </ActionIcon>
                      <ActionIcon 
                        variant="light" 
                        color="red" 
                        size="lg"
                        radius="xl"
                        onClick={() => handleDeleteExtraTask(task.id)}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Paper>
              ))
            )}
          </Stack>

          {/* Danger Zone */}
          <Paper p="lg" radius="lg" withBorder style={{ borderColor: '#fca5a5', background: '#fef2f2' }}>
            <Text fw={700} size="lg" c="red.7" mb="sm">⚠️ Danger Zone</Text>
            <Text size="sm" c="dimmed" mb="md">
              Reset all family members' stars to zero. This cannot be undone! History will be preserved.
            </Text>
            <Button 
              color="red" 
              variant="outline"
              leftSection={<IconTrash size={16} />}
              onClick={async () => {
                if (!confirm('Are you sure you want to reset ALL stars to zero? This cannot be undone!')) return;
                if (!confirm('Really? All stars will be gone. Type "yes" in the next prompt to confirm.')) return;
                try {
                  await api.resetAllStars();
                  loadAllData();
                  notifications.show({
                    title: 'Stars Reset',
                    message: 'All stars have been reset to 0',
                    color: 'red',
                  });
                } catch {
                  notifications.show({
                    title: 'Error',
                    message: 'Failed to reset stars',
                    color: 'red',
                  });
                }
              }}
            >
              Reset All Stars
            </Button>
          </Paper>
        </Tabs.Panel>
        </ScrollArea>
      </Tabs>

      {/* MEMBER MODAL */}
      <Modal
        opened={memberModalOpened}
        onClose={closeMemberModal}
        title={
          <Text fw={700} size="lg">
            {editingMember ? 'Edit Family Member' : 'Add Family Member'}
          </Text>
        }
        size="md"
        radius="lg"
        centered={!isMobile}
        fullScreen={isMobile}
      >
        <Stack gap="lg">
          <TextInput
            label="Name"
            placeholder="Enter name"
            value={memberForm.name}
            onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
            required
            size="md"
            radius="md"
          />

          <div>
            <Text size="sm" fw={600} mb="sm">Avatar</Text>
            <div className="emoji-grid">
              {AVATAR_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  className={`emoji-btn ${memberForm.avatar === emoji ? 'selected' : ''}`}
                  onClick={() => setMemberForm({ ...memberForm, avatar: emoji })}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Text size="sm" fw={600} mb="sm">Color</Text>
            <div className="color-grid">
              {MEMBER_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`color-btn ${memberForm.color === color ? 'selected' : ''}`}
                  style={{ background: color }}
                  onClick={() => setMemberForm({ ...memberForm, color })}
                />
              ))}
            </div>
          </div>

          <div>
            <Text size="sm" fw={600} mb="sm">
              PIN {editingMember ? '(leave blank to keep current)' : '(4 digits required)'}
            </Text>
            <PinInput
              length={4}
              type="number"
              size="lg"
              value={memberForm.pin}
              onChange={(value) => setMemberForm({ ...memberForm, pin: value })}
              styles={{ input: { fontWeight: 700 } }}
            />
          </div>

          <Group justify="flex-end" mt="md" gap="sm">
            <Button variant="subtle" onClick={closeMemberModal} radius="xl">
              Cancel
            </Button>
            <Button onClick={handleSaveMember} radius="xl" leftSection={<IconCheck size={18} />}>
              {editingMember ? 'Save Changes' : 'Add Member'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* CHORE MODAL */}
      <Modal
        opened={choreModalOpened}
        onClose={closeChoreModal}
        title={
          <Text fw={700} size="lg">
            {editingChore ? 'Edit Chore' : 'Add Chore'}
          </Text>
        }
        size="md"
        radius="lg"
        centered={!isMobile}
        fullScreen={isMobile}
      >
        <Stack gap="lg">
          <TextInput
            label="Title"
            placeholder="Enter chore name"
            value={choreForm.title}
            onChange={(e) => setChoreForm({ ...choreForm, title: e.target.value })}
            required
            size="md"
            radius="md"
          />

          <div>
            <Text size="sm" fw={600} mb="sm">Icon</Text>
            <div className="emoji-grid">
              {CHORE_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  className={`emoji-btn ${choreForm.icon === icon ? 'selected' : ''}`}
                  onClick={() => setChoreForm({ ...choreForm, icon })}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <Group justify="flex-end" mt="md" gap="sm">
            <Button variant="subtle" onClick={closeChoreModal} radius="xl">
              Cancel
            </Button>
            <Button onClick={handleSaveChore} radius="xl" leftSection={<IconCheck size={18} />}>
              {editingChore ? 'Save Changes' : 'Add Chore'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* EXTRA TASK MODAL */}
      <Modal
        opened={extraTaskModalOpened}
        onClose={closeExtraTaskModal}
        title={
          <Text fw={700} size="lg">
            {editingExtraTask ? 'Edit Bonus Task' : 'Add Bonus Task'}
          </Text>
        }
        size="md"
        radius="lg"
        centered={!isMobile}
        fullScreen={isMobile}
      >
        <Stack gap="md">
          <TextInput
            label="Task Name"
            placeholder="e.g., Wash the car"
            value={extraTaskForm.title}
            onChange={(e) => setExtraTaskForm({ ...extraTaskForm, title: e.target.value })}
            size="md"
            radius="md"
          />

          <div>
            <Text size="sm" fw={600} mb="sm">Icon</Text>
            <div className="emoji-grid">
              {EXTRA_TASK_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  className={`emoji-btn ${extraTaskForm.icon === icon ? 'selected' : ''}`}
                  onClick={() => setExtraTaskForm({ ...extraTaskForm, icon })}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <NumberInput
            label="Stars"
            description="Number of bonus stars for completing this task"
            value={extraTaskForm.stars}
            onChange={(value) => setExtraTaskForm({ ...extraTaskForm, stars: typeof value === 'number' ? value : 1 })}
            min={1}
            max={20}
            size="md"
            radius="md"
            leftSection={<IconStar size={18} color="#f59e0b" />}
          />

          <Group justify="flex-end" mt="md" gap="sm">
            <Button variant="subtle" onClick={closeExtraTaskModal} radius="xl">
              Cancel
            </Button>
            <Button onClick={handleSaveExtraTask} radius="xl" color="orange" leftSection={<IconCheck size={18} />}>
              {editingExtraTask ? 'Save Changes' : 'Add Task'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* RECIPE MODAL */}
      <Modal
        opened={recipeModalOpened}
        onClose={closeRecipeModal}
        title={
          <Text fw={700} size="lg">
            {editingRecipe ? 'Edit Recipe' : 'Add Recipe'}
          </Text>
        }
        size="md"
        radius="lg"
        centered={!isMobile}
        fullScreen={isMobile}
      >
        <Stack gap="md">
          <TextInput
            label="Recipe Name"
            placeholder="e.g., Chicken Parma"
            value={recipeForm.title}
            onChange={(e) => setRecipeForm({ ...recipeForm, title: e.target.value })}
            size="md"
            radius="md"
            required
          />

          <TextInput
            label="Description (optional)"
            placeholder="A brief description of the dish"
            value={recipeForm.description}
            onChange={(e) => setRecipeForm({ ...recipeForm, description: e.target.value })}
            size="md"
            radius="md"
          />

          <div>
            <Text size="sm" fw={600} mb="sm">Icon</Text>
            <div className="emoji-grid">
              {RECIPE_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  className={`emoji-btn ${recipeForm.icon === icon ? 'selected' : ''}`}
                  onClick={() => setRecipeForm({ ...recipeForm, icon })}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {editingRecipe && (
            <Paper p="md" radius="md" withBorder bg="gray.0">
              <Text size="sm" c="dimmed" mb="xs">Recipe Details</Text>
              <Group gap="md">
                <Badge variant="light" color="gray">
                  {editingRecipe.ingredients?.length || 0} ingredients
                </Badge>
                <Badge variant="light" color="gray">
                  {editingRecipe.instructions?.length || 0} steps
                </Badge>
                {editingRecipe.source_url && (
                  <Button 
                    size="xs" 
                    variant="light" 
                    component="a" 
                    href={editingRecipe.source_url} 
                    target="_blank"
                    leftSection={<IconExternalLink size={14} />}
                  >
                    View Source
                  </Button>
                )}
              </Group>
            </Paper>
          )}

          <Group justify="flex-end" mt="md" gap="sm">
            <Button variant="subtle" onClick={closeRecipeModal} radius="xl">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveRecipe} 
              radius="xl" 
              color="orange" 
              leftSection={<IconCheck size={18} />}
              disabled={!recipeForm.title.trim()}
            >
              {editingRecipe ? 'Save Changes' : 'Add Recipe'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
