import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import NotificationCenter from '../components/NotificationCenter';
import Toast from '../components/Toast';

const initialForm = {
  thrustArea: '',
  title: '',
  description: '',
  uomType: 'Numeric',
  goalType: 'Min',
  target: '',
  weightage: '',
};

const smartSuggestions = {
  sales: {
    thrustArea: 'Revenue Growth',
    title: 'Improve qualified pipeline conversion',
    description: 'Build a healthier sales funnel by focusing on lead qualification and opportunity progression.',
    uomType: 'Percentage',
    goalType: 'Max',
    target: '20',
    weightage: '20',
  },
  support: {
    thrustArea: 'Customer Support',
    title: 'Reduce average ticket resolution time',
    description: 'Strengthen response quality and handling speed to improve customer satisfaction.',
    uomType: 'Numeric',
    goalType: 'Min',
    target: '4',
    weightage: '20',
  },
  engineering: {
    thrustArea: 'Delivery Excellence',
    title: 'Improve sprint delivery predictability',
    description: 'Deliver planned sprint commitments consistently while reducing unplanned spillover work.',
    uomType: 'Percentage',
    goalType: 'Max',
    target: '95',
    weightage: '20',
  },
  hr: {
    thrustArea: 'Employee Experience',
    title: 'Improve onboarding completion quality',
    description: 'Create a smoother onboarding experience with faster completion of required actions and feedback.',
    uomType: 'Percentage',
    goalType: 'Max',
    target: '98',
    weightage: '20',
  },
  default: {
    thrustArea: 'Operational Excellence',
    title: 'Strengthen role-based delivery outcomes',
    description: 'Create a measurable goal that improves accountability, consistency, and performance quality.',
    uomType: 'Percentage',
    goalType: 'Max',
    target: '90',
    weightage: '20',
  },
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
  const [loading, setLoading] = useState(true);
  const [checkInForm, setCheckInForm] = useState({
    goalId: '',
    quarter: 'Q1',
    actualAchievement: '',
    status: 'On Track',
    employeeComment: '',
  });
  const [editGoalModal, setEditGoalModal] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [goalRes, checkInRes] = await Promise.all([
        api.get('/employee/goals'),
        api.get('/employee/checkins'),
      ]);
      setGoals(goalRes.data.goals || []);
      setRules(goalRes.data.rules || { canEditGoals: true, goalSettingMessage: '' });
      setCheckIns(checkInRes.data.checkIns || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load employee dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!message && !error) return undefined;
    const timer = window.setTimeout(() => {
      setMessage('');
      setError('');
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [message, error]);

  const totalWeightage = useMemo(
    () => goals.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0),
    [goals],
  );

  const lockedGoals = goals.filter((goal) => goal.isLocked).length;
  const openGoals = goals.length - lockedGoals;
  const departmentKey = String(user?.department || '').toLowerCase();
  const suggestionTemplate = smartSuggestions[departmentKey] || smartSuggestions.default;

  const badgeClass = (value) => `status-chip status-${String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  const applySmartSuggestion = () => {
    if (!rules.canEditGoals) {
      setError(rules.goalSettingMessage || 'Goal setting window is closed');
      return;
    }

    setGoalForm((current) => ({
      ...current,
      ...suggestionTemplate,
    }));
    setMessage(`Smart suggestion applied for ${user?.department || 'your department'}`);
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

  const openEditModal = (goal) => {
    setEditGoalModal({
      goal,
      title: goal.title,
      target: goal.target,
      weightage: goal.weightage,
    });
  };

  const saveEditedGoal = async (e) => {
    e.preventDefault();
    if (!rules.canEditGoals) {
      setError(rules.goalSettingMessage || 'Goal editing window is closed');
      return;
    }

    if (!editGoalModal) return;

    try {
      const payload = editGoalModal.goal.isShared
        ? { weightage: Number(editGoalModal.weightage) }
        : {
            title: editGoalModal.title,
            target: editGoalModal.goal.uomType === 'Timeline' ? editGoalModal.target : Number(editGoalModal.target),
            weightage: Number(editGoalModal.weightage),
          };

      await api.put(`/employee/goals/${editGoalModal.goal.goalId}`, payload);
      setMessage('Goal updated successfully');
      setEditGoalModal(null);
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
        <div className="action-row">
          <NotificationCenter />
          <button className="ghost" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {message ? (
        <div className="toast-anchor">
          <Toast tone="success" title="Success" message={message} onClose={() => setMessage('')} />
        </div>
      ) : null}
      {error ? (
        <div className="toast-anchor">
          <Toast tone="error" title="Action failed" message={error} onClose={() => setError('')} />
        </div>
      ) : null}

      {editGoalModal ? (
        <Modal
          kicker={editGoalModal.goal.isShared ? 'Edit Shared Goal' : 'Edit Goal'}
          title={editGoalModal.goal.title}
          description={editGoalModal.goal.isShared ? 'Only weightage can be changed for shared goals.' : 'Update the editable draft goal fields and keep the weightage within policy.'}
          onClose={() => setEditGoalModal(null)}
          className="modal-card-wide"
        >
          <form className="grid-form two-col" onSubmit={saveEditedGoal}>
            {editGoalModal.goal.isShared ? (
              <div className="full modal-multiselect">
                <p className="field-label">Shared Goal</p>
                <p className="section-help">Title, target, and description remain locked for shared KPIs.</p>
              </div>
            ) : (
              <>
                <label className="full">
                  Goal Title
                  <input
                    value={editGoalModal.title}
                    onChange={(event) => setEditGoalModal((current) => ({ ...current, title: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Target
                  <input
                    type={editGoalModal.goal.uomType === 'Timeline' ? 'date' : 'number'}
                    value={editGoalModal.target}
                    onChange={(event) => setEditGoalModal((current) => ({ ...current, target: event.target.value }))}
                    required
                  />
                </label>
              </>
            )}
            <label>
              Weightage %
              <input
                type="number"
                min="10"
                value={editGoalModal.weightage}
                onChange={(event) => setEditGoalModal((current) => ({ ...current, weightage: event.target.value }))}
                required
              />
            </label>
            <div className="full button-row-spread">
              <button className="ghost" type="button" onClick={() => setEditGoalModal(null)}>
                Cancel
              </button>
              <button className="primary" type="submit">
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      <section className="panel panel-compact">
        <div className="section-heading">
          <p className="kicker">Workspace Overview</p>
          <h3>Employee activity at a glance</h3>
          <p className="section-help">A concise view of draft goals, locked goals, and submitted quarterly updates.</p>
        </div>
        <div className="metrics-grid metrics-grid-compact">
          <article>
            <p>Total Goals</p>
            <h4>{goals.length}</h4>
          </article>
          <article>
            <p>Locked Goals</p>
            <h4>{lockedGoals}</h4>
          </article>
          <article>
            <p>Open Goals</p>
            <h4>{openGoals}</h4>
          </article>
          <article>
            <p>Check-Ins</p>
            <h4>{checkIns.length}</h4>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading-row">
          <div className="section-heading-inline">
            <p className="kicker">Bonus Features</p>
            <h3>Smart goal suggestion</h3>
            <p className="section-help">Use the department-aware suggestion to draft a professional goal faster.</p>
          </div>
          <button className="ghost button-lg" type="button" onClick={applySmartSuggestion}>
            Smart Goal Suggestion
          </button>
        </div>
        <div className="demo-badge">Bonus Feature</div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <p className="kicker">Goal Planning</p>
          <h3>Create Goal</h3>
          <p className="section-help">Use clear, measurable goals with balanced weightage across the goal sheet.</p>
        </div>
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
        <div className="section-heading section-heading-row">
          <div>
            <p className="kicker">Goal Sheet</p>
            <h3>My Goals</h3>
            <p className="section-help">Draft goals remain editable until submission and then lock after approval.</p>
          </div>
          <button className="primary button-lg" type="button" onClick={submitSheet} disabled={!rules.canEditGoals}>
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
              {loading ? (
                <tr>
                  <td colSpan="8">
                    <div className="table-empty table-loading">Loading goals and workflow status...</div>
                  </td>
                </tr>
              ) : goals.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="table-empty">
                      <strong>No goals yet.</strong>
                      <span>Create your first draft goal to begin the cycle.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                goals.map((goal) => (
                  <tr key={goal.goalId}>
                    <td>{goal.title}</td>
                    <td>{goal.uomType}</td>
                    <td>{goal.goalType}</td>
                    <td>{String(goal.target)}</td>
                    <td>{goal.weightage}%</td>
                    <td><span className={badgeClass(goal.approvalStatus)}>{goal.approvalStatus}</span></td>
                    <td><span className={goal.isLocked ? 'status-chip status-locked' : 'status-chip status-open'}>{goal.isLocked ? 'Locked' : 'Open'}</span></td>
                    <td>
                      {!goal.isLocked ? (
                        <button className="ghost button-sm" type="button" onClick={() => openEditModal(goal)}>
                          {goal.isShared ? 'Edit Weightage' : 'Edit'}
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <p className="kicker">Check-Ins</p>
          <h3>Quarterly Achievement Update</h3>
          <p className="section-help">Enter actuals during the quarter window and document brief review notes for your manager.</p>
        </div>
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
              {loading ? (
                <tr>
                  <td colSpan="7">
                    <div className="table-empty table-loading">Loading check-ins...</div>
                  </td>
                </tr>
              ) : checkIns.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="table-empty">
                      <strong>No quarterly check-ins yet.</strong>
                      <span>Submit a locked goal and add Q1 to Q4 updates when the window opens.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                checkIns.map((item) => (
                  <tr key={item.checkInId}>
                    <td>{item.quarter}</td>
                    <td>{item.goalId.slice(0, 8)}</td>
                    <td>{item.plannedTarget}</td>
                    <td>{item.actualAchievement}</td>
                    <td><span className="status-chip status-primary">{item.progressScore}%</span></td>
                    <td><span className={badgeClass(item.status)}>{item.status}</span></td>
                    <td>{item.managerComment || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default EmployeeDashboard;
