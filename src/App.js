// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import HomePage from './HomePage';
import AdminPage from './AdminPage';
import AdminHome from "./AdminHome";
// ✅ import your new category page
import CategoryPage from './components/CategoryPage';

import ProductsPage from './ProductsPage';
import ProductDetailPage from './ProductDetailPage';
import BulkProductsWizard from './BulkProductsWizard';
import AdminProductsManager from './AdminProductsManager';
import BlogRoutes from "./BlogModule";
import BlogsPage from "./pages/BlogsPage";
import { BlogDetails } from "./pages/BlogDetails";
import { AddEditBlog } from "./pages/AddEditBlog";
import AddProductPage from './AddProductPage';
function App() {
  return (
    <Router>
      <HelmetProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />

          {/* ✅ Category Management Page */}
          <Route path="/categories" element={<CategoryPage />} />

          {/* Existing Admin Page */}
          <Route path="/admin" element={<AdminHome />} />

          {/* Product Listing Page */}
          <Route path="/collection/:gender/:subcategoryName" element={<ProductsPage />} />

          {/* Product Details Page */}
          <Route path="/product/:gender/:subcategoryName/:productId" element={<ProductDetailPage />} />
          <Route path="/admin/bulk-products" element={<BulkProductsWizard />} />
          <Route path="/admin/products" element={<AdminProductsManager />} />
         <Route path="/admin/add-product" element={<AddProductPage />} />
        <Route path="/blog" element={<BlogsPage/>} />
        <Route path="/blog/new" element={<AddEditBlog/>} />
        <Route path="/blog/:slug" element={<BlogDetails/>} />
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
