import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import NotificationCenter from '../components/NotificationCenter';
import Toast from '../components/Toast';

function ManagerDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const [submissions, setSubmissions] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [goalActionModal, setGoalActionModal] = useState(null);
  const [checkInModal, setCheckInModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [goalRes, checkInRes] = await Promise.all([
        api.get('/manager/submissions'),
        api.get('/manager/checkins'),
      ]);
      setSubmissions(goalRes.data.goals || []);
      setCheckIns(checkInRes.data.checkIns || []);
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

  const approvalCount = useMemo(() => submissions.length, [submissions]);
  const reviewCount = useMemo(() => checkIns.length, [checkIns]);

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  const openGoalModal = (goal, action) => {
    setGoalActionModal({
      goal,
      action,
      target: goal.target,
      weightage: goal.weightage,
      managerComment: '',
    });
  };

  const submitGoalAction = async (event) => {
    event.preventDefault();
    if (!goalActionModal) return;

    if (goalActionModal.action === 'rework' && !goalActionModal.managerComment.trim()) {
      setError('A rework comment is required');
      return;
    }

    try {
      await api.patch(`/manager/goals/${goalActionModal.goal.goalId}`, {
        action: goalActionModal.action,
        target: goalActionModal.target === '' ? undefined : Number(goalActionModal.target),
        weightage: goalActionModal.weightage === '' ? undefined : Number(goalActionModal.weightage),
        managerComment: goalActionModal.managerComment.trim(),
      });
      setMessage(goalActionModal.action === 'approve' ? 'Goal approved successfully' : 'Returned for rework');
      setGoalActionModal(null);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to process goal');
    }
  };

  const openDeleteModal = (goal) => setDeleteTarget(goal);

  const performDelete = async (event) => {
    event.preventDefault();
    if (!deleteTarget) return;

    try {
      await api.delete(`/manager/goals/${deleteTarget.goalId}`);
      setMessage('Pending goal removed');
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to remove pending goal');
    }
  };

  const openCheckInCommentModal = (item) => {
    setCheckInModal({
      checkIn: item,
      managerComment: item.managerComment || '',
    });
  };

  const saveCheckInComment = async (event) => {
    event.preventDefault();
    if (!checkInModal) return;

    try {
      await api.post(`/manager/checkins/${checkInModal.checkIn.checkInId}/comment`, {
        managerComment: checkInModal.managerComment,
      });
      setMessage('Comment saved');
      setCheckInModal(null);
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

      {goalActionModal ? (
        <Modal
          kicker={goalActionModal.action === 'approve' ? 'Approve Goal' : 'Return for Rework'}
          title={goalActionModal.goal.title}
          description={goalActionModal.action === 'approve' ? 'Review the goal details, add an optional comment, and confirm approval.' : 'Add a required rework comment before returning the goal.'}
          onClose={() => setGoalActionModal(null)}
          className="modal-card-wide"
        >
          <form className="grid-form two-col" onSubmit={submitGoalAction}>
            <div className="full modal-multiselect">
              <div className="row-between">
                <span className="status-chip status-primary">Employee: {goalActionModal.goal.employeeName || goalActionModal.goal.employeeId}</span>
                <span className="status-chip status-entity-goal">{goalActionModal.goal.approvalStatus}</span>
              </div>
              <p className="section-help">{goalActionModal.goal.description || 'No description provided.'}</p>
            </div>
            <label>
              Target
              <input
                type={goalActionModal.goal.uomType === 'Timeline' ? 'date' : 'number'}
                value={goalActionModal.target}
                onChange={(event) => setGoalActionModal((current) => ({ ...current, target: event.target.value }))}
              />
            </label>
            <label>
              Weightage
              <input
                type="number"
                min="10"
                value={goalActionModal.weightage}
                onChange={(event) => setGoalActionModal((current) => ({ ...current, weightage: event.target.value }))}
              />
            </label>
            <label className="full">
              {goalActionModal.action === 'approve' ? 'Approval Comment (optional)' : 'Rework Comment (required)'}
              <textarea
                value={goalActionModal.managerComment}
                onChange={(event) => setGoalActionModal((current) => ({ ...current, managerComment: event.target.value }))}
                required={goalActionModal.action === 'rework'}
              />
            </label>
            <div className="full button-row-spread">
              <button className="ghost" type="button" onClick={() => setGoalActionModal(null)}>
                Cancel
              </button>
              <button className={goalActionModal.action === 'approve' ? 'approve button-lg' : 'rework button-lg'} type="submit">
                {goalActionModal.action === 'approve' ? 'Confirm Approve' : 'Return for Rework'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {checkInModal ? (
        <Modal
          kicker="Edit Check-in Comment"
          title={checkInModal.checkIn.goalTitle}
          description={`Quarter ${checkInModal.checkIn.quarter} update for ${checkInModal.checkIn.employeeName}.`}
          onClose={() => setCheckInModal(null)}
        >
          <form className="grid-form" onSubmit={saveCheckInComment}>
            <label>
              Comment
              <textarea
                value={checkInModal.managerComment}
                onChange={(event) => setCheckInModal((current) => ({ ...current, managerComment: event.target.value }))}
                required
              />
            </label>
            <div className="button-row-spread">
              <button className="ghost" type="button" onClick={() => setCheckInModal(null)}>
                Cancel
              </button>
              <button className="primary" type="submit">
                Save
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      <section className="panel panel-compact">
        <div className="section-heading-row">
          <div className="section-heading-inline">
            <p className="kicker">Workspace Overview</p>
            <h3>Manager activity at a glance</h3>
            <p className="section-help">Review submitted goals and add quarterly feedback without changing the approval flow.</p>
          </div>
          <div className="metrics-grid metrics-grid-compact" style={{ marginTop: 0 }}>
            <article>
              <p>Pending Goals</p>
              <h4>{approvalCount}</h4>
            </article>
            <article>
              <p>Check-ins</p>
              <h4>{reviewCount}</h4>
            </article>
          </div>
        </div>
      </section>

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
                      <button type="button" className="approve button-sm" onClick={() => openGoalModal(goal, 'approve')}>
                        Approve
                      </button>
                      <button type="button" className="rework button-sm" onClick={() => openGoalModal(goal, 'rework')}>
                        Return Rework
                      </button>
                      <button type="button" className="danger button-sm" onClick={() => openDeleteModal(goal)} aria-label="Remove pending goal">
                        ✕
                      </button>
                    </div>
                  </td>

                      {deleteTarget ? (
                        <Modal
                          kicker="Remove Submission"
                          title={`Remove: ${deleteTarget.title}`}
                          description="This will permanently remove the submitted goal from approvals. The employee will be notified."
                          onClose={() => setDeleteTarget(null)}
                        >
                          <form className="grid-form" onSubmit={performDelete}>
                            <p className="section-help">Are you sure you want to remove this pending goal?</p>
                            <div className="button-row-spread">
                              <button className="ghost" type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
                              <button className="danger" type="submit">Remove</button>
                            </div>
                          </form>
                        </Modal>
                      ) : null}
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
                    <button type="button" className="ghost button-sm" onClick={() => openCheckInCommentModal(item)}>
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
