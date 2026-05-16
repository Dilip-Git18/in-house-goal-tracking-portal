import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const initialForm = {
  thrustArea: '',
  title: '',
  description: '',
  uomType: 'Numeric',
  goalType: 'Min',
  target: '',
  weightage: '',
};

function EmployeeDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const [goalForm, setGoalForm] = useState(initialForm);
  const [goals, setGoals] = useState([]);
  const [rules, setRules] = useState({ canEditGoals: true, goalSettingMessage: '' });
  const [checkIns, setCheckIns] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [checkInForm, setCheckInForm] = useState({
    goalId: '',
    quarter: 'Q1',
    actualAchievement: '',
    status: 'On Track',
    employeeComment: '',
  });

  const loadData = async () => {
    try {
      const [goalRes, checkInRes] = await Promise.all([
        api.get('/employee/goals'),
        api.get('/employee/checkins'),
      ]);
      setGoals(goalRes.data.goals);
      setRules(goalRes.data.rules || { canEditGoals: true, goalSettingMessage: '' });
      setCheckIns(checkInRes.data.checkIns);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load employee dashboard');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalWeightage = useMemo(
    () => goals.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0),
    [goals],
  );

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  const createGoal = async (e) => {
    e.preventDefault();
    if (!rules.canEditGoals) {
      setError(rules.goalSettingMessage || 'Goal setting window is closed');
      return;
    }
    setError('');
    setMessage('');
    try {
      await api.post('/employee/goals', {
        ...goalForm,
        target: goalForm.uomType === 'Timeline' ? goalForm.target : Number(goalForm.target),
        weightage: Number(goalForm.weightage),
      });
      setGoalForm(initialForm);
      setMessage('Goal created in draft mode');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create goal');
    }
  };

  const submitSheet = async () => {
    if (!rules.canEditGoals) {
      setError(rules.goalSettingMessage || 'Goal submission window is closed');
      return;
    }
    setError('');
    setMessage('');
    try {
      await api.post('/employee/goals/submit');
      setMessage('Goal sheet submitted to manager');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit goal sheet');
    }
  };

  const updateCheckIn = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/employee/checkins', {
        ...checkInForm,
        actualAchievement: Number(checkInForm.actualAchievement),
      });
      setMessage('Quarterly achievement saved');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit check-in');
    }
  };

  const editGoal = async (goal) => {
    if (!rules.canEditGoals) {
      setError(rules.goalSettingMessage || 'Goal editing window is closed');
      return;
    }

    let payload;
    if (goal.isShared) {
      const weightageInput = window.prompt('Shared goal: only weightage can be edited', String(goal.weightage));
      if (!weightageInput) return;
      payload = { weightage: Number(weightageInput) };
    } else {
      const title = window.prompt('Edit goal title', goal.title);
      if (!title) return;
      const target = window.prompt('Edit target', String(goal.target));
      const weightage = window.prompt('Edit weightage', String(goal.weightage));
      payload = {
        title,
        target: goal.uomType === 'Timeline' ? target : Number(target),
        weightage: Number(weightage),
      };
    }

    try {
      await api.put(`/employee/goals/${goal.goalId}`, payload);
      setMessage('Goal updated successfully');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update goal');
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <p className="kicker">Employee Dashboard</p>
          <h2>{user.name}</h2>
        </div>
        <button className="ghost" type="button" onClick={logout}>
          Logout
        </button>
      </header>

      {message ? <p className="ok">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <section className="panel">
        <h3>Create Goal</h3>
        {!rules.canEditGoals ? <p className="error">{rules.goalSettingMessage}</p> : null}
        <form className="grid-form two-col" onSubmit={createGoal}>
          <label>
            Thrust Area
            <input
              value={goalForm.thrustArea}
              onChange={(e) => setGoalForm((p) => ({ ...p, thrustArea: e.target.value }))}
              required
            />
          </label>
          <label>
            Goal Title
            <input
              value={goalForm.title}
              onChange={(e) => setGoalForm((p) => ({ ...p, title: e.target.value }))}
              required
            />
          </label>
          <label className="full">
            Description
            <textarea
              value={goalForm.description}
              onChange={(e) => setGoalForm((p) => ({ ...p, description: e.target.value }))}
            />
          </label>
          <label>
            UoM Type
            <select
              value={goalForm.uomType}
              onChange={(e) => setGoalForm((p) => ({ ...p, uomType: e.target.value }))}
            >
              <option>Numeric</option>
              <option>Percentage</option>
              <option>Timeline</option>
              <option>Zero-based</option>
            </select>
          </label>
          <label>
            Goal Type
            <select
              value={goalForm.goalType}
              onChange={(e) => setGoalForm((p) => ({ ...p, goalType: e.target.value }))}
            >
              <option>Min</option>
              <option>Max</option>
              <option>Timeline</option>
              <option>Zero</option>
            </select>
          </label>
          <label>
            Target
            <input
              type={goalForm.uomType === 'Timeline' ? 'date' : 'number'}
              value={goalForm.target}
              onChange={(e) => setGoalForm((p) => ({ ...p, target: e.target.value }))}
              required
            />
          </label>
          <label>
            Weightage %
            <input
              type="number"
              value={goalForm.weightage}
              onChange={(e) => setGoalForm((p) => ({ ...p, weightage: e.target.value }))}
              required
              min="10"
            />
          </label>

          <button className="primary" type="submit">
            Add Draft Goal
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="row-between">
          <h3>My Goals</h3>
          <button className="primary" type="button" onClick={submitSheet} disabled={!rules.canEditGoals}>
            Submit Goal Sheet
          </button>
        </div>
        <p className="subtext">
          Total weightage: <strong>{totalWeightage}%</strong> (must be exactly 100% before submit)
        </p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>UoM</th>
                <th>Type</th>
                <th>Target</th>
                <th>Weightage</th>
                <th>Status</th>
                <th>Locked</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((goal) => (
                <tr key={goal.goalId}>
                  <td>{goal.title}</td>
                  <td>{goal.uomType}</td>
                  <td>{goal.goalType}</td>
                  <td>{String(goal.target)}</td>
                  <td>{goal.weightage}%</td>
                  <td>{goal.approvalStatus}</td>
                  <td>{goal.isLocked ? 'Yes' : 'No'}</td>
                  <td>
                    {!goal.isLocked ? (
                      <button className="ghost" type="button" onClick={() => editGoal(goal)}>
                        {goal.isShared ? 'Edit Weightage' : 'Edit'}
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>Quarterly Achievement Update</h3>
        <form className="grid-form two-col" onSubmit={updateCheckIn}>
          <label>
            Goal
            <select
              value={checkInForm.goalId}
              onChange={(e) => setCheckInForm((p) => ({ ...p, goalId: e.target.value }))}
              required
            >
              <option value="">Select</option>
              {goals
                .filter((goal) => goal.isLocked)
                .map((goal) => (
                  <option key={goal.goalId} value={goal.goalId}>
                    {goal.title}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Quarter
            <select
              value={checkInForm.quarter}
              onChange={(e) => setCheckInForm((p) => ({ ...p, quarter: e.target.value }))}
            >
              <option>Q1</option>
              <option>Q2</option>
              <option>Q3</option>
              <option>Q4</option>
            </select>
          </label>
          <label>
            Actual Achievement
            <input
              type="number"
              value={checkInForm.actualAchievement}
              onChange={(e) => setCheckInForm((p) => ({ ...p, actualAchievement: e.target.value }))}
              required
            />
          </label>
          <label>
            Status
            <select
              value={checkInForm.status}
              onChange={(e) => setCheckInForm((p) => ({ ...p, status: e.target.value }))}
            >
              <option>Not Started</option>
              <option>On Track</option>
              <option>Completed</option>
            </select>
          </label>
          <label className="full">
            Employee Comment
            <textarea
              value={checkInForm.employeeComment}
              onChange={(e) => setCheckInForm((p) => ({ ...p, employeeComment: e.target.value }))}
            />
          </label>
          <button className="primary" type="submit">
            Save Check-In
          </button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Quarter</th>
                <th>Goal ID</th>
                <th>Planned</th>
                <th>Actual</th>
                <th>Score</th>
                <th>Status</th>
                <th>Manager Comment</th>
              </tr>
            </thead>
            <tbody>
              {checkIns.map((item) => (
                <tr key={item.checkInId}>
                  <td>{item.quarter}</td>
                  <td>{item.goalId.slice(0, 8)}</td>
                  <td>{item.plannedTarget}</td>
                  <td>{item.actualAchievement}</td>
                  <td>{item.progressScore}%</td>
                  <td>{item.status}</td>
                  <td>{item.managerComment || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default EmployeeDashboard;
