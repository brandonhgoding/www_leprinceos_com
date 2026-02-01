import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Concessions from './pages/Concessions';
import Engagements from './pages/Engagements';
import Modifiers from './pages/Modifiers';
import EngagementDetail from './pages/EngagementDetail';
import Screens from './pages/Screens';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import SalesTaxes from './pages/SalesTaxes';
import Embeds from './pages/Embeds';
import Integrations from './pages/Integrations';
import Members from './pages/Members';
import MemberDetail from './pages/MemberDetail';
import MembershipTiers from './pages/MembershipTiers';
import TierDetail from './pages/TierDetail';
import Memberships from './pages/Memberships';
import MembershipDetail from './pages/MembershipDetail';

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

      // Press 'N' to create new engagement
      if (e.key === 'n' || e.key === 'N') {
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
          <Route path="concessions" element={<Concessions />} />
          <Route path="modifiers" element={<Modifiers />} />
          <Route path="engagements" element={<Engagements />} />
          <Route path="engagements/:id" element={<EngagementDetail />} />
          <Route path="screens" element={<Screens />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          <Route path="sales-taxes" element={<SalesTaxes />} />
          <Route path="embeds" element={<Embeds />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="members" element={<Members />} />
          <Route path="members/:id" element={<MemberDetail />} />
          <Route path="membership-tiers" element={<MembershipTiers />} />
          <Route path="membership-tiers/:id" element={<TierDetail />} />
          <Route path="memberships" element={<Memberships />} />
          <Route path="memberships/:id" element={<MembershipDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
