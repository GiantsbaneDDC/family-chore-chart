# 🏠 Family Chore Chart

A fun, gamified chore management app for families. Kids earn stars for completing chores, track their progress on leaderboards, and redeem rewards. Perfect for wall-mounted tablets or any device.

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Mantine](https://img.shields.io/badge/Mantine-7-violet?logo=mantine)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![Prisma](https://img.shields.io/badge/Prisma-7-teal?logo=prisma)

## ✨ Features

### 📋 Chore Management
- Create and manage chores with custom icons
- Weekly schedule with day-by-day assignments
- Assign chores to multiple family members
- Track completion history

### ⭐ Gamification
- Earn stars for completing chores
- Bonus tasks for extra stars
- Family leaderboard
- Achievement tracking

### 🏃 Fitness Tracking
- Log family activities with a POS-style picker
- 15+ activity types (bike, run, swim, sports, yoga, etc.)
- Weekly progress tracking toward family goals
- Streak tracking for consecutive active days
- Per-member activity leaderboard
- Admin-manageable activity types

### 🍽️ Dinner Planning
- Weekly meal planner
- Import recipes from any URL (auto-extracts ingredients & instructions)
- Search the web for new recipes
- Recipe collection with prep/cook times

### 🌤️ Weather
- Current conditions with detailed stats
- Hourly forecast
- 7-day forecast
- UV index, humidity, wind, sunrise/sunset

### 📅 Calendar Integration
- View upcoming events
- Syncs with external calendars

### 🖥️ Kiosk Mode
- Beautiful idle screen with clock, weather, and today's dinner
- Auto-sleep after inactivity
- Tap to wake
- Perfect for wall-mounted tablets

### 🤖 AI Assistant
- Voice-enabled assistant integration
- Natural language interaction

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **UI Library:** [Mantine](https://mantine.dev/) v7
- **Icons:** [Tabler Icons](https://tabler.io/icons)
- **Backend:** Express.js
- **Database:** PostgreSQL with [Prisma](https://prisma.io/) ORM
- **Weather:** Open-Meteo API (free, no key required)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or pnpm

### 1. Clone the Repository

```bash
git clone https://github.com/GiantsbaneDDC/family-chore-chart.git
cd family-chore-chart
```

### 2. Install Dependencies

```bash
# Frontend
npm install

# Backend
cd server
npm install
```

### 3. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your database credentials
nano .env
```

Your `.env` should look like:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chorechart
DB_USER=chorechart
DB_PASSWORD=your-password
PORT=8080
SESSION_SECRET=your-secret-key

DATABASE_URL="postgresql://chorechart:your-password@localhost:5432/chorechart?schema=public"
```

### 4. Set Up Database

```bash
# Create the PostgreSQL database (if not exists)
createdb chorechart

# Push the schema to the database (creates all tables)
npm run db:push

# Seed default data (achievements, activities, settings)
npm run db:seed
```

That's it! No manual SQL migrations needed. 🎉

### 5. Build & Run

```bash
# Go back to root
cd ..

# Build frontend
npm run build

# Start server
cd server
npm start
```

### 6. Open the App

Visit **http://localhost:8080**

## 📱 First Steps

1. **Access Admin Panel** - Click the ⚙️ icon, enter PIN `1234` (default)
2. **Add Family Members** - Go to Family tab, add names with avatars and PINs
3. **Create Chores** - Go to Chores tab, add your household chores
4. **Set Up Schedule** - Go to Schedule tab, assign chores to days/people
5. **Plan Dinners** - Go to Dinner Plan, search and import recipes
6. **Track Fitness** - Use the Fitness tab to log family activities

## 🖼️ Screenshots

### Home
![Home](screenshots/home.png)

### Chores
![Chores](screenshots/chores.png)

### Fitness Tracking
![Fitness](screenshots/fitness.png)

### Weather
![Weather](screenshots/weather.png)

### Dinner Planning
![Dinner Plan](screenshots/dinner-plan.png)

### Rewards & Leaderboard
![Rewards](screenshots/rewards.png)

### Calendar
![Calendar](screenshots/calendar.png)

## 📁 Project Structure

```
family-chore-chart/
├── src/                    # Frontend source
│   ├── components/         # Reusable components
│   ├── views/              # Page components
│   ├── api.ts              # API client
│   └── types.ts            # TypeScript types
├── server/                 # Backend source
│   ├── index.js            # Express server
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.js         # Seed data
│   └── generated/          # Prisma client (auto-generated)
├── public/                 # Static assets
└── dist/                   # Production build
```

## 🔧 Development

```bash
# Run frontend dev server (hot reload)
npm run dev

# Run backend (separate terminal)
cd server && npm run dev
```

Frontend dev server runs on `http://localhost:5173` with HMR.

### Database Commands

```bash
cd server

# Push schema changes to database
npm run db:push

# Open Prisma Studio (GUI for database)
npm run db:studio

# Generate Prisma client after schema changes
npm run db:generate

# Seed the database with default data
npm run db:seed

# Reset database (caution: deletes all data!)
npm run db:reset
```

## 🐳 Docker (Coming Soon)

Docker support is planned for even easier deployment.

## 📄 License

MIT

## 🙏 Acknowledgments

- [Mantine](https://mantine.dev/) - Beautiful React components
- [Tabler Icons](https://tabler.io/icons) - High-quality icons
- [Prisma](https://prisma.io/) - Modern database ORM
- [Open-Meteo](https://open-meteo.com/) - Free weather API
