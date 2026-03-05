import React from 'react';
import SearchBar from './SearchBar';
import RecommendedPlaylists from './RecommendedPlaylists';
import ArtistsGrid from './ArtistsGrid';
import SearchResults from './SearchResults';

function MainContent({
  loading,
  error,
  artists,
  tracks,
  allTracks,
  totalTracks,
  searchQuery,
  setSearchQuery,
  recommendedPlaylists,
  getImageUrl,
  onTrackSelect,
  onAddTrackToPlaylist,
  onOpenPlaylist,
  onOpenArtist,
  currentUser,
  activeView,
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  authError,
  onAuthSubmit,
  myPlaylists,
  onCreatePlaylist,
}) {
  const showSearch = activeView === 'search';
  const showLibrary = activeView === 'library';
  const showHome = activeView === 'home';

  return (
    <main className="main-content">
      <div className="main-scroll">
        <section className="hero">
          <div className="hero-card">
            <h2>{currentUser ? `Welcome, ${currentUser.username}` : 'Your Daily Control Room'}</h2>
            <p>Stream artists, preview tracks, and keep your own library in sync.</p>
          </div>
          <div className="hero-stats">
            <strong>{totalTracks}</strong>
            <span className="muted">tracks in your local catalog</span>
          </div>
        </section>

        {showSearch ? <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} /> : null}

        {loading && <div className="loading-box">Loading catalog...</div>}
        {!loading && error && <div className="error-box">{error}</div>}

        {!loading && !error && !currentUser ? (
          <section className="section auth-panel">
            <h3>{authMode === 'login' ? 'Login' : 'Register'}</h3>
            <div className="auth-grid">
              <input
                className="search-input"
                placeholder="Username"
                value={authForm.username}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, username: event.target.value }))}
              />
              <input
                className="search-input"
                placeholder="Email"
                value={authForm.email}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
              />
              {authMode === 'login' ? (
                <input
                  className="search-input"
                  placeholder="Login (username or email)"
                  value={authForm.login}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, login: event.target.value }))}
                />
              ) : null}
              <input
                className="search-input"
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>

            {authError ? <div className="error-box">{authError}</div> : null}

            <div className="auth-actions">
              <button className="action-btn" type="button" onClick={onAuthSubmit}>
                {authMode === 'login' ? 'Login' : 'Create account'}
              </button>
              <button
                className="tiny-btn"
                type="button"
                onClick={() => setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'))}
              >
                {authMode === 'login' ? 'Need account? Register' : 'Have account? Login'}
              </button>
            </div>
          </section>
        ) : null}

        {!loading && !error && showHome ? (
          <>
            <RecommendedPlaylists playlists={recommendedPlaylists} onOpenPlaylist={onOpenPlaylist} getImageUrl={getImageUrl} />
            <ArtistsGrid
              artists={artists}
              tracks={tracks}
              getImageUrl={getImageUrl}
              onTrackSelect={onTrackSelect}
              onAddTrackToPlaylist={onAddTrackToPlaylist}
              onOpenArtist={onOpenArtist}
            />
          </>
        ) : null}

        {!loading && !error && showSearch ? (
          <SearchResults
            tracks={allTracks}
            onTrackSelect={onTrackSelect}
            onAddTrackToPlaylist={onAddTrackToPlaylist}
          />
        ) : null}

        {!loading && !error && showLibrary ? (
          <section className="section">
            <h3>My Library</h3>
            {!currentUser ? (
              <div className="empty-box">Log in to see personal playlists.</div>
            ) : (
              <>
                <div className="auth-actions library-actions">
                  <button className="action-btn" type="button" onClick={onCreatePlaylist}>
                    Create playlist
                  </button>
                </div>
                {myPlaylists.length === 0 ? (
                  <div className="empty-box">No playlists yet. Create your first one.</div>
                ) : (
                  <div className="card-grid">
                    {myPlaylists.map((playlist) => (
                      <button
                        className="playlist-card playlist-card-button"
                        key={playlist.id}
                        type="button"
                        onClick={() => onOpenPlaylist(playlist)}
                      >
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
                )}
              </>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default MainContent;
