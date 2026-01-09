# Dark Mode Implementation Standards

**Version:** 1.0  
**Last Updated:** January 2025  
**Status:** ✅ Active Standard

---

## Overview

This document defines the **official dark mode color standards** for the Investment Portfolio application. ALL pages must follow these standards to ensure consistency across light and dark modes.

---

## Core Principles

1. **Every color class MUST have a `dark:` variant**
2. **Never hardcode colors without dark mode support**
3. **Use consistent color mappings from the official palette**
4. **Test in both modes before considering a page complete**

---

## Official Color Palette

### Backgrounds

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| **Page Background** | `bg-[#F6F8FB]` | `dark:bg-[#0F172A]` |
| **Card/Container** | `bg-white` | `dark:bg-[#1E293B]` |
| **Secondary Container** | `bg-[#F9FAFB]` | `dark:bg-[#334155]` |
| **Hover State** | `hover:bg-[#F9FAFB]` | `dark:hover:bg-[#334155]` |
| **Info Box** | `bg-[#EFF6FF]` | `dark:bg-[#1E3A8A]` |
| **Warning Box** | `bg-[#FEF3C7]` | `dark:bg-[#78350F]` |
| **Success Box** | `bg-[#F0FDF4]` | `dark:bg-[#14532D]` |
| **Error Box** | `bg-[#FEE2E2]` | `dark:bg-[#7F1D1D]` |

### Text Colors

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| **Primary Text** | `text-[#0F172A]` | `dark:text-[#F8FAFC]` |
| **Secondary Text** | `text-[#475569]` | `dark:text-[#CBD5E1]` |
| **Tertiary/Muted** | `text-[#6B7280]` | `dark:text-[#94A3B8]` |
| **Quaternary/Disabled** | `text-[#9CA3AF]` | `dark:text-[#64748B]` |

### Borders

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| **Default Border** | `border-[#E5E7EB]` | `dark:border-[#334155]` |
| **Divider** | `divide-[#E5E7EB]` | `dark:divide-[#334155]` |

### Interactive Elements

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| **Primary Button** | `bg-[#2563EB] text-white` | `dark:bg-[#3B82F6] text-white` |
| **Primary Button Hover** | `hover:bg-[#1E40AF]` | `dark:hover:bg-[#2563EB]` |
| **Link** | `text-[#2563EB]` | `dark:text-[#3B82F6]` |
| **Link Hover** | `hover:text-[#1E40AF]` | `dark:hover:text-[#2563EB]` |

### Status Colors

| Status | Light Mode | Dark Mode |
|--------|-----------|-----------|
| **Success (Green)** | `text-[#16A34A]` | `dark:text-[#22C55E]` |
| **Error (Red)** | `text-[#DC2626]` | `dark:text-[#EF4444]` |
| **Warning (Yellow)** | `text-[#D97706]` | `dark:text-[#FBBF24]` |
| **Info (Blue)** | `text-[#2563EB]` | `dark:text-[#3B82F6]` |

### Loading Spinners

```tsx
// Always use both border and border-t colors
<div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
```

---

## Implementation Checklist

Use this checklist for **EVERY new page**:

### ✅ Page Structure
- [ ] Main container has `bg-[#F6F8FB] dark:bg-[#0F172A]`
- [ ] All loading states have dark variants
- [ ] All error states have dark variants

### ✅ Cards & Containers
- [ ] All `bg-white` have `dark:bg-[#1E293B]`
- [ ] All `bg-[#F9FAFB]` have `dark:bg-[#334155]`
- [ ] All borders have dark variants

### ✅ Text
- [ ] All `text-[#0F172A]` have `dark:text-[#F8FAFC]`
- [ ] All `text-[#475569]` have `dark:text-[#CBD5E1]`
- [ ] All `text-[#6B7280]` have `dark:text-[#94A3B8]`

### ✅ Interactive Elements
- [ ] All buttons have dark variants
- [ ] All links have dark variants
- [ ] All hover states work in dark mode
- [ ] All focus states work in dark mode

### ✅ Tables (if applicable)
- [ ] Table header: `bg-[#F9FAFB] dark:bg-[#334155]`
- [ ] Table rows: `hover:bg-[#F9FAFB] dark:hover:bg-[#334155]`
- [ ] Table dividers: `divide-[#E5E7EB] dark:divide-[#334155]`
- [ ] Table footer: Same as header

### ✅ Status Indicators
- [ ] Success states use green palette
- [ ] Error states use red palette
- [ ] Warning states use yellow palette
- [ ] Info states use blue palette
- [ ] All badges/pills have dark variants

### ✅ Icons
- [ ] All icon colors have dark variants
- [ ] Status icons use appropriate color palette

---

## Code Examples

### ✅ Correct Implementation

```tsx
// Page Container
<div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">

// Card
<div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">

// Text Elements
<h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Title</h1>
<p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Description</p>

// Button
<button className="bg-[#2563EB] dark:bg-[#3B82F6] text-white hover:bg-[#1E40AF] dark:hover:bg-[#2563EB]">
  Click Me
</button>

// Link
<Link className="text-[#2563EB] dark:text-[#3B82F6] hover:text-[#1E40AF] dark:hover:text-[#2563EB]">
  View More
</Link>

// Table Row
<tr className="hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors">
  <td className="text-[#0F172A] dark:text-[#F8FAFC]">Data</td>
</tr>

// Success/Error Text
<span className="text-[#16A34A] dark:text-[#22C55E]">Success</span>
<span className="text-[#DC2626] dark:text-[#EF4444]">Error</span>
```

### ❌ Incorrect Implementation

```tsx
// ❌ No dark mode variant
<div className="bg-white">

// ❌ Missing dark text color
<p className="text-[#0F172A]">Text</p>

// ❌ Hardcoded hover without dark variant
<button className="hover:bg-gray-100">

// ❌ Missing dark border
<div className="border border-[#E5E7EB]">
```

---

## Testing Requirements

Before marking ANY page as complete:

1. **Toggle to dark mode** using the theme toggle in the header
2. **Verify ALL elements** are visible and properly styled
3. **Test hover states** work in dark mode
4. **Check loading states** in dark mode
5. **Test error states** in dark mode
6. **Verify tables** (if applicable) in dark mode
7. **Check icons** are visible in dark mode

---

## Reference Pages

The following pages are **FULLY COMPLIANT** and serve as reference implementations:

✅ `/` - Landing/Home Page  
✅ `/dashboard` - Dashboard Page  
✅ `/portfolio/mutualfunds` - Mutual Funds Holdings  
✅ `/portfolio/equity` - Stock Holdings  
✅ `/portfolio/summary` - Portfolio Summary  
✅ `/portfolio/fixeddeposits` - Fixed Deposits  
✅ `/portfolio/bonds` - Bonds Holdings  

---

## Quick Reference: Most Common Patterns

### Pattern 1: Page Container
```tsx
<div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
```

### Pattern 2: Card/Section
```tsx
<div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
```

### Pattern 3: Heading + Description
```tsx
<h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Title</h1>
<p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Description</p>
```

### Pattern 4: Table Structure
```tsx
<table className="w-full">
  <thead className="bg-[#F9FAFB] dark:bg-[#334155] border-b border-[#E5E7EB] dark:border-[#334155]">
    <tr>
      <th className="text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">Header</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
    <tr className="hover:bg-[#F9FAFB] dark:hover:bg-[#334155]">
      <td className="text-[#0F172A] dark:text-[#F8FAFC]">Data</td>
    </tr>
  </tbody>
</table>
```

### Pattern 5: Loading State
```tsx
if (loading) {
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading...</p>
      </div>
    </div>
  );
}
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Forgetting Main Container
```tsx
// Wrong
<div className="min-h-screen bg-[#F6F8FB]">

// Right
<div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
```

### ❌ Mistake 2: Missing Text Colors
```tsx
// Wrong
<p className="text-sm text-[#6B7280]">Text</p>

// Right
<p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Text</p>
```

### ❌ Mistake 3: Inconsistent Hover States
```tsx
// Wrong
<tr className="hover:bg-[#F9FAFB]">

// Right
<tr className="hover:bg-[#F9FAFB] dark:hover:bg-[#334155]">
```

### ❌ Mistake 4: Hardcoded White Backgrounds
```tsx
// Wrong
<div className="bg-white">

// Right
<div className="bg-white dark:bg-[#1E293B]">
```

---

## Global CSS Support

The application has CSS variables defined in `src/app/globals.css` that automatically switch based on dark mode:

```css
:root {
  --background: #F6F8FB;
  --foreground: #0F172A;
  /* ... more variables */
}

.dark {
  --background: #0F172A;
  --foreground: #F8FAFC;
  /* ... more variables */
}
```

However, **always use Tailwind's `dark:` classes** for consistency and maintainability.

---

## Enforcement

- **Code Review**: All PRs must pass dark mode review
- **Testing**: All pages must be tested in both modes
- **No Exceptions**: Every page must follow these standards

---

## Questions?

Refer to the reference pages listed above or check the existing implementation in:
- `src/app/portfolio/mutualfunds/page.tsx`
- `src/app/portfolio/equity/page.tsx`
- `src/app/dashboard/page.tsx`

**Remember:** If you're adding color, add the dark variant. No exceptions!
