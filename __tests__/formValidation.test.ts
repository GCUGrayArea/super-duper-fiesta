import { describe, it, expect } from 'vitest';

// Extract the email validation function for testing
const validateEmail = (email: string): string | true => {
  const emailRegex = /^[^\s@]+@[^\s@]+$/;
  return emailRegex.test(email) || 'Please enter a valid email address';
};

describe('Form Validation', () => {
  describe('Email Validation', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@example.org', 
        'firstname.lastname@company.com',
        'user123@test123.com',
        'a@b.com',
        'very.long.email.address@very.long.domain.name.com',
        'user_name@example.com',
        'user-name@example.com',
        '123@456.com',
        'user@subdomain.example.com'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',                          // Empty string
        'user',                      // No @ symbol
        '@example.com',              // No user part
        'user@',                     // No domain part
        'user @example.com',         // Space in user part
        'user@ example.com',         // Space in domain part
        'user@example .com',         // Space in domain
        'user@@example.com',         // Double @
        'user@example@com',          // Multiple @
        '.user@example.com',         // Starts with dot (technically invalid but our regex is flexible)
        'user.@example.com',         // Ends with dot (technically invalid but our regex is flexible)
        'user@.example.com',         // Domain starts with dot
        'user@example.',             // Domain ends with dot
        '   ',                       // Only spaces
        'user name@example.com',     // Space in user part
      ];

      invalidEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result).toBe('Please enter a valid email address');
      });
    });

    it('should handle edge cases', () => {
      // Very minimal valid emails
      expect(validateEmail('a@b')).toBe(true);
      expect(validateEmail('1@2')).toBe(true);
      
      // Special characters that should be allowed
      expect(validateEmail('user+tag@example.com')).toBe(true);
      expect(validateEmail('user.name@example.com')).toBe(true);
      expect(validateEmail('user_name@example.com')).toBe(true);
      expect(validateEmail('user-name@example.com')).toBe(true);
      
      // Numbers and letters combination
      expect(validateEmail('user123@domain456.com')).toBe(true);
      expect(validateEmail('123user@456domain.com')).toBe(true);
    });

    it('should be case insensitive for validation', () => {
      // The regex should work regardless of case
      expect(validateEmail('User@Example.COM')).toBe(true);
      expect(validateEmail('TEST@DOMAIN.ORG')).toBe(true);
      expect(validateEmail('MixedCase@Example.Com')).toBe(true);
    });

    it('should handle very long emails', () => {
      // Test with long but valid emails
      const longUser = 'a'.repeat(50);
      const longDomain = 'b'.repeat(50);
      const longEmail = `${longUser}@${longDomain}.com`;
      
      expect(validateEmail(longEmail)).toBe(true);
    });
  });

  describe('Password Validation', () => {
    // Simple required field validation for passwords
    const validatePassword = (password: string): string | true => {
      return password.length > 0 || 'Password is required';
    };

    it('should accept any non-empty password', () => {
      const validPasswords = [
        'password',
        '123',
        'a',
        '!@#$%^&*()',
        'very long password with spaces',
        'MixedCasePassword123!',
        '   spaces   ',
      ];

      validPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(true);
      });
    });

    it('should reject empty password', () => {
      expect(validatePassword('')).toBe('Password is required');
    });
  });

  describe('Display Name Validation', () => {
    // Display name is optional, so no validation needed
    // But let's test the trimming logic used in forms
    const processDisplayName = (displayName?: string): string | undefined => {
      return displayName?.trim() || undefined;
    };

    it('should return undefined for empty or whitespace-only strings', () => {
      expect(processDisplayName('')).toBeUndefined();
      expect(processDisplayName('   ')).toBeUndefined();
      expect(processDisplayName('\t\n')).toBeUndefined();
      expect(processDisplayName(undefined)).toBeUndefined();
    });

    it('should trim whitespace from valid display names', () => {
      expect(processDisplayName('  John Doe  ')).toBe('John Doe');
      expect(processDisplayName('\tTest User\n')).toBe('Test User');
      expect(processDisplayName('   SingleWord   ')).toBe('SingleWord');
    });

    it('should preserve display names without extra whitespace', () => {
      expect(processDisplayName('John Doe')).toBe('John Doe');
      expect(processDisplayName('Test')).toBe('Test');
      expect(processDisplayName('User Name With Spaces')).toBe('User Name With Spaces');
    });
  });
});
