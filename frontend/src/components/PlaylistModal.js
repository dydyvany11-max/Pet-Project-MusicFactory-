import React from 'react';

function PlaylistModal({ playlist, tracks, loading, onClose, onTrackSelect, getImageUrl }) {
  if (!playlist) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-window" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{playlist.title}</h3>
          <button className="tiny-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {playlist.cover_image_path ? (
          <img className="playlist-cover-image modal-cover" src={getImageUrl(playlist.cover_image_path)} alt={playlist.title} />
        ) : null}

        {loading ? <div className="loading-box">Loading playlist...</div> : null}

        {!loading && tracks.length === 0 ? <div className="empty-box">Playlist is empty.</div> : null}

        {!loading && tracks.length > 0 ? (
          <div className="search-list">
            {tracks.map((track) => (
              <button key={`${playlist.id}-${track.id}`} type="button" className="search-track" onClick={() => onTrackSelect(track)}>
                <span>
                  <strong>{track.title}</strong>
                  <span className="muted"> by {track.artist_name || track.artistName || 'Unknown'}</span>
                </span>
                {track.genre ? <span className="pill">{track.genre}</span> : <span className="muted">-</span>}
                <span className="muted">{track.duration_seconds ? `${track.duration_seconds}s` : '--'}</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default PlaylistModal;
