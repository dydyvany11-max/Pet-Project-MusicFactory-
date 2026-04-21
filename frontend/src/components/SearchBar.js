import React from 'react';

function SearchBar({ searchQuery, setSearchQuery }) {
  return (
    <div className="search-wrap">
      <input
        className="search-input"
        type="text"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search tracks, artists, genre"
      />
      {searchQuery ? (
        <button className="search-clear" type="button" onClick={() => setSearchQuery('')}>
          x
        </button>
      ) : null}
    </div>
  );
}

export default SearchBar;
