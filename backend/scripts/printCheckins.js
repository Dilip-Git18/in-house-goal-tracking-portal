const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in backend/.env');
  process.exit(1);
}

const flexibleSchema = new mongoose.Schema({}, { strict: false, versionKey: false });
const UserModel = mongoose.model('users', flexibleSchema, 'users');
const CheckInModel = mongoose.model('checkins', flexibleSchema, 'checkins');

async function run() {
  await mongoose.connect(MONGODB_URI);

  const users = await UserModel.find({}).lean();
  const checkIns = await CheckInModel.find({}).lean();

  console.log('Users:');
  users.forEach((u) => console.log(`- ${u.userId} | ${u.name} | ${u.email} | managerId=${u.managerId}`));

  console.log('\nCheckIns:');
  checkIns.forEach((c) => console.log(`- ${c.checkInId} | goalId=${c.goalId} | employeeId=${c.employeeId} | managerId=${c.managerId} | quarter=${c.quarter}`));

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('printCheckins failed:', err.message);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
