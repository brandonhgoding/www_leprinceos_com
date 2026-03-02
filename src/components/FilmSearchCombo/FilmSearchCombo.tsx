// src/components/FilmSearchCombo/FilmSearchCombo.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filmsApi } from '../../api';
import type { Film, TMDBSearchResult } from '../../api/types';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';
import styles from './FilmSearchCombo.module.css';

interface FilmSearchComboProps {
  onFilmSelected: (film: Film) => void;
  disabled?: boolean;
  selectedFilmId?: number | '';
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w92';
const DEBOUNCE_MS = 300;

export default function FilmSearchCombo({
  onFilmSelected,
  disabled = false,
  selectedFilmId,
}: FilmSearchComboProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showTMDBResults, setShowTMDBResults] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevDebouncedQueryRef = useRef<string>('');

  // Handle search query changes with debouncing
  const handleSearchQueryChange = useCallback((value: string) => {
    setSearchQuery(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const trimmed = value.trim();
      // Only update if the value actually changed
      if (trimmed !== prevDebouncedQueryRef.current) {
        prevDebouncedQueryRef.current = trimmed;
        setDebouncedQuery(trimmed);
        // Reset TMDB results when query changes
        setShowTMDBResults(false);
        // Update dropdown state based on query
        if (trimmed.length >= 1) {
          setIsDropdownOpen(true);
          setSelectedIndex(-1);
        } else {
          setIsDropdownOpen(false);
        }
      }
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Search local films
  const { data: localFilms = [], isLoading: isSearchingLocal } = useQuery({
    queryKey: ['films', 'search', debouncedQuery],
    queryFn: () => filmsApi.list(debouncedQuery || undefined),
    enabled: debouncedQuery.length >= 1,
  });

  // Search TMDB - only when explicitly triggered
  const {
    data: tmdbResults = [],
    isLoading: isSearchingTMDB,
    refetch: searchTMDB,
  } = useQuery({
    queryKey: ['tmdb-search', debouncedQuery],
    queryFn: () => filmsApi.searchTMDB(debouncedQuery),
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  // Create film from TMDB selection
  const createFilmMutation = useMutation({
    mutationFn: (tmdbId: number) => filmsApi.createFromTMDB(tmdbId),
    onSuccess: (film) => {
      onFilmSelected(film);
      setSearchQuery('');
      setDebouncedQuery('');
      prevDebouncedQueryRef.current = '';
      setIsDropdownOpen(false);
      setSelectedIndex(-1);
      setShowTMDBResults(false);
      queryClient.invalidateQueries({ queryKey: ['films'] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to add film from TMDB.')),
  });

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

  const handleSelectLocalFilm = (film: Film) => {
    onFilmSelected(film);
    setSearchQuery('');
    setDebouncedQuery('');
    prevDebouncedQueryRef.current = '';
    setIsDropdownOpen(false);
    setSelectedIndex(-1);
    setShowTMDBResults(false);
  };

  const handleSearchTMDB = () => {
    setShowTMDBResults(true);
    searchTMDB();
  };

  const handleSelectTMDBResult = (result: TMDBSearchResult) => {
    createFilmMutation.mutate(result.tmdb_id);
  };

  // Calculate total navigable items
  const tmdbOptionIndex = localFilms.length;
  const tmdbResultsStartIndex = localFilms.length + 1;
  const totalItems = localFilms.length + 1 + (showTMDBResults ? tmdbResults.length : 0);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < localFilms.length) {
          handleSelectLocalFilm(localFilms[selectedIndex]);
        } else if (selectedIndex === tmdbOptionIndex) {
          handleSearchTMDB();
        } else if (showTMDBResults && selectedIndex >= tmdbResultsStartIndex) {
          const tmdbIndex = selectedIndex - tmdbResultsStartIndex;
          if (tmdbIndex < tmdbResults.length) {
            handleSelectTMDBResult(tmdbResults[tmdbIndex]);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsDropdownOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleInputFocus = () => {
    if (debouncedQuery.length >= 1) {
      setIsDropdownOpen(true);
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

  // Get selected film name for display
  const { data: allFilms = [] } = useQuery({
    queryKey: ['films'],
    queryFn: () => filmsApi.list(),
  });
  const selectedFilm = selectedFilmId ? allFilms.find((f) => f.id === selectedFilmId) : null;

  return (
    <div className={styles.container}>
      <div className={styles.searchWrapper}>
        <input
          id="film-search"
          ref={searchInputRef}
          type="text"
          className={styles.input}
          placeholder="Search for a film..."
          value={searchQuery}
          onChange={(e) => handleSearchQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          disabled={disabled || createFilmMutation.isPending}
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={isDropdownOpen}
          aria-activedescendant={selectedIndex >= 0 ? `result-${selectedIndex}` : undefined}
        />

        {/* Loading spinner in input */}
        {(isSearchingLocal || isSearchingTMDB) && (
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
        {isDropdownOpen && debouncedQuery.length >= 1 && (
          <div ref={dropdownRef} id="search-results" className={styles.dropdown} role="listbox">
            {/* Local Films Section */}
            {isSearchingLocal ? (
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
                <p className={styles.loadingText}>Searching...</p>
              </div>
            ) : (
              <>
                {localFilms.length > 0 && (
                  <>
                    <div className={styles.sectionHeader}>Your Films</div>
                    {localFilms.map((film, index) => (
                      <button
                        key={film.id}
                        id={`result-${index}`}
                        type="button"
                        className={`${styles.resultItem} ${
                          index === selectedIndex ? styles.resultItemSelected : ''
                        }`}
                        onClick={() => handleSelectLocalFilm(film)}
                        disabled={createFilmMutation.isPending}
                        role="option"
                        aria-selected={index === selectedIndex}
                      >
                        <div className={styles.posterWrapper}>
                          {film.poster_url ? (
                            <img src={film.poster_url} alt="" className={styles.poster} />
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
                        <div className={styles.resultContent}>
                          <div className={styles.resultTitle}>
                            {film.title}
                            {film.runtime_minutes && (
                              <span className={styles.resultMeta}>{film.runtime_minutes} min</span>
                            )}
                          </div>
                          {film.rating && (
                            <span className={styles.resultRating}>{film.rating}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {localFilms.length === 0 && !isSearchingLocal && (
                  <div className={styles.emptyLocalState}>
                    <p className={styles.emptyText}>No films found for "{debouncedQuery}"</p>
                  </div>
                )}

                {/* Divider */}
                <div className={styles.divider} />

                {/* TMDB Search Option */}
                <button
                  id={`result-${tmdbOptionIndex}`}
                  type="button"
                  className={`${styles.tmdbOption} ${
                    selectedIndex === tmdbOptionIndex ? styles.resultItemSelected : ''
                  }`}
                  onClick={handleSearchTMDB}
                  disabled={createFilmMutation.isPending || isSearchingTMDB}
                  role="option"
                  aria-selected={selectedIndex === tmdbOptionIndex}
                >
                  <svg
                    className={styles.tmdbIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <span>Search TMDB for "{debouncedQuery}"</span>
                </button>

                {/* TMDB Results Section */}
                {showTMDBResults && (
                  <>
                    {isSearchingTMDB ? (
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
                    ) : (
                      <>
                        {tmdbResults.length > 0 && (
                          <>
                            <div className={styles.sectionHeader}>
                              <svg
                                className={styles.sectionIcon}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12h20" />
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                              </svg>
                              TMDB Results
                            </div>
                            {tmdbResults.map((result, index) => (
                              <button
                                key={result.tmdb_id}
                                id={`result-${tmdbResultsStartIndex + index}`}
                                type="button"
                                className={`${styles.resultItem} ${styles.tmdbResultItem} ${
                                  selectedIndex === tmdbResultsStartIndex + index
                                    ? styles.resultItemSelected
                                    : ''
                                }`}
                                onClick={() => handleSelectTMDBResult(result)}
                                disabled={createFilmMutation.isPending}
                                role="option"
                                aria-selected={selectedIndex === tmdbResultsStartIndex + index}
                              >
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
                                      {truncateText(result.overview, 100)}
                                    </p>
                                  )}
                                  {result.vote_average > 0 && (
                                    <div className={styles.tmdbRating}>
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

                        {tmdbResults.length === 0 && (
                          <div className={styles.emptyState}>
                            <p className={styles.emptyText}>
                              No TMDB results for "{debouncedQuery}"
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
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

      {/* Selected film display */}
      {selectedFilm && !searchQuery && (
        <div className={styles.selectedFilm}>
          <svg
            className={styles.checkIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Selected: {selectedFilm.title}</span>
        </div>
      )}

      {/* Help text */}
      {!searchQuery && !selectedFilm && (
        <p className={styles.helpText}>Search your films or find new ones on TMDB.</p>
      )}
    </div>
  );
}
