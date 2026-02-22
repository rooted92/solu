# Solu — Debt Freedom Planner

> *From "Solutus" — Latin for "freed from debt"*

A family payment planner to track debts, savings goals, and celebrate financial freedom.

---

## 🚀 Getting Started

### Step 1 — Set up Supabase (free database)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project** and give it a name (e.g. "solu")
3. Once created, go to **SQL Editor** in the left sidebar
4. Copy the entire contents of `supabase-schema.sql` and paste it in, then click **Run**
5. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon/public key**

### Step 2 — Configure environment variables

1. In your project folder, duplicate `.env.example` and rename it to `.env`
2. Paste your Supabase credentials:

```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 3 — Install and run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — you're good to go!

---

## 🌐 Deploy to Vercel (free hosting)

1. Push your project to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **Add New Project** → select your repo
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy** — Vercel will give you a free URL instantly!

Any future `git push` to GitHub will auto-deploy to Vercel. 🎉

---

## 📁 Project Structure

```
solu/
├── src/
│   ├── components/
│   │   ├── Auth/          # Login & Register
│   │   ├── Dashboard/     # Main overview page
│   │   ├── Goals/         # Goals & budget setup
│   │   ├── Plan/          # Month-by-month payment table
│   │   ├── PreviousPlans/ # Archived completed plans
│   │   └── shared/        # Navbar, Toast, Celebration
│   ├── lib/
│   │   └── supabase.js    # Supabase client
│   ├── App.jsx            # Routing + global state
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles
├── supabase-schema.sql    # Run this in Supabase SQL Editor
├── .env.example           # Copy to .env and fill in keys
└── package.json
```

---

## ✨ Features

- 🔐 Login & registration with password reset
- 📋 Create payment plans with monthly budget + timeline
- 🎯 Add debts and savings goals with priority ordering
- 📅 Auto-generated month-by-month payment schedule
- ✅ Individual goal checkboxes per month
- 💸 Partial payment support with auto-recalculation
- 📊 Progress bars and dashboard stats
- 🎉 Confetti celebration when a goal is cleared
- 🏆 Archive completed plans and view history
- 📱 Fully mobile responsive

---

## 🛠 Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Fonts**: Clash Display + Cabinet Grotesk (via Fontshare)
