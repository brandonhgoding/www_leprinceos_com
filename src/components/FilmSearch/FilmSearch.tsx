// src/components/FilmSearch/FilmSearch.tsx
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { filmsApi } from '../../api';
import type { TMDBSearchResult, Film } from '../../api/types';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';
import styles from './FilmSearch.module.css';

interface FilmSearchProps {
  onFilmSelected: (film: Film) => void;
  disabled?: boolean;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w92';
const DEBOUNCE_MS = 300;

export default function FilmSearch({ onFilmSelected, disabled = false }: FilmSearchProps) {
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search TMDB when debounced query changes
  const {
    data: searchResults = [],
    isLoading: isSearching,
    error: searchError,
  } = useQuery({
    queryKey: ['tmdb-search', debouncedQuery],
    queryFn: () => filmsApi.searchTMDB(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create film from TMDB selection
  const createFilmMutation = useMutation({
    mutationFn: (tmdbId: number) => filmsApi.createFromTMDB(tmdbId),
    onSuccess: (film) => {
      onFilmSelected(film);
      setSearchQuery('');
      setDebouncedQuery('');
      setIsDropdownOpen(false);
      setSelectedIndex(-1);
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to add film from TMDB.')),
  });

  // Show dropdown when we have results or are loading/errored
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsDropdownOpen(true);
      setSelectedIndex(-1);
    } else {
      setIsDropdownOpen(false);
    }
  }, [debouncedQuery, searchResults]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (result: TMDBSearchResult) => {
    createFilmMutation.mutate(result.tmdb_id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleSelectResult(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsDropdownOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const formatReleaseYear = (dateString: string): string => {
    if (!dateString) return '';
    return new Date(dateString).getFullYear().toString();
  };

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <div className={styles.container}>
      <label htmlFor="film-search" className={styles.label}>
        Search TMDB for Film
      </label>
      <div className={styles.searchWrapper}>
        <input
          id="film-search"
          ref={searchInputRef}
          type="text"
          className={styles.input}
          placeholder="Search for a film by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (debouncedQuery.length >= 2) {
              setIsDropdownOpen(true);
            }
          }}
          disabled={disabled || createFilmMutation.isPending}
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={isDropdownOpen}
          aria-activedescendant={
            selectedIndex >= 0 ? `result-${selectedIndex}` : undefined
          }
        />

        {/* Loading spinner in input */}
        {isSearching && (
          <div className={styles.inputSpinner} aria-label="Searching">
            <svg className={styles.spinner} viewBox="0 0 24 24">
              <circle
                className={styles.spinnerCircle}
                cx="12"
                cy="12"
                r="10"
                fill="none"
                strokeWidth="3"
              />
            </svg>
          </div>
        )}

        {/* Dropdown results */}
        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            id="search-results"
            className={styles.dropdown}
            role="listbox"
          >
            {isSearching && (
              <div className={styles.loadingState}>
                <div className={styles.loadingSpinner}>
                  <svg className={styles.spinner} viewBox="0 0 24 24">
                    <circle
                      className={styles.spinnerCircle}
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      strokeWidth="3"
                    />
                  </svg>
                </div>
                <p className={styles.loadingText}>Searching TMDB...</p>
              </div>
            )}

            {!isSearching && searchError && (
              <div className={styles.errorState}>
                <svg
                  className={styles.errorIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className={styles.errorText}>
                  Failed to search TMDB. Please try again.
                </p>
              </div>
            )}

            {!isSearching && !searchError && searchResults.length === 0 && (
              <div className={styles.emptyState}>
                <svg
                  className={styles.emptyIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <p className={styles.emptyText}>
                  No films found for "{debouncedQuery}"
                </p>
              </div>
            )}

            {!isSearching && !searchError && searchResults.length > 0 && (
              <>
                {searchResults.map((result, index) => (
                  <button
                    key={result.tmdb_id}
                    id={`result-${index}`}
                    type="button"
                    className={`${styles.resultItem} ${
                      index === selectedIndex ? styles.resultItemSelected : ''
                    }`}
                    onClick={() => handleSelectResult(result)}
                    disabled={createFilmMutation.isPending}
                    role="option"
                    aria-selected={index === selectedIndex}
                  >
                    {/* Poster thumbnail */}
                    <div className={styles.posterWrapper}>
                      {result.poster_path ? (
                        <img
                          src={`${TMDB_IMAGE_BASE}${result.poster_path}`}
                          alt=""
                          className={styles.poster}
                        />
                      ) : (
                        <div className={styles.posterPlaceholder}>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Film details */}
                    <div className={styles.resultContent}>
                      <div className={styles.resultTitle}>
                        {result.title}
                        {result.release_date && (
                          <span className={styles.resultYear}>
                            ({formatReleaseYear(result.release_date)})
                          </span>
                        )}
                      </div>
                      {result.overview && (
                        <p className={styles.resultOverview}>
                          {truncateText(result.overview, 120)}
                        </p>
                      )}
                      {result.vote_average > 0 && (
                        <div className={styles.resultRating}>
                          <svg
                            className={styles.starIcon}
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          {result.vote_average.toFixed(1)}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Creating film indicator */}
      {createFilmMutation.isPending && (
        <div className={styles.creatingIndicator} role="status">
          <svg className={styles.spinner} viewBox="0 0 24 24">
            <circle
              className={styles.spinnerCircle}
              cx="12"
              cy="12"
              r="10"
              fill="none"
              strokeWidth="3"
            />
          </svg>
          <span>Adding film to your library...</span>
        </div>
      )}

      {/* Error creating film */}
      {createFilmMutation.isError && (
        <div className={styles.errorBanner} role="alert">
          Failed to add film. Please try again.
        </div>
      )}

      {/* Help text */}
      {!searchQuery && (
        <p className={styles.helpText}>
          Search The Movie Database for films. Type at least 2 characters to start searching.
        </p>
      )}
    </div>
  );
}
