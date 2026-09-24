const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
require('./setup');

describe('Opportunities API (/api/opportunities)', () => {
  let adminCookie;
  let userCookie;
  let adminUser;
  let regularUser;

  beforeEach(async () => {
    // Seed an admin
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@campus.edu',
      password: 'AdminPassword123',
      role: 'ADMIN'
    });

    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@campus.edu', password: 'AdminPassword123' });
    adminCookie = adminLoginRes.headers['set-cookie'];

    // Seed a regular user
    regularUser = await User.create({
      name: 'Regular User',
      email: 'user@campus.edu',
      password: 'UserPassword123',
      role: 'USER'
    });

    const userLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@campus.edu', password: 'UserPassword123' });
    userCookie = userLoginRes.headers['set-cookie'];
  });

  const getFutureDate = (days = 5) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  describe('POST /api/opportunities', () => {
    it('should allow ADMIN to create an opportunity with 201', async () => {
      const res = await request(app)
        .post('/api/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Campus Cleanup Drive',
          description: 'Help clean up the campus lake area',
          dateTime: getFutureDate(7),
          location: 'Campus Lake',
          requiredVolunteers: 10
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Campus Cleanup Drive');
      expect(res.body.data.status).toBe('OPEN');
      expect(res.body.data.registeredCount).toBe(0);
    });

    it('should reject non-admin (USER) with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/opportunities')
        .set('Cookie', userCookie)
        .send({
          title: 'Unauthorized Event',
          description: 'Should fail',
          dateTime: getFutureDate(7),
          location: 'Anywhere',
          requiredVolunteers: 5
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject opportunity with past dateTime with 400', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);

      const res = await request(app)
        .post('/api/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Past Event',
          description: 'Cannot be created',
          dateTime: pastDate.toISOString(),
          location: 'Hall A',
          requiredVolunteers: 5
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/future/i);
    });
  });

  describe('GET /api/opportunities & GET /api/opportunities/:id', () => {
    let oppId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Blood Donation Camp',
          description: 'Donate blood and save lives',
          dateTime: getFutureDate(10),
          location: 'Health Center',
          requiredVolunteers: 5
        });
      oppId = createRes.body.data._id;
    });

    it('should allow authenticated users to list opportunities with filters', async () => {
      const res = await request(app)
        .get('/api/opportunities?status=OPEN&location=Health')
        .set('Cookie', userCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].location).toBe('Health Center');
    });

    it('should allow viewing a single opportunity by ID', async () => {
      const res = await request(app)
        .get(`/api/opportunities/${oppId}`)
        .set('Cookie', userCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(oppId);
      expect(res.body.data.title).toBe('Blood Donation Camp');
    });

    it('should return 400 for invalid ObjectId format', async () => {
      const res = await request(app)
        .get('/api/opportunities/invalid-mongo-id')
        .set('Cookie', userCookie);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it('should return 404 for non-existent valid ObjectId', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/opportunities/${nonExistentId}`)
        .set('Cookie', userCookie);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/opportunities/:id & /status', () => {
    let oppId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Career Fair Setup',
          description: 'Help setup tables and signs',
          dateTime: getFutureDate(4),
          location: 'Sports Complex',
          requiredVolunteers: 3
        });
      oppId = createRes.body.data._id;
    });

    it('should allow ADMIN to update details (excluding status)', async () => {
      const res = await request(app)
        .patch(`/api/opportunities/${oppId}`)
        .set('Cookie', adminCookie)
        .send({
          title: 'Career Fair Setup - Updated',
          requiredVolunteers: 6
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Career Fair Setup - Updated');
      expect(res.body.data.requiredVolunteers).toBe(6);
    });

    it('should reject status changes on the general update route', async () => {
      const res = await request(app)
        .patch(`/api/opportunities/${oppId}`)
        .set('Cookie', adminCookie)
        .send({
          status: 'CLOSED'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/status cannot be changed via general update/i);
    });

    it('should allow ADMIN to update status via dedicated /status endpoint', async () => {
      const res = await request(app)
        .patch(`/api/opportunities/${oppId}/status`)
        .set('Cookie', adminCookie)
        .send({
          status: 'CLOSED'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CLOSED');
    });
  });
});
