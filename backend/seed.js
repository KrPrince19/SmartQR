const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Restaurant = require('./models/Restaurant');
const MenuItem = require('./models/MenuItem');

const MENU = [
  // Starters
  { name: 'Paneer Tikka', description: 'Marinated cottage cheese grilled in tandoor', price: 220, category: 'Starters', isVeg: true },
  { name: 'Chicken Wings', description: 'Crispy wings with spicy sauce', price: 280, category: 'Starters', isVeg: false },
  { name: 'Veg Spring Rolls', description: 'Crispy rolls with mixed vegetables', price: 160, category: 'Starters', isVeg: true },
  { name: 'Fish Fingers', description: 'Golden fried fish fingers with tartar sauce', price: 240, category: 'Starters', isVeg: false },
  // Main Course
  { name: 'Dal Makhani', description: 'Slow cooked black lentils with cream and butter', price: 180, category: 'Main Course', isVeg: true },
  { name: 'Paneer Butter Masala', description: 'Cottage cheese in rich tomato gravy', price: 220, category: 'Main Course', isVeg: true },
  { name: 'Chicken Biryani', description: 'Aromatic basmati rice with spiced chicken', price: 320, category: 'Main Course', isVeg: false },
  { name: 'Mutton Rogan Josh', description: 'Kashmiri style slow cooked mutton curry', price: 380, category: 'Main Course', isVeg: false },
  { name: 'Palak Paneer', description: 'Cottage cheese in smooth spinach gravy', price: 200, category: 'Main Course', isVeg: true },
  { name: 'Butter Chicken', description: 'Tender chicken in velvety tomato sauce', price: 300, category: 'Main Course', isVeg: false },
  // Breads
  { name: 'Butter Naan', description: 'Soft leavened bread baked in tandoor', price: 50, category: 'Breads', isVeg: true },
  { name: 'Garlic Naan', description: 'Naan topped with garlic and butter', price: 70, category: 'Breads', isVeg: true },
  { name: 'Laccha Paratha', description: 'Layered whole wheat bread', price: 60, category: 'Breads', isVeg: true },
  // Beverages
  { name: 'Mango Lassi', description: 'Chilled yogurt mango drink', price: 80, category: 'Beverages', isVeg: true },
  { name: 'Masala Chai', description: 'Spiced Indian milk tea', price: 40, category: 'Beverages', isVeg: true },
  { name: 'Fresh Lime Soda', description: 'Refreshing lime with soda water', price: 60, category: 'Beverages', isVeg: true },
  { name: 'Cold Coffee', description: 'Chilled blended coffee with milk', price: 90, category: 'Beverages', isVeg: true },
  // Desserts
  { name: 'Gulab Jamun', description: 'Soft milk dumplings in rose syrup (2 pcs)', price: 80, category: 'Desserts', isVeg: true },
  { name: 'Kulfi', description: 'Traditional Indian ice cream - malai or mango', price: 100, category: 'Desserts', isVeg: true },
  { name: 'Rasgulla', description: 'Spongy cottage cheese balls in sugar syrup', price: 80, category: 'Desserts', isVeg: true },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartqr');
  console.log('Connected to MongoDB');

  // Remove existing demo
  const existing = await Restaurant.findOne({ adminEmail: 'demo@smartqr.app' });
  if (existing) {
    await MenuItem.deleteMany({ restaurant: existing._id });
    await Restaurant.findByIdAndDelete(existing._id);
    console.log('Removed existing demo data');
  }

  const hash = await bcrypt.hash('demo1234', 12);
  const restaurant = await Restaurant.create({
    name: 'The Spice Garden',
    adminEmail: 'demo@smartqr.app',
    adminPassword: hash,
    description: 'Authentic Indian cuisine with a modern twist',
    address: '45 MG Road, Bangalore, Karnataka 560001',
    phone: '+91 98765 43210',
    currency: '₹',
    tables: ['Table1', 'Table2', 'Table3', 'Table4', 'Table5', 'Table6', 'VIP-1', 'VIP-2', 'Takeaway'],
  });

  await MenuItem.insertMany(MENU.map((item) => ({ ...item, restaurant: restaurant._id })));
  console.log(`✅ Demo restaurant created: ${restaurant.name}`);
  console.log(`   Email: demo@smartqr.app`);
  console.log(`   Password: demo1234`);
  console.log(`   Restaurant ID: ${restaurant._id}`);
  console.log(`   Menu URL: http://localhost:3000/restaurant/${restaurant._id}?table=Table1`);

  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
