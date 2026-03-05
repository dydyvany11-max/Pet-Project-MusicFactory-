import React, { useState } from 'react';

function CreatePlaylistModal({ open, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalized = title.trim();
    if (!normalized) {
      setError('Enter playlist name');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await onCreate(normalized);
      setTitle('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create playlist');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) {
      return;
    }
    setError('');
    setTitle('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <section className="modal-window modal-small" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Playlist</h3>
          <button className="tiny-btn" type="button" onClick={handleClose}>
            Close
          </button>
        </div>

        <form className="create-playlist-form" onSubmit={handleSubmit}>
          <input
            className="search-input create-playlist-input"
            type="text"
            placeholder="Playlist name"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
            autoFocus
          />

          {error ? <div className="error-box">{error}</div> : null}

          <div className="create-playlist-actions">
            <button className="tiny-btn" type="button" onClick={handleClose} disabled={submitting}>
              Cancel
            </button>
            <button className="action-btn" type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default CreatePlaylistModal;
