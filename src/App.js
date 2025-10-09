// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async'; // Import HelmetProvider

import HomePage from './HomePage';
import AdminPage from './AdminPage';
import ProductsPage from './ProductsPage';
import ProductDetailPage from './ProductDetailPage';

function App() {
  return (
    <Router>
      <HelmetProvider> {/* Wrap your entire application with HelmetProvider */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/collection/:gender/:subcategoryName" element={<ProductsPage />} />
          <Route path="/product/:gender/:subcategoryName/:productId" element={<ProductDetailPage />} />

          {/* Add more routes here for other pages (e.g., ContactPage, etc.) */}
          {/* Wildcard route for 404 Not Found (optional) */}
          <Route path="*" element={<div><h1>404 Not Found</h1><p>The page you are looking for does not exist.</p></div>} />
        </Routes>
      </HelmetProvider>
    </Router>
  );
}

export default App;