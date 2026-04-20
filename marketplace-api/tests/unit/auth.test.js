import { describe, it, expect, beforeAll } from '@jest/globals';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test_secret_key_for_unit_tests';

describe('Auth — Unit Tests', () => {
  describe('bcrypt password hashing', () => {
    it('should hash a password', async () => {
      const plain = 'MyPassword123!';
      const hash = await bcrypt.hash(plain, 12);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(plain);
      expect(hash.startsWith('$2b$')).toBe(true);
    });

    it('should verify correct password', async () => {
      const plain = 'MyPassword123!';
      const hash = await bcrypt.hash(plain, 10);
      const valid = await bcrypt.compare(plain, hash);
      expect(valid).toBe(true);
    });

    it('should reject wrong password', async () => {
      const hash = await bcrypt.hash('correct', 10);
      const valid = await bcrypt.compare('wrong', hash);
      expect(valid).toBe(false);
    });
  });

  describe('JWT token generation', () => {
    it('should create a valid JWT', () => {
      const payload = { id: 1, email: 'test@test.com', role: 'user' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
      expect(token).toBeDefined();
      expect(token.split('.').length).toBe(3);
    });

    it('should decode a JWT and recover payload', () => {
      const payload = { id: 42, email: 'dev@gameforge.test', role: 'developer' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.id).toBe(42);
      expect(decoded.email).toBe('dev@gameforge.test');
      expect(decoded.role).toBe('developer');
    });

    it('should reject an expired token', async () => {
      const token = jwt.sign({ id: 1 }, JWT_SECRET, { expiresIn: '0s' });
      await new Promise(r => setTimeout(r, 100));
      expect(() => jwt.verify(token, JWT_SECRET)).toThrow('jwt expired');
    });

    it('should reject a token with wrong secret', () => {
      const token = jwt.sign({ id: 1 }, JWT_SECRET);
      expect(() => jwt.verify(token, 'wrong_secret')).toThrow();
    });
  });

  describe('Password validation rules', () => {
    const validatePassword = (pwd) => !!(pwd && pwd.length >= 8);

    it('should accept password >= 8 chars', () => {
      expect(validatePassword('abcdefgh')).toBe(true);
      expect(validatePassword('SuperSecure123!')).toBe(true);
    });

    it('should reject password < 8 chars', () => {
      expect(validatePassword('abc')).toBe(false);
      expect(validatePassword('')).toBe(false);
      expect(validatePassword(null)).toBe(false);
    });
  });
});
