/**
 * Color Utility Functions
 * 
 * Provides helper functions to get theme-aware colors using CSS variables.
 * This ensures all colors automatically adapt to dark/light mode.
 */

/**
 * Get a CSS variable value for theme-aware colors
 * Use these in inline styles or with Tailwind's arbitrary values
 */
export const themeColors = {
  // Backgrounds
  background: 'var(--background)',
  card: 'var(--card)',
  muted: 'var(--muted)',
  secondary: 'var(--secondary)',
  
  // Text
  foreground: 'var(--foreground)',
  mutedForeground: 'var(--muted-foreground)',
  secondaryForeground: 'var(--secondary-foreground)',
  
  // Borders
  border: 'var(--border)',
  input: 'var(--input)',
  
  // Semantic
  primary: 'var(--primary)',
  success: 'var(--success)',
  loss: 'var(--loss)',
  destructive: 'var(--destructive)',
  
  // Accent
  accent: 'var(--accent)',
  accentForeground: 'var(--accent-foreground)',
} as const;

/**
 * Helper to create Tailwind classes using CSS variables
 * Example: className={twVar('bg-background text-foreground')}
 */
export function twVar(classes: string): string {
  // This is a placeholder - in practice, use Tailwind's arbitrary values:
  // bg-[var(--background)] text-[var(--foreground)]
  return classes;
}

/**
 * Get inline style object for theme-aware colors
 */
export function getThemeStyle(property: keyof typeof themeColors) {
  return { [property === 'background' ? 'backgroundColor' : 'color']: themeColors[property] };
}
