require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Opportunity = require('../models/Opportunity');
const Registration = require('../models/Registration');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/volunteer_management';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Registration.deleteMany({});
    await Opportunity.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing database records.');

    // 1. Create Users
    // ADMIN: admin@campus.edu / Admin@12345
    // USER: asha@campus.edu / Password123
    // USER: ravi@campus.edu / Password123
    const admin = await User.create({
      name: 'Campus Administrator',
      email: 'admin@campus.edu',
      password: 'Admin@12345',
      role: 'ADMIN'
    });

    const asha = await User.create({
      name: 'Asha Sharma',
      email: 'asha@campus.edu',
      password: 'Password123',
      role: 'USER'
    });

    const ravi = await User.create({
      name: 'Ravi Kumar',
      email: 'ravi@campus.edu',
      password: 'Password123',
      role: 'USER'
    });

    console.log('Created Users:');
    console.log(' - Admin: admin@campus.edu (Admin@12345)');
    console.log(' - User 1: asha@campus.edu (Password123)');
    console.log(' - User 2: ravi@campus.edu (Password123)');

    // 2. Create Sample Opportunities
    const futureDate1 = new Date();
    futureDate1.setDate(futureDate1.getDate() + 7);

    const futureDate2 = new Date();
    futureDate2.setDate(futureDate2.getDate() + 3);

    const futureDate3 = new Date();
    futureDate3.setDate(futureDate3.getDate() + 10);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 14);

    // Opportunity 1: Open, general
    const opp1 = await Opportunity.create({
      title: 'Campus Tree Plantation Drive',
      description: 'Join the campus sustainability initiative to plant 100 indigenous saplings across the north campus lawn.',
      dateTime: futureDate1,
      location: 'North Lawn, Main Campus',
      requiredVolunteers: 20,
      registeredCount: 0,
      status: 'OPEN',
      createdBy: admin._id
    });

    // Opportunity 2: Near capacity (required: 2, registered: 1)
    const opp2 = await Opportunity.create({
      title: 'Annual Tech Symposium Registration Desk',
      description: 'Help check in attendees, distribute symposium badges, and direct guests to workshop tracks.',
      dateTime: futureDate2,
      location: 'Auditorium Hall B',
      requiredVolunteers: 2,
      registeredCount: 1,
      status: 'OPEN',
      createdBy: admin._id
    });

    // Register Asha for Opportunity 2 so registeredCount: 1
    await Registration.create({
      user: asha._id,
      opportunity: opp2._id,
      status: 'REGISTERED',
      registeredAt: new Date()
    });

    // Opportunity 3: Closed
    const opp3 = await Opportunity.create({
      title: 'Blood Donation Camp Assistant',
      description: 'Assist doctors and triage donor registrations during the Red Cross campus blood drive.',
      dateTime: futureDate3,
      location: 'Student Health Center',
      requiredVolunteers: 5,
      registeredCount: 0,
      status: 'CLOSED',
      createdBy: admin._id
    });

    // Opportunity 4: Past event (dateTime in past, status COMPLETED)
    const opp4 = await Opportunity.create({
      title: 'Orientation Day Campus Tour Guide',
      description: 'Conducted guided orientation tours for the incoming freshman batch.',
      dateTime: pastDate,
      location: 'Visitor Welcome Plaza',
      requiredVolunteers: 10,
      registeredCount: 1,
      status: 'COMPLETED',
      createdBy: admin._id
    });

    // Register Ravi for Opportunity 4
    await Registration.create({
      user: ravi._id,
      opportunity: opp4._id,
      status: 'ATTENDED',
      registeredAt: pastDate
    });

    console.log('Created Sample Opportunities:');
    console.log(` - [OPEN] ${opp1.title} (${opp1.registeredCount}/${opp1.requiredVolunteers} slots)`);
    console.log(` - [OPEN, Near Capacity] ${opp2.title} (${opp2.registeredCount}/${opp2.requiredVolunteers} slots)`);
    console.log(` - [CLOSED] ${opp3.title} (${opp3.registeredCount}/${opp3.requiredVolunteers} slots)`);
    console.log(` - [COMPLETED, Past] ${opp4.title}`);

    console.log('Seeding completed successfully!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
};

seedData();
