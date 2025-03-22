import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import InstallationGuide from './pages/InstallationGuide';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs/installation" element={<InstallationGuide />} />
        {/* ... your existing routes */}
      </Routes>
    </BrowserRouter>
  );
}

export default App; 