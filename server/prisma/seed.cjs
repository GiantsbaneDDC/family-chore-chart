require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Default admin PIN
  await prisma.admin_settings.upsert({
    where: { key: 'admin_pin' },
    update: {},
    create: { key: 'admin_pin', value: '1234' },
  });

  await prisma.admin_settings.upsert({
    where: { key: 'allowance_enabled' },
    update: {},
    create: { key: 'allowance_enabled', value: 'false' },
  });

  await prisma.admin_settings.upsert({
    where: { key: 'allowance_jar_max' },
    update: {},
    create: { key: 'allowance_jar_max', value: '10' },
  });

  console.log('  ✓ Admin settings');

  // Default achievements
  const achievements = [
    { key: 'first_chore', title: 'First Step', description: 'Complete your first chore', icon: '🌱', points_value: 10 },
    { key: 'perfect_day', title: 'Perfect Day', description: 'Complete all chores in one day', icon: '⭐', points_value: 25 },
    { key: 'perfect_week', title: 'Perfect Week', description: 'Complete all chores in a week', icon: '🏆', points_value: 100 },
    { key: 'streak_3', title: 'On Fire', description: '3 week streak of completing all chores', icon: '🔥', points_value: 50 },
    { key: 'streak_5', title: 'Unstoppable', description: '5 week streak of completing all chores', icon: '💪', points_value: 100 },
    { key: 'early_bird', title: 'Early Bird', description: 'Complete a chore before 9am', icon: '🐦', points_value: 15 },
    { key: 'night_owl', title: 'Night Owl', description: 'Complete a chore after 8pm', icon: '🦉', points_value: 15 },
    { key: 'points_50', title: 'Half Century', description: 'Earn 50 points in a week', icon: '🎯', points_value: 25 },
    { key: 'points_100', title: 'Century', description: 'Earn 100 points in a week', icon: '💯', points_value: 50 },
    // Fitness achievements
    { key: 'first_activity', title: 'Get Moving', description: 'Log your first activity', icon: '🎬', points_value: 10 },
    { key: 'streak_7', title: 'Week Warrior', description: 'Exercise 7 days in a row', icon: '🔥', points_value: 50 },
    { key: 'streak_14', title: 'Fortnight Fighter', description: 'Exercise 14 days in a row', icon: '💪', points_value: 100 },
    { key: 'streak_30', title: 'Monthly Marvel', description: 'Exercise 30 days in a row', icon: '🏅', points_value: 200 },
    { key: 'family_goal', title: 'Team Player', description: 'Help the family reach a weekly goal', icon: '👨‍👩‍👧‍👦', points_value: 25 },
    { key: 'variety_5', title: 'All-Rounder', description: 'Try 5 different activities', icon: '🌈', points_value: 30 },
    { key: 'early_workout', title: 'Rise & Shine', description: 'Log an activity before 8am', icon: '🌅', points_value: 15 },
    { key: 'weekend_warrior', title: 'Weekend Warrior', description: 'Exercise both Saturday and Sunday', icon: '🎉', points_value: 20 },
  ];

  for (const achievement of achievements) {
    await prisma.achievements.upsert({
      where: { key: achievement.key },
      update: {},
      create: achievement,
    });
  }
  console.log('  ✓ Achievements');

  // Default activities
  const activities = [
    { name: 'Bike Ride', icon: '🚴', points: 10, category: 'cardio' },
    { name: 'Run / Jog', icon: '🏃', points: 10, category: 'cardio' },
    { name: 'Walk', icon: '🚶', points: 5, category: 'cardio' },
    { name: 'Dog Walk', icon: '🐕', points: 5, category: 'cardio' },
    { name: 'Swimming', icon: '🏊', points: 10, category: 'cardio' },
    { name: 'Sports / Games', icon: '⚽', points: 10, category: 'sports' },
    { name: 'Stretching', icon: '🧘', points: 5, category: 'flexibility' },
    { name: 'Yoga', icon: '🧘‍♀️', points: 5, category: 'flexibility' },
    { name: 'Dancing', icon: '💃', points: 8, category: 'cardio' },
    { name: 'Playground', icon: '🛝', points: 5, category: 'play' },
    { name: 'Trampoline', icon: '🤸', points: 8, category: 'play' },
    { name: 'Scooter / Skateboard', icon: '🛴', points: 8, category: 'cardio' },
    { name: 'Gym / Weights', icon: '🏋️', points: 10, category: 'strength' },
    { name: 'Martial Arts', icon: '🥋', points: 10, category: 'sports' },
    { name: 'Bush Walk / Hike', icon: '🥾', points: 10, category: 'cardio' },
  ];

  for (const activity of activities) {
    const existing = await prisma.activities.findFirst({
      where: { name: activity.name },
    });
    if (!existing) {
      await prisma.activities.create({ data: activity });
    }
  }
  console.log('  ✓ Activities');

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
