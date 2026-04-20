import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

// We need to test the API routes directly
// Create a minimal test app that uses the same routes

describe('GameForge API — Functional Tests', () => {
  const API_URL = 'http://localhost:3004';

  let authToken = null;
  let testGameId = null;
  const testUser = {
    nom: 'Test',
    prenom: 'User',
    email: `test.${Date.now()}@gameforge.test`,
    password: 'TestPassword123!',
    birthday: '2000-01-01'
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user and return JWT', async () => {
      const res = await request(API_URL)
        .post('/api/auth/register')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user).not.toHaveProperty('password_hash');
      authToken = res.body.token;
    });

    it('should reject duplicate email', async () => {
      const res = await request(API_URL)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);

      expect(res.body).toHaveProperty('message');
    });

    it('should reject missing required fields', async () => {
      const res = await request(API_URL)
        .post('/api/auth/register')
        .send({ email: 'incomplete@test.com' })
        .expect(400);

      expect(res.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const res = await request(API_URL)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should reject wrong password', async () => {
      await request(API_URL)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword!' })
        .expect(401);
    });

    it('should reject unknown email', async () => {
      await request(API_URL)
        .post('/api/auth/login')
        .send({ email: 'nobody@nowhere.com', password: 'test' })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user with valid token', async () => {
      const res = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should reject missing token', async () => {
      await request(API_URL)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  describe('GET /api/games', () => {
    it('should return games list', async () => {
      const res = await request(API_URL)
        .get('/api/games')
        .expect(200);

      expect(res.body).toHaveProperty('games');
      expect(Array.isArray(res.body.games)).toBe(true);
    });

    it('should filter by category', async () => {
      const res = await request(API_URL)
        .get('/api/games?category=Platformer')
        .expect(200);

      expect(Array.isArray(res.body.games)).toBe(true);
    });

    it('should search by query', async () => {
      const res = await request(API_URL)
        .get('/api/games?q=nexus')
        .expect(200);

      expect(Array.isArray(res.body.games)).toBe(true);
    });
  });

  describe('POST /api/developer/become', () => {
    it('should allow user to become developer', async () => {
      const res = await request(API_URL)
        .post('/api/developer/become')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('apiKey');
    });
  });

  describe('POST /api/games', () => {
    it('should create a game as developer', async () => {
      const res = await request(API_URL)
        .post('/api/games')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Game ' + Date.now(),
          slug: 'test-game-' + Date.now(),
          description: 'A test game for functional tests',
          category: 'Platformer',
          price: 0
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('draft');
      testGameId = res.body.id;
    });

    it('should reject game without auth', async () => {
      await request(API_URL)
        .post('/api/games')
        .send({ name: 'No Auth Game', slug: 'no-auth' })
        .expect(401);
    });
  });
});
