import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Toast from '../components/Toast';

function ManagerDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const [submissions, setSubmissions] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [goalRes, checkInRes] = await Promise.all([
        api.get('/manager/submissions'),
        api.get('/manager/checkins'),
      ]);
      setSubmissions(goalRes.data.goals);
      setCheckIns(checkInRes.data.checkIns);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load manager dashboard');
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

  const badgeClass = (value) => `status-chip status-${String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  const processGoal = async (goalId, action) => {
    const managerComment = window.prompt(`Add manager comment for ${action}`) || '';
    const targetInput = window.prompt('Optional: edit target (blank to keep same)');
    const weightageInput = window.prompt('Optional: edit weightage (blank to keep same)');

    try {
      await api.patch(`/manager/goals/${goalId}`, {
        action,
        managerComment,
        target: targetInput ? Number(targetInput) : undefined,
        weightage: weightageInput ? Number(weightageInput) : undefined,
      });
      setMessage(`Goal ${action}d successfully`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to process goal');
    }
  };

  const addCheckInComment = async (checkInId) => {
    const managerComment = window.prompt('Add structured check-in comment') || '';
    try {
      await api.post(`/manager/checkins/${checkInId}/comment`, { managerComment });
      setMessage('Check-in comment saved');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add manager comment');
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <p className="kicker">Manager Dashboard</p>
          <h2>{user.name}</h2>
        </div>
        <button className="ghost" type="button" onClick={logout}>
          Logout
        </button>
      </header>

      {message ? <p className="ok">{message}</p> : null}
      {message ? (
        <div className="toast-anchor"><Toast tone="success" title="Success" message={message} onClose={() => setMessage('')} /></div>
      ) : null}
      {error ? (
        <div className="toast-anchor"><Toast tone="error" title="Action failed" message={error} onClose={() => setError('')} /></div>
      ) : null}

      <section className="panel">
        <div className="section-heading">
          <p className="kicker">Approvals</p>
          <h3>Pending Goal Approvals</h3>
          <p className="section-help">Review submitted goals, adjust target or weightage, and approve or rework with a single action.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Title</th>
                <th>Target</th>
                <th>Weightage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5"><div className="table-empty table-loading">Loading pending approvals...</div></td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="table-empty">
                      <strong>No pending goals.</strong>
                      <span>Once employees submit goals, they will appear here for review.</span>
                    </div>
                  </td>
                </tr>
              ) : submissions.map((goal) => (
                <tr key={goal.goalId}>
                  <td>{goal.employeeName || goal.employeeId}</td>
                  <td>{goal.title}</td>
                  <td>{String(goal.target)}</td>
                  <td><span className="status-chip status-primary">{goal.weightage}%</span></td>
                  <td>
                    <div className="action-row">
                      <button type="button" className="approve button-sm" onClick={() => processGoal(goal.goalId, 'approve')}>
                        Approve
                      </button>
                      <button type="button" className="rework button-sm" onClick={() => processGoal(goal.goalId, 'rework')}>
                        Return Rework
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <p className="kicker">Check-Ins</p>
          <h3>Quarterly Check-In Module</h3>
          <p className="section-help">Compare planned target versus actual achievement and keep a clean, structured manager note.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Goal</th>
                <th>Quarter</th>
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
                  <td colSpan="8"><div className="table-empty table-loading">Loading check-ins...</div></td>
                </tr>
              ) : checkIns.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="table-empty">
                      <strong>No check-ins available.</strong>
                      <span>As employees submit quarterly updates, manager comments will appear here.</span>
                    </div>
                  </td>
                </tr>
              ) : checkIns.map((item) => (
                <tr key={item.checkInId}>
                  <td>{item.employeeName}</td>
                  <td>{item.goalTitle}</td>
                  <td>{item.quarter}</td>
                  <td>{item.plannedTarget}</td>
                  <td>{item.actualAchievement}</td>
                  <td><span className="status-chip status-primary">{item.progressScore}%</span></td>
                  <td><span className={badgeClass(item.status)}>{item.status}</span></td>
                  <td>
                    <button type="button" className="ghost button-sm" onClick={() => addCheckInComment(item.checkInId)}>
                      {item.managerComment ? 'Edit Comment' : 'Add Comment'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default ManagerDashboard;
