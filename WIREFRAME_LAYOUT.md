# Investment Portfolio Dashboard - Wireframe Layout

## Screen Specifications
- **Max Width**: 1280px
- **Grid System**: 12 columns
- **Gutter**: 24px
- **Viewport**: Desktop-first (1440px+)

---

## Layout Zones Map

```
┌─────────────────────────────────────────────────────────┐
│ ZONE 1: HEADER                          [Above the Fold]│
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Dashboard                    [Date Range Selector]  │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ ZONE 2: NET WORTH HERO                  [Above the Fold]│
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │  Total Portfolio Value                             │ │
│ │  ₹ 45,20,000                                       │ │
│ │  +₹2,10,000 (+4.8%) ↑ Last 12 months              │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ ZONE 3: ASSET OVERVIEW TILES            [Above the Fold]│
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│ │ Mutual   │  │ Equity   │  │ Fixed    │  │ Others   │ │
│ │ Funds    │  │          │  │ Deposits │  │          │ │
│ │          │  │          │  │          │  │          │ │
│ │ ₹18.5L   │  │ ₹12.8L   │  │ ₹10.2L   │  │ ₹3.9L    │ │
│ │ 41%      │  │ 28%      │  │ 23%      │  │ 8%       │ │
│ └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
├─────────────────────────────────────────────────────────┤
│                    [FOLD LINE - 900px]                  │
├─────────────────────────────────────────────────────────┤
│ ZONE 4: PORTFOLIO ALLOCATION            [Below the Fold]│
│ ┌────────────────────┐  ┌──────────────────────────────┐│
│ │                    │  │  Mutual Funds      41%       ││
│ │    [Donut Chart]   │  │  Equity            28%       ││
│ │                    │  │  Fixed Deposits    23%       ││
│ │                    │  │  Others             8%       ││
│ └────────────────────┘  └──────────────────────────────┘│
├─────────────────────────────────────────────────────────┤
│ ZONE 5: PERFORMANCE SNAPSHOT            [Below the Fold]│
│ ┌─────────────────────────────────────────────────────┐ │
│ │  Portfolio XIRR: 12.5%                              │ │
│ │  Since inception • All asset classes                │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ ZONE 6: INSIGHTS & ALERTS               [Below the Fold]│
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ⓘ 3 Fixed Deposits maturing in next 60 days        │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ⓘ 40% of equity concentrated in 3 stocks           │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ⓘ Your allocation matches moderate risk profile    │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Detailed Zone Specifications

### ZONE 1: HEADER (Height: 64px)
**Grid Usage**: 12 columns full width

```
┌────────────────────────────────────────────────────────┐
│ [8 cols]                            [4 cols]           │
│ Dashboard                           [Date: Last 12M ▼] │
└────────────────────────────────────────────────────────┘
```

**Structure**:
- Left: Page title (8 cols)
- Right: Date range selector (4 cols)
- Vertically centered
- Minimal padding

**Spacing**:
- Top/Bottom: 16px
- Left/Right: 24px

---

### ZONE 2: NET WORTH HERO (Height: 200px)
**Grid Usage**: 12 columns full width

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  [Label]                                               │
│  Total Portfolio Value                                 │
│                                                        │
│  [Primary Number - Large]                              │
│  ₹ 45,20,000                                          │
│                                                        │
│  [Secondary Info - Smaller]                            │
│  +₹2,10,000 (+4.8%) ↑ Last 12 months                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Structure**:
- Single tile
- Text centered or left-aligned
- 3 information levels:
  1. Label (smallest)
  2. Net worth (largest - 5x label size)
  3. Change indicator (medium - 2x label size)

**Spacing**:
- Padding: 40px all sides
- Line height: 1.2 for numbers, 1.5 for labels

**Visual Weight**:
- Heaviest element on page
- Isolated from other content
- Clear bottom border/gap

---

### ZONE 3: ASSET OVERVIEW TILES (Height: 180px)
**Grid Usage**: 3 columns each (4 tiles × 3 cols = 12 cols)

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ [3 cols] │  │ [3 cols] │  │ [3 cols] │  │ [3 cols] │
│          │  │          │  │          │  │          │
│ Mutual   │  │ Equity   │  │ Fixed    │  │ Others   │
│ Funds    │  │          │  │ Deposits │  │          │
│          │  │          │  │          │  │          │
│ ₹18.5L   │  │ ₹12.8L   │  │ ₹10.2L   │  │ ₹3.9L    │
│ 41%      │  │ 28%      │  │ 23%      │  │ 8%       │
│          │  │          │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

**Tile Structure (Each)**:
- Asset name (top, small)
- Current value (center, large - 3x label size)
- Percentage (bottom, medium - 1.5x label size)

**Spacing**:
- Gap between tiles: 16px
- Padding inside tile: 24px
- Equal height enforced

**Interaction**:
- Entire tile is clickable
- Hover state must be visually distinct
- Clear active/focus states

**Responsive Notes**:
- 4 tiles desktop (3 cols each)
- 2 tiles tablet (6 cols each)
- 1 tile mobile (12 cols)

---

### ZONE 4: PORTFOLIO ALLOCATION (Height: 400px)
**Grid Usage**: 5 cols (chart) + 7 cols (breakdown)

```
┌────────────────────┐  ┌──────────────────────────────┐
│ [5 cols]           │  │ [7 cols]                     │
│                    │  │                              │
│                    │  │  Mutual Funds          41%   │
│   [Donut Chart]    │  │  Equity                28%   │
│   Centered         │  │  Fixed Deposits        23%   │
│                    │  │  Others                 8%   │
│                    │  │                              │
└────────────────────┘  └──────────────────────────────┘
```

**Left Column (5 cols)**:
- Single donut chart
- Vertically and horizontally centered
- No legend inside chart
- Chart diameter: 280px

**Right Column (7 cols)**:
- Asset list (stacked)
- Each row:
  - Asset name (left-aligned)
  - Percentage (right-aligned)
- Row height: 48px
- Gap between rows: 8px

**Spacing**:
- Gap between columns: 32px
- Padding: 32px all sides

**Responsive Notes**:
- Stack vertically on tablet/mobile
- Chart becomes 12 cols, breakdown becomes 12 cols below

---

### ZONE 5: PERFORMANCE SNAPSHOT (Height: 120px)
**Grid Usage**: 12 columns full width

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  Portfolio XIRR: 12.5%                                 │
│  Since inception • All asset classes                   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Structure**:
- Single line with primary metric
- Secondary line with context
- Left-aligned or centered

**Spacing**:
- Padding: 24px all sides
- Line height: 1.6

**Visual Weight**:
- Medium prominence
- Less emphasis than hero
- More than insights

---

### ZONE 6: INSIGHTS & ALERTS (Height: Variable)
**Grid Usage**: 12 columns full width

```
┌────────────────────────────────────────────────────────┐
│ ⓘ 3 Fixed Deposits maturing in next 60 days       [>] │
├────────────────────────────────────────────────────────┤
│ ⓘ 40% of equity concentrated in 3 stocks          [>] │
├────────────────────────────────────────────────────────┤
│ ⓘ Your allocation matches moderate risk profile   [>] │
└────────────────────────────────────────────────────────┘
```

**Row Structure (Each Insight)**:
- Icon (left, 24px)
- Text (center, expands)
- Chevron/arrow (right, 16px)
- Row height: 64px

**Spacing**:
- Gap between rows: 1px (border)
- Padding per row: 16px horizontal, 20px vertical
- Maximum 3 insights shown

**Interaction**:
- Each row is clickable
- Expandable to show more details
- Optional "View all insights" link at bottom

---

## Above the Fold vs Below the Fold

### ABOVE THE FOLD (0–900px from top)
**Must answer in 10 seconds**:
1. ✅ How much money do I have? → **ZONE 2: Net Worth Hero**
2. ✅ Where is my money? → **ZONE 3: Asset Tiles**

**Content**:
- Header
- Net Worth Hero
- Asset Overview Tiles

**Total Height**: ~510px (64 + 200 + 180 + gaps)

---

### BELOW THE FOLD (900px+ from top)
**For users who want more detail**:
3. ✅ How is it allocated? → **ZONE 4: Allocation Visual**
4. ✅ How is it performing? → **ZONE 5: Performance**
5. ✅ Anything I should know? → **ZONE 6: Insights**

**Content**:
- Portfolio Allocation
- Performance Snapshot
- Insights & Alerts

**Total Height**: ~750px (400 + 120 + 230 + gaps)

---

## Spacing System

### Vertical Spacing (Between Zones)
- Between Header and Hero: 32px
- Between Hero and Tiles: 24px
- Between Tiles and Allocation: 48px (fold marker)
- Between Allocation and Performance: 32px
- Between Performance and Insights: 32px
- Bottom padding: 64px

### Horizontal Spacing
- Container padding: 24px left/right
- Grid gutter: 24px
- Tile gaps: 16px

---

## Grid Breakdown

```
Column Layout (12 columns, 1280px max width):
Each column: ~93px
Gutter: 24px

Example calculations:
- 3 cols = 303px (93×3 + 24×2)
- 5 cols = 521px (93×5 + 24×4)
- 7 cols = 735px (93×7 + 24×6)
- 12 cols = 1280px (93×12 + 24×11)
```

---

## Responsive Breakpoints

### Desktop (1280px+)
- Layout as specified above
- 12-column grid
- All zones visible

### Tablet (768px–1279px)
- 8-column grid
- Asset tiles: 2×2 grid (4 cols each)
- Allocation: Stack chart and breakdown vertically

### Mobile (< 768px)
- Single column layout
- Asset tiles: 1 per row
- All zones stack vertically
- Insights collapse to show 1, expand on tap

---

## Clickthrough Hierarchy

### Primary Actions (Tile Clicks)
1. Mutual Funds Tile → Mutual Funds Dashboard
2. Equity Tile → Equity Dashboard
3. Fixed Deposits Tile → FD Dashboard
4. Others Tile → Other Assets Dashboard

### Secondary Actions (Zone Links)
5. Net Worth Hero → Portfolio History
6. Allocation Chart → Allocation Analysis
7. Performance Metric → Performance Analysis
8. Each Insight Row → Relevant Detail Page

---

## Visual Hierarchy (Wireframe Level)

### Tier 1 (Highest Emphasis)
- Net Worth number in Hero
- Asset values in tiles

### Tier 2 (Medium Emphasis)
- Zone headings
- Allocation chart
- Performance metric

### Tier 3 (Lowest Emphasis)
- Labels and secondary text
- Insights descriptions
- Date selectors

---

## Layout Success Criteria

✅ User can see net worth without scrolling  
✅ Asset allocation is scannable in 5 seconds  
✅ No clutter above the fold  
✅ Clear visual separation between zones  
✅ Each zone has a clear purpose  
✅ Progressive disclosure (overview → details)  
✅ Clickable elements are obvious  
✅ Information hierarchy is clear  

---

## Implementation Notes

- Use white space generously
- Avoid cramming information
- Each zone must breathe
- Borders should be subtle (1px, light)
- No overlapping zones
- Clear vertical rhythm

**This wireframe prioritizes structure and hierarchy over aesthetics.**

