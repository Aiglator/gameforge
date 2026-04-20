import { describe, it, expect } from '@jest/globals';

describe('Games — Unit Tests', () => {
  describe('slug generation', () => {
    const toSlug = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    it('should convert name to slug', () => {
      expect(toSlug('Nexus Runner')).toBe('nexus-runner');
      expect(toSlug('Space Explorer 2D')).toBe('space-explorer-2d');
    });

    it('should handle special characters', () => {
      expect(toSlug('My Game!!!  2026')).toBe('my-game-2026');
    });

    it('should trim leading/trailing dashes', () => {
      expect(toSlug('  My Game  ')).toBe('my-game');
    });
  });

  describe('price validation', () => {
    const validatePrice = (p) => typeof p === 'number' && p >= 0 && p <= 999.99;

    it('should accept valid prices', () => {
      expect(validatePrice(0)).toBe(true);
      expect(validatePrice(4.99)).toBe(true);
      expect(validatePrice(9.99)).toBe(true);
    });

    it('should reject negative prices', () => {
      expect(validatePrice(-1)).toBe(false);
    });

    it('should reject non-numeric prices', () => {
      expect(validatePrice('free')).toBe(false);
      expect(validatePrice(null)).toBe(false);
    });
  });

  describe('category validation', () => {
    const VALID_CATS = ['Platformer','Action','Aventure','Stratégie','Puzzle','RPG','Other'];
    const isValid = (cat) => VALID_CATS.includes(cat);

    it('should accept valid categories', () => {
      expect(isValid('Platformer')).toBe(true);
      expect(isValid('RPG')).toBe(true);
    });

    it('should reject unknown categories', () => {
      expect(isValid('Unknown')).toBe(false);
      expect(isValid('')).toBe(false);
    });
  });
});
