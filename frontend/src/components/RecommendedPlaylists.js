import React from 'react';

function RecommendedPlaylists({ playlists, onOpenPlaylist, getImageUrl }) {
  return (
    <section className="section">
      <h3>Recommended Playlists</h3>
      {playlists.length === 0 ? <div className="empty-box">No playlists yet.</div> : null}
      <div className="card-grid">
        {playlists.map((playlist) => (
          <button className="playlist-card playlist-card-button" key={playlist.id} type="button" onClick={() => onOpenPlaylist(playlist)}>
            {playlist.cover_image_path ? (
              <img className="playlist-cover-image" src={getImageUrl(playlist.cover_image_path)} alt={playlist.title} />
            ) : (
              <div className="playlist-cover" />
            )}
            <div className="playlist-meta">
              <h4 className="playlist-name">{playlist.title}</h4>
              <span className="muted">{playlist.tracks_count} tracks</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default RecommendedPlaylists;
