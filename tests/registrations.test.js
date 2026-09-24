const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Opportunity = require('../src/models/Opportunity');
const Registration = require('../src/models/Registration');
require('./setup');

describe('Registrations API & Business Rules (/api/v1/registrations & /api/v1/opportunities/:id/register)', () => {
  let adminCookie;
  let userACookie;
  let userBCookie;
  let adminUser;
  let userA;
  let userB;

  beforeEach(async () => {
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@campus.edu',
      password: 'AdminPassword123',
      role: 'ADMIN'
    });
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@campus.edu', password: 'AdminPassword123' });
    adminCookie = adminLogin.headers['set-cookie'];

    userA = await User.create({
      name: 'User A',
      email: 'usera@campus.edu',
      password: 'UserPassword123',
      role: 'USER'
    });
    const userALogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'usera@campus.edu', password: 'UserPassword123' });
    userACookie = userALogin.headers['set-cookie'];

    userB = await User.create({
      name: 'User B',
      email: 'userb@campus.edu',
      password: 'UserPassword123',
      role: 'USER'
    });
    const userBLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'userb@campus.edu', password: 'UserPassword123' });
    userBCookie = userBLogin.headers['set-cookie'];
  });

  const getFutureDate = (days = 5, extraHours = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(d.getHours() + extraHours);
    return d.toISOString();
  };

  describe('Capacity Guard & Duplicate Registration Guard (§8)', () => {
    it('should reject registration when capacity is reached with 409 CAPACITY_EXCEEDED', async () => {
      // Create opportunity with requiredVolunteers = 1
      const oppRes = await request(app)
        .post('/api/v1/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Single Slot Opportunity',
          dateTime: getFutureDate(3),
          location: 'Lab 101',
          requiredVolunteers: 1
        });
      const oppId = oppRes.body.data._id;

      // User A registers -> 201
      const regARes = await request(app)
        .post(`/api/v1/opportunities/${oppId}/register`)
        .set('Cookie', userACookie);

      expect(regARes.status).toBe(201);
      expect(regARes.body.success).toBe(true);
      expect(regARes.body.data.status).toBe('REGISTERED');

      // Verify registeredCount is 1
      const oppAfterA = await Opportunity.findById(oppId);
      expect(oppAfterA.registeredCount).toBe(1);

      // User B attempts to register -> 409 CAPACITY_EXCEEDED
      const regBRes = await request(app)
        .post(`/api/v1/opportunities/${oppId}/register`)
        .set('Cookie', userBCookie);

      expect(regBRes.status).toBe(409);
      expect(regBRes.body.success).toBe(false);
      expect(regBRes.body.error.code).toBe('CAPACITY_EXCEEDED');

      // Ensure counter was not incremented beyond capacity
      const oppAfterB = await Opportunity.findById(oppId);
      expect(oppAfterB.registeredCount).toBe(1);
    });

    it('should reject duplicate active registration by same user with 409 DUPLICATE_REGISTRATION', async () => {
      const oppRes = await request(app)
        .post('/api/v1/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Multi Slot Workshop',
          dateTime: getFutureDate(4),
          location: 'Hall C',
          requiredVolunteers: 5
        });
      const oppId = oppRes.body.data._id;

      // First registration
      const firstReg = await request(app)
        .post(`/api/v1/opportunities/${oppId}/register`)
        .set('Cookie', userACookie);
      expect(firstReg.status).toBe(201);

      // Duplicate registration attempt
      const secondReg = await request(app)
        .post(`/api/v1/opportunities/${oppId}/register`)
        .set('Cookie', userACookie);

      expect(secondReg.status).toBe(409);
      expect(secondReg.body.success).toBe(false);
      expect(secondReg.body.error.code).toBe('DUPLICATE_REGISTRATION');

      // Counter should only be 1
      const opp = await Opportunity.findById(oppId);
      expect(opp.registeredCount).toBe(1);
    });
  });

  describe('Schedule-Conflict Check (Bonus Rule 1)', () => {
    it('should reject registration if user already has an active registration within 1-hour window (409 SCHEDULE_CONFLICT)', async () => {
      const eventTime1 = new Date();
      eventTime1.setDate(eventTime1.getDate() + 5);
      eventTime1.setHours(10, 0, 0, 0);

      // Opp 1 at 10:00 AM
      const opp1Res = await request(app)
        .post('/api/v1/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Morning Gate Helper',
          dateTime: eventTime1.toISOString(),
          location: 'Main Gate',
          requiredVolunteers: 3
        });
      const opp1Id = opp1Res.body.data._id;

      // Opp 2 at 10:30 AM (same day, 30 mins later - conflict!)
      const eventTime2 = new Date(eventTime1.getTime() + 30 * 60 * 1000);
      const opp2Res = await request(app)
        .post('/api/v1/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Morning Keynote Assistant',
          dateTime: eventTime2.toISOString(),
          location: 'Auditorium',
          requiredVolunteers: 3
        });
      const opp2Id = opp2Res.body.data._id;

      // User A registers for Opp 1
      const reg1 = await request(app)
        .post(`/api/v1/opportunities/${opp1Id}/register`)
        .set('Cookie', userACookie);
      expect(reg1.status).toBe(201);

      // User A attempts to register for Opp 2 (colliding time!)
      const conflictRes = await request(app)
        .post(`/api/v1/opportunities/${opp2Id}/register`)
        .set('Cookie', userACookie);

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.success).toBe(false);
      expect(conflictRes.body.error.code).toBe('SCHEDULE_CONFLICT');

      // Counter for Opp 2 must have rolled back to 0
      const opp2 = await Opportunity.findById(opp2Id);
      expect(opp2.registeredCount).toBe(0);
    });
  });

  describe('Withdrawal & Partial Unique Index Behavior', () => {
    it('should allow withdrawal, decrement capacity, and permit re-registration without partial index collision', async () => {
      const oppRes = await request(app)
        .post('/api/v1/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Art Showcase Setup',
          dateTime: getFutureDate(6),
          location: 'Art Wing',
          requiredVolunteers: 2
        });
      const oppId = oppRes.body.data._id;

      // 1. User A registers
      const regRes = await request(app)
        .post(`/api/v1/opportunities/${oppId}/register`)
        .set('Cookie', userACookie);
      const regId = regRes.body.data._id;

      let opp = await Opportunity.findById(oppId);
      expect(opp.registeredCount).toBe(1);

      // 2. User A withdraws
      const withdrawRes = await request(app)
        .patch(`/api/v1/registrations/${regId}/withdraw`)
        .set('Cookie', userACookie);

      expect(withdrawRes.status).toBe(200);
      expect(withdrawRes.body.success).toBe(true);
      expect(withdrawRes.body.data.status).toBe('WITHDRAWN');

      // Capacity decremented
      opp = await Opportunity.findById(oppId);
      expect(opp.registeredCount).toBe(0);

      // 3. User A re-registers -> partial unique index allows new REGISTERED row because previous is WITHDRAWN!
      const reRegRes = await request(app)
        .post(`/api/v1/opportunities/${oppId}/register`)
        .set('Cookie', userACookie);

      expect(reRegRes.status).toBe(201);
      expect(reRegRes.body.data.status).toBe('REGISTERED');

      opp = await Opportunity.findById(oppId);
      expect(opp.registeredCount).toBe(1);
    });

    it('should reject withdrawal from past events with 400 INELIGIBLE_WITHDRAWAL', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const pastOpp = await Opportunity.create({
        title: 'Past Completed Event',
        dateTime: pastDate,
        location: 'Old Hall',
        requiredVolunteers: 5,
        registeredCount: 1,
        status: 'COMPLETED',
        createdBy: adminUser._id
      });

      const pastReg = await Registration.create({
        user: userA._id,
        opportunity: pastOpp._id,
        status: 'REGISTERED'
      });

      const res = await request(app)
        .patch(`/api/v1/registrations/${pastReg._id}/withdraw`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INELIGIBLE_WITHDRAWAL');
    });

    it('should reject withdrawal attempt by another user with 403 FORBIDDEN', async () => {
      const oppRes = await request(app)
        .post('/api/v1/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Private Activity',
          dateTime: getFutureDate(4),
          location: 'Hall B',
          requiredVolunteers: 5
        });
      const oppId = oppRes.body.data._id;

      const regRes = await request(app)
        .post(`/api/v1/opportunities/${oppId}/register`)
        .set('Cookie', userACookie);
      const regId = regRes.body.data._id;

      // User B attempts to withdraw User A's registration
      const res = await request(app)
        .patch(`/api/v1/registrations/${regId}/withdraw`)
        .set('Cookie', userBCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow user to view their own participation history (GET /api/v1/registrations/me)', async () => {
      const res = await request(app)
        .get('/api/v1/registrations/me')
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
