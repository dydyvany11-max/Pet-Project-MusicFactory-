import React, { useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import NowPlaying from './components/NowPlaying';
import PlaylistModal from './components/PlaylistModal';
import ArtistModal from './components/ArtistModal';
import AddToPlaylistModal from './components/AddToPlaylistModal';
import CreatePlaylistModal from './components/CreatePlaylistModal';
import { addTrackToPlaylist, fetchPlaylistDetails } from './api/client';
import { useAuth } from './hooks/useAuth';
import { useDashboardData } from './hooks/useDashboardData';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const [playbackQueue, setPlaybackQueue] = useState([]);
  const [activeView, setActiveView] = useState('home');

  const [playlistModal, setPlaylistModal] = useState({
    playlist: null,
    tracks: [],
    loading: false,
  });
  const [artistModal, setArtistModal] = useState({
    artist: null,
    tracks: [],
  });
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState(null);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);

  const {
    currentUser,
    authMode,
    setAuthMode,
    authError,
    authForm,
    setAuthForm,
    submitAuth,
    logout,
  } = useAuth(API_BASE_URL);

  const {
    artists,
    tracksByArtist,
    myPlaylists,
    setMyPlaylists,
    loading,
    error,
    setError,
    addPlaylist,
  } = useDashboardData(API_BASE_URL, currentUser);

  const recommendedPlaylists = useMemo(
    () => [...myPlaylists].sort((a, b) => (b.tracks_count || 0) - (a.tracks_count || 0)).slice(0, 6),
    [myPlaylists]
  );

  const allTracks = useMemo(() => {
    const result = [];

    Object.keys(tracksByArtist).forEach((artistId) => {
      const artist = artists.find((item) => item.id === Number(artistId));
      const artistTracks = tracksByArtist[artistId] || [];

      artistTracks.forEach((track) => {
        result.push({
          ...track,
          artistName: track.artist_name || artist?.name || 'Unknown Artist',
          artistImagePath: artist?.image_path || null,
        });
      });
    });

    return result;
  }, [artists, tracksByArtist]);

  const filteredTracks = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return allTracks;
    }

    return allTracks.filter((track) => {
      const haystack = `${track.title} ${track.artistName} ${track.genre || ''}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [allTracks, searchQuery]);

  const normalizeTrack = (track) => {
    if (!track) {
      return null;
    }

    const artist = track.artistName || track.artist_name || 'Unknown Artist';
    const matchedArtist =
      artists.find((item) => item.id === Number(track.artist_id)) ||
      artists.find((item) => item.name === artist);
    const catalogTrack = allTracks.find((item) => item.id === track.id);
    const artistImagePath =
      track.artistImagePath ||
      track.artist_image_path ||
      matchedArtist?.image_path ||
      catalogTrack?.artistImagePath ||
      null;
    return { ...track, artistName: artist, artistImagePath };
  };

  const playTrack = (track, queue = null) => {
    const normalizedTrack = normalizeTrack(track);
    if (!normalizedTrack) {
      return;
    }

    if (Array.isArray(queue) && queue.length > 0) {
      setPlaybackQueue(queue.map((item) => normalizeTrack(item)).filter(Boolean));
    } else {
      setPlaybackQueue([]);
    }

    setCurrentTrackId(normalizedTrack.id);
  };

  const effectiveQueue = useMemo(() => {
    if (playbackQueue.length === 0) {
      return allTracks;
    }

    const containsCurrent = playbackQueue.some((track) => track.id === currentTrackId);
    return containsCurrent ? playbackQueue : allTracks;
  }, [playbackQueue, allTracks, currentTrackId]);

  const currentTrack = useMemo(
    () => effectiveQueue.find((track) => track.id === currentTrackId) || allTracks.find((track) => track.id === currentTrackId) || null,
    [effectiveQueue, allTracks, currentTrackId]
  );

  const currentIndex = useMemo(
    () => effectiveQueue.findIndex((track) => track.id === currentTrackId),
    [effectiveQueue, currentTrackId]
  );

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < effectiveQueue.length - 1;

  const getAudioUrl = (filePath) => {
    const fileName = filePath.split('/').pop();
    return `${API_BASE_URL}/play/${encodeURIComponent(fileName)}`;
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      return 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80';
    }

    const fileName = imagePath.split('/').pop();
    return `${API_BASE_URL}/image/${encodeURIComponent(fileName)}`;
  };

  const openPlaylistModal = async (playlist) => {
    if (!playlist?.id) {
      return;
    }

    setPlaylistModal({ playlist, tracks: [], loading: true });

    try {
      const payload = await fetchPlaylistDetails(API_BASE_URL, playlist.id);
      const modalTracks = (payload.tracks || []).map((track) => ({
        ...track,
        artistName:
          track.artist_name ||
          artists.find((item) => item.id === Number(track.artist_id))?.name ||
          'Unknown Artist',
        artistImagePath:
          track.artist_image_path ||
          artists.find((item) => item.id === Number(track.artist_id))?.image_path ||
          null,
      }));

      setPlaylistModal({ playlist: payload, tracks: modalTracks, loading: false });
      setError('');
    } catch (err) {
      setPlaylistModal({ playlist, tracks: [], loading: false });
      setError(err.message);
    }
  };

  const openArtistModal = (artist) => {
    const artistTracks = tracksByArtist[artist.id] || tracksByArtist[String(artist.id)] || [];
    setArtistModal({ artist, tracks: artistTracks });
  };

  const onCreatePlaylist = () => {
    if (!currentUser) {
      setError('Login first to create playlists');
      setActiveView('library');
      return;
    }

    setCreatePlaylistOpen(true);
  };

  const onConfirmCreatePlaylist = async (title) => {
    const created = await addPlaylist(title);
    await openPlaylistModal(created);
    setError('');
  };

  const onAddTrackToPlaylist = (track) => {
    if (!currentUser) {
      setError('Login first to add tracks into playlists');
      setActiveView('library');
      return;
    }

    setAddToPlaylistTrack(track);
  };

  const onConfirmAddToPlaylist = async (playlist) => {
    if (!addToPlaylistTrack) {
      return;
    }

    try {
      const response = await addTrackToPlaylist(API_BASE_URL, playlist.id, addToPlaylistTrack.id);
      if (response?.message?.includes('already')) {
        setError('Track is already in this playlist');
        setAddToPlaylistTrack(null);
        return;
      }

      setMyPlaylists((prev) =>
        prev.map((item) => {
          if (item.id !== playlist.id) {
            return item;
          }

          return {
            ...item,
            tracks_count: (item.tracks_count || 0) + 1,
            cover_image_path: item.cover_image_path || addToPlaylistTrack.artistImagePath || null,
          };
        })
      );

      if (playlistModal.playlist?.id === playlist.id) {
        setPlaylistModal((prev) => ({
          ...prev,
          tracks: [addToPlaylistTrack, ...prev.tracks],
          playlist: {
            ...prev.playlist,
            tracks_count: (prev.playlist?.tracks_count || 0) + 1,
            cover_image_path: prev.playlist?.cover_image_path || addToPlaylistTrack.artistImagePath || null,
          },
        }));
      }

      setAddToPlaylistTrack(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const onLogout = () => {
    logout();
    setMyPlaylists([]);
    setPlaybackQueue([]);
    setPlaylistModal({ playlist: null, tracks: [], loading: false });
    setArtistModal({ artist: null, tracks: [] });
    setAddToPlaylistTrack(null);
    setCreatePlaylistOpen(false);
  };

  return (
    <div className="app-shell">
      <div className="app-bg-orb app-bg-orb-left" />
      <div className="app-bg-orb app-bg-orb-right" />

      <div className="app-layout">
        <Sidebar
          currentUser={currentUser}
          activeView={activeView}
          onNavigate={setActiveView}
          onLogout={onLogout}
          myPlaylists={myPlaylists}
          recommendedPlaylists={recommendedPlaylists}
          onOpenPlaylist={openPlaylistModal}
        />

        <MainContent
          loading={loading}
          error={error}
          artists={artists}
          tracks={tracksByArtist}
          allTracks={filteredTracks}
          totalTracks={allTracks.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          recommendedPlaylists={recommendedPlaylists}
          getImageUrl={getImageUrl}
          onTrackSelect={(track) => playTrack(track)}
          onAddTrackToPlaylist={onAddTrackToPlaylist}
          onOpenPlaylist={openPlaylistModal}
          onOpenArtist={openArtistModal}
          currentUser={currentUser}
          activeView={activeView}
          authMode={authMode}
          setAuthMode={setAuthMode}
          authForm={authForm}
          setAuthForm={setAuthForm}
          authError={authError}
          onAuthSubmit={submitAuth}
          myPlaylists={myPlaylists}
          onCreatePlaylist={onCreatePlaylist}
        />
      </div>

      {currentTrack ? (
        <NowPlaying
          track={currentTrack}
          getAudioUrl={getAudioUrl}
          getImageUrl={getImageUrl}
          onNext={() => hasNext && setCurrentTrackId(effectiveQueue[currentIndex + 1].id)}
          onPrevious={() => hasPrevious && setCurrentTrackId(effectiveQueue[currentIndex - 1].id)}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
        />
      ) : null}

      <PlaylistModal
        playlist={playlistModal.playlist}
        tracks={playlistModal.tracks}
        loading={playlistModal.loading}
        onTrackSelect={(track) => playTrack(track, playlistModal.tracks)}
        onClose={() => setPlaylistModal({ playlist: null, tracks: [], loading: false })}
        getImageUrl={getImageUrl}
      />

      <ArtistModal
        artist={artistModal.artist}
        tracks={artistModal.tracks}
        getImageUrl={getImageUrl}
        onTrackSelect={(track) => playTrack(track, artistModal.tracks)}
        onAddTrackToPlaylist={onAddTrackToPlaylist}
        onClose={() => setArtistModal({ artist: null, tracks: [] })}
      />

      <AddToPlaylistModal
        track={addToPlaylistTrack}
        playlists={myPlaylists}
        onSelect={onConfirmAddToPlaylist}
        onClose={() => setAddToPlaylistTrack(null)}
      />

      <CreatePlaylistModal
        open={createPlaylistOpen}
        onClose={() => setCreatePlaylistOpen(false)}
        onCreate={onConfirmCreatePlaylist}
      />
    </div>
  );
}

export default App;
