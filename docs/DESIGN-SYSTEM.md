# Design System Documentation
## Metropolitan Mall Bekasi Event Dashboard

> **⚠️ Source of truth (SoT):** [`DESIGN.md`](../DESIGN.md) + `src/styles/tokens.css` + `src/styles/theme.css`.  
> This file is **reference / historical**. On conflict, follow `DESIGN.md` and tokens — not this doc.  
> Pink is **not** a primary CTA fill; secondary buttons use soft tosca (see `DESIGN.md` pink allow/deny).

> **Version**: 2.2  
> **Last Updated**: 2026-07-19  
> **Based on**: design-taste-frontend principles + Metmal logo brand

---

## 🎨 Overview

Sistem desain komprehensif untuk aplikasi **Metropolitan Mall Bekasi Event Dashboard**. Dibangun dengan prinsip-prinsip design-taste-frontend yang mengutamakan konsistensi, aksesibilitas, dan performance.

### Stack
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + Custom Design Tokens
- **Build**: Vite 6
- **Typography**: Plus Jakarta Sans
- **Icons**: Lucide React

---

## 📐 Design Principles

### 1. **Unified Visual Identity**
- Single source of truth untuk colors, typography, spacing
- Konsistensi antara public landing & community pages
- Extensible untuk admin dashboard

### 2. **Metmal-like Aesthetic**
- Pastel neutral palette (paper, card, ink)
- Tosca primary (`#00918E`) + Pink secondary (`#E24378`)
- Clean data-first approach
- Rounded corners (12-16px)

### 3. **Accessibility First (WCAG AA)**
- Minimum 4.5:1 contrast ratio untuk text
- Minimum 3:1 untuk UI components
- Focus states dengan 2px outline
- Skip links untuk keyboard navigation
- ARIA labels dan semantic HTML

### 4. **Performance Optimized**
- CSS-only animations
- Intersection Observer untuk scroll reveals
- Lazy loading images
- Reduced motion support
- No heavy JS dependencies

### 5. **Mobile-First Responsive**
- Touch targets min 44x44px
- Responsive typography scale
- Safe area insets support
- Mobile-specific optimizations

---

## 🎨 Color System

### Brand Colors
| Token | Value | Usage |
|-------|-------|-------|
| `brand-primary` | `#00918e` | Primary actions, links, focus, solid CTAs |
| `brand-primary-50` | `#eefafa` | Light backgrounds |
| `brand-primary-100` | `#d5f3f2` | Soft fills |
| `brand-primary-400` | `#33a8a5` | Soft tosca / dark-mode accents |
| `brand-primary-600` | `#007a78` | Hover actions |
| `brand-primary-700` | `#00554c` | Dark tosca |
| `brand-secondary` | `#e24378` | Secondary accent (pink) |
| `brand-secondary-400` | `#ee95a9` | Soft pink |
| `brand-secondary-600` | `#c92d62` | Hover secondary |

CSS vars: `--brand-tosca`, `--brand-pink`. Legacy `--brand-violet` / `--brand-orange` alias to tosca/pink.

### Neutral Palette
| Token | Value | Usage |
|-------|-------|-------|
| `neutral-50` | `#f4efe8` | Paper background |
| `neutral-100` | `#faf6ef` | Card background |
| `neutral-200` | `#fffdf9` | Card light background |
| `neutral-500` | `#64748b` | Muted text |
| `neutral-700` | `#334155` | Secondary text |
| `neutral-900` | `#0f172a` | Primary text |

### Semantic Colors
| Token | Usage |
|-------|-------|
| `success` (emerald) | Live events, positive actions |
| `warning` (amber) | Warnings, pending states |
| `danger` (red) | Errors, destructive actions |
| `info` (blue) | Informational messages |

---

## 📝 Typography System

### Font Families
```css
--font-display: "Plus Jakarta Sans", system-ui, sans-serif;
--font-body: "Plus Jakarta Sans", system-ui, sans-serif;
```

### Type Scale
| Class | Size | Usage |
|-------|------|-------|
| `display-1` | 8xl (96px) | Hero headers |
| `display-2` | 7xl (72px) | Hero titles |
| `display-3` | 6xl (60px) | Section headers |
| `display-4` | 5xl (48px) | Sub-section headers |
| `h1` | 4xl (36px) | Page titles |
| `h2` | 3xl (30px) | Section titles |
| `h3` | 2xl (24px) | Card titles |
| `h4` | xl (20px) | Sub-card titles |
| `h5` | lg (18px) | Component titles |
| `h6` | base (16px) | Small titles |
| `body-lg` | lg (18px) | Lead paragraphs |
| `body-base` | base (16px) | Default text |
| `body-sm` | sm (14px) | Secondary text |
| `body-xs` | xs (12px) | Captions |

### Specialized Typography
- `ui-eyebrow` - Uppercase, tracking-wide, 11px, brand-primary color
- `ui-label` - Uppercase, tracking-wide, 12px, medium weight
- `ui-caption` - 12px, neutral-500 color
- `font-display` - Display font family
- `font-body` - Body font family

---

## 📏 Spacing System

### Spacing Scale
| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight spacing |
| `space-2` | 8px | Compact spacing |
| `space-3` | 12px | Default spacing |
| `space-4` | 16px | Standard spacing |
| `space-6` | 24px | Section spacing |
| `space-8` | 32px | Large spacing |
| `space-12` | 48px | Section padding |
| `space-16` | 64px | Major sections |
| `space-20` | 80px | Hero sections |
| `space-24` | 96px | Page sections |

---

## 🔘 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 4px | Small elements |
| `rounded` | 8px | Default |
| `rounded-md` | 12px | Cards |
| `rounded-lg` | 16px | Large cards |
| `rounded-xl` | 20px | Hero cards |
| `rounded-2xl` | 24px | Campaign cards |
| `rounded-full` | 9999px | Pills, avatars |

---

## 🌑 Box Shadows

| Token | Usage |
|-------|-------|
| `shadow-sm` | Subtle elevation |
| `shadow` | Default cards |
| `shadow-md` | Elevated cards |
| `shadow-lg` | Hover states |
| `shadow-xl` | Modals |
| `shadow-2xl` | Overlays |

---

## ⚡ Animation System

### Timing Functions
- `ease-out-expo` - `cubic-bezier(0.22, 1, 0.36, 1)` - Default untuk UI
- `ease-in-out` - Standard transitions
- `ease-out` - Exit transitions

### Durations
- `75ms` - Instant feedback
- `150ms` - Quick transitions
- `300ms` - Default transitions
- `500ms` - Page transitions
- `1000ms` - Reveal animations

### Animation Classes
- `fade-in` - Simple fade with slide
- `slide-in-up` - Slide from bottom
- `slide-in-left` - Slide from left
- `slide-in-right` - Slide from right
- `scale-in` - Scale from 0.95 to 1

### Stagger Delays
- `.stagger-1` through `.stagger-8` - 100ms increments

### Reduced Motion
Semua animasi respect `prefers-reduced-motion: reduce`.

---

## 🧩 Component Library

### Core UI Components

#### Button
```tsx
import { Button } from './components/ui';

<Button variant="primary" size="md">Click me</Button>
<Button variant="secondary" size="lg">Submit</Button>
<Button variant="ghost" size="sm">Cancel</Button>
<Button variant="outline">Outline</Button>
<Button isLoading>Loading</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'ghost' | 'outline'
- `size`: 'sm' | 'md' | 'lg'
- `isLoading`: boolean
- All standard button HTML attributes

#### Card
```tsx
import { Card, CardHeader, CardContent, CardFooter } from './components/ui';

<Card variant="elevated">
  <CardHeader>
    <h3>Card Title</h3>
  </CardHeader>
  <CardContent>
    <p>Card content</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

**Variants:**
- `default` - Standard card dengan subtle shadow
- `elevated` - Card dengan medium shadow
- `glass` - Glass morphism effect
- `campaign` - Special campaign card

#### Badge & StatusDot
```tsx
import { Badge, StatusDot } from './components/ui';

<Badge variant="primary">Featured</Badge>
<Badge variant="success" size="sm">
  <StatusDot status="live" />
  Live Now
</Badge>
```

**Variants:**
- `default`, `primary`, `secondary`, `success`, `warning`, `danger`, `info`

**StatusDot statuses:**
- `live` - Pulsing green dot
- `upcoming` - Blue dot
- `completed` - Gray dot
- `cancelled` - Red dot

#### Input & Textarea
```tsx
import { Input, Textarea } from './components/ui';

<Input 
  label="Email" 
  type="email" 
  error={errors.email}
  helperText="We'll never share your email"
/>

<Textarea 
  label="Description"
  rows={4}
  placeholder="Tell us about your event..."
/>
```

#### Select
```tsx
import { Select } from './components/ui';

<Select label="Category">
  <option value="music">Music</option>
  <option value="food">Food</option>
</Select>
```

#### Checkbox & Radio
```tsx
import { Checkbox, Radio } from './components/ui';

<Checkbox label="I agree to terms" />
<Radio name="event-type" label="Indoor" />
```

#### Layout Components
```tsx
import { Hero, Section, Container } from './components/ui';

<Hero 
  title="Welcome" 
  subtitle="Best events in town"
  backgroundImage={heroImg}
>
  <Button size="lg">Get Started</Button>
</Hero>

<Section>
  <Container>
    <h2>Content</h2>
  </Container>
</Section>
```

#### Modal
```tsx
import { Modal, ModalHeader, ModalFooter } from './components/ui';

<Modal 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure?</p>
  <ModalFooter>
    <Button variant="ghost" onClick={onClose}>Cancel</Button>
    <Button variant="primary" onClick={onConfirm}>Confirm</Button>
  </ModalFooter>
</Modal>
```

#### Navbar
```tsx
import { Navbar } from './components/ui';

<Navbar items={[
  { href: '#home', label: 'Home' },
  { href: '#about', label: 'About' }
]} />
```

#### FAQ Accordion
```tsx
import { FAQAccordion } from './components/ui';

<FAQAccordion items={[
  { question: 'Q1?', answer: 'A1' },
  { question: 'Q2?', answer: 'A2' }
]} />
```

#### FeatureCard & StatCard
```tsx
import { FeatureCard, StatCard } from './components/ui';

<FeatureCard 
  icon={<Calendar />}
  title="Event Management"
  description="Manage all your events in one place"
/>

<StatCard 
  label="Total Events"
  value={156}
  trend="up"
  trendValue="+12%"
  icon={<TrendingUp />}
/>
```

#### Footer
```tsx
import { Footer } from './components/ui';

<Footer links={[
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' }
    ]
  }
]} />
```

### RevealSection (Animation)
```tsx
import { RevealSection } from './components/ui';

<RevealSection 
  animation="slide-in-up"
  stagger
  threshold={0.2}
>
  <h2>Section Title</h2>
  <p>Content</p>
</RevealSection>
```

**Props:**
- `animation`: 'fade-in' | 'slide-in-up' | 'slide-in-left' | 'slide-in-right' | 'scale-in'
- `stagger`: boolean - Enable staggered children
- `threshold`: number - Intersection threshold (0-1)
- `delay`: number - Delay in ms

### SkipLink (Accessibility)
```tsx
import { SkipLink } from './components/ui';

<SkipLink href="#main-content">
  Skip to main content
</SkipLink>
```

---

## 📊 Dashboard Components

### DashboardLayout
```tsx
import { DashboardLayout, DashboardSidebar, DashboardHeader, DashboardContent } from './components/ui/dashboard';

<DashboardLayout
  sidebar={
    <DashboardSidebar 
      logo={<Logo />}
      items={[
        { label: 'Events', href: '/events', icon: <Calendar />, active: true },
        { label: 'Settings', href: '/settings', icon: <Settings /> }
      ]}
    />
  }
>
  <DashboardHeader 
    title="Events"
    description="Manage all events"
    actions={<Button>New Event</Button>}
  />
  <DashboardContent>
    {/* Content */}
  </DashboardContent>
</DashboardLayout>
```

### DataTable
```tsx
import { DataTable } from './components/ui/dashboard';

interface Event {
  id: string;
  title: string;
  date: string;
  status: string;
}

<DataTable
  columns={[
    { key: 'title', header: 'Title' },
    { key: 'date', header: 'Date' },
    { 
      key: 'status', 
      header: 'Status',
      render: (event) => <Badge>{event.status}</Badge>
    }
  ]}
  data={events}
  isLoading={isLoading}
  emptyMessage="No events found"
/>
```

### Tabs
```tsx
import { Tabs } from './components/ui/dashboard';

<Tabs
  items={[
    { id: 'overview', label: 'Overview', content: <Overview /> },
    { id: 'details', label: 'Details', content: <Details /> }
  ]}
/>
```

---

## ♿ Accessibility Guidelines

### Color Contrast
- Normal text: ≥ 4.5:1
- Large text (≥18px or ≥14px bold): ≥ 3:1
- UI components: ≥ 3:1

### Focus States
- All interactive elements must have visible focus state
- Use `focus-visible` for keyboard-only focus
- 2px outline dengan `outline-offset: 2px`

### Keyboard Navigation
- All interactive elements keyboard accessible
- Logical tab order
- Skip links untuk bypass navigation
- Escape key closes modals/menus
- Arrow keys untuk navigation dalam components

### ARIA Labels
- Icon buttons harus punya `aria-label`
- Decorative images: `alt=""`
- Informative images: descriptive `alt`
- Form inputs: associated `<label>`
- Modals: `role="dialog"` + `aria-modal="true"`

### Reduced Motion
- Respect `prefers-reduced-motion: reduce`
- Disable animations untuk users yang prefer
- Ensure functionality works without animations

---

## 📱 Responsive Design

### Breakpoints
- `sm`: 640px - Small tablets
- `md`: 768px - Tablets
- `lg`: 1024px - Laptops
- `xl`: 1280px - Desktops
- `2xl`: 1536px - Large screens

### Touch Targets
- Minimum 44x44px untuk all interactive elements
- Adequate spacing between targets
- No overlapping interactive areas

### Mobile Optimizations
- 16px font size on inputs (prevents iOS zoom)
- Safe area insets untuk notched devices
- Responsive typography scale
- Touch-friendly buttons

---

## 🚀 Performance Guidelines

### Images
- Use lazy loading untuk below-the-fold
- Provide srcSet untuk responsive images
- Use proper aspect ratios untuk prevent layout shift
- Optimize images dengan appropriate formats (WebP, AVIF)

### Animations
- Use CSS animations over JS where possible
- Use `transform` dan `opacity` untuk smooth performance
- Use Intersection Observer untuk scroll-triggered animations
- Respect `prefers-reduced-motion`

### Bundle Size
- Tree-shake unused components
- Lazy load heavy components
- Use dynamic imports untuk large features

---

## 📚 Best Practices

### Component Design
1. **Single Responsibility** - Satu komponen, satu tugas
2. **Composition over Configuration** - Build complex dari simple
3. **Props API Consistency** - Predictable patterns
4. **Forward Refs** - Allow parent access ke DOM
5. **TypeScript First** - Full type safety

### Naming Conventions
- Components: PascalCase (Button, Card)
- Files: kebab-case (button.tsx, public-landing.tsx)
- CSS classes: kebab-case (fade-in, slide-up)
- CSS variables: kebab-case with -- prefix (--brand-primary)

### File Organization
```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   ├── dashboard/    # Dashboard-specific components
│   ├── community/    # Community landing components
│   └── public/       # Public landing components
├── hooks/            # Custom React hooks
├── styles/           # Global styles
├── types/            # TypeScript types
└── utils/            # Utility functions
```

---

## 🔄 Migration Guide

### From Old System to New System

#### Colors
```tsx
// ❌ Old
<div className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">

// ✅ New
<div className="bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-white">
```

#### Typography
```tsx
// ❌ Old
<h1 className="text-5xl font-bold">Title</h1>

// ✅ New
<h1 className="display-4 font-display">Title</h1>
```

#### Buttons
```tsx
// ❌ Old
<button className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl">

// ✅ New
<Button variant="primary" size="md">Click me</Button>
```

#### RevealSection
```tsx
// ❌ Old
import { RevealSection } from './PublicShared';

// ✅ New
import { RevealSection } from './components/ui';
```

---

## 📖 Resources

- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [React 19 Documentation](https://react.dev/)
- [Design Taste Frontend Skill](file:///C:/Users/malme/.agents/skills/design-taste-frontend/)

---

**Maintained by**: Design System Team  
**Contact**: design@metropolitanmall.co.id  
**Last Review**: 2026-01-16