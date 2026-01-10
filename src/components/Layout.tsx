import { Outlet } from 'react-router-dom';
import Nav from './Nav';
import { useAuth } from '../contexts/AuthContext';
import styles from './Layout.module.css';

export default function Layout() {
  const { user, currentCinema, selectCinema, logout } = useAuth();

  // Transform cinema memberships for Nav component
  const cinemas = user?.cinemas.map(c => ({
    id: c.cinema_id,
    name: c.cinema_name,
  })) || [];

  const currentCinemaForNav = currentCinema ? {
    id: currentCinema.cinema_id,
    name: currentCinema.cinema_name,
  } : null;

  const handleCinemaChange = (cinemaId: number) => {
    selectCinema(cinemaId);
  };

  return (
    <div className={styles.layout}>
      <Nav
        currentCinema={currentCinemaForNav}
        cinemas={cinemas}
        username={user?.username || ''}
        onCinemaChange={handleCinemaChange}
        onLogout={logout}
      />
      <main className={styles.main}>
        <div className={styles.container}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
