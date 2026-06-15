# DayFlow Professional UI Design System
## Light Antigravity Style - Complete Specification

---

## 1. COLOR PALETTE - Professional Light Theme

### Primary Colors

```
BRAND PRIMARY (Indigo)
--color-primary-50:  #F6F5FF   (Lightest - backgrounds, hover states)
--color-primary-100: #EFEBFF  (Very light - subtle backgrounds)
--color-primary-200: #E0D9FF  (Light - card backgrounds, accents)
--color-primary-300: #C7B5FF  (Medium-light - secondary elements)
--color-primary-400: #A894FF  (Medium - interactive elements)
--color-primary-500: #8B7EFF  (Base primary - CTAs, key actions)
--color-primary-600: #7C6EE6  (Dark - hover states)
--color-primary-700: #6C5ED4  (Darker - focus states)
--color-primary-800: #5A4DC2  (Very dark - active states)
--color-primary-900: #3D2F85  (Darkest - text on light backgrounds)

Use: Main actions, highlights, hover states, CTAs
```

### Secondary Colors (Teal)

```
SECONDARY (Teal/Cyan)
--color-secondary-50:  #F0FDFC
--color-secondary-100: #CCFBF1
--color-secondary-200: #99F6E4
--color-secondary-300: #5EE7DF
--color-secondary-400: #2DD4BF
--color-secondary-500: #14B8A6
--color-secondary-600: #0D9488
--color-secondary-700: #0F766E
--color-secondary-800: #115E59
--color-secondary-900: #134E4A

Use: Success, completion, positive actions, accents
```

### Semantic Colors

```
SUCCESS (Emerald - Task completion)
--color-success-50:  #F0FDF4
--color-success-100: #DCFCE7
--color-success-200: #BBEF63
--color-success-300: #86EFAC
--color-success-400: #4ADE80
--color-success-500: #22C55E
--color-success-600: #16A34A
--color-success-700: #15803D
--color-success-800: #166534
--color-success-900: #0F3F22

Use: Task complete, success states, positive feedback
```

### Warning/Attention Colors

```
WARNING (Amber - Pending, due soon)
--color-warning-50:  #FFFBEB
--color-warning-100: #FEF3C7
--color-warning-200: #FDE68A
--color-warning-300: #FCD34D
--color-warning-400: #FBBF24
--color-warning-500: #F59E0B
--color-warning-600: #D97706
--color-warning-700: #B45309
--color-warning-800: #92400E
--color-warning-900: #78350F

Use: Pending >3 days, due soon, attention needed
NOT for errors or emergencies (calmer tone)
```

### Danger Colors (Minimal Use)

```
DANGER (Red - Destructive only)
--color-danger-50:  #FEF2F2
--color-danger-100: #FEE2E2
--color-danger-200: #FECACA
--color-danger-300: #FCA5A5
--color-danger-400: #F87171
--color-danger-500: #EF4444
--color-danger-600: #DC2626
--color-danger-700: #B91C1C
--color-danger-800: #991B1B
--color-danger-900: #7F1D1D

Use: ONLY for delete/destructive actions
NOT for notifications or alerts
```

### Neutral Colors (Foundation)

```
SLATE (Primary neutral)
--color-neutral-0:   #FFFFFF   (Pure white - cards, surfaces)
--color-neutral-50:  #F9FAFB  (Off-white - main background)
--color-neutral-100: #F3F4F6  (Light grey - secondary backgrounds)
--color-neutral-150: #ECECF1  (Very light - hover states)
--color-neutral-200: #E5E7EB  (Light - borders, dividers)
--color-neutral-300: #D1D5DB  (Medium-light - borders, disabled)
--color-neutral-400: #9CA3AF  (Medium - secondary text, icons)
--color-neutral-500: #6B7280  (Medium - tertiary text)
--color-neutral-600: #4B5563  (Dark - secondary text)
--color-neutral-700: #374151  (Darker - primary text)
--color-neutral-800: #1F2937  (Very dark - headings)
--color-neutral-900: #111827  (Almost black - main text)

Use: All backgrounds, text, borders, dividers
```

---

## 2. BACKGROUND COLORS - Depth Layers

### Layer System (0-5 depth)

```
ELEVATION 0 (Base Page)
Background: #F9FAFB (--color-neutral-50)
Purpose: Page background, least prominent
Appearance: Smooth, flat, slightly warm white

ELEVATION 1 (Cards, Containers)
Background: #FFFFFF (--color-neutral-0)
Purpose: Cards, panels, main content areas
Border: 1px --color-neutral-200
Shadow: 0 1px 2px rgba(0, 0, 0, 0.04)
Appearance: Clean, elevated from page

ELEVATION 2 (Floating Elements)
Background: #FFFFFF (--color-neutral-0)
Purpose: Modals, dropdowns, popups
Border: 1px --color-neutral-200
Shadow: 0 4px 6px rgba(0, 0, 0, 0.07)
Appearance: More prominent than cards

ELEVATION 3 (Important Overlays)
Background: #FFFFFF (--color-neutral-0)
Purpose: Dialog boxes, critical modals
Border: 1px --color-neutral-200
Shadow: 0 10px 15px rgba(0, 0, 0, 0.10)
Appearance: Very prominent

ELEVATION 4 (Top-level UI)
Background: #FFFFFF (--color-neutral-0)
Purpose: Sticky headers, top bars
Border: 1px --color-neutral-200 (bottom)
Shadow: 0 1px 3px rgba(0, 0, 0, 0.08) (bottom only)
Appearance: Always visible, persistent

ELEVATION 5 (Floating Actions)
Background: var(--color-primary-600)
Purpose: FAB buttons, floating actions
Border: None
Shadow: 0 10px 25px rgba(79, 70, 229, 0.2)
Appearance: Most prominent, interactive
```

### Semantic Background Colors

```
SUCCESS BACKGROUND (Completed tasks)
Light: #F0FDF4 (--color-success-50)
Card: #FFFFFF with left border --color-success-600
Purpose: Visual confirmation of completion

WARNING BACKGROUND (Pending, due soon)
Light: #FFFBEB (--color-warning-50)
Card: #FFFFFF with left border --color-warning-500
Purpose: Gentle attention for pending tasks

NEUTRAL BACKGROUND (Inactive, disabled)
Light: #F3F4F6 (--color-neutral-100)
Card: #FFFFFF with border --color-neutral-300
Text: --color-neutral-500
Purpose: Disabled states, inactive elements

ERROR BACKGROUND (Destructive, delete)
Light: #FEF2F2 (--color-danger-50)
Card: #FFFFFF with left border --color-danger-500
Text: --color-danger-700
Purpose: Delete confirmations, destructive actions
```

---

## 3. CARD STYLES - Professional Specifications

### Card Type 1: Default Card (Task, Backlog Item)

```
Structure:
┌────────────────────────────┐
│ 📖 Study                    │ ← Title (600 weight)
│ 2 hours • No deadline       │ ← Meta (400 weight, muted)
│ Est. done: Wednesday 5pm    │ ← Prediction (400 weight, muted)
└────────────────────────────┘

Specifications:
- Background: #FFFFFF
- Border: 1px #E5E7EB
- Border-radius: 8px
- Padding: 12px 14px
- Gap between elements: 4px
- Shadow: 0 1px 2px rgba(0, 0, 0, 0.04)
- Hover: 
  - Background stays white
  - Border: 1px #D1D5DB (darker)
  - Shadow: 0 4px 6px rgba(0, 0, 0, 0.07)
  - Cursor: pointer
  - Transition: 150ms ease

On Hover Effect:
- Scale: 1.01x (subtle lift)
- Shadow increases (more depth)
- Border becomes darker (more defined)
```

### Card Type 2: Task in Timeline (Today)

```
Structure:
├─ 7:00 AM
├─┐
│ └─ 📖 Study
│    [✓] checkbox
│    2h
│    "Morning peak time" ← context
│
└─ 9:00 AM
  ├─ 📚 Math Class
  └─ [✓] checkbox
     1h 30m

Specifications:
- Background: #FFFFFF
- Left Border: 3px (color by type)
  - Work: #8B7EFF (primary)
  - Exercise: #14B8A6 (teal)
  - Relax: #4ADE80 (emerald)
  - Personal: #D97706 (amber)
- Border-radius: 0px left, 8px rest
- Padding: 10px 12px
- Shadow: 0 1px 2px rgba(0, 0, 0, 0.04)
- Margin: 8px 0

Completed State:
- Background: #F0FDF4 (success-50)
- Left border: #16A34A (success-600)
- Text: strikethrough, 50% opacity
- Opacity overall: 0.6
```

### Card Type 3: Chat Message (AI)

```
Structure:
"Good morning! 👋

You have 3 pending tasks.
Your schedule is light today."

Specifications:
- Background: #F6F5FF (primary-50, soft indigo)
- Border: 1px #E0D9FF (primary-200)
- Border-radius: 12px (rounded, softer)
- Padding: 12px 16px
- Max-width: 85% of container
- Margin: 8px 0
- Font: 15px, 400 weight
- Line-height: 1.5
- Text color: #1F2937 (neutral-700)
- Shadow: None (conversational, soft)

Interactive areas:
- Links: #8B7EFF (primary-500)
- Buttons inside: [Confirm] [Adjust] below message
```

### Card Type 4: Chat Message (User)

```
Structure:
"I'm feeling productive today"

Specifications:
- Background: #8B7EFF (primary-500)
- Border: None
- Border-radius: 12px
- Padding: 12px 16px
- Align: Right side
- Font: 15px, 400 weight
- Text color: #FFFFFF
- Shadow: 0 2px 4px rgba(79, 70, 229, 0.2)
```

### Card Type 5: Schedule Proposal Card

```
Structure:
┌─────────────────────────────┐
│ PROPOSED CHANGES            │ ← Header (muted)
├─────────────────────────────┤
│ ✓ Study: 7-9 AM             │ ← Green check (better time)
│  (was 2-4 PM)               │
│  Reason: You're 91% there   │
│                             │
│ ✓ Coding: 9-10:30 AM        │
│  (was 4-5 PM)               │
│  Reason: Avoid post-gym     │
│                             │
│ ✓ Rest: 10:30-11 AM (new)   │
│  Recovery time after work   │
├─────────────────────────────┤
│ [Confirm]  [Revise]         │
└─────────────────────────────┘

Specifications:
- Background: #FFFFFF
- Border: 1px #E0D9FF (primary-200, soft)
- Padding: 16px
- Border-radius: 12px
- Gap between items: 12px

Header:
- Font: 11px, 600 weight, all caps
- Color: #9CA3AF (neutral-400)
- Margin-bottom: 12px
- Text: "PROPOSED CHANGES" or "SCHEDULE"

Items:
- Font: 15px, 400 weight
- Color: #1F2937 (neutral-700)
- Check icon: #22C55E (success-500)
- Secondary text: 13px, #6B7280 (neutral-500)
- Margin: 8px 0

Buttons:
- [Confirm]: #8B7EFF (primary), 12px 20px
- [Revise]: #F3F4F6 (neutral-100), 12px 20px
```

### Card Type 6: Section Header Card

```
Structure:
📊 YOUR DAY AT A GLANCE
─────────────────────────────
9:00-10:30 AM: Math Class  ✓
1:00-2:00 PM: Lunch  ✓
4:00-5:30 PM: Gym
Free slots: 2 | Total: 7 hours

Specifications:
- Background: #F3F4F6 (neutral-100)
- Border: 1px #D1D5DB (neutral-300)
- Padding: 12px 14px
- Border-radius: 8px
- No shadow

Header:
- Font: 13px, 600 weight
- Color: #6B7280 (neutral-500)
- Text: emoji + "YOUR DAY AT A GLANCE"

Content:
- Font: 14px, 400 weight
- Color: #374151 (neutral-700)
- Line-height: 1.6
```

---

## 4. TYPOGRAPHY - Professional Hierarchy

```
DISPLAY
- Font: Inter
- Size: 28px
- Weight: 700
- Line-height: 1.2
- Letter-spacing: 0
- Color: #111827 (neutral-900)
- Use: Page title, app name, hero text

HEADING 1 (H1)
- Font: Inter
- Size: 24px
- Weight: 600
- Line-height: 1.3
- Color: #1F2937 (neutral-800)
- Use: Main section headers

HEADING 2 (H2)
- Font: Inter
- Size: 20px
- Weight: 600
- Line-height: 1.4
- Color: #1F2937 (neutral-800)
- Use: Subsection headers

HEADING 3 (H3)
- Font: Inter
- Size: 16px
- Weight: 600
- Line-height: 1.5
- Color: #374151 (neutral-700)
- Use: Card titles, section names

BODY LARGE (Primary Text)
- Font: Inter
- Size: 15px
- Weight: 400
- Line-height: 1.6
- Color: #1F2937 (neutral-800)
- Use: Main content, descriptions

BODY REGULAR (Secondary Text)
- Font: Inter
- Size: 14px
- Weight: 400
- Line-height: 1.6
- Color: #6B7280 (neutral-600)
- Use: Meta information, timestamps

BODY SMALL (Tertiary Text)
- Font: Inter
- Size: 13px
- Weight: 400
- Line-height: 1.5
- Color: #9CA3AF (neutral-500)
- Use: Labels, hints, muted info

CAPTION
- Font: Inter
- Size: 12px
- Weight: 400
- Line-height: 1.4
- Color: #9CA3AF (neutral-500)
- Letter-spacing: 0.02em
- Use: Very small labels, copyright

LABEL (Form Labels)
- Font: Inter
- Size: 13px
- Weight: 500
- Color: #374151 (neutral-700)
- Margin-bottom: 6px
- Use: Input labels, form headers

BUTTON TEXT
- Font: Inter
- Size: 14px
- Weight: 600
- Letter-spacing: 0.01em
- Use: Button labels, CTAs
```

---

## 5. SPACING SYSTEM - 8px Grid

```
BASE UNIT: 8px

Padding (Internal)
--spacing-0:   0px
--spacing-1:   4px    (tight, internal spacing)
--spacing-2:   8px    (standard, card padding)
--spacing-3:   12px   (comfortable, section padding)
--spacing-4:   16px   (spacious, card content)
--spacing-5:   20px   (large, major sections)
--spacing-6:   24px   (very large, page sections)
--spacing-7:   32px   (hero sections)
--spacing-8:   40px   (top-level spacing)

Margin (External)
- Same as padding system
- Use for spacing between components

Gap (Between Child Elements)
- Cards/items: 8px (--spacing-2)
- Sections: 16px (--spacing-4)
- Major sections: 24px (--spacing-6)
- Page sections: 32px (--spacing-7)
```

---

## 6. BORDER & DIVIDER SYSTEM

```
BORDER WIDTHS
--border-0: None
--border-1: 1px
--border-2: 2px (only for left borders on cards)
--border-3: 3px (accent/category borders)

BORDER COLORS
Primary: #E5E7EB (--color-neutral-200) - default cards
Light: #F3F4F6 (--color-neutral-100) - subtle dividers
Dark: #D1D5DB (--color-neutral-300) - hover states

BORDER RADIUS
--radius-none: 0px
--radius-sm:   4px (small elements, icons)
--radius-md:   8px (cards, inputs, small buttons)
--radius-lg:   12px (large cards, modals, chat bubbles)
--radius-xl:   16px (hero sections)
--radius-full: 9999px (pills, avatars)

DIVIDERS
- Thickness: 1px
- Color: #E5E7EB (--color-neutral-200)
- Margin: --spacing-4 (16px) top/bottom
- Use: Between sections, not borders on containers
```

---

## 7. SHADOW & DEPTH SYSTEM

```
SHADOW SYSTEM (3 levels)

Shadow Subtle (Low depth)
0 1px 2px rgba(0, 0, 0, 0.04)
Use: Cards, default cards, minimal lift

Shadow Medium (Medium depth)
0 4px 6px rgba(0, 0, 0, 0.07)
Use: Hover states on cards, floating elements

Shadow Strong (High depth)
0 10px 15px rgba(0, 0, 0, 0.10)
Use: Modals, important overlays, dropdowns

Shadow Extra (Top level)
0 20px 25px rgba(0, 0, 0, 0.15)
Use: FAB buttons, top-level dialogs

DEPTH TRANSITION
Default: box-shadow 150ms ease
Hover: box-shadow 150ms ease (smooth transition)

NO GRADIENT SHADOWS (Clean look)
- Avoid: Multiple layered shadows
- Use: Single, clean shadow per elevation
```

---

## 8. COLOR COMBINATIONS - Usage Guide

### Primary Action Button

```
State: Default
- Background: #8B7EFF (primary-500)
- Text: #FFFFFF
- Border: None
- Shadow: 0 4px 6px rgba(79, 70, 229, 0.2)

State: Hover
- Background: #7C6EE6 (primary-600)
- Shadow: 0 10px 15px rgba(79, 70, 229, 0.3)
- Transition: 150ms ease

State: Active/Pressed
- Background: #6C5ED4 (primary-700)
- Transform: scale(0.98)

State: Disabled
- Background: #D1D5DB (neutral-300)
- Text: #9CA3AF (neutral-500)
- Cursor: not-allowed
- Shadow: none
```

### Secondary Button

```
State: Default
- Background: #F3F4F6 (neutral-100)
- Text: #1F2937 (neutral-800)
- Border: 1px #D1D5DB (neutral-300)

State: Hover
- Background: #E5E7EB (neutral-200)
- Border: 1px #9CA3AF (neutral-400)

State: Active
- Background: #D1D5DB (neutral-300)
```

### Input Field

```
State: Default
- Background: #FFFFFF
- Border: 1px #D1D5DB (neutral-300)
- Text: #1F2937 (neutral-800)
- Placeholder: #9CA3AF (neutral-500)

State: Focus
- Border: 1px #8B7EFF (primary-500)
- Shadow: 0 0 0 3px rgba(139, 126, 255, 0.1)
- Outline: none

State: Error
- Border: 1px #DC2626 (danger-600)
- Shadow: 0 0 0 3px rgba(220, 38, 38, 0.1)

State: Success
- Border: 1px #16A34A (success-600)
- Shadow: 0 0 0 3px rgba(22, 163, 74, 0.1)
```

### Pill Badge (Category/Tag)

```
Work (Primary)
- Background: #F6F5FF (primary-50)
- Text: #4D2E7E (primary-900)
- Border: 1px #E0D9FF (primary-200)

Exercise (Teal)
- Background: #F0FDFC (secondary-50)
- Text: #0F766E (secondary-700)
- Border: 1px #99F6E4 (secondary-300)

Relax (Emerald)
- Background: #F0FDF4 (success-50)
- Text: #15803D (success-700)
- Border: 1px #BBEF63 (success-300)

Personal (Amber)
- Background: #FFFBEB (warning-50)
- Text: #92400E (warning-800)
- Border: 1px #FCD34D (warning-300)
```

---

## 9. COMPONENT SPECIFICATIONS

### Toggle Switch

```
State: Off
- Background: #D1D5DB (neutral-300)
- Circle: #FFFFFF
- Size: 44px × 24px
- Radius: 12px

State: On
- Background: #8B7EFF (primary-500)
- Circle: #FFFFFF (moves right)
- Transition: 200ms ease

Accessibility:
- Min touch target: 44px × 44px
- Focus state: 2px outline #8B7EFF
```

### Checkbox

```
State: Unchecked
- Border: 2px #D1D5DB (neutral-300)
- Size: 20px × 20px
- Border-radius: 4px
- Background: #FFFFFF

State: Checked
- Background: #8B7EFF (primary-500)
- Icon: ✓ white
- Border: 2px #8B7EFF
- Transition: 150ms ease

State: Hover (unchecked)
- Border: 2px #9CA3AF (neutral-400)

State: Disabled
- Background: #F3F4F6 (neutral-100)
- Border: 2px #D1D5DB (neutral-300)
```

### Progress Bar (Task Completion)

```
Container
- Background: #E5E7EB (neutral-200)
- Height: 4px
- Border-radius: 2px
- Overflow: hidden

Fill
- Background: #8B7EFF (primary-500)
- Transition: width 300ms ease
- Border-radius: 2px

Text Overlay (if showing %)
- Font: 12px, 500 weight
- Color: #1F2937 (neutral-800)
- Position: Absolute, centered on bar
```

### Slider (Duration, Gap Selection)

```
Track
- Background: #E5E7EB (neutral-200)
- Height: 6px
- Border-radius: 3px

Thumb
- Background: #8B7EFF (primary-500)
- Size: 20px × 20px
- Border-radius: 50% (circular)
- Shadow: 0 2px 4px rgba(79, 70, 229, 0.3)
- Cursor: grab (hover), grabbing (active)

Fill (completed portion)
- Background: #8B7EFF (primary-500)
- Height: 6px

Hover state
- Thumb shadow: 0 4px 8px rgba(79, 70, 229, 0.4)
- Scale: 1.1x
```

---

## 10. MICRO-INTERACTIONS & ANIMATIONS

```
TIMING
- Fast: 100ms (hover states, quick feedback)
- Standard: 150ms (transitions, most interactions)
- Slow: 250ms (modals, important transitions)
- Very slow: 300ms (page transitions)

EASING
- Ease-out: cubic-bezier(0.4, 0, 0.2, 1) - for entrances
- Ease-in-out: cubic-bezier(0.4, 0, 0.2, 1) - for state changes
- Ease: cubic-bezier(0.25, 0.46, 0.45, 0.94) - smooth, natural

TRANSFORMS
Button press: scale(0.98) - 100ms ease
Card hover: scale(1.01) + shadow increase - 150ms ease
Modal appear: opacity 0→1 + transform translateY(10px) - 200ms ease-out
Checkbox check: scale(0.8→1) - 150ms cubic-bezier(0.4, 0, 0.2, 1)

FADE TRANSITIONS
- Page change: opacity 0→1 - 150ms ease
- Toast appear: opacity 0→1, translateY(-20px→0) - 200ms ease-out
- Toast exit: opacity 1→0, translateY(0→20px) - 150ms ease-in
```

---

## 11. COMPLETE EXAMPLE - Task Card

```
VISUAL:
┌────────────────────────────────┐
│ ← 3px border (category color)  │
│  📖 Study                       │ ← H3: 16px, 600 weight
│  2 hours • No deadline          │ ← Body small: 13px, 400
│  Est. done: Wednesday 5pm       │ ← Body small: 13px, 400
│                                 │
│  [Hover: scale 1.01, shadow]   │
└────────────────────────────────┘

SPECIFICATIONS:
Background: #FFFFFF
Border-left: 3px #8B7EFF (work/primary)
Border: 1px #E5E7EB (other sides)
Border-radius: 0 8px 8px 0 (rounded on right only)
Padding: 12px 14px
Gap: 4px between lines
Shadow: 0 1px 2px rgba(0, 0, 0, 0.04)

Hover State:
- Transform: scale(1.01)
- Border: 1px #D1D5DB
- Shadow: 0 4px 6px rgba(0, 0, 0, 0.07)
- Transition: all 150ms ease

Title:
- Font: Inter 16px 600
- Color: #1F2937
- Margin: 0

Meta:
- Font: Inter 13px 400
- Color: #9CA3AF

Completion State:
- Background: #F0FDF4
- Border-left: 3px #16A34A
- Text: strikethrough, 0.6 opacity
```

---

## 12. ACCESSIBILITY STANDARDS

```
Color Contrast
- Text on background: Minimum 4.5:1 (WCAG AA)
- Large text (18px+): Minimum 3:1
- Primary on white: #1F2937 on #FFFFFF = 8.4:1 ✓

Touch Targets
- Minimum: 44px × 44px
- Ideal: 48px × 48px
- Spacing between: 8px minimum

Focus States
- All interactive elements must have visible focus
- Style: 2px outline --color-primary-500
- Offset: 2px from element

Focus Outline:
box-shadow: 0 0 0 3px rgba(139, 126, 255, 0.2)
border: 2px solid #8B7EFF

Animation
- Prefers-reduced-motion: No animations
- Default: All animations should be disable-able
```

---

## 13. RESPONSIVE BREAKPOINTS

```
MOBILE (< 480px)
- Max-width: 100%
- Padding: 16px
- Font: 14px base
- Card padding: 12px
- Stack all layouts vertically
- Bottom nav: Visible
- FAB: Fixed bottom-right with margin

TABLET (480px - 768px)
- Max-width: 720px
- Padding: 20px
- Font: 15px base
- Card padding: 14px
- 2-column layouts where appropriate

DESKTOP (> 768px)
- Max-width: 1024px (if centered)
- Padding: 24px
- Font: 15px base
- Card padding: 16px
- Multi-column layouts
- Sidebars enabled
```

---

## 14. DARK MODE (Optional Future)

```
If implementing dark mode:

Primary dark backgrounds
--color-dark-900: #0F172A
--color-dark-800: #1F2937
--color-dark-700: #374151

Card backgrounds (dark)
--color-dark-card: #1F2937

Text (dark)
--color-dark-text-primary: #F9FAFB
--color-dark-text-secondary: #D1D5DB

Keep same primary colors (#8B7EFF)
Increase contrast for readability
Use softer shadows on dark backgrounds
```

---

## 15. SUMMARY - Design Tokens

```CSS
/* Core Colors */
--primary: #8B7EFF
--secondary: #14B8A6
--success: #22C55E
--warning: #F59E0B
--danger: #EF4444

/* Neutrals */
--bg-primary: #F9FAFB
--bg-secondary: #FFFFFF
--text-primary: #1F2937
--text-secondary: #6B7280
--text-muted: #9CA3AF
--border: #E5E7EB

/* Typography */
--font-family: Inter
--font-size-sm: 13px
--font-size-base: 15px
--font-size-lg: 16px
--font-size-xl: 20px
--font-size-2xl: 24px

/* Spacing */
--spacing-1: 4px
--spacing-2: 8px
--spacing-3: 12px
--spacing-4: 16px
--spacing-5: 20px
--spacing-6: 24px

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07)
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.10)

/* Border Radius */
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px

/* Transitions */
--transition-fast: 150ms ease
--transition-slow: 250ms ease
```

---

## Implementation Checklist

- [ ] Apply primary color (#8B7EFF) to all CTAs
- [ ] Update all card backgrounds to #FFFFFF
- [ ] Set page background to #F9FAFB
- [ ] Update all text to use neutral color scale
- [ ] Remove all bright/childish colors
- [ ] Add proper shadows for depth
- [ ] Implement border system (1px #E5E7EB)
- [ ] Update typography to Inter, proper hierarchy
- [ ] Set spacing to 8px grid
- [ ] Add hover states to all interactive elements
- [ ] Test contrast ratios (WCAG AA minimum)
- [ ] Verify touch targets (44px minimum)
- [ ] Test on mobile/tablet/desktop
- [ ] Ensure animations are smooth (150ms default)
