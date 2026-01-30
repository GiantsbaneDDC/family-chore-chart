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
  IconCoin,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import * as api from '../api';
import type { FamilyMember, Chore, Assignment } from '../types';
import { DAYS, SHORT_DAYS, MEMBER_COLORS, CHORE_ICONS, AVATAR_EMOJIS } from '../types';

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
    money_value: null as number | null,
  });

  // Allowance settings
  const [allowanceEnabled, setAllowanceEnabled] = useState(false);
  const [jarMax, setJarMax] = useState(10);

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
      const [membersData, choresData, assignmentsData, historyData, allowanceSettings] = await Promise.all([
        api.getMembers(),
        api.getChores(),
        api.getAssignments(),
        api.getHistory(4),
        api.getAllowanceSettings(),
      ]);
      setMembers(membersData);
      setChores(choresData);
      setAssignments(assignmentsData);
      setHistory(historyData);
      setAllowanceEnabled(allowanceSettings.enabled);
      setJarMax(allowanceSettings.jarMax);
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
      const choreData = {
        ...choreForm,
        money_value: choreForm.money_value || null,
      };
      if (editingChore) {
        await api.updateChore(editingChore.id, choreData);
      } else {
        await api.createChore(choreData);
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

  const handleToggleAllowance = async (enabled: boolean) => {
    try {
      await api.updateAllowanceSettings({ enabled });
      setAllowanceEnabled(enabled);
      notifications.show({
        title: enabled ? 'Allowance Enabled' : 'Allowance Disabled',
        message: enabled ? 'Kids can now earn money for chores!' : 'Allowance tracking is off',
        color: enabled ? 'green' : 'gray',
      });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to update allowance settings', color: 'red' });
    }
  };

  const handleUpdateJarMax = async (value: number) => {
    try {
      await api.updateAllowanceSettings({ jarMax: value });
      setJarMax(value);
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to update jar max', color: 'red' });
    }
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
      money_value: chore.money_value || null 
    });
    openChoreModal();
  };

  const resetChoreForm = () => {
    setEditingChore(null);
    setChoreForm({ title: '', icon: '📋', points: 1, money_value: null });
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
    <Box className="admin-container safe-area-padding">
      {/* Header */}
      <Paper p="lg" mb="xl" radius="xl" shadow="sm">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Group gap="md">
            <ActionIcon 
              component={Link} 
              to="/" 
              variant="light" 
              size="xl" 
              radius="xl"
            >
              <IconArrowLeft size={22} />
            </ActionIcon>
            <div>
              <Title order={2} fw={800}>⚙️ Admin Panel</Title>
              <Text size="sm" c="dimmed">Manage your family chore chart</Text>
            </div>
          </Group>
          <Button 
            variant="subtle" 
            color="gray" 
            onClick={handleLogout}
            radius="xl"
          >
            Logout
          </Button>
        </Group>
      </Paper>

      <Tabs defaultValue="members" variant="pills" radius="xl">
        <ScrollArea scrollbarSize={0}>
          <Tabs.List mb="xl" style={{ flexWrap: 'nowrap' }}>
            <Tabs.Tab 
              value="members" 
              leftSection={<IconUsers size={18} />}
              style={{ fontWeight: 600 }}
            >
              Family
            </Tabs.Tab>
            <Tabs.Tab 
              value="chores" 
              leftSection={<IconChecklist size={18} />}
              style={{ fontWeight: 600 }}
            >
              Chores
            </Tabs.Tab>
            <Tabs.Tab 
              value="assignments" 
              leftSection={<IconCalendar size={18} />}
              style={{ fontWeight: 600 }}
            >
              Schedule
            </Tabs.Tab>
            <Tabs.Tab 
              value="history" 
              leftSection={<IconHistory size={18} />}
              style={{ fontWeight: 600 }}
            >
              History
            </Tabs.Tab>
            <Tabs.Tab 
              value="settings" 
              leftSection={<IconSettings size={18} />}
              style={{ fontWeight: 600 }}
            >
              Settings
            </Tabs.Tab>
          </Tabs.List>
        </ScrollArea>

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
            <Button 
              leftSection={<IconPlus size={18} />}
              onClick={() => { resetChoreForm(); openChoreModal(); }}
              radius="xl"
            >
              Add Chore
            </Button>
          </Group>

          <div className="admin-grid">
            {chores.map(chore => (
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
                    <Group gap="xs">
                      <Badge color="yellow" size="sm" variant="light">
                        ⭐ {chore.points} point{chore.points !== 1 ? 's' : ''}
                      </Badge>
                      {chore.money_value && (
                        <Badge color="green" size="sm" variant="light">
                          💵 ${Number(chore.money_value).toFixed(2)}
                        </Badge>
                      )}
                    </Group>
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
          <Text fw={700} size="lg" mb="lg">Weekly Schedule</Text>
          
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
                      {chores.flatMap(chore => 
                        members.map((member, mIdx) => (
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

        {/* HISTORY TAB */}
        <Tabs.Panel value="history">
          <Text fw={700} size="lg" mb="lg">Recent Completions</Text>
          
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
                    }>).slice(0, 50).map((h, i) => (
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
          <Text fw={700} size="lg" mb="lg">Settings</Text>
          
          <Stack gap="lg">
            {/* Allowance Settings */}
            <Paper p="lg" radius="lg" shadow="sm" withBorder>
              <Group justify="space-between" mb="md">
                <Group gap="md">
                  <ThemeIcon size="xl" radius="xl" color="green" variant="light">
                    <IconCoin size={24} />
                  </ThemeIcon>
                  <div>
                    <Text fw={700} size="lg">Allowance System</Text>
                    <Text size="sm" c="dimmed">Let kids earn money for completing chores</Text>
                  </div>
                </Group>
                <Switch
                  checked={allowanceEnabled}
                  onChange={(e) => handleToggleAllowance(e.currentTarget.checked)}
                  size="lg"
                  color="green"
                />
              </Group>
              
              {allowanceEnabled && (
                <Stack gap="md" mt="lg" pt="lg" style={{ borderTop: '1px solid #e9ecef' }}>
                  <NumberInput
                    label="Money Jar Maximum"
                    description="The max amount shown in the visual jar (for fill percentage)"
                    value={jarMax}
                    onChange={(val) => handleUpdateJarMax(typeof val === 'number' ? val : 10)}
                    min={1}
                    max={100}
                    prefix="$"
                    size="md"
                    radius="md"
                    style={{ maxWidth: 200 }}
                  />
                  <Text size="sm" c="dimmed">
                    💡 Tip: Set money values on individual chores in the Chores tab
                  </Text>
                </Stack>
              )}
            </Paper>
          </Stack>
        </Tabs.Panel>
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

          <NumberInput
            label="Points"
            description="Award points for completing this chore"
            value={choreForm.points}
            onChange={(value) => setChoreForm({ ...choreForm, points: typeof value === 'number' ? value : 1 })}
            min={1}
            max={10}
            size="md"
            radius="md"
          />

          {allowanceEnabled && (
            <NumberInput
              label="Money Value (Optional)"
              description="Amount earned when this chore is completed"
              value={choreForm.money_value || ''}
              onChange={(value) => setChoreForm({ ...choreForm, money_value: typeof value === 'number' ? value : null })}
              min={0}
              max={100}
              step={0.25}
              decimalScale={2}
              prefix="$"
              size="md"
              radius="md"
              placeholder="No money value"
              leftSection={<IconCoin size={18} />}
            />
          )}

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
    </Box>
  );
}
