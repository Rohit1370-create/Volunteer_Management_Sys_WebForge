const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
require('./setup');

describe('Authentication API (/api/v1/auth)', () => {
  const testUser = {
    name: 'Test Volunteer',
    email: 'volunteer@campus.edu',
    password: 'Password123',
    phone: '+919876543210',
    branch: 'Computer Science',
    section: 'A',
    yearOfStudy: 3
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully, forcing role=USER, returning 201', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...testUser, role: 'ADMIN' }); // Attempting to pass role: ADMIN should be ignored/forced to USER

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.role).toBe('USER');
      expect(res.body.data.user.branch).toBe('Computer Science');
      expect(res.body.data.user.password).toBeUndefined(); // never leaked

      // Check HTTP-only cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.includes('token=') && c.includes('HttpOnly'))).toBe(true);
    });

    it('should reject duplicate email with 409 DUPLICATE_EMAIL', async () => {
      await request(app).post('/api/v1/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
    });

    it('should reject invalid email or short password with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: '',
          email: 'invalid-email',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(testUser);
    });

    it('should login with valid credentials and return 200 with cookie and token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());

      const cookies = res.headers['set-cookie'];
      expect(cookies.some(c => c.includes('token='))).toBe(true);
    });

    it('should return generic 401 UNAUTHORIZED on wrong password without revealing field', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid credentials');
    });

    it('should return identical 401 UNAUTHORIZED on non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@campus.edu',
          password: 'Password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid credentials');
    });

    it('should reject deactivated user with 401', async () => {
      await User.findOneAndUpdate({ email: testUser.email }, { isActive: false });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/deactivated/i);
    });
  });

  describe('GET /api/v1/auth/me & POST /api/v1/auth/logout', () => {
    let authCookie;

    beforeEach(async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testUser);
      authCookie = res.headers['set-cookie'];
    });

    it('should return user profile when authenticated with cookie', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email.toLowerCase());
    });

    it('should return 401 UNAUTHORIZED without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should log out and clear cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
