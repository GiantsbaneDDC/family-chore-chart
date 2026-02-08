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

## 🚀 Installation

### Option 1: One-Line Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/GiantsbaneDDC/family-chore-chart/master/scripts/install.sh | bash
```

This interactive script will:
- ✅ Check prerequisites (Node.js, PostgreSQL)
- ✅ Clone the repository
- ✅ Install all dependencies
- ✅ Create the database and user
- ✅ Configure everything automatically
- ✅ Optionally set up as a system service

### Option 2: Docker (Easiest)

```bash
git clone https://github.com/GiantsbaneDDC/family-chore-chart.git
cd family-chore-chart
docker compose up -d
```

That's it! Open **http://localhost:8080**

### Option 3: Manual Install

<details>
<summary>Click to expand manual steps</summary>

#### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or pnpm

#### Steps

```bash
# 1. Clone
git clone https://github.com/GiantsbaneDDC/family-chore-chart.git
cd family-chore-chart

# 2. Install dependencies
npm install
cd server && npm install && cd ..

# 3. Create database
sudo -u postgres psql -c "CREATE USER chorechart WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "CREATE DATABASE chorechart OWNER chorechart;"

# 4. Configure environment
cp server/.env.example server/.env
# Edit server/.env with your database credentials

# 5. Initialize database
cd server
npm run db:push
npm run db:seed
cd ..

# 6. Build and run
npm run build
cd server && npm start
```

</details>

### Access the App

Open **http://localhost:8080** (or your server's IP)

**Default admin PIN: `1234`** (change this in settings!)

## 📱 First Steps

1. **Access Admin Panel** - Click the ⚙️ icon, enter PIN `1234` (default)
2. **Add Family Members** - Go to Family tab, add names with avatars and PINs
3. **Create Chores** - Go to Chores tab, add your household chores
4. **Set Up Schedule** - Go to Schedule tab, assign chores to days/people
5. **Plan Dinners** - Go to Dinner Plan, search and import recipes
6. **Track Fitness** - Use the Fitness tab to log family activities

## 🖼️ Screenshots

### Main Views

| Home | Chores | Fitness |
|:---:|:---:|:---:|
| ![Home](screenshots/home.png) | ![Chores](screenshots/chores.png) | ![Fitness](screenshots/fitness.png) |

| Weather | Dinner Plan | Rewards |
|:---:|:---:|:---:|
| ![Weather](screenshots/weather.png) | ![Dinner Plan](screenshots/dinner-plan.png) | ![Rewards](screenshots/rewards.png) |

| Calendar | Recipe |
|:---:|:---:|
| ![Calendar](screenshots/calendar.png) | ![Recipe](screenshots/recipe.png) |

### Kiosk Mode (POS-Style Pickers)

| Member Select | Chore Picker |
|:---:|:---:|
| ![Member Select](screenshots/kiosk-member-select.png) | ![Chore Picker](screenshots/kiosk-chore-picker.png) |

| Fitness - Select Member | Fitness - Activity Picker |
|:---:|:---:|
| ![Fitness Member](screenshots/fitness-member-select.png) | ![Activity Picker](screenshots/fitness-activity-picker.png) |

### Admin Panel

| Members | Chores | Activities |
|:---:|:---:|:---:|
| ![Admin Members](screenshots/admin-members.png) | ![Admin Chores](screenshots/admin-chores.png) | ![Admin Activities](screenshots/admin-activities.png) |

| Rewards | Recipes |
|:---:|:---:|
| ![Admin Rewards](screenshots/admin-rewards.png) | ![Admin Recipes](screenshots/admin-recipes.png) |

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

## 🐳 Docker

Full Docker support included:

```bash
# Start everything (app + database)
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down

# Reset database (caution: deletes all data)
docker compose down -v
docker compose up -d
```

### Unraid

For Unraid users, there's a ready-made template:

1. **Add Template Repository:**
   - Go to **Docker → Add Container → Template Repositories**
   - Add: `https://github.com/GiantsbaneDDC/family-chore-chart`

2. **Or Manual Template Install:**
   - Download [`unraid/my-FamilyChoreChart.xml`](unraid/my-FamilyChoreChart.xml)
   - Place in `/boot/config/plugins/dockerMan/templates-user/`
   - Go to **Docker → Add Container** and select "FamilyChoreChart"

3. **Configure:**
   - **Port:** 8080 (or your preference)
   - **Data Path:** `/mnt/user/appdata/chore-chart`
   - **Timezone:** Your timezone (e.g., `Australia/Sydney`)

4. **Apply** and access at `http://[UNRAID-IP]:8080`

### Environment Variables

Create a `.env` file in the project root for custom settings:

```env
DB_PASSWORD=your-secure-password
SESSION_SECRET=your-random-secret
```

Or pass directly:
```bash
DB_PASSWORD=supersecret docker compose up -d
```

## 📄 License

MIT

## 🙏 Acknowledgments

- [Mantine](https://mantine.dev/) - Beautiful React components
- [Tabler Icons](https://tabler.io/icons) - High-quality icons
- [Prisma](https://prisma.io/) - Modern database ORM
- [Open-Meteo](https://open-meteo.com/) - Free weather API
