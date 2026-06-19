# DayFlow Design Principles & Optimization Function

DayFlow is not a strict parent, nor is it a soft, passive chatbot. It is a **negotiation engine** that bridges human emotions and scheduling reality.

## Core Optimization Function

> **DayFlow does not optimize for completing every task. DayFlow optimizes for preserving meaningful progress while minimizing decision fatigue, burnout, and self-deception.**

This principle guides all development, scheduling algorithms, and AI behaviors.

## Behavioral Psychology Guidelines

### 1. Intent-First Scheduling (Compassionate Negotiation)
Instead of forcing users to pick hours/minutes of delay when they are tired or overwhelmed, DayFlow negotiates on **intent**:
- **Done**: Celebration and logging of effort.
- **Break**: Silent low-risk short breaks (e.g. 10m) vs gated high-risk breaks (e.g. 30m+).
- **Move**: Shift task to predefined available time gaps calculated from daily schedules.
- **Skip**: Option to either skip with cascades displayed, or choose the *Reduce Task* ("Do 20-25m now") alternative to keep the momentum streak alive.

### 2. Risk Gating
- Low-friction events execute silently.
- High-friction events (e.g. Skips, streaks breaking) require facing the real-world consequence in a pre-decision card.

### 3. Task Importance Levels
Tasks are categorized by importance:
- **Critical**: Extremely high-friction skip. Warns of immediate catch-up bottleneck, severe schedule shift, or deadline risk.
- **Important**: Balanced coaching on downstream effects and streak preservation.
- **Optional**: Highly flexible skip. Minimal friction; encourages general momentum without warnings or stress.
