# DayFlow — Your Behavior-Aware Execution Coach

> A smart daily scheduler that doesn't just store tasks — it understands *why* you avoid them.

---

## What is DayFlow?

DayFlow is a **personal scheduling and behavioral intelligence app** built for people who genuinely want to make better use of their time. Unlike traditional to-do apps, DayFlow tracks your patterns, detects avoidance behaviors, and nudges you — without being intrusive.

The core philosophy:

> A normal to-do app stores tasks.  
> DayFlow stores **behavior patterns.**

It knows when you keep pushing "Portfolio" to tomorrow. It notices when your high-stakes work gets quietly buried under small, comfortable tasks. And it calls it out — gently, in plain language.

---

## Core Concepts

### 🗓️ Today Tab — Your Live Timetable
- Auto-generates a full daily schedule from your fixed blocks (gym, meals, classes) and flexible tasks
- Shows an always-visible **Daily Coach Reflection** — a behavioral observation updated based on what you've been doing
- Marks past-due unverified tasks in a muted style (`⏱ Unverified`) — neutral, not punishing
- A floating **Reschedule Day** button compresses remaining tasks into the available time window, pushes overflow to backlog

### 🧠 Behavioral Intervention System
DayFlow uses a **3-level progressive escalation model** when you try to delay or skip tasks:

- **Level 1 (Nudge)**: A soft inline prompt — "You've delayed this 3 times. Want to break it into smaller steps?"
- **Level 2 (Friction Log)**: Asks you to log *why* you're avoiding it — energy, clarity, motivation, external blockers
- **Level 3 (Decomposition)**: Offers to split the task into smaller, actionable subtasks — manually or via AI

### 📦 Backlog Queue
- Tasks that don't fit today automatically move to the Backlog
- Two sub-views: **Carried Forward** (pending from previous days) and **Dropped** (skipped or expired)
- Full filter system by priority, project, and carry-over count

### 📅 Future Calendar
- Monthly calendar grid with dot indicators for scheduled days
- Day Frame panel shows the exact timetable for any selected date
- Backlog predictions show when overdue tasks are likely to be picked up

### 👤 Profile Tab
Four sub-sections:

1. **Analytics** — Execution score, momentum state, behavioral patterns, weekly snapshots, completion trends
2. **Routines** — Full manager for fixed routine blocks (e.g. Morning Run 6:30–7:00, Daily, Mon–Fri)
3. **Projects** — Organize tasks into projects with phases and milestones
4. **Goals** — Track long-term goals with check-ins, milestones, and AI-generated progress insights

---

## Intelligence Features

| Feature | What it does |
|---|---|
| **Calibration Profile** | Learns your real task durations over time |
| **Delay Pattern Detection** | Identifies which tasks you chronically avoid |
| **Momentum State** | High / Stable / Drift — based on recent completion rate |
| **Execution Score** | Daily completion % with contextual labels |
| **UBM Insights** | Behavioral signals like "avoids evaluative tasks" or "thrives in the morning" |
| **Future Predictions** | Estimates when backlog tasks will realistically be scheduled |
| **Streak Counter** | Counts consecutive days of full task completion |
| **AI Copilot** | Natural language scheduling, task management, and schedule reasoning |

---

## Command Tiers

DayFlow processes your natural language instructions in tiers:

1. **UI Actions** — Button taps, drags, form interactions
2. **Local Semantic Parser** — Fast, offline parsing (e.g. `done gym`, `move study to 5pm`, `delay lunch 30m`)
3. **AI Reasoning** — Gemini AI for complex requests and ambiguous intent

---

## Tech Stack

- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS v4 + custom design system
- **Scheduling Engine**: Custom deterministic slot-packing algorithm
- **AI**: Gemini API (via server-side proxy)
- **Storage**: `localStorage` — 100% client-side, fully sandboxed, no account needed

---

## Running Locally

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Add your Gemini API key
echo "GEMINI_API_KEY=your_key_here" > .env

# Start the dev server
npm run dev
```

Open `http://localhost:3000`.

---

## Design Philosophy

- **No forced interruptions** — behavioural prompts appear inline, not as modals
- **Scroll-over nav** — the floating bottom bar uses frosted glass, content scrolls cleanly under it  
- **Premium aesthetics** — monochromatic color system, not multicolored or bright. Calm and intentional.
- **Mobile-first** — designed to be used on a phone, in the moment, throughout the day
- **Offline-first** — everything runs in the browser. No sync, no account, no lock-in.

---

## Repository

Built by **Siddhesh Nagawade** as an experiment in behavior-driven productivity design.

> "What if your schedule knew you well enough to call out your own blind spots?"
