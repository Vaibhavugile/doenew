// ProductsPage.js — Soft Luxury edition
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import './ProductsPage.css';
import { db } from './firebaseConfig';
import { collection, query, where, getDocs, orderBy as firebaseOrderBy } from 'firebase/firestore';
import { Filter, IndianRupee, Loader2, XCircle, Clock } from 'lucide-react';

/* ===== Cinematic ImageGallery (tilt + ken burns + lightbox) ===== */
function ImageGallery({
  images = [],
  productName = "",
  autoplay = true,
  autoplayInterval = 4500,
  kenBurnsDuration = 12000,
}) {
  const imgs = Array.isArray(images) ? images.filter(Boolean) : [];
  const count = Math.max(1, imgs.length);
  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [tiltStyle, setTiltStyle] = useState({});
  const autoplayRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!autoplay || count <= 1 || hover || lightboxOpen) return;
    autoplayRef.current = setInterval(() => setIndex(i => (i + 1) % count), autoplayInterval);
    return () => clearInterval(autoplayRef.current);
  }, [autoplay, autoplayInterval, count, hover, lightboxOpen]);

  useEffect(() => { setIndex(0); }, [images]);

  useEffect(() => {
    const onKey = (e) => {
      if (lightboxOpen) {
        if (e.key === "Escape") setLightboxOpen(false);
        if (e.key === "ArrowLeft") setIndex(i => (i - 1 + count) % count);
        if (e.key === "ArrowRight") setIndex(i => (i + 1) % count);
      } else {
        if (e.key === "ArrowLeft") setIndex(i => (i - 1 + count) % count);
        if (e.key === "ArrowRight") setIndex(i => (i + 1) % count);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, lightboxOpen]);

  const onMove = (e) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
    if (clientX == null || clientY == null) return;
    const x = (clientX - rect.left) / rect.width - 0.5;
    const y = (clientY - rect.top) / rect.height - 0.5;
    const rotateY = x * 6;
    const rotateX = -y * 6;
    const translateX = x * -6;
    setTiltStyle({
      transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateX(${translateX}px)`,
    });
  };
  const onLeave = () => setTiltStyle({ transform: "" });

  const go = (i) => setIndex((i + count) % count);

  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? "hidden" : "";
  }, [lightboxOpen]);

  if (imgs.length === 0) {
    return (
      <div className="image-gallery cinematic fallback">
        <img src="https://placehold.co/400x500/cccccc/333?text=No+Image" alt={productName || "Product image"} />
      </div>
    );
  }

  return (
    <>
      <div
        className="image-gallery cinematic"
        ref={containerRef}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => { setHover(false); setTiltStyle({ transform: "" }); }}
        onMouseMove={onMove}
        onTouchMove={onMove}
        onTouchEnd={onLeave}
        style={tiltStyle}
        aria-label={`${productName} image gallery cinematic`}
      >
        <button className="ig-nav ig-prev" aria-label="Previous" onClick={() => go(index - 1)}>‹</button>

        <div
          className="ig-main cinematic-main"
          onDoubleClick={() => setLightboxOpen(true)}
          onClick={() => setLightboxOpen(true)}
          role="button"
          tabIndex={0}
        >
          {imgs.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${productName} (${i + 1} of ${imgs.length})`}
              className={`ig-image cinematic ${i === index ? "active" : ""}`}
              style={{ animationDuration: `${kenBurnsDuration}ms` }}
              draggable={false}
              onError={(e) => (e.target.src = "https://placehold.co/800x1000/cccccc/333?text=Image+Not+Found")}
            />
          ))}
          <div className="cinematic-overlay" aria-hidden></div>
        </div>

        <button className="ig-nav ig-next" aria-label="Next" onClick={() => go(index + 1)}>›</button>
      </div>

      {lightboxOpen && (
        <div className="ig-lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" onClick={() => setLightboxOpen(false)}>
          <div className="ig-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button className="lb-close" onClick={() => setLightboxOpen(false)} aria-label="Close">✕</button>
            <button className="lb-arrow lb-prev" onClick={() => go(index - 1)} aria-label="Previous">‹</button>
            <div className="lb-image-wrap">
              <img src={imgs[index]} alt={`${productName} large`} className="lb-image" />
              <div className="lb-caption">{productName} — {index + 1} / {imgs.length}</div>
            </div>
            <button className="lb-arrow lb-next" onClick={() => go(index + 1)} aria-label="Next">›</button>
          </div>
        </div>
      )}
    </>
  );
}

/* =================== Products Page =================== */
function ProductsPage() {
  const { gender, subcategoryName } = useParams();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState('');

  // Filters
  const [selectedStore, setSelectedStore] = useState(() => localStorage.getItem('selectedStore') || 'All');
  const [selectedColor, setSelectedColor] = useState('All');
  const [selectedSize, setSelectedSize] = useState('All');
  const [sortBy, setSortBy] = useState('rentAsc');

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [dynamicStores, setDynamicStores] = useState([]);
  const [dynamicColors, setDynamicColors] = useState([]);
  const [dynamicSizes, setDynamicSizes] = useState([]);

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const storesSnapshot = await getDocs(collection(db, 'filterOptions', 'stores', 'list'));
        setDynamicStores(['All', ...storesSnapshot.docs.map(doc => doc.id)]);

        const colorsSnapshot = await getDocs(collection(db, 'filterOptions', 'colors', 'list'));
        setDynamicColors(['All', ...colorsSnapshot.docs.map(doc => doc.id)]);

        const sizesSnapshot = await getDocs(collection(db, 'filterOptions', 'sizes', 'list'));
        setDynamicSizes(['All', ...sizesSnapshot.docs.map(doc => doc.id)]);
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };
    fetchFilterOptions();
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      setProductError('');
      setProducts([]);

      if (!gender || !subcategoryName) {
        setProductError('Invalid category or subcategory selected.');
        setLoadingProducts(false);
        return;
      }

      try {
        const parentCollection = gender === 'men' ? 'menCategories' : 'womenCategories';

        const subcategoryQuery = query(
          collection(db, parentCollection),
          where('name', '==', subcategoryName)
        );
        const subcategorySnapshot = await getDocs(subcategoryQuery);

        if (subcategorySnapshot.empty) {
          setProductError(`Subcategory "${subcategoryName}" not found.`);
          setLoadingProducts(false);
          return;
        }

        const subcategoryDocId = subcategorySnapshot.docs[0].id;
        let productsCollectionRef = collection(db, parentCollection, subcategoryDocId, 'products');

        let queriesToExecute = [];
        let currentBaseQuery = productsCollectionRef;

        if (selectedColor !== 'All') {
          currentBaseQuery = query(currentBaseQuery, where('color', '==', selectedColor));
        }

        if (sortBy === 'rentAsc') currentBaseQuery = query(currentBaseQuery, firebaseOrderBy('rent', 'asc'));
        else if (sortBy === 'rentDesc') currentBaseQuery = query(currentBaseQuery, firebaseOrderBy('rent', 'desc'));
        else if (sortBy === 'newest') currentBaseQuery = query(currentBaseQuery, firebaseOrderBy('addedDate', 'desc'));

        if (selectedStore !== 'All') {
          queriesToExecute.push(query(currentBaseQuery, where('availableStores', 'array-contains', selectedStore)));
        }
        if (selectedSize !== 'All') {
          queriesToExecute.push(query(currentBaseQuery, where('sizes', 'array-contains', selectedSize)));
        }
        if (queriesToExecute.length === 0) queriesToExecute.push(currentBaseQuery);

        const seen = new Set();
        const all = [];
        for (const qy of queriesToExecute) {
          const snap = await getDocs(qy);
          snap.forEach((doc) => {
            if (!seen.has(doc.id)) {
              all.push({ id: doc.id, ...doc.data() });
              seen.add(doc.id);
            }
          });
        }
        setProducts(all);
      } catch (err) {
        console.error('Error fetching products:', err);
        setProductError('Failed to load products. Please try again later.');
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [gender, subcategoryName, selectedStore, selectedColor, selectedSize, sortBy]);

  const handleStoreChange = (e) => setSelectedStore(e.target.value);
  const handleColorChange = (e) => setSelectedColor(e.target.value);
  const handleSizeChange = (e) => setSelectedSize(e.target.value);
  const handleSortByChange = (e) => setSortBy(e.target.value);
  const toggleMobileFilters = () => setShowMobileFilters((s) => !s);
  const clearFilters = () => {
    setSelectedStore('All');
    setSelectedColor('All');
    setSelectedSize('All');
    setSortBy('rentAsc');
    localStorage.removeItem('selectedStore');
  };

  return (
    <div className="products-page">
      <header className="products-header">
        <div className="products-header-content">
          <h1 className="products-title">{subcategoryName} Collection</h1>
          <p className="products-breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-separator"> / </span>
            <Link to={`/collection/${gender}`} className="breadcrumb-link">{gender === 'men' ? 'Men' : 'Women'}</Link>
            <span className="breadcrumb-separator"> / </span>
            {subcategoryName}
          </p>
        </div>
      </header>

      {/* Filters bar */}
      <div className="filter-bar-wrapper">
        <div className="filter-bar">
          <button className="mobile-filter-toggle" onClick={toggleMobileFilters}>
            <Filter size={18} /> <span className="toggle-text">Filters</span>
          </button>

          <div className="filter-group desktop-filter">
            <label htmlFor="store-select">Store:</label>
            <select id="store-select" value={selectedStore} onChange={handleStoreChange} className="filter-select">
              {dynamicStores.map(store => (<option key={store} value={store}>{store}</option>))}
            </select>
          </div>

          <div className="filter-group desktop-filter">
            <label htmlFor="color-select">Color:</label>
            <select id="color-select" value={selectedColor} onChange={handleColorChange} className="filter-select">
              {dynamicColors.map(color => (<option key={color} value={color}>{color}</option>))}
            </select>
          </div>

          <div className="filter-group desktop-filter">
            <label htmlFor="size-select">Size:</label>
            <select id="size-select" value={selectedSize} onChange={handleSizeChange} className="filter-select">
              {dynamicSizes.map(size => (<option key={size} value={size}>{size}</option>))}
            </select>
          </div>

          <div className="filter-group desktop-filter">
            <label htmlFor="sort-by-select">Sort By:</label>
            <select id="sort-by-select" value={sortBy} onChange={handleSortByChange} className="filter-select">
              <option value="rentAsc">Rent: Low to High</option>
              <option value="rentDesc">Rent: High to Low</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>

          <button className="clear-filters-btn desktop-filter" onClick={clearFilters}>
            <XCircle size={18} /> Clear
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="products-content-wrapper">
        {/* Mobile filter overlay */}
        <aside className={`products-filters-overlay ${showMobileFilters ? 'show' : ''}`}>
          <div className="filters-header">
            <h2 className="filters-title"><Filter size={24} className="icon-mr" /> Filters & Sort</h2>
            <button className="close-filters-btn" onClick={toggleMobileFilters}>×</button>
          </div>

          <div className="filter-group">
            <label htmlFor="store-select-overlay">Store Location:</label>
            <select id="store-select-overlay" value={selectedStore} onChange={handleStoreChange} className="filter-select">
              {dynamicStores.map(store => (<option key={store} value={store}>{store}</option>))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="color-select-overlay">Color:</label>
            <select id="color-select-overlay" value={selectedColor} onChange={handleColorChange} className="filter-select">
              {dynamicColors.map(color => (<option key={color} value={color}>{color}</option>))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="size-select-overlay">Size:</label>
            <select id="size-select-overlay" value={selectedSize} onChange={handleSizeChange} className="filter-select">
              {dynamicSizes.map(size => (<option key={size} value={size}>{size}</option>))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-by-select-overlay">Order:</label>
            <select id="sort-by-select-overlay" value={sortBy} onChange={handleSortByChange} className="filter-select">
              <option value="rentAsc">Rent: Low to High</option>
              <option value="rentDesc">Rent: High to Low</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>

          <button className="clear-filters-btn-overlay" onClick={clearFilters}>
            <XCircle size={20} className="icon-mr" /> Clear All Filters
          </button>
        </aside>

        <main className="products-listing">
          {loadingProducts ? (
            <div className="message-container loading">
              <Loader2 size={48} className="spin" />
              <p className="message-text">Fetching amazing products...</p>
            </div>
          ) : productError ? (
            <p className="message-container error">
              <XCircle size={24} className="icon-mr" /> {productError}
            </p>
          ) : products.length === 0 ? (
            <div className="message-container no-products-found">
              <Clock size={60} className="no-products-icon" />
              <p className="no-products-title">We will be coming soon!</p>
              <p className="no-products-text">Get ready for an exciting collection! We're busy preparing something special for you.</p>
            </div>
          ) : (
            <div className="product-grid">
              {products.map(product => (
                <Link
                  to={`/product/${gender}/${subcategoryName}/${product.id}`}
                  key={product.id}
                  className="product-card-link"
                >
                  <div className="product-card">
                    <div className="product-image-container">
                      <ImageGallery
                        images={[product.imageUrl, ...(product.images || [])]}
                        productName={product.name}
                        autoplay={true}
                        autoplayInterval={5000}
                        kenBurnsDuration={12000}
                      />
                    </div>

                    <div className="product-info">
                      <h3 className="product-name">{product.name}</h3>
                      <p className="product-color">Available Stores: {product.availableStores ? product.availableStores.join(', ') : 'N/A'}</p>
                      <p className="product-color">Available Sizes: {product.sizes ? product.sizes.join(', ') : 'N/A'}</p>
                      <p className="product-rent">
                        <IndianRupee size={14} className="inline-icon" />
                        {Number(product.rent).toLocaleString('en-IN')}
                        <span className="rent-per-day"> for 3 days</span>
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default ProductsPage;
