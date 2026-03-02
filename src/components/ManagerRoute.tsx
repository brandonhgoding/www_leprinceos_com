// src/components/ManagerRoute.tsx
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ManagerRouteProps {
  children: React.ReactNode;
}

export default function ManagerRoute({ children }: ManagerRouteProps) {
  const { isManager } = useAuth();

  if (!isManager) {
    return (
      <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-md)',
          }}
        >
          Access Denied
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
          You do not have permission to view this page.
        </p>
        <Link to="/" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
          Return to dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
