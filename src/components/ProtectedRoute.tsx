// src/components/ProtectedRoute.tsx
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to Django's login page with return URL
      // Use window.location for full page navigation (not React Router)
      const returnUrl = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?next=${returnUrl}`;
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--charcoal)',
          color: 'var(--paper)',
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
