import React from 'react';

function AddToPlaylistModal({ track, playlists, onSelect, onClose }) {
  if (!track) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-window modal-small" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Add To Playlist</h3>
          <button className="tiny-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="muted">Track: {track.title}</p>

        {playlists.length === 0 ? (
          <div className="empty-box">No playlists yet. Create one in Library first.</div>
        ) : (
          <div className="playlist-picker-list">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                className="playlist-picker-item"
                type="button"
                onClick={() => onSelect(playlist)}
              >
                <span>{playlist.title}</span>
                <span className="muted">{playlist.tracks_count} tracks</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AddToPlaylistModal;
