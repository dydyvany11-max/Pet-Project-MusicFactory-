import React from 'react';

function RecommendedPlaylists({ playlists }) {
  return (
    <section className="section">
      <h3>Recommended Playlists</h3>
      <div className="card-grid">
        {playlists.map((playlist) => (
          <article className="playlist-card" key={playlist.id}>
            <div className="playlist-cover" />
            <div className="playlist-meta">
              <h4 className="playlist-name">{playlist.title}</h4>
              <span className="muted">{playlist.tracks_count} tracks</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default RecommendedPlaylists;
