import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import './ProductDetailPage.css';
import { db } from './firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { IndianRupee, MessageSquare, Info, CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight, Ruler, Palette, ZoomIn, ZoomOut, Maximize2, MapPin, Clock } from 'lucide-react';

function ProductDetailPage() {
    const storedTheme = localStorage.getItem('theme') || 'light';

    const { gender, subcategoryName, productId } = useParams();

    const [product, setProduct] = useState(null);
    const [loadingProduct, setLoadingProduct] = useState(true);
    const [productError, setProductError] = useState('');

    const [selectedSize, setSelectedSize] = useState('');
    const [selectedColor, setSelectedColor] = useState('');

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [displayImages, setDisplayImages] = useState([]); // State for combined images

    const [showModal, setShowModal] = useState(false); // For inquiry/error modal
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState('');

    // --- New States for Zoom Modal ---
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [zoomImageUrl, setZoomImageUrl] = useState('');
    const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100% zoom
    const imageRef = useRef(null); // Ref for the image in the zoom modal for pan
    const [isPanning, setIsPanning] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });
    const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });

    // --- New State for Related Products ---
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loadingRelatedProducts, setLoadingRelatedProducts] = useState(false);
    const [relatedProductsError, setRelatedProductsError] = useState('');
    const [deliveryPincode, setDeliveryPincode] = useState('');
    const [serviceabilityResult, setServiceabilityResult] = useState(null); // { success: bool, message: string, ...}
    const [loadingServiceability, setLoadingServiceability] = useState(false);

    // Tracks the user's final choice (Fastest or Cheapest)
    // Check if the product is available for Pan India delivery based on the stores array
    const isPanIndiaDelivery = product && product.availableStores && product.availableStores.includes('PAN INDIA Delivery');

    // REFS for cinematic effects
    const galleryRef = useRef(null);

    useEffect(() => {
        const fetchProduct = async () => {
            setLoadingProduct(true);
            setProductError('');
            setProduct(null);
            setDisplayImages([]);
            setRelatedProducts([]); // Clear related products on new product fetch
            setDeliveryPincode('');
            setServiceabilityResult(null);
            if (!productId || !gender || !subcategoryName) {
                setProductError("Missing product ID, gender, or subcategory name in URL.");
                setLoadingProduct(false);
                return;
            }

            try {
                const parentCollection = gender === 'men' ? 'menCategories' : 'womenCategories';
                let currentSubcategoryDocId = ''; // To store the subcategory document ID

                const subcategoryQuery = query(
                    collection(db, parentCollection),
                    where('name', '==', subcategoryName)
                );
                const subcategorySnapshot = await getDocs(subcategoryQuery);

                if (subcategorySnapshot.empty) {
                    setProductError(`Subcategory "${subcategoryName}" not found in ${parentCollection}.`);
                    setLoadingProduct(false);
                    return;
                }

                const subcategoryDoc = subcategorySnapshot.docs[0];
                currentSubcategoryDocId = subcategoryDoc.id; // Store for related products fetch

                const productDocRef = doc(db, parentCollection, currentSubcategoryDocId, 'products', productId);
                const productDocSnap = await getDoc(productDocRef);

                if (!productDocSnap.exists()) {
                    setProductError("Product not found with the given ID and category.");
                    setLoadingProduct(false);
                    return;
                }

                const productData = productDocSnap.data();
                setProduct({ id: productDocSnap.id, ...productData });

                const combinedProductImages = [];
                const uniqueImageUrls = new Set();

                if (productData.imageUrl && typeof productData.imageUrl === 'string') {
                    combinedProductImages.push(productData.imageUrl);
                    uniqueImageUrls.add(productData.imageUrl);
                }

                if (productData.images && Array.isArray(productData.images)) {
                    productData.images.forEach(img => {
                        if (img && typeof img === 'string' && !uniqueImageUrls.has(img)) {
                            combinedProductImages.push(img);
                            uniqueImageUrls.add(img);
                        }
                    });
                }
                setDisplayImages(combinedProductImages);

                if (productData.sizes && productData.sizes.length > 0) {
                    setSelectedSize(productData.sizes[0]);
                }
                if (productData.colors && productData.colors.length > 0) {
                    setSelectedColor(productData.colors[0]);
                } else if (productData.color) {
                    setSelectedColor(productData.color);
                }

                setCurrentImageIndex(0);

                // --- Fetch Related Products ---
                setLoadingRelatedProducts(true);
                setRelatedProductsError('');
                try {
                    let relatedProductsQuery = collection(db, parentCollection, currentSubcategoryDocId, 'products');
                    relatedProductsQuery = query(
                        relatedProductsQuery,
                        where('__name__', '!=', productId) // Exclude the current product
                    );

                    // If the product has 'availableStores', filter by it
                    if (productData.availableStores && Array.isArray(productData.availableStores) && productData.availableStores.length > 0) {
                        relatedProductsQuery = query(
                            relatedProductsQuery,
                            where('availableStores', 'array-contains-any', productData.availableStores)
                        );
                    }

                    relatedProductsQuery = query(relatedProductsQuery, limit(6));

                    const relatedProductsSnapshot = await getDocs(relatedProductsQuery);
                    const fetchedRelatedProducts = relatedProductsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setRelatedProducts(fetchedRelatedProducts);

                } catch (relatedError) {
                    console.error("Error fetching related products:", relatedError);
                    setRelatedProductsError("Failed to load related products.");
                } finally {
                    setLoadingRelatedProducts(false);
                }

            } catch (error) {
                console.error("Error fetching product:", error);
                setProductError("Failed to load product details. Please try again later. " + error.message);
            } finally {
                setLoadingProduct(false);
            }
        };

        fetchProduct();
    }, [productId, gender, subcategoryName]);

    // Cinematic: update CSS var on scroll so background layers can move
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = Math.round(window.scrollY * 0.06);
            document.documentElement.style.setProperty('--scroll-offset', `${scrollTop}px`);
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Cinematic: create mouse-following light element inside galleryRef
    useEffect(() => {
        const gallery = galleryRef.current;
        if (!gallery) return;

        // Respect reduced motion — don't create fancy light if user prefers reduced motion
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) return;

        const lightEl = document.createElement('div');
        lightEl.className = 'mouse-light';
        lightEl.style.opacity = '0';
        lightEl.style.pointerEvents = 'none';
        gallery.style.position = gallery.style.position || 'relative';
        gallery.appendChild(lightEl);

        const onMove = (e) => {
            const rect = gallery.getBoundingClientRect();
            const clientX = e.clientX ?? (e.touches && e.touches[0] && e.touches[0].clientX);
            const clientY = e.clientY ?? (e.touches && e.touches[0] && e.touches[0].clientY);
            if (clientX == null || clientY == null) return;
            const x = clientX - rect.left;
            const y = clientY - rect.top;
            lightEl.style.left = `${x}px`;
            lightEl.style.top = `${y}px`;
            lightEl.style.opacity = '0.28';
        };
        const onLeave = () => {
            lightEl.style.opacity = '0';
        };

        gallery.addEventListener('mousemove', onMove);
        gallery.addEventListener('touchmove', onMove, { passive: true });
        gallery.addEventListener('mouseleave', onLeave);
        gallery.addEventListener('touchend', onLeave);

        return () => {
            gallery.removeEventListener('mousemove', onMove);
            gallery.removeEventListener('touchmove', onMove);
            gallery.removeEventListener('mouseleave', onLeave);
            gallery.removeEventListener('touchend', onLeave);
            lightEl.remove();
        };
    }, [galleryRef.current]);

    // Related products reveal (intersection observer)
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.2 });

        const nodes = document.querySelectorAll('.related-product-card');
        nodes.forEach(n => observer.observe(n));
        return () => observer.disconnect();
    }, [relatedProducts]);

    // Make sure body scroll is never stuck when this page loads
    useEffect(() => {
        const unlock = () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
        unlock();           // on mount
        return unlock;      // on unmount (safety)
    }, []);


    const handleThumbnailClick = (index) => {
        setCurrentImageIndex(index);
    };

    const handlePrevImage = () => {
        setCurrentImageIndex((prevIndex) =>
            prevIndex === 0 ? (displayImages.length || 1) - 1 : prevIndex - 1
        );
    };

    const handleNextImage = () => {
        setCurrentImageIndex((prevIndex) =>
            prevIndex === (displayImages.length || 1) - 1 ? 0 : prevIndex + 1
        );
    };




    const handleEnquire = async () => {
        if (!product) {
            setModalMessage('Product details are not available for inquiry.');
            setModalType('error');
            setShowModal(true);
            return;
        }

        try {
            const whatsappNumber = '+918698797007';


            const storeName = product?.availableStores?.length > 0
                ? product.availableStores.join(', ')
                : 'Store Info Not Available';


            const productPageLink = window.location.href;

            const message =
                `Hello, I'm interested in renting the product:\n` +
                `*${product.name}*\n` +
                `Product Code: ${product.productCode}\n` +
                `Rent: ₹${product.rent?.toLocaleString('en-IN')} for 3 days\n\n` +
                `*Available At:* ${storeName}\n\n` +
                `Product Link:\n${productPageLink}\n\n` +
                `Please provide more details.`;

            const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

            window.open(whatsappUrl, '_blank');
            setModalMessage(`Inquiry sent on WhatsApp! We will respond shortly.`);
            setModalType('success');
            setShowModal(true);

        } catch (error) {
            console.error("Error sending inquiry:", error);
            setModalMessage('Failed to open WhatsApp. Please try again.');
            setModalType('error');
            setShowModal(true);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setModalMessage('');
        setModalType('');
    };



    // --- New Zoom Modal Functions ---
    const openZoomModal = (imageUrl) => {
        setZoomImageUrl(imageUrl);
        setZoomLevel(1);
        setImageOffset({ x: 0, y: 0 });
        setShowZoomModal(true);
        document.body.style.overflow = 'hidden';
    };

    const closeZoomModal = () => {
        setShowZoomModal(false);
        setZoomImageUrl('');
        setZoomLevel(1);
        setImageOffset({ x: 0, y: 0 });
        document.body.style.overflow = 'unset';
    };

    const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.2, 3));
    const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.2, 1));

    const handleMouseDown = (e) => {
        if (zoomLevel > 1) {
            setIsPanning(true);
            setStartPan({ x: e.clientX - imageOffset.x, y: e.clientY - imageOffset.y });
        }
    };

    const handleMouseMove = (e) => {
        if (!isPanning || zoomLevel === 1) return;
        const newX = e.clientX - startPan.x;
        const newY = e.clientY - startPan.y;
        setImageOffset({ x: newX, y: newY });
    };

    const handleMouseUp = () => setIsPanning(false);
    const handleDoubleClick = () => { setZoomLevel(1); setImageOffset({ x: 0, y: 0 }); };

    if (loadingProduct) {
        return (
            <div className="loading-spinner-container">
                <Loader2 className="loading-spinner" />
                <p>Loading product details...</p>
            </div>
        );
    }

    if (productError) {
        return (
            <div className="product-detail-page error-state">
                <XCircle size={48} className="text-red-500" />
                <p>{productError}</p>
                <Link to={`/collection/${gender}/${subcategoryName}`} className="btn btn-primary mt-4">Back to Products</Link>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="product-detail-page error-state">
                <Info size={48} className="text-gray-500" />
                <p>Product data could not be loaded.</p>
                <Link to={`/collection/${gender}/${subcategoryName}`} className="btn btn-primary mt-4">Back to Products</Link>
            </div>
        );
    }

    const mainImageUrl = displayImages[currentImageIndex] || `https://placehold.co/600x800/e0e0e0/333333?text=${product.name}`;

    return (
        <div className={`product-detail-page home-page ${storedTheme}-theme new-layout`}>

            <header className="page-header-section">
                <div className="container">
                    <p className="breadcrumb-nav">
                        <Link to="/" className="breadcrumb-link">Home</Link>
                        <span className="breadcrumb-separator"> / </span>
                        <Link to={`/#${gender}`} className="breadcrumb-link">{gender === 'men' ? 'Men' : 'Women'}</Link>
                        <span className="breadcrumb-separator"> / </span>
                        <Link to={`/collection/${gender}/${subcategoryName}`} className="breadcrumb-link">{subcategoryName}</Link>
                    </p>
                    <h1 className="product-main-title">{product.name}</h1>
                </div>
            </header>

            <section className="product-main-section container">
                <div className="product-gallery-column" ref={galleryRef}>
                    <div className="main-image-display" onClick={() => openZoomModal(mainImageUrl)}>
                        <img
                            src={mainImageUrl}
                            alt={product.name}
                            className="main-product-image"
                            onError={(e) => {
                                console.error(`Error loading main product image for "${product.name}". Attempted URL: ${e.target.src}`, e);
                                e.target.onerror = null;
                                e.target.src = `https://placehold.co/600x800/cccccc/333333?text=${product.name}`;
                            }}
                        />
                        {(displayImages && displayImages.length > 1) && (
                            <>
                                <button className="nav-arrow left-arrow" onClick={(e) => { e.stopPropagation(); handlePrevImage(); }} aria-label="Previous image">
                                    <ChevronLeft size={30} />
                                </button>
                                <button className="nav-arrow right-arrow" onClick={(e) => { e.stopPropagation(); handleNextImage(); }} aria-label="Next image">
                                    <ChevronRight size={30} />
                                </button>
                            </>
                        )}
                        <div className="click-to-zoom-indicator">
                            <Maximize2 size={24} /> Click to Zoom
                        </div>
                    </div>

                    {displayImages && displayImages.length > 0 && (
                        <div className="thumbnail-strip">
                            {displayImages.map((img, index) => (
                                <img
                                    key={index}
                                    src={img}
                                    alt={`${product.name} thumbnail ${index + 1}`}
                                    className={`thumbnail-image ${index === currentImageIndex ? 'active-thumbnail' : ''}`}
                                    onClick={() => handleThumbnailClick(index)}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `https://placehold.co/80x80/cccccc/333333?text=Thumb`;
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="product-details-column">
                    <h2 className="product-secondary-title">{product.name}</h2>
                    <p className="product-code-display">Product Code: {product.productCode}</p>

                    <div className="product-price-block">
                        <span className="rent-price-large"><IndianRupee size={30} className="inline-icon" />{product.rent.toLocaleString('en-IN')}</span> <span className="price-term">for 3 days</span>

                        {product.originalPrice && (
                            <span className="original-price-strike">M.R.P: <IndianRupee size={20} className="inline-icon" />{product.originalPrice.toLocaleString('en-IN')}</span>
                        )}
                    </div>

                    {/* <div className="product-description-block animate-fade-in-up">
                        <h3 className="section-heading">Description</h3>
                        <p>{product.description || 'No detailed description available.'}</p>
                    </div> */}

                    <div className="product-options">
                        <div className="option-group">
                            <label htmlFor="size-select-detail" className="option-label">
                                <Ruler size={20} className="icon-mr" /> Available Sizes:
                            </label>
                            <select
                                id="size-select-detail"
                                value={selectedSize}
                                onChange={(e) => setSelectedSize(e.target.value)}
                                className="option-select"
                            >
                                {product.sizes && product.sizes.length > 0 ? (
                                    product.sizes.map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))
                                ) : (
                                    <option value="">No sizes available</option>
                                )}
                            </select>
                            <a href="#" className="size-chart-link" onClick={(e) => e.preventDefault()}>Size Chart</a>
                        </div>

                        {product.colors && product.colors.length > 1 && (
                            <div className="option-group">
                                <label htmlFor="color-select-detail" className="option-label">
                                    <Palette size={20} className="icon-mr" /> Available Colors:
                                </label>
                                <select
                                    id="color-select-detail"
                                    value={selectedColor}
                                    onChange={(e) => setSelectedColor(e.target.value)}
                                    className="option-select"
                                >
                                    {product.colors.map(color => (
                                        <option key={color} value={color}>{color}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {product.color && (!product.colors || product.colors.length <= 1) && (
                            <p className="product-color-display option-group">
                                <Palette size={20} className="icon-mr" />Available Color: <strong>{product.color}</strong>
                            </p>
                        )}
                    </div>





                    {!isPanIndiaDelivery && (
                        <div className="action-area">
                            <button
                                onClick={handleEnquire}
                                disabled={!product || !selectedSize || (!selectedColor && (product.colors && product.colors.length > 0 && product.color === undefined))}
                                className="btn btn-primary enquire-button"
                            >
                                <MessageSquare size={20} className="icon-mr" /> Enquire Now (via WhatsApp)
                            </button>

                        </div>
                    )}

                    <div className="additional-info-block">
                        <h3 className="section-heading">Product Specifications:</h3>
                        <ul>
                            {/* <li><strong>Material:</strong> {product.material || 'Not specified'}</li> */}
                            {/* <li><strong>Care Instructions:</strong> {product.careInstructions || 'Dry clean only'}</li> */}
                            <li><strong>Available at:</strong> {product.availableStores ? product.availableStores.join(', ') : 'Check in-store'}</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Related Products */}
            {relatedProducts && relatedProducts.length > 0 && (
                <section className="related-products-section">
                    <h3 className="section-heading">Related Products</h3>
                    <div className="related-products-grid">
                        {relatedProducts.map((rp) => (
                            <Link key={rp.id} to={`/product/${gender}/${subcategoryName}/${rp.id}`} className="related-product-card">
                                <img className="related-product-image" src={rp.imageUrl || rp.image || `https://placehold.co/400x300/cccccc/333?text=${rp.name}`} alt={rp.name} />
                                <div className="related-product-name">{rp.name}</div>
                                <div className="related-product-price"><IndianRupee size={14} /> {rp.rent?.toLocaleString('en-IN') || rp.price}</div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Inquiry/Error Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className={`modal-content ${modalType}`}>
                        <button className="modal-close-button" onClick={closeModal}>&times;</button>
                        {modalType === 'success' ? <CheckCircle size={48} className="modal-icon success-icon" /> : <XCircle size={48} className="modal-icon error-icon" />}
                        <p className="modal-message">{modalMessage}</p>
                        <button onClick={closeModal} className="btn btn-primary modal-ok-button">OK</button>
                    </div>
                </div>
            )}

            {/* Zoom Modal */}
            {showZoomModal && (
                <div className="zoom-modal-overlay" onClick={closeZoomModal}>
                    <div className="zoom-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="zoom-close-button" onClick={closeZoomModal}>&times;</button>
                        <div
                            className={`zoomed-image-wrapper ${isPanning ? 'panning' : ''}`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onDoubleClick={handleDoubleClick}
                            style={{ cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in' }}
                        >
                            <img
                                ref={imageRef}
                                src={zoomImageUrl}
                                alt="Zoomed Product"
                                className="zoomed-image"
                                style={{
                                    transform: `scale(${zoomLevel}) translate(${imageOffset.x / zoomLevel}px, ${imageOffset.y / zoomLevel}px)`,
                                    transformOrigin: 'center center',
                                    transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                                }}
                            />
                        </div>

                        <div className="zoom-controls">
                            <button className="zoom-button" onClick={handleZoomOut} disabled={zoomLevel <= 1}><ZoomOut size={24} /></button>
                            <span className="zoom-level-text">{(zoomLevel * 100).toFixed(0)}%</span>
                            <button className="zoom-button" onClick={handleZoomIn} disabled={zoomLevel >= 3}><ZoomIn size={24} /></button>
                            <button className="zoom-button reset-zoom-button" onClick={handleDoubleClick} title="Reset Zoom">Reset</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProductDetailPage;
