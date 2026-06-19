import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import ManagerRoute from './components/ManagerRoute';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Engagements from './pages/Engagements';
import EngagementDetail from './pages/EngagementDetail';
import Screens from './pages/Screens';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import Embeds from './pages/Embeds';
import Integrations from './pages/Integrations';
import Members from './pages/Members';
import MemberDetail from './pages/MemberDetail';
import MembershipTiers from './pages/MembershipTiers';
import TierDetail from './pages/TierDetail';
import Memberships from './pages/Memberships';
import MembershipDetail from './pages/MembershipDetail';
import ShowtimeReport from './pages/reports/ShowtimeReport';
import EngagementReport from './pages/reports/EngagementReport';
import TicketDetailReport from './pages/reports/TicketDetailReport';
import EngagementSummaryReport from './pages/reports/EngagementSummaryReport';

function NotFound() {
  return (
    <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
      <h1
        style={{
          fontFamily: 'var(--font-heading)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-md)',
        }}
      >
        404 — Page Not Found
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
        The page you are looking for does not exist.
      </p>
      <Link to="/" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
        Return to dashboard
      </Link>
    </div>
  );
}

function KeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input or textarea
      const activeElement = document.activeElement;
      const isTyping =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.hasAttribute('contenteditable');

      if (isTyping) return;

      // Press Alt+N to create new engagement
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        navigate('/engagements');
        // Dispatch custom event to trigger drawer opening
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open-create-engagement-drawer'));
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return null;
}

function App() {
  return (
    // basename="/dashboard" makes all routes relative to /dashboard
    <BrowserRouter basename="/dashboard">
      <KeyboardShortcuts />
      <Routes>
        {/* All dashboard routes are protected by Django's @login_required */}
        {/* ProtectedRoute provides client-side session validation */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="engagements" element={<Engagements />} />
          <Route path="engagements/:id" element={<EngagementDetail />} />
          <Route path="screens" element={<Screens />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          <Route path="embeds" element={<Embeds />} />
          <Route
            path="integrations"
            element={
              <ManagerRoute>
                <Integrations />
              </ManagerRoute>
            }
          />
          <Route path="members" element={<Members />} />
          <Route path="members/:id" element={<MemberDetail />} />
          <Route path="membership-tiers" element={<MembershipTiers />} />
          <Route path="membership-tiers/:id" element={<TierDetail />} />
          <Route path="memberships" element={<Memberships />} />
          <Route path="memberships/:id" element={<MembershipDetail />} />
          <Route
            path="reports/showtime"
            element={
              <ManagerRoute>
                <ShowtimeReport />
              </ManagerRoute>
            }
          />
          <Route
            path="reports/engagement"
            element={
              <ManagerRoute>
                <EngagementReport />
              </ManagerRoute>
            }
          />
          <Route
            path="reports/tickets"
            element={
              <ManagerRoute>
                <TicketDetailReport />
              </ManagerRoute>
            }
          />
          <Route
            path="reports/summary"
            element={
              <ManagerRoute>
                <EngagementSummaryReport />
              </ManagerRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
