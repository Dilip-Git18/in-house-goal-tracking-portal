const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { Parser } = require('json2csv');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'hackathon-secret-key';
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

const nowIso = () => new Date().toISOString();

let users = [
  {
    userId: 'emp_001',
    name: 'Rahul Sharma',
    email: 'employee@company.com',
    password: bcrypt.hashSync('Pass@123', 8),
    role: 'employee',
    department: 'Sales',
    designation: 'Sales Executive',
    managerId: 'mgr_001',
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    userId: 'mgr_001',
    name: 'Priya Mehta',
    email: 'manager@company.com',
    password: bcrypt.hashSync('Pass@123', 8),
    role: 'manager',
    department: 'Sales',
    designation: 'Sales Manager',
    managerId: null,
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    userId: 'adm_001',
    name: 'HR Admin',
    email: 'admin@company.com',
    password: bcrypt.hashSync('Pass@123', 8),
    role: 'admin',
    department: 'HR',
    designation: 'HR Manager',
    managerId: null,
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

let goalCycles = [
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
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

let goals = [
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
    approvalStatus: 'submitted',
    isLocked: false,
    isShared: false,
    sharedGoalId: null,
    primaryOwnerId: 'emp_001',
    managerComment: '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
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
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

let checkIns = [];
let sharedGoals = [];
let notifications = [];
let auditLogs = [];

const flexibleSchema = new mongoose.Schema({}, { strict: false, versionKey: false });
const UserModel = mongoose.model('users', flexibleSchema, 'users');
const GoalModel = mongoose.model('goals', flexibleSchema, 'goals');
const CheckInModel = mongoose.model('checkins', flexibleSchema, 'checkins');
const GoalCycleModel = mongoose.model('goalcycles', flexibleSchema, 'goalcycles');
const SharedGoalModel = mongoose.model('sharedgoals', flexibleSchema, 'sharedgoals');
const AuditLogModel = mongoose.model('auditlogs', flexibleSchema, 'auditlogs');
const NotificationModel = mongoose.model('notifications', flexibleSchema, 'notifications');

function withoutMongoMeta(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const { _id, __v, ...rest } = doc;
  return rest;
}

async function replaceCollection(model, rows) {
  await model.deleteMany({});
  if (rows.length > 0) {
    await model.insertMany(rows, { ordered: false });
  }
}

async function syncToDatabase() {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) return;

  await Promise.all([
    replaceCollection(UserModel, users),
    replaceCollection(GoalModel, goals),
    replaceCollection(CheckInModel, checkIns),
    replaceCollection(GoalCycleModel, goalCycles),
    replaceCollection(SharedGoalModel, sharedGoals),
    replaceCollection(AuditLogModel, auditLogs),
    replaceCollection(NotificationModel, notifications),
  ]);
}

function scheduleSync() {
  if (!MONGODB_URI) return;
  syncToDatabase().catch((error) => {
    console.error('MongoDB sync failed:', error.message);
  });
}

async function loadOrSeed(model, seedRows) {
  const existing = await model.find({}).lean();
  if (existing.length > 0) {
    return existing.map(withoutMongoMeta);
  }

  if (seedRows.length > 0) {
    await model.insertMany(seedRows, { ordered: false });
  }
  return seedRows;
}

async function initializeDatabase() {
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI not provided, backend will run in memory mode.');
    return;
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  users = await loadOrSeed(UserModel, users);
  goals = await loadOrSeed(GoalModel, goals);
  checkIns = await loadOrSeed(CheckInModel, checkIns);
  goalCycles = await loadOrSeed(GoalCycleModel, goalCycles);
  sharedGoals = await loadOrSeed(SharedGoalModel, sharedGoals);
  auditLogs = await loadOrSeed(AuditLogModel, auditLogs);
  notifications = await loadOrSeed(NotificationModel, notifications);
}

const validUomTypes = ['Numeric', 'Percentage', 'Timeline', 'Zero-based'];
const validGoalTypes = ['Min', 'Max', 'Timeline', 'Zero'];
const validStatus = ['Not Started', 'On Track', 'Completed'];

function todayUtcDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseDateOnly(dateString) {
  if (!dateString) return null;
  return new Date(`${dateString}T00:00:00.000Z`);
}

function isWithinWindow(startDateString, endDateString) {
  const today = todayUtcDate();
  const start = parseDateOnly(startDateString);
  const end = parseDateOnly(endDateString);
  if (!start || !end) return false;
  return today >= start && today <= end;
}

function isGoalSettingWindowOpen(cycle) {
  return isWithinWindow(cycle?.goalSettingOpenDate, cycle?.goalSettingCloseDate);
}

function quarterOpenDate(cycle, quarter) {
  if (quarter === 'Q1') return parseDateOnly(cycle?.q1OpenDate);
  if (quarter === 'Q2') return parseDateOnly(cycle?.q2OpenDate);
  if (quarter === 'Q3') return parseDateOnly(cycle?.q3OpenDate);
  if (quarter === 'Q4') return parseDateOnly(cycle?.q4OpenDate);
  return null;
}

function isQuarterCheckInOpen(cycle, quarter) {
  const openDate = quarterOpenDate(cycle, quarter);
  if (!openDate) return false;
  return todayUtcDate() >= openDate;
}

function activeCycle() {
  const current = goalCycles.find((c) => c.status === 'active');
  return current || goalCycles[0];
}

function addAuditLog({ userId, role, action, entityType, entityId, oldValue, newValue, remarks }) {
  auditLogs.unshift({
    logId: uuidv4(),
    userId,
    role,
    action,
    entityType,
    entityId,
    oldValue,
    newValue,
    timestamp: nowIso(),
    remarks: remarks || '',
  });
  scheduleSync();
}

function checkWeightageRules(employeeId, cycleId, incoming = []) {
  const current = goals.filter((g) => g.employeeId === employeeId && g.cycleId === cycleId);
  const combined = [...current, ...incoming];
  if (combined.length > 8) {
    return 'Maximum 8 goals are allowed per employee';
  }
  if (combined.some((g) => Number(g.weightage) < 10)) {
    return 'Minimum weightage per goal must be 10%';
  }
  const total = combined.reduce((sum, g) => sum + Number(g.weightage || 0), 0);
  if (total > 100) {
    return 'Total goal weightage cannot exceed 100%';
  }
  return null;
}

function canSubmitGoalSheet(employeeId, cycleId) {
  const userGoals = goals.filter((g) => g.employeeId === employeeId && g.cycleId === cycleId);
  if (userGoals.length === 0) {
    return 'Add at least one goal before submit';
  }
  const total = userGoals.reduce((sum, g) => sum + Number(g.weightage || 0), 0);
  if (userGoals.length > 8) {
    return 'Maximum 8 goals are allowed per employee';
  }
  if (userGoals.some((g) => Number(g.weightage) < 10)) {
    return 'Minimum weightage per goal must be 10%';
  }
  if (total !== 100) {
    return 'Total goal weightage must be exactly 100% before submission';
  }
  return null;
}

function computeProgressScore(goal, actualAchievement, completionDate) {
  const target = Number(goal.target);
  const actual = Number(actualAchievement);

  if (goal.uomType === 'Timeline' || goal.goalType === 'Timeline') {
    if (!completionDate || !goal.target) return 0;
    const deadline = new Date(goal.target);
    const done = new Date(completionDate);
    return done <= deadline ? 100 : 50;
  }

  if (goal.uomType === 'Zero-based' || goal.goalType === 'Zero') {
    return actual === 0 ? 100 : 0;
  }

  if (goal.goalType === 'Max') {
    if (actual <= 0) return 0;
    return Math.max(0, Math.min(150, (target / actual) * 100));
  }

  if (target <= 0) return 0;
  return Math.max(0, Math.min(150, (actual / target) * 100));
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: role mismatch' });
    }
    return next();
  };
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: mongoose.connection?.readyState === 1 ? 'mongodb' : 'in-memory',
    dbState: mongoose.connection?.readyState ?? 0,
    timestamp: nowIso(),
  });
});

app.get('/', (_req, res) => {
  res.status(200).json({
    service: 'In-House Goal Setting & Tracking Portal API',
    status: 'running',
    health: '/api/health',
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { userId: user.userId, role: user.role, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '8h' },
  );

  return res.json({
    token,
    user: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      managerId: user.managerId,
    },
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = users.find((u) => u.userId === req.user.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  return res.json({
    user: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      managerId: user.managerId,
    },
  });
});

app.get('/api/employee/goals', authMiddleware, requireRole('employee'), (req, res) => {
  const cycle = activeCycle();
  const data = goals.filter((g) => g.employeeId === req.user.userId && g.cycleId === cycle.cycleId);
  const canEditGoals = isGoalSettingWindowOpen(cycle);
  res.json({
    goals: data,
    cycle,
    rules: {
      canEditGoals,
      goalSettingMessage: canEditGoals
        ? 'Goal setting window is open'
        : 'Goal setting window is closed for this cycle',
    },
  });
});

app.post('/api/employee/goals', authMiddleware, requireRole('employee'), (req, res) => {
  const cycle = activeCycle();
  const { thrustArea, title, description, uomType, goalType, target, weightage } = req.body;

  if (!isGoalSettingWindowOpen(cycle)) {
    return res.status(400).json({ message: 'Goal setting window is currently closed' });
  }

  if (!thrustArea || !title || !uomType || target === undefined || weightage === undefined) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  if (!validUomTypes.includes(uomType)) {
    return res.status(400).json({ message: 'Invalid unit of measurement type' });
  }

  if (!validGoalTypes.includes(goalType)) {
    return res.status(400).json({ message: 'Invalid goal type' });
  }

  const check = checkWeightageRules(req.user.userId, cycle.cycleId, [{ weightage }]);
  if (check) return res.status(400).json({ message: check });

  const employee = users.find((u) => u.userId === req.user.userId);

  const newGoal = {
    goalId: uuidv4(),
    employeeId: req.user.userId,
    managerId: employee.managerId,
    cycleId: cycle.cycleId,
    thrustArea,
    title,
    description: description || '',
    uomType,
    goalType,
    target,
    weightage: Number(weightage),
    approvalStatus: 'draft',
    isLocked: false,
    isShared: false,
    sharedGoalId: null,
    primaryOwnerId: req.user.userId,
    managerComment: '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  goals.push(newGoal);
  addAuditLog({
    userId: req.user.userId,
    role: req.user.role,
    action: 'Goal created',
    entityType: 'Goal',
    entityId: newGoal.goalId,
    oldValue: {},
    newValue: newGoal,
    remarks: 'Employee created draft goal',
  });

  return res.status(201).json({ goal: newGoal });
});

app.put('/api/employee/goals/:goalId', authMiddleware, requireRole('employee'), (req, res) => {
  const { goalId } = req.params;
  const goal = goals.find((g) => g.goalId === goalId && g.employeeId === req.user.userId);
  const cycle = activeCycle();

  if (!isGoalSettingWindowOpen(cycle)) {
    return res.status(400).json({ message: 'Goal editing is disabled outside goal-setting window' });
  }

  if (!goal) return res.status(404).json({ message: 'Goal not found' });
  if (goal.isLocked) return res.status(400).json({ message: 'Goal is locked by approval' });
  if (goal.isShared) {
    if (
      req.body.title !== undefined ||
      req.body.description !== undefined ||
      req.body.target !== undefined
    ) {
      return res.status(400).json({ message: 'For shared goals, title/description/target are read-only' });
    }
    if (req.body.weightage === undefined) {
      return res.status(400).json({ message: 'For shared goals, only weightage can be updated' });
    }
  }

  const before = { ...goal };

  const nextWeightage = req.body.weightage !== undefined ? Number(req.body.weightage) : goal.weightage;
  const siblingGoals = goals.filter(
    (g) => g.employeeId === req.user.userId && g.cycleId === goal.cycleId && g.goalId !== goal.goalId,
  );
  const total = siblingGoals.reduce((sum, g) => sum + Number(g.weightage || 0), 0) + nextWeightage;
  if (nextWeightage < 10) return res.status(400).json({ message: 'Minimum weightage per goal must be 10%' });
  if (total > 100) return res.status(400).json({ message: 'Total goal weightage cannot exceed 100%' });

  goal.title = goal.isShared ? goal.title : req.body.title ?? goal.title;
  goal.description = goal.isShared ? goal.description : req.body.description ?? goal.description;
  goal.target = goal.isShared ? goal.target : req.body.target ?? goal.target;
  goal.weightage = nextWeightage;
  goal.updatedAt = nowIso();

  addAuditLog({
    userId: req.user.userId,
    role: req.user.role,
    action: 'Goal updated',
    entityType: 'Goal',
    entityId: goal.goalId,
    oldValue: before,
    newValue: goal,
    remarks: 'Employee edited draft/rework goal',
  });

  return res.json({ goal });
});

app.post('/api/employee/goals/submit', authMiddleware, requireRole('employee'), (req, res) => {
  const cycle = activeCycle();

  if (!isGoalSettingWindowOpen(cycle)) {
    return res.status(400).json({ message: 'Goal submission is allowed only during goal-setting window' });
  }

  const validationMessage = canSubmitGoalSheet(req.user.userId, cycle.cycleId);
  if (validationMessage) return res.status(400).json({ message: validationMessage });

  const userGoals = goals.filter((g) => g.employeeId === req.user.userId && g.cycleId === cycle.cycleId);
  userGoals.forEach((g) => {
    g.approvalStatus = 'submitted';
    g.updatedAt = nowIso();
  });

  const manager = users.find((u) => u.userId === req.user.userId)?.managerId;
  notifications.unshift({
    notificationId: uuidv4(),
    recipientId: manager,
    title: 'Goal Sheet Submitted',
    message: `${req.user.name} has submitted goals for approval`,
    type: 'goal_submission',
    isRead: false,
    createdAt: nowIso(),
    relatedEntityId: userGoals[0]?.goalId || null,
  });

  addAuditLog({
    userId: req.user.userId,
    role: req.user.role,
    action: 'Goal sheet submitted',
    entityType: 'Goal',
    entityId: req.user.userId,
    oldValue: { status: 'draft/rework' },
    newValue: { status: 'submitted' },
    remarks: 'Submitted to manager for approval',
  });

  return res.json({ message: 'Goals submitted for manager approval' });
});

app.get('/api/employee/checkins', authMiddleware, requireRole('employee'), (req, res) => {
  const data = checkIns.filter((c) => c.employeeId === req.user.userId);
  return res.json({ checkIns: data });
});

app.post('/api/employee/checkins', authMiddleware, requireRole('employee'), (req, res) => {
  const { goalId, quarter, actualAchievement, status, employeeComment, completionDate } = req.body;
  const goal = goals.find((g) => g.goalId === goalId && g.employeeId === req.user.userId);
  const cycle = activeCycle();

  if (!goal) return res.status(404).json({ message: 'Goal not found' });
  if (!goal.isLocked) return res.status(400).json({ message: 'Check-in opens after manager approval lock' });
  if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) return res.status(400).json({ message: 'Invalid quarter' });
  if (!isQuarterCheckInOpen(cycle, quarter)) {
    return res.status(400).json({ message: `${quarter} check-in window is not open yet` });
  }
  if (!validStatus.includes(status)) return res.status(400).json({ message: 'Invalid progress status' });

  const existing = checkIns.find((c) => c.goalId === goalId && c.quarter === quarter);
  const score = Number(computeProgressScore(goal, actualAchievement, completionDate).toFixed(2));

  if (existing) {
    const before = { ...existing };
    existing.actualAchievement = actualAchievement;
    existing.progressScore = score;
    existing.status = status;
    existing.employeeComment = employeeComment || '';
    existing.submittedAt = nowIso();

    addAuditLog({
      userId: req.user.userId,
      role: req.user.role,
      action: 'Check-in updated',
      entityType: 'CheckIn',
      entityId: existing.checkInId,
      oldValue: before,
      newValue: existing,
      remarks: `${quarter} achievement updated by employee`,
    });

    return res.json({ checkIn: existing });
  }

  const record = {
    checkInId: uuidv4(),
    goalId,
    employeeId: req.user.userId,
    managerId: goal.managerId,
    quarter,
    plannedTarget: goal.target,
    actualAchievement,
    progressScore: score,
    status,
    employeeComment: employeeComment || '',
    managerComment: '',
    submittedAt: nowIso(),
    reviewedAt: null,
    createdAt: nowIso(),
  };

  checkIns.push(record);
  addAuditLog({
    userId: req.user.userId,
    role: req.user.role,
    action: 'Check-in created',
    entityType: 'CheckIn',
    entityId: record.checkInId,
    oldValue: {},
    newValue: record,
    remarks: `${quarter} achievement submitted`,
  });

  return res.status(201).json({ checkIn: record });
});

app.get('/api/manager/submissions', authMiddleware, requireRole('manager'), (req, res) => {
  const data = goals
    .filter((g) => g.managerId === req.user.userId && g.approvalStatus === 'submitted')
    .map((g) => {
      const employee = users.find((u) => u.userId === g.employeeId);
      return { ...g, employeeName: employee?.name || g.employeeId };
    });
  return res.json({ goals: data });
});

app.patch('/api/manager/goals/:goalId', authMiddleware, requireRole('manager'), (req, res) => {
  const { goalId } = req.params;
  const { target, weightage, action, managerComment } = req.body;
  const goal = goals.find((g) => g.goalId === goalId && g.managerId === req.user.userId);

  if (!goal) return res.status(404).json({ message: 'Goal not found' });
  if (goal.isLocked) return res.status(400).json({ message: 'Goal already approved and locked' });

  const before = { ...goal };

  if (target !== undefined) goal.target = target;
  if (weightage !== undefined) {
    const nextWeightage = Number(weightage);
    if (nextWeightage < 10) {
      return res.status(400).json({ message: 'Minimum weightage per goal must be 10%' });
    }

    const siblingTotal = goals
      .filter(
        (g) =>
          g.employeeId === goal.employeeId &&
          g.cycleId === goal.cycleId &&
          g.goalId !== goal.goalId,
      )
      .reduce((sum, g) => sum + Number(g.weightage || 0), 0);

    if (siblingTotal + nextWeightage > 100) {
      return res.status(400).json({ message: 'Total goal weightage cannot exceed 100%' });
    }

    goal.weightage = nextWeightage;
  }
  if (managerComment !== undefined) goal.managerComment = managerComment;

  if (action === 'approve') {
    goal.approvalStatus = 'approved';
    goal.isLocked = true;
  } else if (action === 'rework') {
    goal.approvalStatus = 'rework';
    goal.isLocked = false;
  }

  goal.updatedAt = nowIso();

  addAuditLog({
    userId: req.user.userId,
    role: req.user.role,
    action: `Goal ${action || 'updated'} by manager`,
    entityType: 'Goal',
    entityId: goal.goalId,
    oldValue: before,
    newValue: goal,
    remarks: managerComment || '',
  });

  return res.json({ goal });
});

app.get('/api/manager/checkins', authMiddleware, requireRole('manager'), (req, res) => {
  const teamCheckIns = checkIns.filter((c) => c.managerId === req.user.userId);
  const enriched = teamCheckIns.map((c) => {
    const emp = users.find((u) => u.userId === c.employeeId);
    const goal = goals.find((g) => g.goalId === c.goalId);
    return {
      ...c,
      employeeName: emp?.name || 'Unknown',
      goalTitle: goal?.title || 'Unknown',
    };
  });

  return res.json({ checkIns: enriched });
});

app.post('/api/manager/checkins/:checkInId/comment', authMiddleware, requireRole('manager'), (req, res) => {
  const { checkInId } = req.params;
  const { managerComment } = req.body;
  const checkIn = checkIns.find((c) => c.checkInId === checkInId && c.managerId === req.user.userId);

  if (!checkIn) return res.status(404).json({ message: 'Check-in not found' });

  const before = { ...checkIn };
  checkIn.managerComment = managerComment || '';
  checkIn.reviewedAt = nowIso();

  addAuditLog({
    userId: req.user.userId,
    role: req.user.role,
    action: 'Manager check-in comment added',
    entityType: 'CheckIn',
    entityId: checkIn.checkInId,
    oldValue: before,
    newValue: checkIn,
    remarks: 'Structured check-in feedback logged',
  });

  return res.json({ checkIn });
});

app.get('/api/admin/dashboard', authMiddleware, requireRole('admin'), (_req, res) => {
  const totalEmployees = users.filter((u) => u.role === 'employee').length;
  const totalManagers = users.filter((u) => u.role === 'manager').length;

  const quarterCompletion = ['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => {
    const totalPossible = goals.filter((g) => g.approvalStatus === 'approved').length;
    const done = checkIns.filter((c) => c.quarter === quarter).length;
    return {
      quarter,
      completed: done,
      pending: Math.max(totalPossible - done, 0),
      percentage: totalPossible > 0 ? Number(((done / totalPossible) * 100).toFixed(2)) : 0,
    };
  });

  const statusCount = goals.reduce(
    (acc, g) => {
      acc[g.approvalStatus] = (acc[g.approvalStatus] || 0) + 1;
      return acc;
    },
    { draft: 0, submitted: 0, approved: 0, rework: 0 },
  );

  res.json({
    metrics: {
      totalEmployees,
      totalManagers,
      totalGoals: goals.length,
      totalCheckIns: checkIns.length,
      unlockedGoals: goals.filter((g) => !g.isLocked && g.approvalStatus === 'approved').length,
    },
    statusCount,
    quarterCompletion,
    recentAuditLogs: auditLogs.slice(0, 20),
  });
});

app.post('/api/admin/goals/:goalId/unlock', authMiddleware, requireRole('admin'), (req, res) => {
  const { goalId } = req.params;
  const { remarks } = req.body;
  const goal = goals.find((g) => g.goalId === goalId);

  if (!goal) return res.status(404).json({ message: 'Goal not found' });

  const before = { ...goal };
  goal.isLocked = false;
  goal.updatedAt = nowIso();

  addAuditLog({
    userId: req.user.userId,
    role: req.user.role,
    action: 'Goal unlocked',
    entityType: 'Goal',
    entityId: goal.goalId,
    oldValue: before,
    newValue: goal,
    remarks: remarks || 'Unlocked for exception handling',
  });

  return res.json({ goal });
});

app.post('/api/admin/shared-goals/push', authMiddleware, requireRole('admin', 'manager'), (req, res) => {
  const {
    title,
    description,
    thrustArea,
    target,
    uomType,
    goalType,
    department,
    assignedEmployees = [],
    primaryOwnerId,
  } = req.body;

  if (!title || !department || !target || assignedEmployees.length === 0) {
    return res.status(400).json({ message: 'Please provide all required shared goal fields' });
  }

  const sharedGoal = {
    sharedGoalId: uuidv4(),
    title,
    description: description || '',
    thrustArea,
    target,
    uomType,
    goalType,
    department,
    assignedEmployees,
    primaryOwnerId,
    createdBy: req.user.userId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  sharedGoals.push(sharedGoal);

  assignedEmployees.forEach((employeeId) => {
    const employee = users.find((u) => u.userId === employeeId);
    if (!employee) return;

    const employeeGoal = {
      goalId: uuidv4(),
      employeeId,
      managerId: employee.managerId,
      cycleId: activeCycle().cycleId,
      thrustArea: thrustArea || 'Shared KPI',
      title,
      description: description || '',
      uomType,
      goalType,
      target,
      weightage: 10,
      approvalStatus: 'draft',
      isLocked: false,
      isShared: true,
      sharedGoalId: sharedGoal.sharedGoalId,
      primaryOwnerId: primaryOwnerId || employeeId,
      managerComment: 'Shared KPI pushed by leadership',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    goals.push(employeeGoal);
  });

  addAuditLog({
    userId: req.user.userId,
    role: req.user.role,
    action: 'Shared goal pushed',
    entityType: 'SharedGoal',
    entityId: sharedGoal.sharedGoalId,
    oldValue: {},
    newValue: sharedGoal,
    remarks: 'Shared KPI assigned to multiple employees',
  });

  return res.status(201).json({ sharedGoal });
});

app.get('/api/admin/audit-logs', authMiddleware, requireRole('admin'), (_req, res) => {
  return res.json({ auditLogs });
});

app.get('/api/admin/users', authMiddleware, requireRole('admin'), (_req, res) => {
  return res.json({ users: users.map((u) => ({ ...u, password: undefined })) });
});

app.post('/api/admin/users', authMiddleware, requireRole('admin'), (req, res) => {
  const { name, email, password, role, department, designation, managerId } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'name, email, password and role are required' });
  }

  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ message: 'User with this email already exists' });
  }

  const user = {
    userId: uuidv4(),
    name,
    email,
    password: bcrypt.hashSync(password, 8),
    role,
    department: department || '',
    designation: designation || '',
    managerId: managerId || null,
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  users.push(user);
  addAuditLog({
    userId: req.user.userId,
    role: req.user.role,
    action: 'User created',
    entityType: 'User',
    entityId: user.userId,
    oldValue: {},
    newValue: { ...user, password: undefined },
    remarks: 'Admin created user account',
  });

  return res.status(201).json({ user: { ...user, password: undefined } });
});

app.get('/api/admin/reports/achievement.csv', authMiddleware, requireRole('admin'), (_req, res) => {
  const rows = checkIns.map((c) => {
    const employee = users.find((u) => u.userId === c.employeeId);
    const goal = goals.find((g) => g.goalId === c.goalId);

    return {
      employee: employee?.name || c.employeeId,
      managerId: c.managerId,
      quarter: c.quarter,
      goalTitle: goal?.title || c.goalId,
      plannedTarget: c.plannedTarget,
      actualAchievement: c.actualAchievement,
      progressScore: c.progressScore,
      status: c.status,
      employeeComment: c.employeeComment,
      managerComment: c.managerComment,
    };
  });

  const parser = new Parser();
  const csv = parser.parse(rows);
  res.header('Content-Type', 'text/csv');
  res.attachment('achievement-report.csv');
  return res.send(csv);
});

app.get('/api/admin/reports/achievement.xlsx', authMiddleware, requireRole('admin'), (_req, res) => {
  const rows = checkIns.map((c) => {
    const employee = users.find((u) => u.userId === c.employeeId);
    const goal = goals.find((g) => g.goalId === c.goalId);
    return {
      Employee: employee?.name || c.employeeId,
      Quarter: c.quarter,
      Goal: goal?.title || c.goalId,
      PlannedTarget: c.plannedTarget,
      ActualAchievement: c.actualAchievement,
      ProgressScore: c.progressScore,
      Status: c.status,
      EmployeeComment: c.employeeComment,
      ManagerComment: c.managerComment,
    };
  });

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Achievements');
  const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename=achievement-report.xlsx');
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );

  return res.send(output);
});

app.get('/api/data/snapshot', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admin can view full snapshot' });
  return res.json({ users, goals, checkIns, goalCycles, sharedGoals, auditLogs, notifications });
});

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    requestedPath: req.originalUrl,
    health: '/api/health',
  });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Goal Tracking API running on http://localhost:${PORT}`);
      console.log('Demo credentials: employee@company.com / manager@company.com / admin@company.com');
      console.log('Password for all: Pass@123');
    });
  })
  .catch((error) => {
    console.error('Failed to initialize backend:', error.message);
    process.exit(1);
  });
