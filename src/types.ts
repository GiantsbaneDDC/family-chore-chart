export interface FamilyMember {
  id: number;
  name: string;
  color: string;
  avatar: string;
  created_at: string;
}

export interface Chore {
  id: number;
  title: string;
  icon: string;
  points: number;
  created_at: string;
}

export interface Assignment {
  id: number;
  chore_id: number;
  member_id: number;
  day_of_week: number;
  created_at: string;
  chore_title?: string;
  chore_icon?: string;
  chore_points?: number;
  member_name?: string;
  member_color?: string;
  member_avatar?: string;
}

export interface Completion {
  id: number;
  assignment_id: number;
  week_start: string;
  completed_at: string;
}

// Extra Tasks (Bonus Chores)
export interface ExtraTask {
  id: number;
  title: string;
  icon: string;
  stars: number;
  created_at: string;
}

export interface ExtraTaskClaim {
  claim_id: number;
  extra_task_id: number;
  member_id: number;
  title: string;
  icon: string;
  stars: number;
  completed_at: string | null;
  member_name?: string;
  member_avatar?: string;
  member_color?: string;
}

export interface KioskData {
  members: FamilyMember[];
  assignments: Assignment[];
  completions: number[];
  extraTaskClaims: ExtraTaskClaim[];
  weekStart: string;
}

export interface StreakData {
  streak: number;
  weeks: {
    week_start: string;
    completed: number;
    total_per_week: number;
  }[];
}

export interface PointsData {
  id: number;
  name: string;
  color: string;
  avatar: string;
  points: number;
}

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MEMBER_COLORS = [
  '#4dabf7', // blue
  '#69db7c', // green
  '#fcc419', // yellow
  '#ff8787', // red
  '#cc5de8', // purple
  '#20c997', // teal
  '#ff922b', // orange
  '#a9e34b', // lime
];

export const CHORE_ICONS = [
  '🧹', '🧽', '🗑️', '🛏️', '🍽️', '🧺', '🐕', '🐱',
  '📚', '🪥', '🚿', '🧸', '🎒', '👟', '🪴', '📬',
  '🚗', '🛒', '🍳', '🥗', '🧊', '🪣', '🧴', '💊'
];

export const AVATAR_EMOJIS = [
  '👦', '👧', '👨', '👩', '🧒', '👶', '🧑', '👴',
  '👵', '🦸', '🦹', '🧙', '🧚', '🐶', '🐱', '🦊'
];

// Achievements
export interface Achievement {
  id: number;
  key: string;
  title: string;
  description: string;
  icon: string;
  points_value: number;
  created_at: string;
}

export interface MemberAchievement {
  id: number;
  member_id?: number;
  achievement_key: string;
  earned_at: string;
  title: string;
  description: string;
  icon: string;
  points_value: number;
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  avatar: string;
  color: string;
  weekly_points: number;
}

export interface MemberStreak {
  id: number;
  name: string;
  avatar: string;
  color: string;
  streak: number;
}

export interface FunStats {
  mostCompletedChore: { title: string; icon: string; count: number } | null;
  busiestDay: { day_of_week: number; day_name: string; count: number } | null;
  totalCompletions: number;
}

export interface RewardsData {
  leaderboard: LeaderboardEntry[];
  streaks: MemberStreak[];
  achievements: Record<number, MemberAchievement[]>;
  allAchievements: Achievement[];
  funStats: FunStats;
  weekStart: string;
}

// Extra task icons
export const EXTRA_TASK_ICONS = [
  '⭐', '🌟', '✨', '💫', '🎯', '🏆', '🎖️', '🥇',
  '🎁', '🎀', '💎', '👑', '🚀', '💪', '🙌', '🎉'
];
