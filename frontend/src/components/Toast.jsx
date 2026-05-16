function Toast({ tone = 'success', title, message, onClose }) {
  return (
    <div className={`toast toast-${tone}`} role="status" aria-live="polite">
      <div>
        {title ? <p className="toast-title">{title}</p> : null}
        <p className="toast-message">{message}</p>
      </div>
      {onClose ? (
        <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss notification">
          ×
        </button>
      ) : null}
    </div>
  );
}

export default Toast;
