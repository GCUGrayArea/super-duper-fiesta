/**
 * Color utility functions for calculating complementary colors and ensuring good contrast
 */

import { UserColor } from './colorHash';

/**
 * Get complementary color for better text contrast against background
 * @param color - Background color from COLOR_PALETTE
 * @returns Complementary color (light or dark) for optimal readability
 */
export function getComplementaryColor(color: UserColor): string {
  // Map each color to its best contrasting text color
  const complementMap: Record<UserColor, string> = {
    'crimson': '#ffffff',        // White text on crimson
    'hotpink': '#000000',        // Black text on hotpink  
    'darkorange': '#000000',     // Black text on darkorange
    'gold': '#000000',           // Black text on gold
    'darkmagenta': '#ffffff',    // White text on darkmagenta
    'chartreuse': '#000000',     // Black text on chartreuse
    'cadetblue': '#ffffff',      // White text on cadetblue
    'saddlebrown': '#ffffff'     // White text on saddlebrown
  };

  return complementMap[color] || '#000000'; // Default to black if color not found
}

/**
 * Get a lighter/darker variant of a color for hover states
 * @param color - Base color from COLOR_PALETTE
 * @returns Slightly modified color for hover effects
 */
export function getHoverColor(color: UserColor): string {
  // Map each color to a slightly lighter/darker variant
  const hoverMap: Record<UserColor, string> = {
    'crimson': '#dc2626',        // Slightly darker crimson
    'hotpink': '#ec4899',        // Slightly darker hotpink
    'darkorange': '#ea580c',     // Slightly darker orange
    'gold': '#d97706',           // Slightly darker gold
    'darkmagenta': '#a21caf',    // Slightly lighter darkmagenta
    'chartreuse': '#84cc16',     // Slightly darker chartreuse
    'cadetblue': '#0891b2',      // Slightly darker cadetblue
    'saddlebrown': '#92400e'     // Slightly darker saddlebrown
  };

  return hoverMap[color] || color; // Default to original color if not found
}

/**
 * Check if a color is considered "dark" (needs light text)
 * @param color - Color to analyze
 * @returns True if color is dark and needs light text
 */
export function isDarkColor(color: UserColor): boolean {
  const darkColors: UserColor[] = ['crimson', 'darkmagenta', 'cadetblue', 'saddlebrown'];
  return darkColors.includes(color);
}

/**
 * Get RGB values for a color name (for future calculations if needed)
 * @param color - Color name from COLOR_PALETTE
 * @returns RGB object or null if color not recognized
 */
export function getColorRGB(color: UserColor): { r: number; g: number; b: number } | null {
  const colorRGBMap: Record<UserColor, { r: number; g: number; b: number }> = {
    'crimson': { r: 220, g: 20, b: 60 },
    'hotpink': { r: 255, g: 105, b: 180 },
    'darkorange': { r: 255, g: 140, b: 0 },
    'gold': { r: 255, g: 215, b: 0 },
    'darkmagenta': { r: 139, g: 0, b: 139 },
    'chartreuse': { r: 127, g: 255, b: 0 },
    'cadetblue': { r: 95, g: 158, b: 160 },
    'saddlebrown': { r: 139, g: 69, b: 19 }
  };

  return colorRGBMap[color] || null;
}
