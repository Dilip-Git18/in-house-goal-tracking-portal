import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function ManagerDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const [submissions, setSubmissions] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
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
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      {error ? <p className="error">{error}</p> : null}

      <section className="panel">
        <h3>Pending Goal Approvals</h3>
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
              {submissions.map((goal) => (
                <tr key={goal.goalId}>
                  <td>{goal.employeeName || goal.employeeId}</td>
                  <td>{goal.title}</td>
                  <td>{String(goal.target)}</td>
                  <td>{goal.weightage}%</td>
                  <td>
                    <div className="action-row">
                      <button type="button" className="approve" onClick={() => processGoal(goal.goalId, 'approve')}>
                        Approve
                      </button>
                      <button type="button" className="rework" onClick={() => processGoal(goal.goalId, 'rework')}>
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
        <h3>Quarterly Check-In Module</h3>
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
              {checkIns.map((item) => (
                <tr key={item.checkInId}>
                  <td>{item.employeeName}</td>
                  <td>{item.goalTitle}</td>
                  <td>{item.quarter}</td>
                  <td>{item.plannedTarget}</td>
                  <td>{item.actualAchievement}</td>
                  <td>{item.progressScore}%</td>
                  <td>{item.status}</td>
                  <td>
                    <button type="button" className="ghost" onClick={() => addCheckInComment(item.checkInId)}>
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
