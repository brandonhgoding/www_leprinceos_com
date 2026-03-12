// src/components/Layout.tsx
import { useState, useCallback, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import AlertBanner from './AlertBanner';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import styles from './Layout.module.css';

export interface LayoutContext {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

export default function Layout() {
  const { user, currentCinema, isManager, selectCinema } = useAuth();
  const { toasts, dismissToast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
      return next;
    });
  }, []);

  // Sync state when browser exits fullscreen (e.g. user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Transform cinema memberships for Sidebar component
  const cinemas =
    user?.cinemas.map((c) => ({
      id: c.cinema_id,
      name: c.cinema_name,
    })) || [];

  const currentCinemaForSidebar = currentCinema
    ? {
        id: currentCinema.cinema_id,
        name: currentCinema.cinema_name,
      }
    : null;

  const handleCinemaChange = (cinemaId: number) => {
    selectCinema(cinemaId);
  };

  const handleLogout = () => {
    // Redirect to Django's logout endpoint (full page navigation)
    window.location.href = '/logout/';
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className={styles.layout}>
      {/* Mobile Header */}
      {!isFullscreen && (
        <header className={styles.mobileHeader}>
          <button
            className={styles.mobileMenuToggle}
            onClick={toggleSidebar}
            aria-label="Toggle navigation"
          >
            <span className={styles.hamburgerIcon}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
          <Link to="/" className={styles.mobileBrand}>
            LeprinceOS
          </Link>
        </header>
      )}

      {/* Sidebar */}
      {!isFullscreen && (
        <Sidebar
          currentCinema={currentCinemaForSidebar}
          cinemas={cinemas}
          username={user?.username || ''}
          isManager={isManager}
          onCinemaChange={handleCinemaChange}
          onLogout={handleLogout}
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
        />
      )}

      {/* Main Content */}
      <main className={isFullscreen ? styles.mainFullscreen : styles.main}>
        <div className={isFullscreen ? styles.containerFullscreen : styles.container}>
          {toasts.length > 0 && <AlertBanner alerts={toasts} onDismiss={dismissToast} />}
          <Outlet context={{ isFullscreen, toggleFullscreen } satisfies LayoutContext} />
        </div>

        {/* Keyboard Shortcut Hint */}
        {!isFullscreen && (
          <div className={styles.keyboardHint} title="Press Alt+N to create new engagement">
            <kbd className={styles.kbd}>Alt+N</kbd>
            <span className={styles.hintText}>New Engagement</span>
          </div>
        )}
      </main>
    </div>
  );
}
