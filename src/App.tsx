import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Home from './pages/Home';
import Engagements from './pages/Engagements';
import EngagementDetail from './pages/EngagementDetail';
import Screens from './pages/Screens';
import BoxOffice from './pages/BoxOffice';
import Embeds from './pages/Embeds';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* Protected dashboard routes */}
        <Route
          path="/dashboard"
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
          <Route path="box-office" element={<BoxOffice />} />
          <Route path="embeds" element={<Embeds />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
