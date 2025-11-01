// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import HomePage from './HomePage';
import AdminPage from './AdminPage';

// ✅ import your new category page
import CategoryPage from './components/CategoryPage';

import ProductsPage from './ProductsPage';
import ProductDetailPage from './ProductDetailPage';

function App() {
  return (
    <Router>
      <HelmetProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />

          {/* ✅ Category Management Page */}
          <Route path="/categories" element={<CategoryPage />} />

          {/* Existing Admin Page */}
          <Route path="/admin" element={<AdminPage />} />

          {/* Product Listing Page */}
          <Route path="/collection/:gender/:subcategoryName" element={<ProductsPage />} />

          {/* Product Details Page */}
          <Route path="/product/:gender/:subcategoryName/:productId" element={<ProductDetailPage />} />

          {/* 404 Fallback */}
          <Route
            path="*"
            element={
              <div style={{ padding: "20px", textAlign: "center" }}>
                <h1>404 Not Found</h1>
                <p>The page you are looking for does not exist.</p>
              </div>
            }
          />
        </Routes>
      </HelmetProvider>
    </Router>
  );
}

export default App;
