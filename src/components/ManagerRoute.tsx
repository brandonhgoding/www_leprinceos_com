// src/components/ManagerRoute.tsx
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ManagerRouteProps {
  children: ReactNode;
}

export default function ManagerRoute({ children }: ManagerRouteProps) {
  const { isManager } = useAuth();

  if (!isManager) {
    return (
      <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-md)',
          }}
        >
          Access Denied
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
          You do not have permission to view this page.
        </p>
        <Link to="/" style={{ color: 'var(--brass)', textDecoration: 'underline' }}>
          Return to dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
