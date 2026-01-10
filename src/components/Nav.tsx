import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Nav.module.css';

interface Cinema {
  id: number;
  name: string;
}

interface NavProps {
  currentCinema?: Cinema | null;
  cinemas?: Cinema[];
  username?: string;
  onCinemaChange?: (cinemaId: number) => void;
  onLogout?: () => void;
}

export default function Nav({ currentCinema, cinemas = [], username, onCinemaChange, onLogout }: NavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCinemaDropdownOpen, setIsCinemaDropdownOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navLinks = [
    { path: '/dashboard', label: 'Home' },
    { path: '/dashboard/engagements', label: 'Engagements' },
    { path: '/dashboard/showtimes', label: 'Showtimes' },
    { path: '/dashboard/box-office', label: 'Box Office' },
    { path: '/dashboard/embeds', label: 'Embeds' },
  ];

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        {/* Logo and brand */}
        <Link to="/dashboard" className={styles.brand}>
          <div className={styles.brandText}>
            <span className={styles.brandName}>Leprince</span>
            <span className={styles.brandAccent}>OS</span>
          </div>
          <span className={styles.tagline}>run your cinema, not your website.</span>
        </Link>

        {/* Mobile menu button */}
        <button
          className={styles.menuButton}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isMenuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Nav content */}
        <div className={`${styles.navContent} ${isMenuOpen ? styles.navContentOpen : ''}`}>
          {/* Cinema selector (desktop) */}
          {currentCinema && (
            <div className={styles.cinemaSelector}>
              {cinemas.length > 1 ? (
                <div className={styles.dropdown}>
                  <button
                    className={styles.dropdownTrigger}
                    onClick={() => setIsCinemaDropdownOpen(!isCinemaDropdownOpen)}
                  >
                    {currentCinema.name}
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M3 5l3 3 3-3" />
                    </svg>
                  </button>
                  {isCinemaDropdownOpen && (
                    <ul className={styles.dropdownMenu}>
                      {cinemas.map((cinema) => (
                        <li key={cinema.id}>
                          <button
                            className={`${styles.dropdownItem} ${cinema.id === currentCinema.id ? styles.dropdownItemActive : ''}`}
                            onClick={() => {
                              onCinemaChange?.(cinema.id);
                              setIsCinemaDropdownOpen(false);
                            }}
                          >
                            {cinema.id === currentCinema.id && (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                              </svg>
                            )}
                            {cinema.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <span className={styles.cinemaName}>{currentCinema.name}</span>
              )}
            </div>
          )}

          {/* Desktop nav links */}
          <ul className={styles.navLinks}>
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  className={`${styles.navLink} ${isActive(link.path) ? styles.navLinkActive : ''}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile cinema selector */}
          {currentCinema && cinemas.length > 1 && (
            <div className={styles.mobileCinemaSelector}>
              <span className={styles.mobileCinemaLabel}>Switch Cinema</span>
              {cinemas.map((cinema) => (
                <button
                  key={cinema.id}
                  className={`${styles.mobileCinemaItem} ${cinema.id === currentCinema.id ? styles.mobileCinemaItemActive : ''}`}
                  onClick={() => onCinemaChange?.(cinema.id)}
                >
                  {cinema.id === currentCinema.id && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                    </svg>
                  )}
                  {cinema.name}
                </button>
              ))}
            </div>
          )}

          {/* User menu */}
          <div className={styles.userMenu}>
            {username && <span className={styles.username}>{username}</span>}
            <button className={styles.logoutButton} onClick={onLogout}>Logout</button>
          </div>
        </div>
      </div>
    </nav>
  );
}
