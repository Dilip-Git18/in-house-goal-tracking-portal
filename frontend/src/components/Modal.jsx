function Modal({ kicker, title, description, onClose, className = '', footer, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className={`modal-card ${className}`.trim()} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            {kicker ? <p className="kicker">{kicker}</p> : null}
            {title ? <h3>{title}</h3> : null}
            {description ? <p className="section-help">{description}</p> : null}
          </div>
          <button type="button" className="ghost button-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

export default Modal;
