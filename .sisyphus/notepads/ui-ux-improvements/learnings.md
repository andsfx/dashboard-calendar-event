# learnings


## Hero Background Enhancement (Completed)
- Multi-layer background structure: base gradient → noise texture → mesh gradient
- Noise texture: inline SVG data URI with fractalNoise filter (opacity 0.03)
- Mesh gradient: 4 radial-gradients positioned at different coordinates with brand colors (orange, violet, pink, indigo)
- Decorative blur elements: 4 elements with /25 opacity for atmospheric depth
- Pattern: Fragment-based approach allows conditional rendering (heroImageUrl vs fallback)

## Task 2: CTA Buttons Enhancement (2026-04-25 19:48)

### What Worked
- **Bold box-shadow with brand color**: Using rgba(242, 116, 62, 0.5) creates a warm glow that reinforces brand identity
- **Tailwind group utilities**: Parent element gets 'group' class, children use 'group-hover:' for coordinated animations
- **Scale + icon translation combo**: Primary CTA scales to 1.05x while arrow icon translates right - creates dynamic, directional feel
- **Enhanced glassmorphism**: Secondary CTA upgraded from backdrop-blur-sm to backdrop-blur-xl with stronger bg opacity (white/10 → white/20 on hover)
- **Border weight increase**: Changing from border to border-2 makes secondary CTA more defined and intentional

### Technical Patterns
- **Inline style + Tailwind hybrid**: boxShadow in inline style object, hover effects via Tailwind classes
- **transition-all duration-300**: Smooth 300ms transitions for all properties
- **Multi-property hover states**: Secondary CTA animates bg, border, and backdrop simultaneously

### Design Decisions
- Primary CTA: Bold, attention-grabbing with warm shadow matching gradient
- Secondary CTA: Refined glassmorphism that complements without competing
- Icon animation: Subtle translate-x-1 (4px) reinforces "forward" action
- Duration consistency: All transitions use 300ms for cohesive feel


## Task 3: Benefits Cards Redesign (Accent Colors + Hover)
- **Pattern**: CSS variables for dynamic colors: `style={{ '--accent-color': benefit.color } as React.CSSProperties}`
- **Accent bar**: Absolute positioned, transitions h-1 → h-2 on hover, uses inline style for color
- **Icon background**: Hex color + opacity suffix (`15`) creates 15% opacity tint
- **Hover coordination**: `group` class + `group-hover:` utilities for synchronized effects
- **Multi-layer hover**: Combines translate-y, shadow, scale, and opacity transitions
- **Decorative blob**: Absolute positioned gradient with blur-2xl, opacity 0 → 20% on hover
- **Transition consistency**: 300ms duration across all animated properties
- **Overflow handling**: `overflow-hidden` on card container prevents blob from escaping rounded corners
- **Accessibility**: `pointer-events-none` on decorative blob, `aria-hidden="true"` for non-semantic elements
- **Color differentiation**: Each card visually distinct via benefit.color (amber, pink, violet, emerald)
