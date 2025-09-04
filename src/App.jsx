import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import content from "./config/index.js";
import patchNotesData from "./config/patchnotes.json";
import HeroVideo from "./components/HeroVideo";
import Carousel from "./components/Carousel";
import Modal from "./components/Modal";
import YouTubeAudio from "./components/YouTubeAudio";
import NewsBanner from "./components/NewsBanner";
import LanguageSelector from "./components/LanguageSelector";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPanel from "./pages/AdminPanel";
import HomePage from "./pages/HomePage";
import LoginAdmin from "./pages/LoginAdmin";
import Page404 from "./pages/Page404";
import { useLanguage } from "./contexts/LanguageContext";

// Composant pour gérer la redirection Auth0
function AuthRedirectHandler() {
  const { isAuthenticated, isLoading } = useAuth0();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Si on arrive sur la page d'accueil après connexion Auth0 ET on est authentifié
    // ET il y a des paramètres Auth0 dans l'URL (code, state)
    if (!isLoading && isAuthenticated && location.pathname === '/' && 
        (location.search.includes('code=') || location.search.includes('state='))) {
      // Rediriger vers admin-login
      navigate('/admin-login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  return null;
}

export default function App() {
  return (
    <Router>
      <AuthRedirectHandler />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin-login" element={<LoginAdmin />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        } />
        {/* Route catch-all pour les pages inexistantes */}
        <Route path="*" element={<Page404 />} />
      </Routes>
    </Router>
  );
}