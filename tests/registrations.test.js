const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Opportunity = require('../src/models/Opportunity');
const Registration = require('../src/models/Registration');
require('./setup');

describe('Registrations API & Business Rules (/api/registrations & /api/opportunities/:id/register)', () => {
  let adminCookie;
  let userACookie;
  let userBCookie;
  let adminUser;
  let userA;
  let userB;

  beforeEach(async () => {
    // Admin
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

    // User A
    userA = await User.create({
      name: 'User A',
      email: 'usera@campus.edu',
      password: 'UserPassword123',
      role: 'USER'
    });
    const userALogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'usera@campus.edu', password: 'UserPassword123' });
    userACookie = userALogin.headers['set-cookie'];

    // User B
    userB = await User.create({
      name: 'User B',
      email: 'userb@campus.edu',
      password: 'UserPassword123',
      role: 'USER'
    });
    const userBLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'userb@campus.edu', password: 'UserPassword123' });
    userBCookie = userBLogin.headers['set-cookie'];
  });

  const getFutureDate = (days = 5) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  describe('Capacity Guard & Duplicate Registration Guard (§8)', () => {
    it('should allow User A to register, but block User B when requiredVolunteers=1 (capacity full)', async () => {
      // 1. Create opportunity with capacity = 1
      const oppRes = await request(app)
        .post('/api/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Single Volunteer Task',
          description: 'Only 1 volunteer needed',
          dateTime: getFutureDate(3),
          location: 'Lab 101',
          requiredVolunteers: 1
        });
      const oppId = oppRes.body.data._id;

      // 2. User A registers -> 201
      const regARes = await request(app)
        .post(`/api/opportunities/${oppId}/register`)
        .set('Cookie', userACookie);

      expect(regARes.status).toBe(201);
      expect(regARes.body.success).toBe(true);
      expect(regARes.body.data.status).toBe('REGISTERED');

      // Verify registeredCount is 1
      const oppAfterA = await Opportunity.findById(oppId);
      expect(oppAfterA.registeredCount).toBe(1);

      // 3. User B attempts to register -> 409 "No available slots"
      const regBRes = await request(app)
        .post(`/api/opportunities/${oppId}/register`)
        .set('Cookie', userBCookie);

      expect(regBRes.status).toBe(409);
      expect(regBRes.body.success).toBe(false);
      expect(regBRes.body.message).toBe('No available slots');

      // Verify registeredCount did not overshoot capacity
      const oppAfterB = await Opportunity.findById(oppId);
      expect(oppAfterB.registeredCount).toBe(1);
    });

    it('should reject duplicate registration by the same user with 409 "Already registered for this opportunity"', async () => {
      const oppRes = await request(app)
        .post('/api/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Workshop Assistant',
          description: 'Multiple slots',
          dateTime: getFutureDate(3),
          location: 'Hall C',
          requiredVolunteers: 5
        });
      const oppId = oppRes.body.data._id;

      // First registration
      const firstReg = await request(app)
        .post(`/api/opportunities/${oppId}/register`)
        .set('Cookie', userACookie);
      expect(firstReg.status).toBe(201);

      // Duplicate registration attempt
      const secondReg = await request(app)
        .post(`/api/opportunities/${oppId}/register`)
        .set('Cookie', userACookie);

      expect(secondReg.status).toBe(409);
      expect(secondReg.body.success).toBe(false);
      expect(secondReg.body.message).toBe('Already registered for this opportunity');
    });

    it('should reject registration if opportunity is CLOSED with 409', async () => {
      const oppRes = await request(app)
        .post('/api/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Closed Event',
          description: 'Closed for signup',
          dateTime: getFutureDate(5),
          location: 'Hall D',
          requiredVolunteers: 5
        });
      const oppId = oppRes.body.data._id;

      // Close it
      await request(app)
        .patch(`/api/opportunities/${oppId}/status`)
        .set('Cookie', adminCookie)
        .send({ status: 'CLOSED' });

      // User A attempts to register
      const res = await request(app)
        .post(`/api/opportunities/${oppId}/register`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/not open for registration/i);
    });
  });

  describe('Withdrawal & Re-registration State Machine (§9)', () => {
    it('should allow user to withdraw, decrement slot count, and allow re-registration (flip)', async () => {
      const oppRes = await request(app)
        .post('/api/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Art Festival Helper',
          description: 'Help setup galleries',
          dateTime: getFutureDate(6),
          location: 'Campus Gallery',
          requiredVolunteers: 2
        });
      const oppId = oppRes.body.data._id;

      // 1. User A registers
      const regRes = await request(app)
        .post(`/api/opportunities/${oppId}/register`)
        .set('Cookie', userACookie);
      const regId = regRes.body.data._id;

      let opp = await Opportunity.findById(oppId);
      expect(opp.registeredCount).toBe(1);

      // 2. User A withdraws
      const withdrawRes = await request(app)
        .patch(`/api/registrations/${regId}/withdraw`)
        .set('Cookie', userACookie);

      expect(withdrawRes.status).toBe(200);
      expect(withdrawRes.body.success).toBe(true);
      expect(withdrawRes.body.data.status).toBe('WITHDRAWN');
      expect(withdrawRes.body.data.withdrawnAt).toBeDefined();

      // Slot count must decrement
      opp = await Opportunity.findById(oppId);
      expect(opp.registeredCount).toBe(0);

      // 3. User A re-registers -> 201 (re-uses existing record, flips status to REGISTERED)
      const reRegRes = await request(app)
        .post(`/api/opportunities/${oppId}/register`)
        .set('Cookie', userACookie);

      expect(reRegRes.status).toBe(201);
      expect(reRegRes.body.data.status).toBe('REGISTERED');

      // Database should still only have 1 registration document for (user, opp)
      const totalRegs = await Registration.countDocuments({ user: userA._id, opportunity: oppId });
      expect(totalRegs).toBe(1);

      // Slot count increments back to 1
      opp = await Opportunity.findById(oppId);
      expect(opp.registeredCount).toBe(1);
    });

    it('should reject withdrawal from past or completed opportunities with 400', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      // Directly create past completed opportunity in DB
      const pastOpp = await Opportunity.create({
        title: 'Past Seminar',
        description: 'Already happened',
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
        .patch(`/api/registrations/${pastReg._id}/withdraw`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not eligible to withdraw/i);
    });

    it('should return 404 if a user tries to withdraw someone else’s registration', async () => {
      const oppRes = await request(app)
        .post('/api/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Music Night Stagehand',
          description: 'Help on stage',
          dateTime: getFutureDate(4),
          location: 'Amphitheater',
          requiredVolunteers: 5
        });
      const oppId = oppRes.body.data._id;

      // User A registers
      const regRes = await request(app)
        .post(`/api/opportunities/${oppId}/register`)
        .set('Cookie', userACookie);
      const regId = regRes.body.data._id;

      // User B attempts to withdraw User A's registration
      const res = await request(app)
        .patch(`/api/registrations/${regId}/withdraw`)
        .set('Cookie', userBCookie);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Registration not found');
    });
  });

  describe('Admin Status Management & Cascades (§10)', () => {
    it('should bulk-flip active registrations to WITHDRAWN and reset registeredCount when Admin cancels opportunity', async () => {
      const oppRes = await request(app)
        .post('/api/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Guest Lecture',
          description: 'To be cancelled',
          dateTime: getFutureDate(7),
          location: 'Main Hall',
          requiredVolunteers: 5
        });
      const oppId = oppRes.body.data._id;

      // Both User A and User B register
      await request(app).post(`/api/opportunities/${oppId}/register`).set('Cookie', userACookie);
      await request(app).post(`/api/opportunities/${oppId}/register`).set('Cookie', userBCookie);

      let opp = await Opportunity.findById(oppId);
      expect(opp.registeredCount).toBe(2);

      // Admin cancels opportunity
      const cancelRes = await request(app)
        .patch(`/api/opportunities/${oppId}/status`)
        .set('Cookie', adminCookie)
        .send({ status: 'CANCELLED' });

      expect(cancelRes.status).toBe(200);

      // Check registeredCount reset to 0
      opp = await Opportunity.findById(oppId);
      expect(opp.registeredCount).toBe(0);
      expect(opp.status).toBe('CANCELLED');

      // Check both registrations were flipped to WITHDRAWN
      const registrations = await Registration.find({ opportunity: oppId });
      expect(registrations.length).toBe(2);
      expect(registrations.every(r => r.status === 'WITHDRAWN')).toBe(true);
    });

    it('should allow ADMIN to set participation outcome to ATTENDED or ABSENT', async () => {
      const oppRes = await request(app)
        .post('/api/opportunities')
        .set('Cookie', adminCookie)
        .send({
          title: 'Hackathon Mentor Assistant',
          description: 'Mentor help',
          dateTime: getFutureDate(2),
          location: 'Lab 2',
          requiredVolunteers: 3
        });
      const oppId = oppRes.body.data._id;

      const regRes = await request(app)
        .post(`/api/opportunities/${oppId}/register`)
        .set('Cookie', userACookie);
      const regId = regRes.body.data._id;

      // Admin sets status to ATTENDED
      const outcomeRes = await request(app)
        .patch(`/api/registrations/${regId}/status`)
        .set('Cookie', adminCookie)
        .send({ status: 'ATTENDED' });

      expect(outcomeRes.status).toBe(200);
      expect(outcomeRes.body.data.status).toBe('ATTENDED');

      // Attempting to set outcome again on ATTENDED status should be rejected
      const invalidOutcome = await request(app)
        .patch(`/api/registrations/${regId}/status`)
        .set('Cookie', adminCookie)
        .send({ status: 'ABSENT' });

      expect(invalidOutcome.status).toBe(400);
      expect(invalidOutcome.body.message).toMatch(/currently registered volunteers/i);
    });
  });
});
