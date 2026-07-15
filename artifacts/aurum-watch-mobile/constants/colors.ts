/**
 * Semantic design tokens for the mobile app.
 *
 * Mirrors the "trading desk" dark theme from the sibling Forex Alarm web
 * artifact (artifacts/price-tracker/src/index.css) so both apps share one
 * visual identity. The app is always dark — there is no light theme toggle
 * on the web app either — so the same palette is used regardless of the
 * device's system appearance.
 */

const dark = {
  // Legacy aliases (kept for backward compatibility)
  text: '#fafafa',
  tint: '#fbc02d',

  // Core surfaces
  background: '#09090b',
  foreground: '#fafafa',

  // Cards / elevated surfaces
  card: '#0e0e11',
  cardForeground: '#fafafa',

  // Primary action color (gold/amber, matches the web app's brand accent)
  primary: '#fbc02d',
  primaryForeground: '#09090b',

  // Secondary / less-emphasis interactive surfaces
  secondary: '#27272a',
  secondaryForeground: '#fafafa',

  // Muted / subdued elements (dividers, timestamps, placeholders)
  muted: '#27272a',
  mutedForeground: '#a1a1aa',

  // Accent highlights (badges, selected items, focus rings)
  accent: '#27272a',
  accentForeground: '#fafafa',

  // Destructive actions (delete, error states, triggered alerts)
  destructive: '#ef4343',
  destructiveForeground: '#fafafa',

  // Positive / "above" direction accents (not in the web token set, but
  // used consistently across both apps for price-up states)
  success: '#22c55e',

  // Borders and input outlines
  border: '#27272a',
  input: '#27272a',
};

const colors = {
  light: dark,
  dark,

  // Border radius (in px). Synced from the web app's --radius: 0.3rem (~5px).
  radius: 6,
};

export default colors;
