<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
Redesign the existing **Teso LMS + Self-Study Platform UI** into a polished, modern, academic learning platform.

The goal is to make Teso feel **intelligent, trustworthy, structured, and professional**, while avoiding the visual patterns that make modern interfaces immediately look AI-generated.

### Core Design Direction

Create a UI that feels like a **real product designed by an experienced product/design team**, not an AI-generated SaaS landing page.

Prioritize:

- Clear information hierarchy
- Excellent readability
- Strong usability for long study sessions
- Consistent spacing and alignment
- Functional visual hierarchy over decoration
- Professional academic/productivity aesthetics
- Subtle personality through typography, color, icons, and layout
- Familiar UI patterns where they improve usability

The interface should feel suitable for students using the platform for **hours of studying**, rather than looking like a flashy AI product demo.

---

## IMPORTANT: Avoid the "AI-Generated UI" Look

Do **NOT** use common AI-generated UI patterns such as:

- Large decorative gradients across the interface
- Gradient backgrounds behind every section
- Excessive purple/violet glow effects
- Neon colors
- Glassmorphism
- Frosted-glass cards
- Floating translucent blobs
- Abstract AI-looking background shapes
- Excessive shadows
- Huge rounded cards everywhere
- Excessive use of `border-radius: 20px+`
- Every element being placed inside a separate card
- Oversized hero sections
- Excessive whitespace that reduces information density
- Random decorative icons
- Excessive sparkles, stars, "AI magic" symbols, or ✨ visuals
- Gradient text
- Gradient buttons
- Glowing buttons
- Excessive animated elements
- Artificial-looking dashboard charts
- Generic "AI SaaS" landing-page layouts
- Purple-on-dark futuristic interfaces
- Overly symmetrical layouts that feel template-generated

Do not add visual elements simply because they make the interface look "modern."

**Modern should come from good typography, spacing, hierarchy, interaction design, and consistency — not visual effects.**

---

# Teso Color System

Use the following palette consistently.

| Role           | Color       | Hex       | Usage                                                       |
| -------------- | ----------- | --------- | ----------------------------------------------------------- |
| Primary        | Deep Indigo | `#4F46E5` | Logo, primary buttons, active navigation, important actions |
| Primary Dark   | Dark Indigo | `#3730A3` | Hover states, strong headings, selected states              |
| AI Accent      | Violet      | `#7C3AED` | AI Tutor, AI insights, smart features                       |
| Success        | Emerald     | `#10B981` | Correct answers, completed lessons, improvement             |
| Warning        | Amber       | `#F59E0B` | Weak topics, deadlines, attention                           |
| Error          | Red         | `#EF4444` | Wrong answers, errors, struggling areas                     |
| Background     | Soft Gray   | `#F8FAFC` | Main application background                                 |
| Surface        | White       | `#FFFFFF` | Cards, question panels, dashboards                          |
| Main Text      | Slate       | `#0F172A` | Headings and primary content                                |
| Secondary Text | Gray Slate  | `#64748B` | Descriptions, metadata, secondary information               |
| Borders        | Light Slate | `#E2E8F0` | Inputs, cards, separators                                   |

### Brand Color

The main Teso brand relationship should be:

**Deep Indigo `#4F46E5` + Violet `#7C3AED`**

However, do NOT turn this into a gradient-heavy visual identity.

Use Indigo as the dominant brand color and Violet only as a controlled accent for AI-related functionality.

For example:

- Normal learning → Indigo
- Navigation → Indigo
- Primary actions → Indigo
- AI Tutor → Violet
- AI-generated insights → Violet
- AI recommendations → subtle Violet indicator

The AI accent should communicate **"smart functionality"**, not make the entire platform look like an AI chatbot.

---

# Color Distribution

Follow approximately:

**80%** → White / Soft Gray
**15%** → Indigo
**5%** → Violet + semantic colors

The majority of the interface should remain calm and neutral.

Do not use Indigo or Violet as large background surfaces unless there is a strong UX reason.

Avoid gradients as a general design language.

If a gradient is absolutely necessary, keep it extremely subtle and localized rather than using it as a major background treatment.

---

# Learning-Focused Semantic Colors

Color should communicate meaning throughout the learning experience.

### Green — Mastered / Correct

Use `#10B981`

Examples:

- Correct answers
- Completed lessons
- Mastered topics
- Positive improvement
- Strong performance

### Amber — Needs Practice / Attention

Use `#F59E0B`

Examples:

- Weak topics
- Approaching deadlines
- Topics requiring revision
- Moderate performance

### Red — Struggling / Incorrect

Use `#EF4444`

Examples:

- Incorrect answers
- Significant learning gaps
- Poor performance
- Critical issues

### Indigo — Normal Learning

Use `#4F46E5`

Examples:

- Navigation
- Standard learning progress
- Primary actions
- Active learning states

Do not rely on color alone to communicate status. Combine colors with labels, icons, percentages, progress indicators, or other accessible visual cues.

---

# Example Dashboard

The student dashboard should make academic performance immediately understandable without looking like a generic analytics dashboard.

For example:

**Physics — 82%**

- Green
- Strong/mastered indication

**Chemistry — 61%**

- Amber
- Needs practice indication

**Electric Fields — 38%**

- Red
- Struggling indication

Use simple progress bars, compact indicators, or clearly structured statistics instead of decorative charts everywhere.

The dashboard should answer important questions quickly:

- What should I study next?
- What am I doing well in?
- Where am I struggling?
- What lessons are incomplete?
- What should I practice?
- How is my performance improving?
- What deadlines or upcoming activities matter?

---

# Layout Principles

Use a clean application layout with:

- Persistent sidebar or appropriate navigation system
- Clear page titles
- Consistent content width
- Strong visual hierarchy
- Comfortable but efficient spacing
- Clear section separation
- Simple cards where cards are genuinely useful
- Tables/lists when information is better represented as structured data
- Compact controls for filtering and sorting
- Consistent button hierarchy
- Predictable navigation

Do not put every piece of information into a floating card.

Use **cards only when they help group related information**.

Some sections should intentionally remain flat on the page.

---

# Cards and Components

Cards should generally have:

- White background
- Subtle `#E2E8F0` border
- Small, restrained shadow when necessary
- Moderate corner radius
- Clear internal spacing

Avoid making every component heavily rounded.

Prefer a restrained radius such as **8–12px** for most UI components.

Buttons should also feel like standard professional product UI rather than oversized pill-shaped AI buttons.

---

# Typography

Use a clean, highly readable modern sans-serif font.

Prioritize:

- Strong heading hierarchy
- Comfortable body text
- Clear metadata
- Good line height
- High readability

<!-- END:nextjs-agent-rules -->
