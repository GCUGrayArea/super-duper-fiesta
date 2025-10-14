// Color palette for user assignment (matches PROJECT_TASKS.md specification)
export const COLOR_PALETTE = [
  'crimson',      // 0-1
  'hotpink',      // 2-3  
  'darkorange',   // 4-5
  'gold',         // 6-7
  'darkmagenta',  // 8-9
  'chartreuse',   // a-b
  'cadetblue',    // c-d
  'saddlebrown'   // e-f
] as const;

// Type for valid color values
export type UserColor = typeof COLOR_PALETTE[number];

/**
 * Simple hash function to convert string to hex hash
 * @param input - String to hash (email or display name)
 * @returns Hex hash string
 */
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Calculate user color based on email
 * @param email - User's email (required)
 * @returns Color string from COLOR_PALETTE
 */
export function calculateUserColor(email: string): UserColor {
  // Generate hash and get last character
  const hash = simpleHash(email.toLowerCase());
  const lastChar = hash.slice(-1);
  
  // Map hex character to color index
  const colorIndex = mapHexToColorIndex(lastChar);
  
  return COLOR_PALETTE[colorIndex];
}

/**
 * Map hex character to color palette index
 * @param hexChar - Single hex character (0-9, a-f)
 * @returns Index in COLOR_PALETTE (0-7)
 */
function mapHexToColorIndex(hexChar: string): number {
  switch (hexChar.toLowerCase()) {
    case '0':
    case '1':
      return 0; // crimson
    case '2':
    case '3':
      return 1; // hotpink
    case '4':
    case '5':
      return 2; // darkorange
    case '6':
    case '7':
      return 3; // gold
    case '8':
    case '9':
      return 4; // darkmagenta
    case 'a':
    case 'b':
      return 5; // chartreuse
    case 'c':
    case 'd':
      return 6; // cadetblue
    case 'e':
    case 'f':
      return 7; // saddlebrown
    default:
      // Fallback for non-hex characters
      return 0; // crimson
  }
}

