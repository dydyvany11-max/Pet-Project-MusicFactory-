import React from 'react';

function SearchResults({ tracks, onTrackSelect, onAddTrackToPlaylist }) {
  return (
    <section className="section">
      <h3>Search Results</h3>

      {tracks.length === 0 ? (
        <div className="empty-box">No matching tracks. Try another query.</div>
      ) : (
        <div className="search-list">
          {tracks.map((track) => (
            <div key={track.id} className="search-row">
              <button type="button" className="search-track" onClick={() => onTrackSelect(track)}>
                <span>
                  <strong>{track.title}</strong>
                  <span className="muted"> by {track.artistName}</span>
                </span>
                {track.genre ? <span className="pill">{track.genre}</span> : <span className="muted">-</span>}
                <span className="muted">{track.duration_seconds ? `${track.duration_seconds}s` : '--'}</span>
              </button>
              <button className="tiny-btn add-btn" type="button" onClick={() => onAddTrackToPlaylist(track)}>
                + Playlist
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default SearchResults;
