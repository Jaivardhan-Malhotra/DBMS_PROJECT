# 🏏 IPL Management System

A full-stack web application for managing IPL (Indian Premier League) data — built for a college DBMS/ER Diagram assignment.

**Stack:** React.js · Node.js/Express.js · MySQL · REST API

---

## Features

The application exposes exactly these five IPL modules:

1. **Teams** — add, view, update, and delete teams.
2. **Players in Teams** — manage player details and team assignments.
3. **Match Schedule** — manage participating teams, season, date, time, venue, and status. Seasons and venues are read-only lookups required by the existing database.
4. **Player Statistics** — view matches, runs, wickets, batting average, and strike rate; manage per-match player records.
5. **Team Statistics** — view played, won, lost, win percentage, titles, points, and season standings derived from match results.

The database contains only the six tables used by these modules: `teams`, `players`, `matches`, `player_match`, `seasons`, and `venues`. Match schedule details are exposed through the `v_match_details` view.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + React Router 6 |
| Backend | Node.js + Express.js |
| Database | MySQL 8.x |
| DB Driver | mysql2 (promise-based pool) |
| Styling | Vanilla CSS (dark cricket theme) |
| HTTP Client | Axios |
| Icons | lucide-react |
| Notifications | react-hot-toast |
| Security | helmet, CORS, parameterized queries |

---

## 📦 Prerequisites

Install these before starting:

1. **Node.js v18+** — [nodejs.org](https://nodejs.org)
2. **MySQL 8.x** — [mysql.com](https://dev.mysql.com/downloads/mysql/)
3. **MySQL Workbench** (optional, for visual DB management)
4. **Git** (optional)

Verify installations:
```powershell
node --version    # v18+
npm --version     # 9+
mysql --version   # 8.x
```

---

## 📁 Project Structure

```
ipl-management-system/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── layouts/           # Sidebar, Navbar, MainLayout
│   │   ├── pages/             # The five IPL modules
│   │   ├── services/          # Axios API service (api.js)
│   │   └── index.css          # Global stylesheet
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                    # Express.js backend
│   ├── src/
│   │   ├── config/            # database.js (mysql2 pool)
│   │   ├── controllers/       # Route handlers per entity
│   │   ├── routes/            # Express routers
│   │   └── middleware/        # errorHandler, validate
│   ├── server.js
│   ├── .env.example
│   └── package.json
├── database/
│   ├── schema.sql             # DDL — create the six application tables and match view
│   └── seed.sql               # Sample data (10 teams, 50 players, 24 matches...)
├── docs/
│   ├── er-to-relational-mapping.md
└── README.md
```

---

## 🚀 Setup Instructions

### Step 1 — Set Up MySQL Database

Create an empty database named `ipl_management` in MySQL Workbench (or your preferred database setup tool). Select it before running the scripts; the scripts do not create or select databases.

In MySQL Workbench, select `ipl_management`, then execute `database/schema.sql` followed by `database/seed.sql`.

```powershell
# Run from the project root after creating the database:
mysql -u root -p ipl_management < database\schema.sql
mysql -u root -p ipl_management < database\seed.sql
```

The schema and seed scripts are intended for an empty database.

---

### Step 2 — Configure Backend Environment

```powershell
# Navigate to server folder
cd server

# Copy the example env file
copy .env.example .env
```

Open `server/.env` and update your MySQL password:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_ACTUAL_MYSQL_PASSWORD
DB_NAME=ipl_management
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

---

### Step 3 — Install Backend Dependencies

```powershell
# From the server/ directory
cd server
npm install
```

---

### Step 4 — Start the Backend Server

```powershell
# Development mode (auto-restart on file changes)
npm run dev

# OR production mode
npm start
```

You should see:
```
🏏 IPL Management System API
🚀 Server running on http://localhost:5000
📊 Environment: development
✅ MySQL connected: ipl_management
```

---

### Step 5 — Install Frontend Dependencies

Open a **new terminal tab/window**:

```powershell
# From the client/ directory
cd client
npm install
```

---

### Step 6 — Start the Frontend

```powershell
# From the client/ directory
npm run dev
```

Open your browser: **http://localhost:5173**

---

## API Endpoints

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/teams` | List / Create teams |
| GET/PUT/DELETE | `/teams/:id` | Get / Update / Delete team |
| GET | `/teams/:id/players` | List players assigned to a team |
| GET/POST | `/players` | List / Create players |
| GET/PUT/DELETE | `/players/:id` | Get / Update / Delete player |
| GET/POST | `/matches` | List / Schedule matches |
| GET/PUT/DELETE | `/matches/:id` | Get / Update / Delete match |
| GET | `/player-statistics` | Player totals and calculated rates |
| GET/POST | `/player-statistics/records` | List / Add player match records |
| PUT/DELETE | `/player-statistics/records/:id` | Update / Delete player match records |
| GET | `/team-statistics` | Season-based team results and standings |
| GET | `/seasons` | Read-only season lookup for scheduling and standings |
| GET | `/venues` | Read-only venue lookup for scheduling |

---

## 🗄️ Database Schema Summary

The schema contains only `teams`, `players`, `matches`, `player_match`, `seasons`, and `venues`. `player_match` stores per-match player figures and references its player, team, and match through foreign keys. `v_match_details` joins matches to their season, venue, teams, winner, and player of the match for schedule queries.

---

## 🔧 Common Errors & Troubleshooting

### ❌ `ER_ACCESS_DENIED_ERROR`
→ Wrong MySQL username or password in `server/.env`

### ❌ `ECONNREFUSED` (port 3306)
→ MySQL service is not running.
```powershell
# Windows — Start MySQL service
net start MySQL80
```

### ❌ `Table doesn't exist`
→ You haven't run `schema.sql` yet. Run it in MySQL Workbench.

### ❌ `Foreign key constraint fails` on seed
→ Run `schema.sql` first, then `seed.sql` in the correct order.

### ❌ Frontend shows 'Network Error'
→ Check the backend is running on port 5000. Check CORS settings.

### ❌ `Cannot GET /api/...`
→ Backend server is not running. Run `npm run dev` in `server/`.

### ❌ `Cannot find module`
→ Run `npm install` in both `server/` and `client/` directories.

---

## Existing Sample Data

| Entity | Count |
|---|---|
| Teams | 10 (all IPL 2024 teams) |
| Players | 50 (5 per team) |
| Venues | 10 |
| Seasons | 6 (2019–2024) |
| Matches | 24 |

---

## SQL Concepts Used

The schema and seed use the requested table definitions, listed data types and constraints, `INSERT INTO`, and a view built from `SELECT` and joins. The API's create, read, update, and delete operations continue to use the existing application queries.

`AUTO_INCREMENT` remains on primary keys because the API's create operations use MySQL-generated IDs. Tables removed from the schema include awards, innings, owners, sponsors, and umpires, along with their related data.

---

*Built for DBMS College Assignment — IPL Management System*
