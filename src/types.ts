export interface FamilyMember {
  id: number;
  name: string;
  color: string;
  avatar: string;
  total_stars?: number;
  created_at: string;
}

export interface StarHistory {
  id: number;
  stars: number;
  description: string;
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

// Fluent 3D emoji avatars (Microsoft Fluent Emoji)
export const FLUENT_AVATARS = [
  { id: 'boy', label: 'Boy', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Boy/Default/3D/boy_3d_default.png' },
  { id: 'girl', label: 'Girl', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Girl/Default/3D/girl_3d_default.png' },
  { id: 'man', label: 'Man', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Man/Default/3D/man_3d_default.png' },
  { id: 'woman', label: 'Woman', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Woman/Default/3D/woman_3d_default.png' },
  { id: 'child', label: 'Child', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Child/Default/3D/child_3d_default.png' },
  { id: 'baby', label: 'Baby', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Baby/Default/3D/baby_3d_default.png' },
  { id: 'person', label: 'Person', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Person/Default/3D/person_3d_default.png' },
  { id: 'older', label: 'Older Person', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Older%20person/Default/3D/older_person_3d_default.png' },
  { id: 'superhero', label: 'Superhero', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Man%20superhero/Default/3D/man_superhero_3d_default.png' },
  { id: 'supervillain', label: 'Supervillain', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Man%20supervillain/Default/3D/man_supervillain_3d_default.png' },
  { id: 'mage', label: 'Mage', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Man%20mage/Default/3D/man_mage_3d_default.png' },
  { id: 'fairy', label: 'Fairy', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Person%20fairy/Default/3D/person_fairy_3d_default.png' },
  { id: 'ninja', label: 'Ninja', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Ninja/Default/3D/ninja_3d_default.png' },
  { id: 'dog', label: 'Dog', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Dog%20face/3D/dog_face_3d.png' },
  { id: 'cat', label: 'Cat', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Cat%20face/3D/cat_face_3d.png' },
  { id: 'fox', label: 'Fox', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fox/3D/fox_3d.png' },
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

// Dinner Plan & Recipes
export interface Recipe {
  id: number;
  title: string;
  icon: string;
  description?: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  source_url?: string;
  created_at: string;
}

export interface DinnerPlan {
  id: number;
  recipe_id: number;
  day_of_week: number;
  week_start: string;
  notes?: string;
  created_at: string;
  // Joined fields
  recipe_title?: string;
  recipe_icon?: string;
  recipe_description?: string;
  recipe_prep_time?: number;
  recipe_cook_time?: number;
}

export interface DinnerPlanData {
  plans: DinnerPlan[];
  recipes: Recipe[];
  weekStart: string;
}

// Recipe icons
export const RECIPE_ICONS = [
  '🍝', '🍕', '🍔', '🌮', '🍜', '🍛', '🍲', '🥘',
  '🍗', '🥩', '🍖', '🐟', '🦐', '🥗', '🥙', '🌯',
  '🍱', '🍣', '🥡', '🍚', '🍤', '🧆', '🥧', '🍳'
];

// Recipe tags
export const RECIPE_TAGS = [
  'Quick', 'Healthy', 'Vegetarian', 'Vegan', 'Kid-Friendly',
  'Comfort Food', 'Spicy', 'Italian', 'Asian', 'Mexican',
  'BBQ', 'Seafood', 'Pasta', 'Soup', 'Salad', 'One-Pot'
];
