import axios from 'axios';
import type { FamilyMember, Chore, Assignment, KioskData, StreakData, PointsData, Completion, ExtraTask, ExtraTaskClaim, StarHistory } from './types';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Family Members
export const getMembers = () => api.get<FamilyMember[]>('/members').then(r => r.data);
export const getMember = (id: number) => api.get<FamilyMember>(`/members/${id}`).then(r => r.data);
export const createMember = (data: { name: string; color: string; avatar: string; pin: string }) => 
  api.post<FamilyMember>('/members', data).then(r => r.data);
export const updateMember = (id: number, data: { name: string; color: string; avatar: string; pin?: string }) => 
  api.put<FamilyMember>(`/members/${id}`, data).then(r => r.data);
export const deleteMember = (id: number) => api.delete(`/members/${id}`);
export const verifyMemberPin = (id: number, pin: string) => 
  api.post<FamilyMember>(`/members/${id}/verify-pin`, { pin }).then(r => r.data);

// Chores
export const getChores = () => api.get<Chore[]>('/chores').then(r => r.data);
export const createChore = (data: { title: string; icon: string; points: number }) => 
  api.post<Chore>('/chores', data).then(r => r.data);
export const updateChore = (id: number, data: { title: string; icon: string; points: number }) => 
  api.put<Chore>(`/chores/${id}`, data).then(r => r.data);
export const deleteChore = (id: number) => api.delete(`/chores/${id}`);

// Assignments
export const getAssignments = () => api.get<Assignment[]>('/assignments').then(r => r.data);
export const getMemberAssignments = (memberId: number) => 
  api.get<Assignment[]>(`/assignments/member/${memberId}`).then(r => r.data);
export const createAssignment = (data: { chore_id: number; member_id: number; day_of_week: number }) => 
  api.post<Assignment>('/assignments', data).then(r => r.data);
export const deleteAssignment = (id: number) => api.delete(`/assignments/${id}`);
export const updateMemberAssignments = (memberId: number, assignments: { chore_id: number; day_of_week: number }[]) => 
  api.put(`/assignments/member/${memberId}`, { assignments });

// Completions
export const getCompletions = (weekStart?: string) => 
  api.get<Completion[]>('/completions', { params: { week_start: weekStart } }).then(r => r.data);
export const getMemberCompletions = (memberId: number, weekStart?: string) => 
  api.get<Completion[]>(`/completions/member/${memberId}`, { params: { week_start: weekStart } }).then(r => r.data);
export const toggleCompletion = (assignmentId: number, weekStart?: string) => 
  api.post<{ completed: boolean }>('/completions/toggle', { assignment_id: assignmentId, week_start: weekStart }).then(r => r.data);
export const markComplete = (assignmentId: number, weekStart?: string) => 
  api.post('/completions', { assignment_id: assignmentId, week_start: weekStart });

// Kiosk
export const getKioskData = (weekStart?: string) => 
  api.get<KioskData>('/kiosk', { params: { week_start: weekStart } }).then(r => r.data);

// Extra Tasks (Bonus Chores)
export const getExtraTasks = () => api.get<ExtraTask[]>('/extra-tasks').then(r => r.data);
export const getAvailableExtraTasks = () => api.get<ExtraTask[]>('/extra-tasks/available').then(r => r.data);
export const createExtraTask = (data: { title: string; icon: string; stars: number }) => 
  api.post<ExtraTask>('/extra-tasks', data).then(r => r.data);
export const updateExtraTask = (id: number, data: { title: string; icon: string; stars: number }) => 
  api.put<ExtraTask>(`/extra-tasks/${id}`, data).then(r => r.data);
export const deleteExtraTask = (id: number) => api.delete(`/extra-tasks/${id}`);
export const claimExtraTask = (taskId: number, memberId: number) => 
  api.post<ExtraTaskClaim>(`/extra-tasks/${taskId}/claim`, { member_id: memberId }).then(r => r.data);
export const getTodaysClaims = () => api.get<ExtraTaskClaim[]>('/extra-tasks/claims/today').then(r => r.data);
export const toggleExtraTaskCompletion = (claimId: number) => 
  api.post<{ completed: boolean; starsEarned?: number; starsChanged?: number }>(`/extra-tasks/claims/${claimId}/toggle`).then(r => r.data);

// Stars
export const getMemberStars = (memberId: number) => 
  api.get<{ totalStars: number; history: StarHistory[] }>(`/stars/${memberId}`).then(r => r.data);
export const getStarLeaderboard = () => 
  api.get<FamilyMember[]>('/stars/leaderboard').then(r => r.data);

// Stats
export const getMemberStreak = (memberId: number) => 
  api.get<StreakData>(`/stats/streak/${memberId}`).then(r => r.data);
export const getPoints = (weekStart?: string) => 
  api.get<PointsData[]>('/stats/points', { params: { week_start: weekStart } }).then(r => r.data);
export const getHistory = (weeks?: number) => 
  api.get('/stats/history', { params: { weeks } }).then(r => r.data);

// Admin
export const verifyAdmin = (pin: string) => api.post('/admin/verify', { pin }).then(r => r.data);
export const getAdminStatus = () => api.get<{ isAdmin: boolean }>('/admin/status').then(r => r.data);
export const logoutAdmin = () => api.post('/admin/logout');
export const changeAdminPin = (pin: string) => api.put('/admin/pin', { pin });

// Analytics
export const logAnalyticsEvent = (eventType: string, memberId?: number, metadata?: Record<string, unknown>) => 
  api.post('/analytics/event', { event_type: eventType, member_id: memberId, metadata });
export const getAnalyticsSummary = (weekStart?: string) => 
  api.get('/analytics/summary', { params: { week_start: weekStart } }).then(r => r.data);

// Achievements
import type { Achievement, MemberAchievement, RewardsData, Recipe, DinnerPlanData } from './types';
export const getAchievements = () => api.get<Achievement[]>('/achievements').then(r => r.data);
export const getMemberAchievements = (memberId: number) => 
  api.get<MemberAchievement[]>(`/achievements/member/${memberId}`).then(r => r.data);
export const checkAchievements = (memberId: number) => 
  api.post<{ awarded: string[] }>(`/achievements/check/${memberId}`).then(r => r.data);

// Rewards
export const getRewardsData = (weekStart?: string) => 
  api.get<RewardsData>('/rewards', { params: { week_start: weekStart } }).then(r => r.data);

// Recipes
export const getRecipes = () => api.get<Recipe[]>('/recipes').then(r => r.data);
export const getRecipe = (id: number) => api.get<Recipe>(`/recipes/${id}`).then(r => r.data);
export const createRecipe = (data: Partial<Recipe>) => 
  api.post<Recipe>('/recipes', data).then(r => r.data);
export const updateRecipe = (id: number, data: Partial<Recipe>) => 
  api.put<Recipe>(`/recipes/${id}`, data).then(r => r.data);
export const deleteRecipe = (id: number) => api.delete(`/recipes/${id}`);

// Dinner Plan
export const getDinnerPlan = (weekStart?: string) => 
  api.get<DinnerPlanData>('/dinner-plan', { params: { week_start: weekStart } }).then(r => r.data);
export const setDinnerPlan = (data: { recipe_id: number; day_of_week: number; week_start?: string; notes?: string }) => 
  api.post('/dinner-plan', data).then(r => r.data);
export const clearDinnerPlan = (dayOfWeek: number, weekStart?: string) => 
  api.delete(`/dinner-plan/${dayOfWeek}`, { params: { week_start: weekStart } });
export const copyLastWeekPlan = () => 
  api.post<{ success: boolean; copied: number }>('/dinner-plan/copy-week').then(r => r.data);
