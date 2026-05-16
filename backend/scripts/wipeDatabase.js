const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in backend/.env');
  process.exit(1);
}

const flexibleSchema = new mongoose.Schema({}, { strict: false, versionKey: false });
const collections = ['users', 'goals', 'checkins', 'goalcycles', 'sharedgoals', 'auditlogs', 'notifications'];

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB, about to wipe collections:', collections.join(', '));

  for (const name of collections) {
    try {
      const model = mongoose.model(name, flexibleSchema, name);
      const res = await model.deleteMany({});
      console.log(`Cleared ${name}: deleted ${res.deletedCount} documents.`);
    } catch (err) {
      console.warn(`Failed to clear ${name}:`, err.message);
    }
  }

  // Optionally, write a single audit marker in a new auditlogs collection that notes the wipe
  try {
    const AuditModel = mongoose.model('auditlogs', flexibleSchema, 'auditlogs');
    await AuditModel.insertMany([
      {
        logId: 'wipe_' + Date.now(),
        userId: 'system',
        role: 'system',
        action: 'Full database wipe',
        entityType: 'System',
        entityId: 'wipe_all',
        oldValue: {},
        newValue: {},
        timestamp: new Date().toISOString(),
        remarks: 'All collections cleared by wipeDatabase script',
      },
    ]);
    console.log('Wipe marker written to auditlogs.');
  } catch (err) {
    console.warn('Failed to write wipe marker audit log:', err.message);
  }

  await mongoose.disconnect();
  console.log('Database wipe complete.');
}

run().catch(async (err) => {
  console.error('wipeDatabase failed:', err.message);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
