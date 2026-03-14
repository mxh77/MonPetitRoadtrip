import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import HomePage from './pages/HomePage.jsx';
import RoadtripPage from './pages/RoadtripPage.jsx';
import RoadtripFormPage from './pages/RoadtripFormPage.jsx';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/roadtrips/new" element={<ProtectedRoute><RoadtripFormPage /></ProtectedRoute>} />
        <Route path="/roadtrips/:id/edit" element={<ProtectedRoute><RoadtripFormPage /></ProtectedRoute>} />
        <Route path="/roadtrips/:id" element={<ProtectedRoute><RoadtripPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
