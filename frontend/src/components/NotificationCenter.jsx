import { useEffect, useMemo, useState } from 'react';
import api from '../api';

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString();
}

function NotificationCenter({ compact = false }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const unreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications || []);
      setError('');
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || 'Unable to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications((current) => current.map((item) => (item.notificationId === notificationId ? { ...item, isRead: true } : item)));
    } catch (markError) {
      setError(markError.response?.data?.message || 'Unable to update notification');
    }
  };

  return (
    <div className={`notification-center ${compact ? 'notification-center-compact' : ''}`}>
      <button type="button" className="notification-bell ghost button-sm" onClick={() => setOpen((current) => !current)}>
        <span aria-hidden="true">🔔</span>
        <span>Notifications</span>
        {unreadCount > 0 ? <span className="notification-count">{unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <div>
              <p className="kicker">Notification Center</p>
              <h4>{unreadCount} unread</h4>
            </div>
            <button type="button" className="ghost button-sm" onClick={loadNotifications} disabled={loading}>
              Refresh
            </button>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="table-empty">
                <strong>No notifications yet.</strong>
                <span>Updates like approvals, reminders, and shared KPI assignments will appear here.</span>
              </div>
            ) : (
              notifications.map((notification) => (
                <article key={notification.notificationId} className={`notification-item ${notification.isRead ? '' : 'notification-unread'}`}>
                  <div className="notification-item-top">
                    <div>
                      <h5>{notification.title}</h5>
                      <p>{notification.message}</p>
                    </div>
                    {!notification.isRead ? <span className="notification-dot" aria-hidden="true" /> : null}
                  </div>
                  <div className="notification-item-meta">
                    <span>{notification.type}</span>
                    <span>{formatTime(notification.createdAt)}</span>
                  </div>
                  {!notification.isRead ? (
                    <button type="button" className="ghost button-sm" onClick={() => markAsRead(notification.notificationId)}>
                      Mark Read
                    </button>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default NotificationCenter;
