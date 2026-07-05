# DayFlow — Code Split + Performance Overhaul

## What This Is

A full structural split of the 12,954-line, 523KB `App.tsx` monolith into a clean, maintainable multi-file architecture — combined with targeted performance fixes that eliminate the UI freezes you experience when adding or updating tasks.

This is the right time to do this: zero live users, active development, maximum flexibility.

---

## Why It Freezes (Root Cause)

Every button click (e.g. "Add Task", marking done, postpone) calls `handleUpdateFlexible()`, which:

1. Sets React state → triggers full re-render of 12,954 lines
2. Re-evaluates **20+ `useMemo` blocks** simultaneously:
   - `extractUBMInsights()` — O(n²) loop over 300 logs × all tasks
   - `computeBehaviorSignals()` — full pattern analysis
   - `generateSchedule()` — full timeline rebuild
   - `detectHighDelayPatterns()` — another full scan
   - `dailyCoachReflection`, `selfPerceptionMismatch`, `interventionScore`, `driftedTask`…
3. Writes to localStorage **synchronously** (blocking UI thread)

All of this must finish before React can show you the result. On mobile = 200–800ms freeze.

---

## Architecture After This Plan

```
src/
├── App.tsx                          (~1,500 lines — shell + state + routing only)
├── types.ts                         (unchanged)
├── index.css                        (unchanged)
├── main.tsx                         (unchanged)
│
├── hooks/
│   ├── useDebounce.ts               [NEW] debounce hook for heavy computations
│   └── useDebouncedAnalytics.ts     [NEW] wraps all heavy useMemo computations
│
├── utils/
│   ├── storage.ts                   [MODIFY] add debounced save wrapper
│   ├── scheduler.ts                 (unchanged)
│   ├── mlEngine.ts                  (unchanged)
│   ├── patternEngine.ts             (unchanged)
│   ├── goalEngine.ts                (unchanged)
│   ├── evaluationEngine.ts          (unchanged)
│   └── aiContextBuilder.ts          (unchanged)
│
└── components/
    ├── ui/                          (unchanged — modern-mobile-menu.tsx, demo.tsx)
    │
    ├── modals/
    │   ├── FlexibleTaskModal.tsx    [NEW] Add/Edit Task modal (lines ~3664–3851)
    │   ├── SettingsModal.tsx        [NEW] Settings modal (lines ~11433–11750)
    │   └── AIReasoningOverlay.tsx   [NEW] AI confirmation overlay (lines ~4905–5240)
    │
    ├── panels/
    │   └── CopilotPanel.tsx         [NEW] Full AI chat panel (lines ~7584–8390)
    │
    ├── tabs/
    │   ├── TodayTab.tsx             [NEW] Timeline/Today view (lines ~8828–9838)
    │   ├── BacklogTab.tsx           [NEW] Backlog view (lines ~9840–10112)
    │   ├── CalendarTab.tsx          [NEW] Calendar/Predictions (lines ~10113–10256)
    │   └── RoutinesTab.tsx          [NEW] Routines & Profile (lines ~10257–11431)
    │
    └── layout/
        ├── Navbar.tsx               [NEW] Bottom mobile navbar + sidebar desktop nav
        ├── OnboardingFlow.tsx       [NEW] Full onboarding screens (lines ~7198–7196)
        └── AddTaskFAB.tsx           [NEW] Floating Add Task button
```

---

## Phase 1 — Performance Fixes (Immediate, in current App.tsx)

Do this first — gets you fast UI in ~2 hours without splitting anything.

### Step 1.1 — Debounced Storage

#### [NEW] `src/hooks/useDebounce.ts`
```typescript
export function useDebounce<T>(value: T, delay: number): T
```
Returns a debounced value that only updates after `delay` ms of inactivity.

#### [MODIFY] `src/utils/storage.ts`
- Add `createDebouncedSaver(key, delay)` factory
- `saveFlexibleTasks` → debounced 500ms (state updates instantly, disk write defers)
- `saveTaskExecutionLogs` → debounced 500ms
- `saveReflectionEvents` → debounced 500ms

### Step 1.2 — Debounce Heavy Analytics in App.tsx

Replace the expensive `useMemo` blocks that depend on `flexibleTasks` with debounced versions:

```typescript
// BEFORE (fires instantly on every task click):
const ubmInsights = useMemo(() => extractUBMInsights(flexibleTasks, ...), [flexibleTasks, ...]);

// AFTER (fires 800ms after last task update):
const debouncedFlexibleTasks = useDebounce(flexibleTasks, 800);
const ubmInsights = useMemo(() => extractUBMInsights(debouncedFlexibleTasks, ...), [debouncedFlexibleTasks, ...]);
```

Apply to:
- `ubmInsights` (line 933)
- `behaviorSignals` (line 937)
- `evalHistory` (line 947)
- `calibrationProfile` (line 2986)
- `delayPatterns` (line 3007)
- `dailyCoachReflection` (line 3119)
- `selfPerceptionMismatch` (line 3049)
- `futurePredictions` (line 3487)
- `interventionScore` (line 3320)

### Step 1.3 — Memoize `handleUpdateFlexible`

Wrap in `useCallback` to prevent it from invalidating downstream hooks on every render:

```typescript
const handleUpdateFlexible = useCallback((newTasks: FlexibleTask[], isSilent = false) => {
  // ... existing implementation
}, [goals, projects, achievements, setGoals, setAchievements, setProjects]);
```

---

## Phase 2 — Component Split

After Phase 1 ships and the app feels fast, extract components cleanly.

### Step 2.1 — Extract Modals

These are fully self-contained JSX blocks with their own state needs — easiest to extract.

#### [NEW] `src/components/modals/FlexibleTaskModal.tsx`
- Extracts lines ~3664–3851 (the Add/Edit flexible task bottom sheet)
- Props: `flexibleForm`, `editingTask`, `onSubmit`, `onClose`, `goals`, `classificationFeedback`, etc.
- Wrapped in `React.memo`

#### [NEW] `src/components/modals/SettingsModal.tsx`
- Extracts lines ~11433–11750 (the settings modal)
- Props: `appSettings`, `profileName`, `onClose`, `onSave`, etc.

#### [NEW] `src/components/modals/AIReasoningOverlay.tsx`
- Extracts lines ~4905–5240 (the AI proposal confirmation panel)
- Props: `proposals`, `onConfirm`, `onUndo`, etc.

### Step 2.2 — Extract Copilot Panel

#### [NEW] `src/components/panels/CopilotPanel.tsx`
- Extracts lines ~7584–8828 (full AI copilot chat UI)
- This is ~1,244 lines alone — biggest win for readability
- Props: all copilot state and handlers passed from App

### Step 2.3 — Extract Tab Views

#### [NEW] `src/components/tabs/TodayTab.tsx`
- Lines ~8828–9838 (today's timeline)
- This includes TimelineCard rendering, day coach hints, etc.
- Wrapped in `React.memo`

#### [NEW] `src/components/tabs/BacklogTab.tsx`
- Lines ~9840–10112
- Wrapped in `React.memo`

#### [NEW] `src/components/tabs/CalendarTab.tsx`
- Lines ~10113–10256

#### [NEW] `src/components/tabs/RoutinesTab.tsx`
- Lines ~10257–11431

### Step 2.4 — Extract Layout Components

#### [NEW] `src/components/layout/Navbar.tsx`
- Desktop sidebar + mobile bottom nav bar
- Memoized — doesn't need to re-render on task state changes

#### [NEW] `src/components/layout/OnboardingFlow.tsx`
- Lines ~7198–7196 (the `if (showOnboarding) return (...)` block)

---

## Phase 3 — App.tsx After Split

After all components are extracted, App.tsx becomes:
- **State declarations** (~80 useState/useRef) — still global
- **Handlers** (handleUpdateFlexible, handleSubmitFlexible, etc.)
- **Core useMemo** (daySchedule, debounced analytics)
- **The JSX shell** — just imports + tab routing + modal conditionals

Target size: ~1,500 lines.

---

## Execution Order

| Step | What | Impact |
|------|------|--------|
| 1 | `useDebounce` hook | ✅ Eliminates freeze on task updates |
| 2 | Debounced analytics in App.tsx | ✅ Eliminates compute blocking |
| 3 | Debounced storage writes | ✅ Eliminates I/O blocking |
| 4 | Memoize `handleUpdateFlexible` | ✅ Reduces cascading re-renders |
| 5 | Extract modals (FlexModal, Settings, AI) | 🧹 Readability |
| 6 | Extract CopilotPanel | 🧹 Biggest single file reduction (~1,200 lines) |
| 7 | Extract tab views | 🧹 Isolation + React.memo |
| 8 | Extract layout components | 🧹 Separation of concerns |

---

## Verification Plan

### Automated
```bash
npm run build   # Must pass with zero TypeScript errors after each step
```

### Manual
- Click "Add Task" → should respond in < 50ms (no freeze)
- Mark a task done → should respond in < 50ms
- Open Copilot → should open instantly
- Check all 4 tabs render correctly
- Check onboarding flow (if first-time)
- Verify localStorage data persists correctly

> [!IMPORTANT]
> We will do Phase 1 (performance) first. Once you confirm the app feels snappy, we proceed with Phase 2 (component split). Both phases maintain 100% feature parity — no visible changes to the user.

> [!NOTE]
> The component split (Phase 2) is NOT a rewrite. Each extracted component is a direct cut of existing JSX. No logic changes. Every prop comes from App.tsx via explicit prop drilling (no context, no Redux — keeping it simple).
