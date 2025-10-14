/**
 * Utility functions for generating consistent user colors
 */

// Define 8 distinct colors for user identification
const USER_COLORS = [
  '#B22222', // firebrick (0-1)
  '#FF69B4', // hotpink (2-3)
  '#FF8C00', // darkorange (4-5)
  '#FFD700', // gold (6-7)
  '#8B008B', // darkmagenta (8-9)
  '#7FFF00', // chartreuse (A-B)
  '#00FFFF', // cyan (C-D)
  '#8B4513', // saddlebrown (E-F)
];

/**
 * Generates a consistent color for a user based on their user ID
 * Uses the last character of the MD5-like hash of the user ID
 */
export const generateUserColor = (userId: string): string => {
  // Create a simple hash of the user ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Get the absolute value and map to our color array
  const colorIndex = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[colorIndex];
};

/**
 * Gets a readable text color (black or white) based on background color
 */
export const getContrastColor = (backgroundColor: string): string => {
  // Convert hex to RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate brightness using YIQ formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return black for light colors, white for dark colors
  return brightness > 128 ? '#000000' : '#FFFFFF';
};

/**
 * Generates a lighter version of a color for UI elements
 */
export const lightenColor = (color: string, amount: number = 0.2): string => {
  const hex = color.replace('#', '');
  const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + Math.round(255 * amount));
  const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + Math.round(255 * amount));
  const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + Math.round(255 * amount));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};
