import React from 'react';

function ArtistCard({ artist, tracks, getImageUrl, onTrackSelect, onAddTrackToPlaylist }) {
  return (
    <article className="artist-card">
      <img className="artist-cover" src={getImageUrl(artist.image_path)} alt={artist.name} loading="lazy" />
      <div className="artist-meta">
        <h4 className="artist-name">{artist.name}</h4>
        <span className="muted">{tracks.length} tracks</span>
      </div>

      <div className="track-stack">
        {tracks.slice(0, 4).map((track) => {
          const normalized = {
            ...track,
            artistName: track.artist_name || artist.name,
            artistImagePath: artist.image_path || null,
          };

          return (
            <div className="track-row" key={track.id}>
              <button className="track-button" type="button" onClick={() => onTrackSelect(normalized)}>
                {track.title}
              </button>
              <button className="tiny-btn add-btn" type="button" onClick={() => onAddTrackToPlaylist(normalized)}>
                +
              </button>
            </div>
          );
        })}

        {tracks.length === 0 ? <div className="muted">No tracks uploaded for this artist</div> : null}
      </div>
    </article>
  );
}

export default ArtistCard;
