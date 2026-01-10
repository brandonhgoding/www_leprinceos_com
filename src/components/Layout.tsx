import { Outlet } from 'react-router-dom';
import Nav from './Nav';
import styles from './Layout.module.css';

export default function Layout() {
  // Mock data - in a real app this would come from auth context or API
  const mockCinema = { id: 1, name: 'Alamo Drafthouse' };
  const mockCinemas = [
    { id: 1, name: 'Alamo Drafthouse' },
    { id: 2, name: 'Regal Cinema' },
  ];
  const mockUsername = 'demo_user';

  return (
    <div className={styles.layout}>
      <Nav
        currentCinema={mockCinema}
        cinemas={mockCinemas}
        username={mockUsername}
      />
      <main className={styles.main}>
        <div className={styles.container}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
