// Favorites island (bead #58, decision C3 pattern — hand-written ES module in
// public/js/, same reasoning as catch-record.js). localStorage-backed,
// keyed to the device-token cookie: the cookie itself is httpOnly, so the
// server renders its value into `<body data-device-token>` for this script
// to read. Shape ported from `main`'s useFavorites.ts, minus React.
(() => {
  const STORAGE_PREFIX = "fresh-catch-favorites:";
  const deviceToken = document.body.dataset.deviceToken || "anon";
  const storageKey = STORAGE_PREFIX + deviceToken;

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveFavorites(favorites) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(favorites));
    } catch {
      // Private browsing / quota exceeded — favorites just won't persist.
    }
  }

  function applyState(button, isFavorite) {
    button.setAttribute("aria-pressed", String(isFavorite));
    button.innerHTML = isFavorite
      ? '<span aria-hidden="true">★</span> Saved'
      : '<span aria-hidden="true">☆</span> Save';
  }

  const favorites = loadFavorites();
  document.querySelectorAll(".favorite-toggle").forEach((button) => {
    const marketId = button.dataset.marketId;
    applyState(button, favorites.includes(marketId));
    button.addEventListener("click", () => {
      const index = favorites.indexOf(marketId);
      if (index === -1) {
        favorites.push(marketId);
      } else {
        favorites.splice(index, 1);
      }
      saveFavorites(favorites);
      applyState(button, favorites.includes(marketId));
    });
  });
})();
