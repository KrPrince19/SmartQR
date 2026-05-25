const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const SuperAdmin = require('./models/SuperAdmin');
const Subscription = require('./models/Subscription');
const Restaurant = require('./models/Restaurant');

async function seedSuperAdmin() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartqr');
  console.log('Connected to MongoDB');

  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@smartqr.app';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@2024!';
  const name = process.env.SUPER_ADMIN_NAME || 'Platform Admin';

  // Remove existing
  await SuperAdmin.deleteOne({ email });

  const hash = await bcrypt.hash(password, 14); // Higher rounds for super admin
  const admin = await SuperAdmin.create({ email, password: hash, name });

  console.log(`\n✅ Super Admin created:`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`\n⚠️  IMPORTANT: Change these credentials in production!`);
  console.log(`   Set SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD in .env before running this.\n`);

  // Seed subscriptions for existing demo restaurant if exists
  const demoRestaurant = await Restaurant.findOne({ adminEmail: 'demo@smartqr.app' });
  if (demoRestaurant) {
    const existing = await Subscription.findOne({ restaurant: demoRestaurant._id });
    if (!existing) {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      await Subscription.create({
        restaurant: demoRestaurant._id,
        plan: 'pro',
        startDate: new Date(),
        endDate,
        amount: 2999,
        status: 'active',
        history: [{
          action: 'created',
          plan: 'pro',
          date: new Date(),
          by: email,
          note: 'Demo account setup',
        }],
      });
      console.log(`✅ Created Pro subscription for demo restaurant`);
    }
  }

  process.exit(0);
}

seedSuperAdmin().catch((err) => { console.error(err); process.exit(1); });
