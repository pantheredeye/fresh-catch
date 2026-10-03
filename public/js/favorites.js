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

  // Saved band (#73 item 4): the server renders a pin for every market with
  // a computable occurrence, hidden by default (`hidden` attribute, not
  // display:none, so it degrades correctly with no JS). This function is
  // re-run after every toggle so the band/count/pin set stays in sync.
  function renderSavedBand(favorites) {
    const band = document.getElementById("saved-band");
    if (!band) return;
    const pins = band.querySelectorAll(".pin");
    let shown = 0;
    pins.forEach((pin) => {
      const isSaved = favorites.includes(pin.dataset.marketId);
      pin.hidden = !isSaved;
      if (isSaved) shown++;
    });
    band.hidden = shown === 0;
    const count = document.getElementById("saved-count");
    if (count) count.textContent = shown === 1 ? "1 saved" : `${shown} saved`;
  }

  const favorites = loadFavorites();
  renderSavedBand(favorites);

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
      renderSavedBand(favorites);
    });
  });
})();
