import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    // basename="/dashboard" makes all routes relative to /dashboard
    <BrowserRouter basename="/dashboard">
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
