const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
require('./setup');

describe('Clubs & Events API (/api/v1/clubs, /api/v1/events)', () => {
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

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@campus.edu', password: 'AdminPassword123' });
    adminCookie = adminLoginRes.headers['set-cookie'];

    regularUser = await User.create({
      name: 'Regular User',
      email: 'user@campus.edu',
      password: 'UserPassword123',
      role: 'USER'
    });

    const userLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@campus.edu', password: 'UserPassword123' });
    userCookie = userLoginRes.headers['set-cookie'];
  });

  describe('Clubs API (/api/v1/clubs)', () => {
    it('should allow ADMIN to create a club (201)', async () => {
      const res = await request(app)
        .post('/api/v1/clubs')
        .set('Cookie', adminCookie)
        .send({
          name: 'Robotics Club',
          description: 'Autonomous drones and battle bots'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Robotics Club');
      expect(res.body.data.createdBy.toString()).toBe(adminUser._id.toString());
    });

    it('should reject non-admin USER with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/v1/clubs')
        .set('Cookie', userCookie)
        .send({
          name: 'Unauthorized Club'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow all authenticated users to list clubs (200)', async () => {
      await request(app)
        .post('/api/v1/clubs')
        .set('Cookie', adminCookie)
        .send({ name: 'Music Club' });

      const res = await request(app)
        .get('/api/v1/clubs')
        .set('Cookie', userCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Events API (/api/v1/events)', () => {
    let clubId;

    beforeEach(async () => {
      const clubRes = await request(app)
        .post('/api/v1/clubs')
        .set('Cookie', adminCookie)
        .send({ name: 'Astronomy Club' });
      clubId = clubRes.body.data._id;
    });

    it('should allow ADMIN to create an event (201)', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set('Cookie', adminCookie)
        .send({
          name: 'Stargazing Night 2026',
          description: 'Telescope night on the observatory terrace',
          club: clubId,
          startDate: new Date().toISOString()
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Stargazing Night 2026');
      expect(res.body.data.club.toString()).toBe(clubId.toString());
    });

    it('should reject non-admin USER from creating an event with 403', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set('Cookie', userCookie)
        .send({
          name: 'Unauthorized Event',
          club: clubId
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow listing events and filtering by club', async () => {
      await request(app)
        .post('/api/v1/events')
        .set('Cookie', adminCookie)
        .send({
          name: 'Meteor Shower Watch',
          club: clubId
        });

      const res = await request(app)
        .get(`/api/v1/events?club=${clubId}`)
        .set('Cookie', userCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });
});
