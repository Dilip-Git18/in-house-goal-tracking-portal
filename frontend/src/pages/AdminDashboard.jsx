import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api';
import Toast from '../components/Toast';

const statusColors = ['#0f766e', '#f59e0b', '#16a34a', '#b91c1c'];
const cycleLabels = {
  goalSettingOpenDate: 'Goal Setting Opens',
  goalSettingCloseDate: 'Goal Setting Closes',
  q1OpenDate: 'Q1 Open',
  q2OpenDate: 'Q2 Open',
  q3OpenDate: 'Q3 Open',
  q4OpenDate: 'Q4 Open',
};

const modalInitial = {
  unlockGoalId: '',
  unlockRemarks: '',
  sharedTitle: '',
  sharedDescription: '',
  sharedThrustArea: '',
  sharedTarget: '',
  sharedUomType: 'Percentage',
  sharedGoalType: 'Min',
  sharedDepartment: '',
  sharedAssignedEmployees: [],
  sharedPrimaryOwnerId: '',
};

function AdminDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditEntityFilter, setAuditEntityFilter] = useState('All');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: 'Pass@123',
    role: 'employee',
    department: '',
    designation: '',
    managerId: '',
  });
  const [modalForm, setModalForm] = useState(modalInitial);
  const [activeModal, setActiveModal] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, userRes, auditRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/users'),
        api.get('/admin/audit-logs'),
      ]);
      setDashboard(dashRes.data);
      setUsers(userRes.data.users);
      setAuditLogs(auditRes.data.auditLogs);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load admin dashboard');
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

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', newUser);
      setMessage('User created successfully');
      setNewUser({
        name: '',
        email: '',
        password: 'Pass@123',
        role: 'employee',
        department: '',
        designation: '',
        managerId: '',
      });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create user');
    }
  };

  const closeModal = () => {
    setActiveModal('');
    setModalForm(modalInitial);
  };

  const openUnlockModal = () => setActiveModal('unlock');
  const openSharedModal = () => setActiveModal('shared');

  const unlockGoal = async (e) => {
    e.preventDefault();
    if (!modalForm.unlockGoalId || !modalForm.unlockRemarks) return;

    try {
      await api.post(`/admin/goals/${modalForm.unlockGoalId}/unlock`, { remarks: modalForm.unlockRemarks });
      setMessage('Goal unlocked');
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to unlock goal');
    }
  };

  const pushSharedGoal = async (e) => {
    e.preventDefault();
    if (
      !modalForm.sharedTitle ||
      !modalForm.sharedThrustArea ||
      !modalForm.sharedTarget ||
      !modalForm.sharedDepartment ||
      modalForm.sharedAssignedEmployees.length === 0
    ) {
      return;
    }

    try {
      await api.post('/admin/shared-goals/push', {
        title: modalForm.sharedTitle,
        description: modalForm.sharedDescription,
        thrustArea: modalForm.sharedThrustArea,
        target: Number(modalForm.sharedTarget),
        uomType: modalForm.sharedUomType,
        goalType: modalForm.sharedGoalType,
        department: modalForm.sharedDepartment,
        assignedEmployees: modalForm.sharedAssignedEmployees,
        primaryOwnerId: modalForm.sharedPrimaryOwnerId || modalForm.sharedAssignedEmployees[0],
      });
      setMessage('Shared goal pushed to employees');
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to push shared goal');
    }
  };

  const managerOptions = useMemo(() => users.filter((item) => item.role === 'manager' && item.isActive !== false), [users]);
  const employeeOptions = useMemo(() => users.filter((item) => item.role === 'employee' && item.isActive !== false), [users]);

  const statusData = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.statusCount).map(([name, value]) => ({ name, value }));
  }, [dashboard]);

  const filteredAuditLogs = useMemo(() => {
    if (auditEntityFilter === 'All') return auditLogs;
    return auditLogs.filter((log) => log.entityType === auditEntityFilter);
  }, [auditLogs, auditEntityFilter]);

  const getUserName = (userId) => users.find((item) => item.userId === userId)?.name || userId || '-';

  const roleBadgeClass = (value) => `status-chip status-${String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const entityBadgeClass = (value) => `status-chip status-entity-${String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const downloadReport = async (format) => {
    try {
      const endpoint =
        format === 'csv' ? '/admin/reports/achievement.csv' : '/admin/reports/achievement.xlsx';
      const filename =
        format === 'csv' ? 'achievement-report.csv' : 'achievement-report.xlsx';

      const response = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.setAttribute('download', filename);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to export report');
    }
  };

  const toggleEmployeeSelection = (employeeId) => {
    setModalForm((prev) => {
      const exists = prev.sharedAssignedEmployees.includes(employeeId);
      return {
        ...prev,
        sharedAssignedEmployees: exists
          ? prev.sharedAssignedEmployees.filter((item) => item !== employeeId)
          : [...prev.sharedAssignedEmployees, employeeId],
      };
    });
  };

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <p className="kicker">Admin / HR Dashboard</p>
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

      {activeModal === 'unlock' ? (
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <div className="modal-card" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="kicker">Unlock Goal</p>
                <h3>Unlock goal for exception handling</h3>
              </div>
              <button type="button" className="ghost" onClick={closeModal}>Close</button>
            </div>
            <form className="grid-form" onSubmit={unlockGoal}>
              <label>
                Goal ID
                <input
                  value={modalForm.unlockGoalId}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, unlockGoalId: e.target.value }))}
                  required
                />
              </label>
              <label>
                Remarks
                <textarea
                  value={modalForm.unlockRemarks}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, unlockRemarks: e.target.value }))}
                  required
                />
              </label>
              <button className="primary" type="submit">Unlock Goal</button>
            </form>
          </div>
        </div>
      ) : null}

      {activeModal === 'shared' ? (
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <div className="modal-card modal-card-wide" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="kicker">Push Shared KPI</p>
                <h3>Create and assign a shared goal</h3>
              </div>
              <button type="button" className="ghost" onClick={closeModal}>Close</button>
            </div>
            <form className="grid-form two-col" onSubmit={pushSharedGoal}>
              <label className="full">
                Title
                <input
                  value={modalForm.sharedTitle}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, sharedTitle: e.target.value }))}
                  required
                />
              </label>
              <label className="full">
                Description
                <textarea
                  value={modalForm.sharedDescription}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, sharedDescription: e.target.value }))}
                />
              </label>
              <label>
                Thrust Area
                <input
                  value={modalForm.sharedThrustArea}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, sharedThrustArea: e.target.value }))}
                  required
                />
              </label>
              <label>
                Target
                <input
                  type="number"
                  value={modalForm.sharedTarget}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, sharedTarget: e.target.value }))}
                  required
                />
              </label>
              <label>
                UoM Type
                <select
                  value={modalForm.sharedUomType}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, sharedUomType: e.target.value }))}
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
                  value={modalForm.sharedGoalType}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, sharedGoalType: e.target.value }))}
                >
                  <option>Min</option>
                  <option>Max</option>
                  <option>Timeline</option>
                  <option>Zero</option>
                </select>
              </label>
              <label>
                Department
                <input
                  value={modalForm.sharedDepartment}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, sharedDepartment: e.target.value }))}
                  required
                />
              </label>
              <label>
                Primary Owner
                <select
                  value={modalForm.sharedPrimaryOwnerId}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, sharedPrimaryOwnerId: e.target.value }))}
                >
                  <option value="">Auto select first employee</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.userId} value={employee.userId}>{employee.name}</option>
                  ))}
                </select>
              </label>
              <div className="full modal-multiselect">
                <p className="field-label">Assign Employees</p>
                <div className="checkbox-grid">
                  {employeeOptions.map((employee) => (
                    <label key={employee.userId} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={modalForm.sharedAssignedEmployees.includes(employee.userId)}
                        onChange={() => toggleEmployeeSelection(employee.userId)}
                      />
                      <span>{employee.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button className="primary full" type="submit">Push Shared KPI</button>
            </form>
          </div>
        </div>
      ) : null}

      <section className="panel">
        <div className="row-between">
          <div className="section-heading-inline">
            <p className="kicker">Summary</p>
            <h3>Completion Dashboard</h3>
            <p className="section-help">Monitor adoption, approvals, and quarterly progress across the portal.</p>
          </div>
          <div className="action-row">
            <button type="button" className="ghost" onClick={openUnlockModal}>Unlock Goal</button>
            <button type="button" className="ghost" onClick={openSharedModal}>Push Shared KPI</button>
          </div>
        </div>

        {dashboard ? (
          <div className="metrics-grid">
            <article>
              <p>Total Employees</p>
              <h4>{dashboard.metrics.totalEmployees}</h4>
            </article>
            <article>
              <p>Total Managers</p>
              <h4>{dashboard.metrics.totalManagers}</h4>
            </article>
            <article>
              <p>Total Goals</p>
              <h4>{dashboard.metrics.totalGoals}</h4>
            </article>
            <article>
              <p>Total Check-Ins</p>
              <h4>{dashboard.metrics.totalCheckIns}</h4>
            </article>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="section-heading">
          <p className="kicker">Cycle Setup</p>
          <h3>Goal Cycle</h3>
          <p className="section-help">The active cycle and review windows drive when employees can create goals and submit check-ins.</p>
        </div>
        {dashboard?.currentCycle ? (
          <div className="cycle-grid">
            <article>
              <p>Active Cycle</p>
              <h4>{dashboard.currentCycle.cycleName}</h4>
              <span>{dashboard.currentCycle.year}</span>
            </article>
            <article>
              <p>Goal Setting Window</p>
              <h4>{dashboard.currentCycle.goalSettingOpenDate} to {dashboard.currentCycle.goalSettingCloseDate}</h4>
            </article>
            {Object.entries(cycleLabels).map(([key, label]) => (
              <article key={key}>
                <p>{label}</p>
                <h4>{dashboard.currentCycle[key]}</h4>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="panel chart-grid">
        <div>
          <div className="section-heading">
            <p className="kicker">Analytics</p>
            <h3>Goal Status Mix</h3>
            <p className="section-help">Approved, submitted, draft, and rework counts shown as a clean overview.</p>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90}>
                  {statusData.map((entry, index) => (
                    <Cell key={entry.name} fill={statusColors[index % statusColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-chip-row">
            {['draft', 'submitted', 'approved', 'rework'].map((status, index) => (
              <span key={status} className="legend-chip">
                <span className="legend-dot" style={{ backgroundColor: statusColors[index] }} />
                {status}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="section-heading">
            <p className="kicker">Analytics</p>
            <h3>Quarter Completion</h3>
            <p className="section-help">Completed versus pending check-ins across Q1 to Q4.</p>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dashboard?.quarterCompletion || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" fill="#0f766e" />
                <Bar dataKey="pending" fill="#f59e0b" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-chip-row">
            <span className="legend-chip"><span className="legend-dot" style={{ backgroundColor: '#0f766e' }} />Completed</span>
            <span className="legend-chip"><span className="legend-dot" style={{ backgroundColor: '#f59e0b' }} />Pending</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <p className="kicker">Users</p>
          <h3>User Management</h3>
          <p className="section-help">Create users, assign reporting lines, and review the current organization list.</p>
        </div>
        <form className="grid-form two-col" onSubmit={createUser}>
          <label>
            Name
            <input
              value={newUser.name}
              onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </label>
          <label>
            Role
            <select value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label>
            Department
            <input value={newUser.department} onChange={(e) => setNewUser((p) => ({ ...p, department: e.target.value }))} />
          </label>
          <label>
            Designation
            <input value={newUser.designation} onChange={(e) => setNewUser((p) => ({ ...p, designation: e.target.value }))} />
          </label>
          <label>
            Manager
            <select
              value={newUser.managerId}
              onChange={(e) => setNewUser((p) => ({ ...p, managerId: e.target.value }))}
              required={newUser.role === 'employee'}
            >
              <option value="">Select manager</option>
              {managerOptions.map((manager) => (
                <option key={manager.userId} value={manager.userId}>
                  {manager.name} ({manager.department || 'No Department'})
                </option>
              ))}
            </select>
          </label>
          <button className="primary" type="submit">Create User</button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Manager</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7"><div className="table-empty table-loading">Loading users...</div></td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="table-empty">
                      <strong>No users found.</strong>
                      <span>Create your first employee, manager, or admin account from the form above.</span>
                    </div>
                  </td>
                </tr>
              ) : users.map((item) => (
                <tr key={item.userId}>
                  <td>{item.name}</td>
                  <td>{item.email}</td>
                  <td><span className={roleBadgeClass(item.role)}>{item.role}</span></td>
                  <td>{item.department || '-'}</td>
                  <td>{getUserName(item.managerId)}</td>
                  <td><span className={item.isActive ? 'status-chip status-active' : 'status-chip status-inactive'}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div className="action-row">
                      <button type="button" className="ghost button-sm" onClick={() => navigator.clipboard.writeText(item.email)}>
                        Copy Email
                      </button>
                      <button type="button" className="ghost button-sm" onClick={() => navigator.clipboard.writeText(item.userId)}>
                        Copy ID
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
          <p className="kicker">Reports & Audit</p>
          <h3>Reporting & Audit</h3>
          <p className="section-help">Export achievement reports and review activity logs by entity type.</p>
        </div>
        <div className="export-panel">
          <p className="export-help">
            Export achievement report with planned vs actual values for all submitted check-ins.
          </p>
          <div className="action-row">
            <button className="primary link-btn" type="button" onClick={() => downloadReport('csv')}>
              Download CSV Format
            </button>
            <button className="primary link-btn" type="button" onClick={() => downloadReport('xlsx')}>
              Download Excel Format
            </button>
          </div>
        </div>

        <div className="audit-filter-row">
          <label>
            Filter by Entity Type
            <select value={auditEntityFilter} onChange={(e) => setAuditEntityFilter(e.target.value)}>
              <option value="All">All</option>
              <option value="Goal">Goal</option>
              <option value="CheckIn">CheckIn</option>
              <option value="User">User</option>
              <option value="System">System</option>
              <option value="SharedGoal">SharedGoal</option>
            </select>
          </label>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5"><div className="table-empty table-loading">Loading audit trail...</div></td>
                </tr>
              ) : filteredAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="table-empty">
                      <strong>No audit entries for this filter.</strong>
                      <span>Try another entity type or perform a tracked action.</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAuditLogs.slice(0, 20).map((log) => (
                <tr key={log.logId}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.userId}</td>
                  <td>{log.action}</td>
                  <td><span className={entityBadgeClass(log.entityType)}>{log.entityType}</span></td>
                  <td>{log.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
