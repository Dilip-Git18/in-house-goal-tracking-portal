const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config({ path: '.env' });
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in backend/.env');
  process.exit(1);
}

const flexibleSchema = new mongoose.Schema({}, { strict: false, versionKey: false });
const CheckInModel = mongoose.model('checkins', flexibleSchema, 'checkins');
const AuditLogModel = mongoose.model('auditlogs', flexibleSchema, 'auditlogs');

async function run() {
  await mongoose.connect(MONGODB_URI);

  // Target check-in id (matches the seeded demo)
  const targetCheckInId = 'check_001';

  const existing = await CheckInModel.findOne({ checkInId: targetCheckInId }).lean();
  if (!existing) {
    console.log(`No check-in found with checkInId=${targetCheckInId}. Attempting fallback by goalId+quarter.`);
    // fallback: delete by goalId and quarter if present
    const fallback = await CheckInModel.findOne({ goalId: 'goal_001', quarter: 'Q1' }).lean();
    if (!fallback) {
      console.log('No matching check-in found to delete. Exiting.');
      await mongoose.disconnect();
      return;
    }
    console.log('Found fallback check-in:', fallback.checkInId);
    await CheckInModel.deleteOne({ _id: fallback._id });
    await AuditLogModel.insertMany([
      {
        logId: uuidv4(),
        userId: 'adm_001',
        role: 'admin',
        action: 'Check-in reset (fallback)',
        entityType: 'CheckIn',
        entityId: fallback.checkInId,
        oldValue: fallback,
        newValue: {},
        timestamp: new Date().toISOString(),
        remarks: 'Deleted by admin via deleteCheckin script (fallback).',
      },
    ]);
    console.log('Fallback deletion complete.');
    await mongoose.disconnect();
    return;
  }

  // Delete the found check-in
  await CheckInModel.deleteOne({ checkInId: targetCheckInId });
  await AuditLogModel.insertMany([
    {
      logId: uuidv4(),
      userId: 'adm_001',
      role: 'admin',
      action: 'Check-in reset',
      entityType: 'CheckIn',
      entityId: existing.checkInId,
      oldValue: existing,
      newValue: {},
      timestamp: new Date().toISOString(),
      remarks: 'Deleted by admin via deleteCheckin script.',
    },
  ]);

  console.log(`Deleted check-in ${targetCheckInId} and wrote audit log.`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('deleteCheckin failed:', err.message);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
