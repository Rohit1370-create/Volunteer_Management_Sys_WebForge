require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Club = require('../models/Club');
const Event = require('../models/Event');
const Opportunity = require('../models/Opportunity');
const Registration = require('../models/Registration');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/volunteer_management';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing collections
    await Registration.deleteMany({});
    await Opportunity.deleteMany({});
    await Event.deleteMany({});
    await Club.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing collections.');

    // 1. Create Admin
    const admin = await User.create({
      name: 'Campus Administrator',
      email: 'admin@campus.edu',
      password: 'Admin@12345',
      role: 'ADMIN',
      phone: '+919876543210',
      branch: 'Administration',
      section: 'Staff',
      yearOfStudy: 4,
      isActive: true
    });

    // 2. Create 5 Students (USERs)
    const asha = await User.create({
      name: 'Asha Sharma',
      email: 'asha@campus.edu',
      password: 'Password123',
      role: 'USER',
      phone: '+919876500001',
      branch: 'Computer Science',
      section: 'A',
      yearOfStudy: 3,
      isActive: true
    });

    const ravi = await User.create({
      name: 'Ravi Kumar',
      email: 'ravi@campus.edu',
      password: 'Password123',
      role: 'USER',
      phone: '+919876500002',
      branch: 'Electronics & Comm',
      section: 'B',
      yearOfStudy: 2,
      isActive: true
    });

    const neha = await User.create({
      name: 'Neha Patel',
      email: 'neha@campus.edu',
      password: 'Password123',
      role: 'USER',
      phone: '+919876500003',
      branch: 'Mechanical Engg',
      section: 'A',
      yearOfStudy: 4,
      isActive: true
    });

    const arjun = await User.create({
      name: 'Arjun Das',
      email: 'arjun@campus.edu',
      password: 'Password123',
      role: 'USER',
      phone: '+919876500004',
      branch: 'Information Tech',
      section: 'C',
      yearOfStudy: 1,
      isActive: true
    });

    const priya = await User.create({
      name: 'Priya Nair',
      email: 'priya@campus.edu',
      password: 'Password123',
      role: 'USER',
      phone: '+919876500005',
      branch: 'Civil Engg',
      section: 'A',
      yearOfStudy: 3,
      isActive: true
    });

    console.log('Seeded Users: 1 Admin, 5 Students.');

    // 3. Create 3 Clubs
    const ecoClub = await Club.create({
      name: 'Eco Warriors Club',
      description: 'Dedicated to sustainability, afforestation, and campus cleanliness drives.',
      createdBy: admin._id
    });

    const techClub = await Club.create({
      name: 'Tech Innovators Society',
      description: 'Fosters software development, robotics, AI workshops, and hackathons.',
      createdBy: admin._id
    });

    const culturalClub = await Club.create({
      name: 'Campus Cultural Guild',
      description: 'Coordinates annual cultural fest, musical performances, and student activities.',
      createdBy: admin._id
    });

    console.log('Seeded 3 Clubs.');

    // 4. Create Events per Club
    const now = new Date();

    const hackEvent = await Event.create({
      name: 'HackCampus 2026',
      description: 'Annual 36-hour inter-college hackathon with 500+ participants.',
      club: techClub._id,
      startDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    });

    const roboticsEvent = await Event.create({
      name: 'RoboQuest Exhibition',
      description: 'Robotics combat and autonomous drone showcase.',
      club: techClub._id,
      startDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000)
    });

    const greenFest = await Event.create({
      name: 'Green Campus Carnival',
      description: 'Promoting solar energy, zero-waste lifestyle, and tree plantation.',
      club: ecoClub._id,
      startDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000)
    });

    const lakeFest = await Event.create({
      name: 'Lake Shoreline Revival',
      description: 'Volunteer clean-up and water conservation campaign.',
      club: ecoClub._id,
      startDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 13 * 24 * 60 * 60 * 1000)
    });

    const musicFest = await Event.create({
      name: 'Spring Music & Arts Gala',
      description: 'Stage drama, acoustics night, and art exhibition.',
      club: culturalClub._id,
      startDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000)
    });

    const orientationEvent = await Event.create({
      name: 'Freshman Orientation Week',
      description: 'Welcoming the incoming freshman class.',
      club: culturalClub._id,
      startDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000)
    });

    console.log('Seeded Events.');

    // 5. Create 11 Opportunities across OPEN, CLOSED, CANCELLED, COMPLETED

    // Opp 1: OPEN - FULL CAPACITY (requiredVolunteers: 1, registeredCount: 1 -> filled by Asha)
    const opp1Time = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now at 10:00 AM
    opp1Time.setUTCHours(10, 0, 0, 0);

    const opp1 = await Opportunity.create({
      title: 'Hackathon Registration Desk Coordinator',
      description: 'Verify attendee IDs and distribute symposium welcome kits.',
      event: hackEvent._id,
      club: techClub._id,
      dateTime: opp1Time,
      location: 'Auditorium Foyer',
      requiredVolunteers: 1,
      registeredCount: 1,
      status: 'OPEN',
      createdBy: admin._id
    });

    await Registration.create({
      user: asha._id,
      opportunity: opp1._id,
      status: 'REGISTERED',
      registeredAt: new Date()
    });

    // Opp 2: OPEN - Time collision with Opp 1 (same day, 10:30 AM -> 30 mins collision window)
    // Exercises the SCHEDULE_CONFLICT 409 test when Asha tries to register
    const opp2Time = new Date(opp1Time.getTime() + 30 * 60 * 1000); // 30 mins later
    const opp2 = await Opportunity.create({
      title: 'Hackathon Hardware Lab Assistant',
      description: 'Manage Arduino and sensor loan desk for participants.',
      event: hackEvent._id,
      club: techClub._id,
      dateTime: opp2Time,
      location: 'Electronics Lab 2',
      requiredVolunteers: 2,
      registeredCount: 0,
      status: 'OPEN',
      createdBy: admin._id
    });

    // Opp 3: OPEN (Available slots: 1/5 filled by Ravi)
    const opp3Time = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
    const opp3 = await Opportunity.create({
      title: 'Robotics Arena Marshall',
      description: 'Safety check arena boundaries and manage viewer seating.',
      event: roboticsEvent._id,
      club: techClub._id,
      dateTime: opp3Time,
      location: 'Sports Complex Arena B',
      requiredVolunteers: 5,
      registeredCount: 1,
      status: 'OPEN',
      createdBy: admin._id
    });

    await Registration.create({
      user: ravi._id,
      opportunity: opp3._id,
      status: 'REGISTERED',
      registeredAt: new Date()
    });

    // Opp 4: OPEN (Available slots: 2/10 filled by Neha and Arjun)
    const opp4Time = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
    const opp4 = await Opportunity.create({
      title: 'Tree Sapling Distribution Volunteer',
      description: 'Distribute native plant saplings to visitors and record commitments.',
      event: greenFest._id,
      club: ecoClub._id,
      dateTime: opp4Time,
      location: 'Botanical Garden Pavilion',
      requiredVolunteers: 10,
      registeredCount: 2,
      status: 'OPEN',
      createdBy: admin._id
    });

    await Registration.create({
      user: neha._id,
      opportunity: opp4._id,
      status: 'REGISTERED',
      registeredAt: new Date()
    });

    await Registration.create({
      user: arjun._id,
      opportunity: opp4._id,
      status: 'REGISTERED',
      registeredAt: new Date()
    });

    // Opp 5: OPEN (0/4 filled)
    const opp5Time = new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000);
    await Opportunity.create({
      title: 'Solar Panel Display Demonstrator',
      description: 'Demonstrate portable solar kits to student attendees.',
      event: greenFest._id,
      club: ecoClub._id,
      dateTime: opp5Time,
      location: 'Science Quad',
      requiredVolunteers: 4,
      registeredCount: 0,
      status: 'OPEN',
      createdBy: admin._id
    });

    // Opp 6: CLOSED (Registration not allowed)
    const opp6Time = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);
    await Opportunity.create({
      title: 'Lake Shoreline Cleanup Crew',
      description: 'Collect shoreline debris with environmental safety equipment.',
      event: lakeFest._id,
      club: ecoClub._id,
      dateTime: opp6Time,
      location: 'East Lake Gate',
      requiredVolunteers: 8,
      registeredCount: 3,
      status: 'CLOSED',
      createdBy: admin._id
    });

    // Opp 7: CLOSED
    const opp7Time = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    await Opportunity.create({
      title: 'Stage Lighting & Sound Technician',
      description: 'Assist audio engineers behind main concert stage.',
      event: musicFest._id,
      club: culturalClub._id,
      dateTime: opp7Time,
      location: 'Open Air Amphitheatre',
      requiredVolunteers: 2,
      registeredCount: 1,
      status: 'CLOSED',
      createdBy: admin._id
    });

    // Opp 8: COMPLETED (Past event)
    const opp8Time = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const opp8 = await Opportunity.create({
      title: 'Freshman Campus Tour Guide',
      description: 'Escorted incoming students and parents around campus.',
      event: orientationEvent._id,
      club: culturalClub._id,
      dateTime: opp8Time,
      location: 'Welcome Plaza',
      requiredVolunteers: 6,
      registeredCount: 2,
      status: 'COMPLETED',
      createdBy: admin._id
    });

    await Registration.create({
      user: priya._id,
      opportunity: opp8._id,
      status: 'REGISTERED',
      registeredAt: opp8Time
    });

    // Opp 9: COMPLETED (Past event)
    const opp9Time = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    await Opportunity.create({
      title: 'Library Archive Digitization Volunteer',
      description: 'Helped scan and tag old college chronicles.',
      event: null,
      club: culturalClub._id,
      dateTime: opp9Time,
      location: 'Central Library Floor 3',
      requiredVolunteers: 3,
      registeredCount: 3,
      status: 'COMPLETED',
      createdBy: admin._id
    });

    // Opp 10: CANCELLED
    const opp10Time = new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000);
    await Opportunity.create({
      title: 'Drone Show Safety Marshall',
      description: 'Night drone safety patrol.',
      event: roboticsEvent._id,
      club: techClub._id,
      dateTime: opp10Time,
      location: 'Helipad Area',
      requiredVolunteers: 5,
      registeredCount: 0,
      status: 'CANCELLED',
      createdBy: admin._id
    });

    // Opp 11: CANCELLED
    const opp11Time = new Date(now.getTime() + 22 * 24 * 60 * 60 * 1000);
    await Opportunity.create({
      title: 'VIP Guest Escort Officer',
      description: 'Escort guest speakers from airport to campus hall.',
      event: musicFest._id,
      club: culturalClub._id,
      dateTime: opp11Time,
      location: 'Admin Guest House',
      requiredVolunteers: 2,
      registeredCount: 0,
      status: 'CANCELLED',
      createdBy: admin._id
    });

    console.log('Seeded 11 Opportunities across OPEN, CLOSED, COMPLETED, CANCELLED.');
    console.log(' - Opp 1 (Full Capacity: 1/1) -> Tests 409 CAPACITY_EXCEEDED');
    console.log(' - Opp 2 (Overlaps Opp 1 by 30 mins) -> Tests 409 SCHEDULE_CONFLICT for Asha');
    console.log('Seeding completed successfully!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
};

seedDatabase();
