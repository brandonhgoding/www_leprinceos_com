import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Engagements from './pages/Engagements';
import BoxOffice from './pages/BoxOffice';
import Embeds from './pages/Embeds';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<Landing />} />

        {/* Dashboard routes (authenticated) */}
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="engagements" element={<Engagements />} />
          <Route path="box-office" element={<BoxOffice />} />
          <Route path="embeds" element={<Embeds />} />
        </Route>

        {/* Placeholder for login */}
        <Route path="/login" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
