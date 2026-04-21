import React from 'react';

function Sidebar({
  currentUser,
  activeView,
  onNavigate,
  onLogout,
  myPlaylists,
  recommendedPlaylists,
  onOpenPlaylist,
}) {
  return (
    <aside className="sidebar">
      <h1 className="brand">
        Music<span>Factory</span>
      </h1>

      <div className="side-group">
        <h4 className="side-title">Account</h4>
        {currentUser ? (
          <div className="user-box">
            <div className="user-name">{currentUser.username}</div>
            <div className="muted">{currentUser.email}</div>
            <button className="tiny-btn" type="button" onClick={onLogout}>
              Logout
            </button>
          </div>
        ) : (
          <div className="muted">Guest mode</div>
        )}
      </div>

      <div className="side-group">
        <h4 className="side-title">Navigation</h4>
        <button className={`nav-item ${activeView === 'home' ? 'active' : ''}`} type="button" onClick={() => onNavigate('home')}>
          Home
        </button>
        <button className={`nav-item ${activeView === 'search' ? 'active' : ''}`} type="button" onClick={() => onNavigate('search')}>
          Search
        </button>
        <button className={`nav-item ${activeView === 'library' ? 'active' : ''}`} type="button" onClick={() => onNavigate('library')}>
          Library
        </button>
        {currentUser?.is_admin ? (
          <button className={`nav-item ${activeView === 'admin' ? 'active' : ''}`} type="button" onClick={() => onNavigate('admin')}>
            Admin
          </button>
        ) : null}
      </div>

      <div className="side-group">
        <h4 className="side-title">My Playlists</h4>
        {myPlaylists.length === 0 ? <div className="muted">No playlists yet</div> : null}
        {myPlaylists.map((playlist) => (
          <button key={playlist.id} className="playlist-item" type="button" onClick={() => onOpenPlaylist(playlist)}>
            <span>{playlist.title}</span>
            <span className="playlist-count">{playlist.tracks_count}</span>
          </button>
        ))}
      </div>

      <div className="side-group">
        <h4 className="side-title">Recommended</h4>
        {recommendedPlaylists.map((playlist) => (
          <button key={playlist.id} className="playlist-item" type="button" onClick={() => onOpenPlaylist(playlist)}>
            <span>{playlist.title}</span>
            <span className="playlist-count">{playlist.tracks_count}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export default Sidebar;
