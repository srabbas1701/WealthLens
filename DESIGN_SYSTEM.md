# Investment Portfolio Dashboard - Design System

## Overview
Professional, production-grade investment portfolio dashboard for Indian retail investors.

## Design Philosophy
- **Calm & Premium**: Trust-first approach with no urgency or flashy elements
- **Clean & Simple**: No gradients, no glassmorphism, minimal shadows
- **Data-First**: Clear hierarchy with strong emphasis on numbers
- **Professional**: Feels like INDmoney + Monzo, not AI-generated UI

---

## Color Palette

### Primary - Wealth Blue
```
--wealth-blue: #0F3B5F (Deep wealth blue)
--wealth-blue-light: #1A5080
--wealth-blue-dark: #0A2840
```

### Backgrounds
```
--background: #FAFBFC (Soft neutral background)
--card: #FFFFFF (White cards)
--secondary: #F3F4F6 (Light gray)
--muted: #F9FAFB (Muted background)
--accent: #EFF6FF (Light blue accent)
```

### Text Colors
```
--foreground: #1F2937 (Primary text)
--secondary-foreground: #374151 (Secondary text)
--muted-foreground: #6B7280 (Muted text)
```

### Semantic Colors
```
--success: #059669 (Green for positive)
--success-light: #D1FAE5
--warning: #D97706 (Amber for warnings)
--warning-light: #FEF3C7
--destructive: #DC2626 (Red for errors)
```

### Borders
```
--border: #E5E7EB (Standard border)
--input: #E5E7EB (Input borders)
```

---

## Typography

### Font Family
- **Primary**: Inter (Google Fonts)
- **Fallback**: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

### Font Weights
- Regular: 400 (Body text)
- Medium: 500 (Labels, secondary headings)
- Semibold: 600 (Headings, important text)
- Bold: 700 (Numbers, primary headings)

### Font Sizes
- **Hero Numbers**: 3rem (48px) - text-5xl
- **Large Numbers**: 2rem (32px) - text-3xl
- **Medium Numbers**: 1.5rem (24px) - text-2xl
- **Headings**: 1rem (16px) - text-base
- **Body**: 0.875rem (14px) - text-sm
- **Caption**: 0.75rem (12px) - text-xs

### Number Styling
All financial numbers use the `.number-emphasis` class:
```css
.number-emphasis {
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
```

---

## Layout System

### Tile-Based Dashboard
1. **Hero Net Worth Tile** - Full width, prominent
2. **Asset-wise Tiles** - 3-column grid (MF, Equity, FDs)
3. **Risk & Goal Tiles** - 2-column grid
4. **Data Tables** - Left column (2/3 width)
5. **Sidebar** - Right column (1/3 width)

### Container Widths
- **Max Width**: 1280px (max-w-7xl)
- **Padding**: 1.5rem (px-6)
- **Gap**: 1rem (gap-4) for grids, 1.5rem (gap-6) for sections

### Spacing
- **Section Margins**: 1.5rem (mb-6)
- **Card Padding**: 1.5rem (p-6)
- **Tile Padding**: 2rem (p-8) for hero, 1.5rem (p-6) for regular

---

## Components

### Cards
```
Background: white (#FFFFFF)
Border: 1px solid #E5E7EB
Border Radius: 0.5rem (rounded-lg)
Shadow: minimal (shadow-sm)
Hover: shadow-md
```

### Buttons

#### Primary Button
```
Background: #0F3B5F
Text: white
Hover: #1A5080
Border Radius: 0.5rem
Padding: 0.625rem 1.25rem (py-2.5 px-5)
Font: 14px, medium weight
```

#### Secondary Button
```
Background: #EFF6FF
Text: #0F3B5F
Border: 1px solid #0F3B5F/10
Hover: #0F3B5F/5
```

#### Tile Button (Quick Actions)
```
Background: white
Border: 1px solid #D1D5DB
Hover Border: #0F3B5F
Hover Background: #EFF6FF
Padding: 1rem (p-4)
Text Align: left
```

### Status Badges
```
No Action: emerald-50 bg, emerald-800 text
Monitor: blue-50 bg, blue-800 text
Attention: amber-50 bg, amber-800 text

Border Radius: 0.5rem (rounded-lg)
Border: 1px solid matching color
Padding: 0.375rem 0.75rem (py-1.5 px-3)
```

### Progress Bars
```
Track: #F3F4F6 (gray-100)
Fill: #0F3B5F (primary) or #059669 (success)
Height: 0.5rem (h-2)
Border Radius: full (rounded-full)
```

---

## Shadows

Minimal shadow approach:
- **Default**: shadow-sm (subtle)
- **Hover**: shadow-md (slightly elevated)
- **Focus**: none (use outline instead)

```css
shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1)
```

---

## Border Radius

Consistent across all elements:
- **Small**: 0.5rem (rounded-lg) - default for most
- **Icons**: 0.5rem (rounded-lg)
- **Badges**: 0.5rem (rounded-lg)
- **Buttons**: 0.5rem (rounded-lg)
- **Full**: rounded-full for dots, progress tracks

---

## Interaction States

### Hover
- Cards: border-color changes slightly, shadow increases
- Buttons: background color lightens slightly
- Quick Actions: border changes to primary blue, background to light blue

### Focus
- Outline: 2px solid primary with 50% opacity
- No additional shadows or backgrounds

### Active
- Buttons: scale(0.98) on click
- No color change from hover state

---

## Icon System

### Icon Library
Lucide React icons throughout

### Icon Sizes
- Small: 4 × 4 (1rem)
- Medium: 5 × 5 (1.25rem)
- Large: 8 × 8 (2rem) in icon containers

### Icon Containers
```
Size: 2rem × 2rem (w-8 h-8) or 2.5rem × 2.5rem (w-10 h-10)
Background: #EFF6FF (light blue)
Icon Color: #0F3B5F (wealth blue)
Border Radius: 0.5rem (rounded-lg)
```

---

## Data Tables

### Header
```
Background: #F9FAFB
Border: #E5E7EB
Text: #374151, semibold, 0.875rem
Padding: 0.75rem 1.5rem (py-3 px-6)
```

### Rows
```
Background: white
Border: 1px solid #F3F4F6
Hover: #F9FAFB
Padding: 0.875rem 1.5rem (py-3.5 px-6)
```

### Footer
```
Background: #F9FAFB
Border Top: 2px solid #D1D5DB
Font: bold
```

---

## Responsive Breakpoints

- **Mobile**: < 768px (single column)
- **Tablet**: 768px - 1024px (md:)
- **Desktop**: > 1024px (lg:, full layout)

### Grid Adjustments
- Asset Tiles: 1 col mobile, 3 cols desktop
- Risk/Goal: 1 col mobile, 2 cols desktop
- Main Layout: 1 col mobile, 3 cols (2+1) desktop

---

## Accessibility

### Contrast Ratios
- Primary text on white: 12.63:1 (AAA)
- Secondary text on white: 7.24:1 (AA)
- Blue on white: 8.91:1 (AAA)

### Focus States
- Visible outline on all interactive elements
- Skip to content link (for screen readers)

### Semantic HTML
- Proper heading hierarchy (h1 → h2 → h3)
- ARIA labels where needed
- Semantic section elements

---

## Animation & Motion

### Timing Functions
- Default: ease-in-out
- Duration: 150-300ms (transition-colors)

### Animations
- Hover transitions: 200ms
- Loading spinners: animate-spin
- Progress bars: transition-all duration-500

### Reduced Motion
Respect `prefers-reduced-motion` for accessibility

---

## Best Practices

1. **No Gradients**: Solid colors only
2. **No Glassmorphism**: No backdrop-blur except minimal use
3. **Minimal Shadows**: Use sparingly, prefer borders
4. **Strong Numbers**: Bold, tabular nums for all financial data
5. **Clean Spacing**: Consistent padding and margins
6. **Professional Tone**: Calm, reassuring, trust-first
7. **Data Transparency**: All values verifiable and clear

---

## File Structure

```
src/
├── app/
│   ├── globals.css        # Design tokens & base styles
│   └── dashboard/
│       └── page.tsx       # Main dashboard implementation
└── components/
    └── ui/                # Reusable UI components
```

---

## Future Considerations

- Dark mode (optional, using same calm approach)
- Mobile-first optimizations
- Progressive disclosure for complex data
- Export/print stylesheets
- Component library documentation

---

**Design System Version**: 1.0  
**Last Updated**: December 2024  
**Designer**: Production-grade for Indian retail investors

