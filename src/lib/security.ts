import { createHash } from 'crypto';

// ============================================
// SHA-256 PASSWORD HASHING
// ============================================

/**
 * Hash a password using SHA-256 with a salt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const hash = createHash('sha256')
    .update(salt + password)
    .digest('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const computedHash = createHash('sha256')
    .update(salt + password)
    .digest('hex');
  return computedHash === hash;
}

/**
 * Generate a random 16-char hex salt
 */
function generateSalt(): string {
  const array = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================
// PASSWORD VALIDATION
// ============================================

const COMMON_PATTERNS = [
  'password', 'qwerty', 'qwertyuiop', 'asdfgh', 'asdfghjkl',
  'zxcvbn', 'zxcvbnm', '123456', '1234567', '12345678', '123456789',
  '1234567890', '111111', '000000', 'abc123', 'abcdef', 'abcdefgh',
  'letmein', 'welcome', 'monkey', 'dragon', 'master', 'admin',
  'login', 'princess', 'football', 'shadow', 'sunshine', 'trustno1',
  'iloveyou', 'batman', 'passw0rd', 'hello123', 'charlie', 'donald',
  'password1', 'password123', 'qwerty123', 'aa123456', '654321',
  '987654321', '121212', 'qwer1234', 'aaaaaa', 'abcd1234',
];

// Keyboard walks to block
const KEYBOARD_WALKS = [
  'qwertyui', 'asdfghjk', 'zxcvbnm', '1qaz2wsx', '2wsx3edc',
  'qazwsx', 'wsxedc', 'edcrfv', 'rfvtgb', 'tgbyhn', 'yhnujm',
  '1q2w3e4r', 'zaq12wsx', 'q1w2e3r4',
];

/**
 * Validate password against security rules
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Min 8 characters
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // At least 1 number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least 1 number');
  }

  // At least 1 special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    errors.push('Password must contain at least 1 special character');
  }

  // Check common patterns
  const lowerPassword = password.toLowerCase();
  for (const pattern of COMMON_PATTERNS) {
    if (lowerPassword === pattern || lowerPassword.includes(pattern)) {
      errors.push('Password contains a common/easily guessable pattern');
      break;
    }
  }

  // Check keyboard walks
  for (const walk of KEYBOARD_WALKS) {
    if (lowerPassword.includes(walk)) {
      errors.push('Password contains a keyboard pattern (e.g. qwerty, asdf)');
      break;
    }
  }

  // Check for repeated characters (e.g., "aaaa", "1111")
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Password must not contain 4 or more repeated characters');
  }

  // Check for sequential numbers (e.g., "1234", "4321")
  if (hasSequentialNumbers(password)) {
    errors.push('Password must not contain sequential numbers (e.g. 1234, 4321)');
  }

  return { valid: errors.length === 0, errors };
}

function hasSequentialNumbers(password: string): boolean {
  for (let i = 0; i <= password.length - 4; i++) {
    const chars = password.slice(i, i + 4);
    if (/^\d{4}$/.test(chars)) {
      const nums = chars.split('').map(Number);
      const ascending = nums.every((n, j) => j === 0 || n === nums[j - 1] + 1);
      const descending = nums.every((n, j) => j === 0 || n === nums[j - 1] - 1);
      if (ascending || descending) return true;
    }
  }
  return false;
}

// ============================================
// INPUT SANITIZATION (NoSQL Injection Protection)
// ============================================

/**
 * Sanitize a string input — strip dangerous characters for MongoDB
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  // Remove null bytes
  let clean = input.replace(/\0/g, '');
  // Limit length to prevent abuse
  clean = clean.slice(0, 5000);
  return clean.trim();
}

/**
 * Escape regex special characters in a search string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize an object — strip keys starting with $ (MongoDB operator injection)
 * and recursively clean nested objects
 */
export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip keys starting with $ (MongoDB operators)
    if (key.startsWith('$')) continue;
    // Skip keys with dots (MongoDB field path injection)
    if (key.includes('.')) continue;

    if (typeof value === 'string') {
      clean[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      clean[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}
