import React from 'react';
import ArtistCard from './ArtistCard';

function ArtistsGrid({
  artists,
  tracks,
  getImageUrl,
  onTrackSelect,
  onAddTrackToPlaylist,
  onOpenArtist,
}) {
  return (
    <section className="section">
      <h3>Artists</h3>
      {artists.length === 0 ? (
        <div className="empty-box">No artists in database yet. Add an artist from API and reload.</div>
      ) : (
        <div className="card-grid">
          {artists.map((artist) => (
            <ArtistCard
              key={artist.id}
              artist={artist}
              tracks={tracks[artist.id] || tracks[String(artist.id)] || []}
              getImageUrl={getImageUrl}
              onTrackSelect={onTrackSelect}
              onAddTrackToPlaylist={onAddTrackToPlaylist}
              onOpenArtist={onOpenArtist}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default ArtistsGrid;
