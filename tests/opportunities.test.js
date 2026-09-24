const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Opportunity = require('../src/models/Opportunity');
require('./setup');

describe('Opportunities API (/api/v1/opportunities)', () => {
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

  const getFutureDate = (days = 5) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  describe('POST /api/v1/opportunities', () => {
    it('should allow ADMIN to create an opportunity with 201', async () => {
      const res = await request(app)
        .post('/api/v1/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Campus Cleanup Drive',
          description: 'Help clean up the campus lake area',
          dateTime: getFutureDate(7),
          location: 'Campus Lake Pavilion',
          requiredVolunteers: 10
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Campus Cleanup Drive');
      expect(res.body.data.status).toBe('OPEN');
      expect(res.body.data.registeredCount).toBe(0);
    });

    it('should reject non-admin (USER) with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/v1/opportunities')
        .set('Cookie', userCookie)
        .send({
          title: 'Unauthorized Event',
          dateTime: getFutureDate(7),
          location: 'Anywhere',
          requiredVolunteers: 5
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject opportunity with past dateTime with 400 VALIDATION_ERROR', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);

      const res = await request(app)
        .post('/api/v1/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Past Event',
          dateTime: pastDate.toISOString(),
          location: 'Hall A',
          requiredVolunteers: 5
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/opportunities & GET /api/v1/opportunities/:id', () => {
    let oppId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/v1/opportunities')
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

    it('should allow authenticated users to browse opportunities with filters (no club gating)', async () => {
      const res = await request(app)
        .get('/api/v1/opportunities?status=OPEN')
        .set('Cookie', userCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.opportunities.length).toBeGreaterThan(0);
    });

    it('should allow viewing a single opportunity by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/opportunities/${oppId}`)
        .set('Cookie', userCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(oppId);
      expect(res.body.data.title).toBe('Blood Donation Camp');
    });

    it('should return 400 INVALID_ID for invalid ObjectId format before query executes', async () => {
      const res = await request(app)
        .get('/api/v1/opportunities/invalid-mongo-id')
        .set('Cookie', userCookie);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_ID');
    });

    it('should return 404 NOT_FOUND for non-existent valid ObjectId', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/v1/opportunities/${nonExistentId}`)
        .set('Cookie', userCookie);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH & DELETE /api/v1/opportunities/:id', () => {
    let oppId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/v1/opportunities')
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

    it('should allow ADMIN to update fields including status (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/opportunities/${oppId}`)
        .set('Cookie', adminCookie)
        .send({
          title: 'Career Fair Setup - Updated',
          requiredVolunteers: 6,
          status: 'CLOSED'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Career Fair Setup - Updated');
      expect(res.body.data.status).toBe('CLOSED');
      expect(res.body.data.requiredVolunteers).toBe(6);
    });

    it('should soft-cancel on DELETE (status: CANCELLED)', async () => {
      const res = await request(app)
        .delete(`/api/v1/opportunities/${oppId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');

      const oppInDb = await Opportunity.findById(oppId);
      expect(oppInDb.status).toBe('CANCELLED');
    });
  });

  describe('Excel Export (/api/v1/opportunities/:id/volunteers/export)', () => {
    it('should allow ADMIN to export volunteer list as .xlsx buffer', async () => {
      const createRes = await request(app)
        .post('/api/v1/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Hackathon Helpers',
          dateTime: getFutureDate(5),
          location: 'Lab 1',
          requiredVolunteers: 5
        });
      const oppId = createRes.body.data._id;

      // Register regular user
      await request(app)
        .post(`/api/v1/opportunities/${oppId}/register`)
        .set('Cookie', userCookie);

      const res = await request(app)
        .get(`/api/v1/opportunities/${oppId}/volunteers/export`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.body).toBeDefined();
    });

    it('should reject non-admin from exporting with 403', async () => {
      const createRes = await request(app)
        .post('/api/v1/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Secret Event',
          dateTime: getFutureDate(5),
          location: 'Lab 2',
          requiredVolunteers: 5
        });
      const oppId = createRes.body.data._id;

      const res = await request(app)
        .get(`/api/v1/opportunities/${oppId}/volunteers/export`)
        .set('Cookie', userCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
