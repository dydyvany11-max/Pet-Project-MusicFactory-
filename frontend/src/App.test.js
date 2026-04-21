import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          artists: [],
          tracks_by_artist: {},
          playlists: [],
        }),
    })
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders app shell title', async () => {
  render(<App />);
  const title = await screen.findByRole('heading', { name: /Music\s*Factory/i });
  expect(title).toBeInTheDocument();
});
