// src/components/Layout.tsx
import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import styles from './Layout.module.css';

export default function Layout() {
  const { user, currentCinema, selectCinema } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Transform cinema memberships for Sidebar component
  const cinemas = user?.cinemas.map(c => ({
    id: c.cinema_id,
    name: c.cinema_name,
  })) || [];

  const currentCinemaForSidebar = currentCinema ? {
    id: currentCinema.cinema_id,
    name: currentCinema.cinema_name,
  } : null;

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

      {/* Sidebar */}
      <Sidebar
        currentCinema={currentCinemaForSidebar}
        cinemas={cinemas}
        username={user?.username || ''}
        onCinemaChange={handleCinemaChange}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
      />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.container}>
          <Outlet />
        </div>

        {/* Keyboard Shortcut Hint */}
        <div className={styles.keyboardHint} title="Press N to create new engagement">
          <kbd className={styles.kbd}>N</kbd>
          <span className={styles.hintText}>New Engagement</span>
        </div>
      </main>
    </div>
  );
}
