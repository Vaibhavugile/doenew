// AdminHome.js
import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "./AdminPage.css"; // reuse your admin styles if you like

export default function AdminHome() {
  return (
    <div className="admin-page-container">
      <Helmet><title>Admin • Dashboard</title></Helmet>

      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Quickly navigate to categories and products.</p>
      </header>

      <section className="admin-card" style={{ marginTop: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          <Link to="/categories" className="admin-btn primary" style={{ textAlign: "center", padding: 18 }}>
            📁 Manage Categories
          </Link>

          <Link to="/admin/products" className="admin-btn" style={{ textAlign: "center", padding: 18 }}>
            🧾 Manage Products
          </Link>

          <Link to="/admin/add-product" className="admin-btn ghost" style={{ textAlign: "center", padding: 18 }}>
            ➕ Add Product
          </Link>

          <Link to="/admin/bulk-products" className="admin-btn ghost" style={{ textAlign: "center", padding: 18 }}>
            📦 Bulk Import
          </Link>
        </div>
      </section>
    </div>
  );
}
