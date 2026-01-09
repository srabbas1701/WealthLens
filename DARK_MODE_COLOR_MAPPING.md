# Dark Mode Color Mapping Guide

This document provides the mapping between light mode and dark mode colors used throughout the application.

## Background Colors
- `bg-[#F6F8FB]` → `bg-[#F6F8FB] dark:bg-[#0F172A]`
- `bg-white` → `bg-white dark:bg-[#1E293B]`
- `bg-[#F9FAFB]` → `bg-[#F9FAFB] dark:bg-[#1E293B]`
- `bg-[#F1F5F9]` → `bg-[#F1F5F9] dark:bg-[#334155]`
- `bg-[#EFF6FF]` → `bg-[#EFF6FF] dark:bg-[#1E3A8A]`

## Text Colors
- `text-[#0F172A]` → `text-[#0F172A] dark:text-[#F8FAFC]`
- `text-[#475569]` → `text-[#475569] dark:text-[#CBD5E1]`
- `text-[#6B7280]` → `text-[#6B7280] dark:text-[#94A3B8]`
- `text-[#9CA3AF]` → `text-[#9CA3AF] dark:text-[#64748B]`

## Border Colors
- `border-[#E5E7EB]` → `border-[#E5E7EB] dark:border-[#334155]`
- `border-[#D1D5DB]` → `border-[#D1D5DB] dark:border-[#475569]`

## Semantic Colors (usually stay the same)
- Success: `text-[#16A34A]` → `text-[#16A34A] dark:text-[#22C55E]`
- Loss/Error: `text-[#DC2626]` → `text-[#DC2626] dark:text-[#EF4444]`
- Primary: `text-[#2563EB]` → `text-[#2563EB] dark:text-[#3B82F6]`

## Button Colors
- Primary button: `bg-[#2563EB] hover:bg-[#1E40AF]` → `bg-[#2563EB] dark:bg-[#3B82F6] hover:bg-[#1E40AF] dark:hover:bg-[#2563EB]`
- Secondary button: `bg-white border border-[#E5E7EB]` → `bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]`

## Card Colors
- Card background: `bg-white` → `bg-white dark:bg-[#1E293B]`
- Card border: `border-[#E5E7EB]` → `border-[#E5E7EB] dark:border-[#334155]`

## Pattern for Updates
When updating components, follow this pattern:
1. Add `dark:` variant for every color class
2. Maintain contrast ratios for accessibility
3. Test both themes to ensure readability
4. Use semantic color names where possible (success, error, etc.)
