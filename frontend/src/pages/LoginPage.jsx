import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Toast from '../components/Toast';

const presets = [
  { label: 'Employee', email: 'employee@company.com', password: 'Pass@123' },
  { label: 'Manager', email: 'manager@company.com', password: 'Pass@123' },
  { label: 'Admin', email: 'admin@company.com', password: 'Pass@123' },
];

const featureCards = [
  {
    title: 'Goal Creation',
    body: 'Employees define thrust area, goals, targets, and weightage with policy checks.',
  },
  {
    title: 'Manager Approval',
    body: 'Managers review, refine, approve, or return goals for rework with comments.',
  },
  {
    title: 'Quarterly Check-ins',
    body: 'Track planned vs actual progress for Q1 to Q4 with structured updates.',
  },
  {
    title: 'Admin Reports',
    body: 'HR dashboard for completion tracking, exports, and auditable activity history.',
  },
];

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'employee@company.com', password: 'Pass@123' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  useEffect(() => {
    if (!error) return undefined;
    const timer = window.setTimeout(() => setError(''), 4000);
    return () => window.clearTimeout(timer);
  }, [error]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.role === 'employee') navigate('/employee');
      if (data.user.role === 'manager') navigate('/manager');
      if (data.user.role === 'admin') navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page login-page">
      <div className="orb orb-left" />
      <div className="orb orb-right" />

      <div className="panel login-panel">
        <div className="section-heading login-heading">
          <p className="kicker">Hackathon Build</p>
          <h1>In-House Goal Setting & Tracking Portal</h1>
          <p className="subtext">
            A role-based portal for employee goal creation, manager approval, quarterly check-ins,
            HR reporting, and audit tracking.
          </p>
        </div>

        <div className="demo-badge">Demo Mode: Sample credentials provided</div>

        {error ? (
          <div className="toast-anchor">
            <Toast tone="error" title="Sign-in failed" message={error} onClose={() => setError('')} />
          </div>
        ) : null}

        <div className="preset-row">
          {presets.map((preset) => (
            <button
              type="button"
              key={preset.label}
              className={`chip ${form.email === preset.email ? 'chip-active' : ''}`}
              onClick={() => setForm({ email: preset.email, password: preset.password })}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="feature-grid">
          {featureCards.map((card) => (
            <article key={card.title} className="feature-card">
              <h4>{card.title}</h4>
              <p>{card.body}</p>
            </article>
          ))}
        </div>

        <form onSubmit={onSubmit} className="grid-form">
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              required
              autoComplete="username"
            />
          </label>

          <label>
            Password
            <div className="password-row">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={onChange}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="eye-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="credentials-box">
          <p>Sample credentials (same password for all):</p>
          <ul>
            <li>employee@company.com / Pass@123</li>
            <li>manager@company.com / Pass@123</li>
            <li>admin@company.com / Pass@123</li>
          </ul>
        </div>

        <p className="login-footer">Built for AtomQuest Hackathon 1.0</p>
      </div>
    </div>
  );
}

export default LoginPage;
