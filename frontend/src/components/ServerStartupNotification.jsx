import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function ServerStartupNotification({ forceShow = false }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const location = useLocation();

  useEffect(() => {
    // Check if first visit and current page is home/login
    const isFirstVisit = !localStorage.getItem('visited_before');
    const isHomePage = location.pathname === '/';

    if ((isFirstVisit || forceShow) && isHomePage) {
      setIsVisible(true);
      localStorage.setItem('visited_before', 'true');

      // Progress bar animation over 4 seconds (4000ms)
      const startTime = Date.now();
      const duration = 4000;
      
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progressValue = (elapsed / duration) * 100;
        
        if (progressValue >= 100) {
          setProgress(100);
          clearInterval(progressInterval);
        } else {
          setProgress(progressValue);
        }
      }, 20);

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        dismissNotification();
      }, 4000);

      return () => {
        clearInterval(progressInterval);
        clearTimeout(timer);
      };
    }
  }, [location.pathname, forceShow]);

  const dismissNotification = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`server-startup-notification ${isAnimatingOut ? 'animating-out' : ''}`}>
      <div className="notification-content">
        <div className="notification-body">
          <p className="notification-title">Please Wait While Server Starts</p>
          <p className="notification-message">
            Render free tier may take up to 30 seconds to wake up on first load. Please wait here.
          </p>
        </div>
        <button
          type="button"
          className="notification-dismiss"
          onClick={dismissNotification}
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default ServerStartupNotification;
