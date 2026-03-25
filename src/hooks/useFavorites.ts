"use client";

import { useState, useEffect } from "react";

const FAVORITES_KEY = "fresh-catch-favorites";

/**
 * Custom hook for managing market favorites in localStorage
 *
 * Phase 1: Anonymous users, localStorage only
 * Future: Sync with database after user login
 */
export function useFavorites(): [
  string[],
  (marketId: string) => void,
  () => void
] {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      } catch (error) {
        console.error("Failed to save favorites:", error);
      }
    }
  }, [favorites, isLoaded]);

  const toggleFavorite = (marketId: string) => {
    setFavorites((prev) =>
      prev.includes(marketId)
        ? prev.filter((id) => id !== marketId)
        : [...prev, marketId]
    );
  };

  const clearFavorites = () => {
    setFavorites([]);
  };

  return [favorites, toggleFavorite, clearFavorites];
}

/**
 * Get favorites from localStorage (for server-side use)
 * Note: This will only work client-side
 */
export function getFavoritesFromStorage(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to read favorites:", error);
    return [];
  }
}
