require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedAdmin = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/factchecker';

  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(MONGODB_URI);
    console.log('Database connected.');

    // Check if user already exists
    const adminExists = await User.findOne({ email: 'admin@verifacts.com' });
    if (adminExists) {
      console.log('Default admin account already exists. Skipping seed.');
      process.exit(0);
    }

    // Create user
    console.log('Seeding default administrator user account...');
    await User.create({
      name: 'Admin Analyst',
      email: 'admin@verifacts.com',
      password: 'admin123', // Will be hashed automatically by UserSchema save hook
    });

    console.log('Successfully seeded default administrator user:');
    console.log('  Email: admin@verifacts.com');
    console.log('  Password: admin123');
    process.exit(0);
  } catch (error) {
    console.error('Seeding script failed with error:', error.message);
    process.exit(1);
  }
};

seedAdmin();
