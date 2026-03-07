import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
import PokedexPage from "./pages/PokedexPage";
import ExtradexPage from "./pages/ExtradexPage";
import GuidePage from "./pages/GuidePage";
import BSTPage from "./pages/BSTPage";
import ItemLocationPage from "./pages/ItemLocationPage";
import LoginAdmin from "./pages/LoginAdmin";
import Page404 from "./pages/Page404";
import { useLanguage } from "./contexts/LanguageContext";


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pokedex" element={<PokedexPage />} />
        <Route path="/extradex" element={<ExtradexPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/bst" element={<BSTPage />} />
        <Route path="/item-location" element={<ItemLocationPage />} />
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