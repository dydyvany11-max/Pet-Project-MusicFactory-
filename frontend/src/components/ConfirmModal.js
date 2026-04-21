import React from 'react';

function ConfirmModal({ open, title, message, confirmLabel, onConfirm, onCancel, busy }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onCancel}>
      <section className="modal-window modal-small" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{title || 'Confirm action'}</h3>
          <button className="tiny-btn" type="button" onClick={onCancel} disabled={busy}>
            Close
          </button>
        </div>

        <p className="muted">{message}</p>

        <div className="create-playlist-actions">
          <button className="tiny-btn" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="action-btn" type="button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working...' : (confirmLabel || 'Delete')}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ConfirmModal;
