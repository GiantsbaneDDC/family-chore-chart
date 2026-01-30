# Family Chore Chart 📋✅

A family-friendly chore tracking app with a kiosk display, individual kid views, and admin management.

## Features

- **Kiosk View** (`/` or `/kiosk`) - Full-screen family chore board
  - Swim lane layout: rows = family members, columns = days
  - Current day highlighted
  - Real-time updates (polls every 5 seconds)
  - Click any chore to toggle completion

- **Kid View** (`/my/:memberId` or `/my` for PIN entry)
  - Personal chore list with BIG tap-friendly checkboxes
  - 🎉 Confetti celebration on task completion!
  - Week streak tracking
  - Progress bar

- **Admin Panel** (`/admin`)
  - Manage family members (add/edit/delete)
  - Manage chores with emoji icons
  - Assign chores to specific days
  - View completion history
  - PIN protected (default: 1234)

## Tech Stack

- **Frontend:** React + Mantine UI + TypeScript
- **Backend:** Express.js
- **Database:** PostgreSQL

## Quick Start

### 1. Set up the database

```bash
cd server
sudo -u postgres psql -f setup-db.sql
```

### 2. Install dependencies

```bash
# Server
cd server && npm install

# Frontend
cd .. && npm install
```

### 3. Development mode

```bash
# Terminal 1 - Start backend
cd server && npm run dev

# Terminal 2 - Start frontend
npm run dev
```

### 4. Production build

```bash
npm run build
```

### 5. Run as systemd service

```bash
sudo cp chorechart.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable chorechart
sudo systemctl start chorechart
```

## Configuration

### Server Environment Variables

Create `server/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chorechart
DB_USER=chorechart
DB_PASSWORD=chorechart
PORT=3001
SESSION_SECRET=your-secret-here
```

## API Endpoints

### Family Members
- `GET /api/members` - List all members
- `POST /api/members` - Create member
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member
- `POST /api/members/:id/verify-pin` - Verify member PIN

### Chores
- `GET /api/chores` - List all chores
- `POST /api/chores` - Create chore
- `PUT /api/chores/:id` - Update chore
- `DELETE /api/chores/:id` - Delete chore

### Assignments
- `GET /api/assignments` - List all assignments
- `POST /api/assignments` - Create assignment
- `DELETE /api/assignments/:id` - Delete assignment

### Completions
- `GET /api/completions` - Get completions for current week
- `POST /api/completions/toggle` - Toggle completion status

### Kiosk Data
- `GET /api/kiosk` - Get all data for kiosk view in one call

### Admin
- `POST /api/admin/verify` - Verify admin PIN
- `GET /api/admin/status` - Check admin status
- `POST /api/admin/logout` - Logout admin

## Default Admin PIN

The default admin PIN is `1234`. Change it in the admin panel after first login.

## Screenshots

- **Kiosk View:** Family chore board with swim lanes
- **Kid View:** Personal chores with big checkboxes and confetti
- **Admin Panel:** Manage members, chores, and assignments

## License

MIT
