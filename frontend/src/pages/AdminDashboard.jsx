import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api';

const statusColors = ['#0f766e', '#f59e0b', '#16a34a', '#b91c1c'];

function AdminDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: 'Pass@123',
    role: 'employee',
    department: '',
    designation: '',
    managerId: 'mgr_001',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
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
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
        managerId: 'mgr_001',
      });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create user');
    }
  };

  const unlockGoal = async () => {
    const goalId = window.prompt('Enter goal ID to unlock');
    const remarks = window.prompt('Enter remarks for unlock action') || '';
    if (!goalId) return;

    try {
      await api.post(`/admin/goals/${goalId}/unlock`, { remarks });
      setMessage('Goal unlocked');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to unlock goal');
    }
  };

  const pushSharedGoal = async () => {
    const title = window.prompt('Shared goal title');
    if (!title) return;

    try {
      await api.post('/admin/shared-goals/push', {
        title,
        description: 'Department KPI pushed from admin dashboard',
        thrustArea: 'Operational Excellence',
        target: 90,
        uomType: 'Percentage',
        goalType: 'Min',
        department: 'Sales',
        assignedEmployees: users.filter((u) => u.role === 'employee').map((u) => u.userId),
      });
      setMessage('Shared goal pushed to employees');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to push shared goal');
    }
  };

  const statusData = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.statusCount).map(([name, value]) => ({ name, value }));
  }, [dashboard]);

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
      {error ? <p className="error">{error}</p> : null}

      <section className="panel">
        <div className="row-between">
          <h3>Completion Dashboard</h3>
          <div className="action-row">
            <button className="ghost" onClick={unlockGoal}>Unlock Goal</button>
            <button className="ghost" onClick={pushSharedGoal}>Push Shared KPI</button>
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

      <section className="panel chart-grid">
        <div>
          <h3>Goal Status Mix</h3>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90}>
                  {statusData.map((entry, index) => (
                    <Cell key={entry.name} fill={statusColors[index % statusColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3>Quarter Completion</h3>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dashboard?.quarterCompletion || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" fill="#0f766e" />
                <Bar dataKey="pending" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>User Management</h3>
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
            Manager ID
            <input value={newUser.managerId} onChange={(e) => setNewUser((p) => ({ ...p, managerId: e.target.value }))} />
          </label>
          <button className="primary" type="submit">Create User</button>
        </form>
      </section>

      <section className="panel">
        <h3>Reporting & Audit</h3>
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
              {auditLogs.slice(0, 20).map((log) => (
                <tr key={log.logId}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.userId}</td>
                  <td>{log.action}</td>
                  <td>{log.entityType}</td>
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
