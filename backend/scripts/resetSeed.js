const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is missing in backend/.env');
  process.exit(1);
}

const flexibleSchema = new mongoose.Schema({}, { strict: false, versionKey: false });
const UserModel = mongoose.model('users', flexibleSchema, 'users');
const GoalModel = mongoose.model('goals', flexibleSchema, 'goals');
const CheckInModel = mongoose.model('checkins', flexibleSchema, 'checkins');
const GoalCycleModel = mongoose.model('goalcycles', flexibleSchema, 'goalcycles');
const SharedGoalModel = mongoose.model('sharedgoals', flexibleSchema, 'sharedgoals');
const AuditLogModel = mongoose.model('auditlogs', flexibleSchema, 'auditlogs');
const NotificationModel = mongoose.model('notifications', flexibleSchema, 'notifications');

const now = new Date().toISOString();
const hash = (txt) => bcrypt.hashSync(txt, 8);

const users = [
  {
    userId: 'adm_001',
    name: 'HR Admin',
    email: 'admin@company.com',
    password: hash('Pass@123'),
    role: 'admin',
    department: 'HR',
    designation: 'HR Manager',
    managerId: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    userId: 'mgr_001',
    name: 'Priya Mehta',
    email: 'manager@company.com',
    password: hash('Pass@123'),
    role: 'manager',
    department: 'Sales',
    designation: 'Sales Manager',
    managerId: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    userId: 'mgr_002',
    name: 'Arjun Rao',
    email: 'manager2@company.com',
    password: hash('Pass@123'),
    role: 'manager',
    department: 'Operations',
    designation: 'Operations Manager',
    managerId: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    userId: 'emp_001',
    name: 'Rahul Sharma',
    email: 'employee@company.com',
    password: hash('Pass@123'),
    role: 'employee',
    department: 'Sales',
    designation: 'Sales Executive',
    managerId: 'mgr_001',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    userId: 'emp_002',
    name: 'Dilip Kumar',
    email: 'dilip@company.com',
    password: hash('Pass@123'),
    role: 'employee',
    department: 'Operations',
    designation: 'Program Associate',
    managerId: 'mgr_002',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    userId: 'emp_003',
    name: 'Neha Verma',
    email: 'employee2@company.com',
    password: hash('Pass@123'),
    role: 'employee',
    department: 'Support',
    designation: 'Support Specialist',
    managerId: 'mgr_001',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
];

const goalCycles = [
  {
    cycleId: 'cycle_2026',
    cycleName: 'Annual Goal Cycle 2026',
    year: 2026,
    goalSettingOpenDate: '2026-05-01',
    goalSettingCloseDate: '2026-05-31',
    q1OpenDate: '2026-07-01',
    q2OpenDate: '2026-10-01',
    q3OpenDate: '2027-01-01',
    q4OpenDate: '2027-03-01',
    status: 'active',
    createdBy: 'adm_001',
    createdAt: now,
    updatedAt: now,
  },
];

const goals = [
  {
    goalId: 'goal_001',
    employeeId: 'emp_001',
    managerId: 'mgr_001',
    cycleId: 'cycle_2026',
    thrustArea: 'Revenue Growth',
    title: 'Increase monthly sales revenue',
    description: 'Achieve higher sales revenue through new customer acquisition',
    uomType: 'Numeric',
    goalType: 'Min',
    target: 500000,
    weightage: 40,
    approvalStatus: 'approved',
    isLocked: true,
    isShared: false,
    sharedGoalId: null,
    primaryOwnerId: 'emp_001',
    managerComment: 'Approved',
    createdAt: now,
    updatedAt: now,
  },
  {
    goalId: 'goal_002',
    employeeId: 'emp_001',
    managerId: 'mgr_001',
    cycleId: 'cycle_2026',
    thrustArea: 'Process Improvement',
    title: 'Reduce customer response time',
    description: 'Reduce average customer response time for support tickets',
    uomType: 'Numeric',
    goalType: 'Max',
    target: 4,
    weightage: 30,
    approvalStatus: 'submitted',
    isLocked: false,
    isShared: false,
    sharedGoalId: null,
    primaryOwnerId: 'emp_001',
    managerComment: '',
    createdAt: now,
    updatedAt: now,
  },
  {
    goalId: 'goal_003',
    employeeId: 'emp_001',
    managerId: 'mgr_001',
    cycleId: 'cycle_2026',
    thrustArea: 'Pipeline',
    title: 'Improve conversion rate',
    description: 'Raise lead to closure conversion ratio',
    uomType: 'Percentage',
    goalType: 'Min',
    target: 22,
    weightage: 30,
    approvalStatus: 'submitted',
    isLocked: false,
    isShared: false,
    sharedGoalId: null,
    primaryOwnerId: 'emp_001',
    managerComment: '',
    createdAt: now,
    updatedAt: now,
  },
  {
    goalId: 'goal_004',
    employeeId: 'emp_002',
    managerId: 'mgr_002',
    cycleId: 'cycle_2026',
    thrustArea: 'Automation',
    title: 'Automate weekly project status reporting',
    description: 'Reduce manual consolidation effort for PMO reporting',
    uomType: 'Timeline',
    goalType: 'Timeline',
    target: '2026-09-30',
    weightage: 50,
    approvalStatus: 'approved',
    isLocked: true,
    isShared: false,
    sharedGoalId: null,
    primaryOwnerId: 'emp_002',
    managerComment: 'Approved for Q2 milestone',
    createdAt: now,
    updatedAt: now,
  },
  {
    goalId: 'goal_005',
    employeeId: 'emp_002',
    managerId: 'mgr_002',
    cycleId: 'cycle_2026',
    thrustArea: 'Quality',
    title: 'Zero major production incidents',
    description: 'Keep major incidents at zero for critical workflows',
    uomType: 'Zero-based',
    goalType: 'Zero',
    target: 0,
    weightage: 50,
    approvalStatus: 'approved',
    isLocked: true,
    isShared: false,
    sharedGoalId: null,
    primaryOwnerId: 'emp_002',
    managerComment: 'Approved',
    createdAt: now,
    updatedAt: now,
  },
];

const checkIns = [
  {
    checkInId: 'check_001',
    goalId: 'goal_001',
    employeeId: 'emp_001',
    managerId: 'mgr_001',
    quarter: 'Q1',
    plannedTarget: 500000,
    actualAchievement: 420000,
    progressScore: 84,
    status: 'On Track',
    employeeComment: 'Need stronger lead conversion in next cycle.',
    managerComment: 'Good momentum. Push enterprise accounts.',
    submittedAt: now,
    reviewedAt: now,
    createdAt: now,
  },
  {
    checkInId: 'check_002',
    goalId: 'goal_004',
    employeeId: 'emp_002',
    managerId: 'mgr_002',
    quarter: 'Q1',
    plannedTarget: '2026-09-30',
    actualAchievement: 1,
    progressScore: 100,
    status: 'On Track',
    employeeComment: 'Design and implementation started.',
    managerComment: 'Good progress, continue execution.',
    submittedAt: now,
    reviewedAt: now,
    createdAt: now,
  },
];

const sharedGoals = [
  {
    sharedGoalId: 'shared_001',
    title: 'Improve customer satisfaction score',
    description: 'Increase CSAT score for customer-facing teams',
    thrustArea: 'Customer Experience',
    target: 90,
    uomType: 'Percentage',
    goalType: 'Min',
    department: 'Support',
    assignedEmployees: ['emp_001', 'emp_003'],
    primaryOwnerId: 'emp_003',
    createdBy: 'mgr_001',
    createdAt: now,
    updatedAt: now,
  },
];

const notifications = [
  {
    notificationId: 'notif_001',
    recipientId: 'mgr_001',
    title: 'Goal Sheet Submitted',
    message: 'Rahul Sharma has submitted goals for approval',
    type: 'goal_submission',
    isRead: false,
    createdAt: now,
    relatedEntityId: 'goal_002',
  },
];

const auditLogs = [
  {
    logId: 'audit_001',
    userId: 'mgr_001',
    role: 'manager',
    action: 'Goal approved',
    entityType: 'Goal',
    entityId: 'goal_001',
    oldValue: { approvalStatus: 'submitted', isLocked: false },
    newValue: { approvalStatus: 'approved', isLocked: true },
    timestamp: now,
    remarks: 'Approved after review.',
  },
  {
    logId: 'audit_002',
    userId: 'adm_001',
    role: 'admin',
    action: 'Database reseeded',
    entityType: 'System',
    entityId: 'seed_2026_05',
    oldValue: {},
    newValue: { users: users.length, goals: goals.length, checkIns: checkIns.length },
    timestamp: now,
    remarks: 'Initial demo data reset and seeded.',
  },
];

async function run() {
  await mongoose.connect(MONGODB_URI);

  await Promise.all([
    UserModel.deleteMany({}),
    GoalModel.deleteMany({}),
    CheckInModel.deleteMany({}),
    GoalCycleModel.deleteMany({}),
    SharedGoalModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
    NotificationModel.deleteMany({}),
  ]);

  await Promise.all([
    UserModel.insertMany(users),
    GoalModel.insertMany(goals),
    CheckInModel.insertMany(checkIns),
    GoalCycleModel.insertMany(goalCycles),
    SharedGoalModel.insertMany(sharedGoals),
    AuditLogModel.insertMany(auditLogs),
    NotificationModel.insertMany(notifications),
  ]);

  console.log('Database reset complete.');
  console.log(`Users: ${users.length}`);
  console.log(`Goals: ${goals.length}`);
  console.log(`CheckIns: ${checkIns.length}`);
  console.log(`GoalCycles: ${goalCycles.length}`);
  console.log(`SharedGoals: ${sharedGoals.length}`);
  console.log(`AuditLogs: ${auditLogs.length}`);
  console.log(`Notifications: ${notifications.length}`);
  console.log('Sample users:');
  console.log('- admin@company.com / Pass@123');
  console.log('- manager@company.com / Pass@123');
  console.log('- manager2@company.com / Pass@123');
  console.log('- employee@company.com / Pass@123');
  console.log('- dilip@company.com / Pass@123');
  console.log('- employee2@company.com / Pass@123');

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Reset/seed failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch (_err) {
    // noop
  }
  process.exit(1);
});
