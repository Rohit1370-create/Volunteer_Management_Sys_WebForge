const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
require('./setup');

describe('Users API (/api/users)', () => {
  let adminCookie;
  let userCookie;
  let adminUser;
  let regularUser;

  beforeEach(async () => {
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@campus.edu',
      password: 'AdminPassword123',
      role: 'ADMIN'
    });
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@campus.edu', password: 'AdminPassword123' });
    adminCookie = adminLogin.headers['set-cookie'];

    regularUser = await User.create({
      name: 'Student Volunteer',
      email: 'student@campus.edu',
      password: 'StudentPassword123',
      role: 'USER'
    });
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@campus.edu', password: 'StudentPassword123' });
    userCookie = userLogin.headers['set-cookie'];
  });

  describe('GET /api/users & GET /api/users/:id', () => {
    it('should allow ADMIN to list volunteers', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.some(u => u.email === 'student@campus.edu')).toBe(true);
    });

    it('should reject regular USER from listing volunteers with 403', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Cookie', userCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow ADMIN to view a volunteer profile by ID', async () => {
      const res = await request(app)
        .get(`/api/users/${regularUser._id}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('student@campus.edu');
      expect(res.body.data.password).toBeUndefined();
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should allow authenticated user to update their own name', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Cookie', userCookie)
        .send({ name: 'Updated Student Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Student Name');

      const updatedUser = await User.findById(regularUser._id);
      expect(updatedUser.name).toBe('Updated Student Name');
    });

    it('should reject role change attempts (privilege escalation protection §11)', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Cookie', userCookie)
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/role cannot be changed/i);

      // Verify DB role is still USER
      const userInDb = await User.findById(regularUser._id);
      expect(userInDb.role).toBe('USER');
    });
  });
});
