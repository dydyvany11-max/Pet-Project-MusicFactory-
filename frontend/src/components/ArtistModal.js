import React from 'react';

function ArtistModal({
  artist,
  tracks,
  getImageUrl,
  onClose,
  onTrackSelect,
  onAddTrackToPlaylist,
}) {
  if (!artist) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-window" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{artist.name}</h3>
          <button className="tiny-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="artist-modal-top">
          <img className="artist-modal-image" src={getImageUrl(artist.image_path)} alt={artist.name} />
          <div>
            <div className="muted">Artist bio</div>
            <p>{artist.bio || 'No bio yet.'}</p>
            <div className="muted">Tracks: {tracks.length}</div>
          </div>
        </div>

        {tracks.length === 0 ? (
          <div className="empty-box">No tracks uploaded for this artist yet.</div>
        ) : (
          <div className="search-list">
            {tracks.map((track) => (
              <div className="search-row" key={`${artist.id}-${track.id}`}>
                <button
                  type="button"
                  className="search-track"
                  onClick={() =>
                    onTrackSelect({
                      ...track,
                      artistName: track.artist_name || artist.name,
                      artistImagePath: artist.image_path || null,
                    })
                  }
                >
                  <span>
                    <strong>{track.title}</strong>
                    <span className="muted"> by {artist.name}</span>
                  </span>
                  {track.genre ? <span className="pill">{track.genre}</span> : <span className="muted">-</span>}
                  <span className="muted">{track.duration_seconds ? `${track.duration_seconds}s` : '--'}</span>
                </button>
                <button
                  className="tiny-btn add-btn"
                  type="button"
                  onClick={() =>
                    onAddTrackToPlaylist({
                      ...track,
                      artistName: track.artist_name || artist.name,
                      artistImagePath: artist.image_path || null,
                    })
                  }
                >
                  + Playlist
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ArtistModal;
