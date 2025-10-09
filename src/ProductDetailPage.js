import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { useParams, Link } from 'react-router-dom';
import './ProductDetailPage.css';
import { db,checkPincodeServiceability } from './firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs,limit } from 'firebase/firestore';

// Import icons from lucide-react
import { IndianRupee, MessageSquare, Info, CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight, Ruler, Palette, ZoomIn, ZoomOut, Maximize2,MapPin } from 'lucide-react'; // Added ZoomIn, ZoomOut, Maximize2
import axios from 'axios';

function ProductDetailPage() {
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
                         // Use array-contains-any to match any of the current product's stores
                         // Note: array-contains-any can take up to 10 values
                         relatedProductsQuery = query(
                            relatedProductsQuery,
                            where('availableStores', 'array-contains-any', productData.availableStores)
                        );
                    }

                    // Limit to a reasonable number of related products
                    relatedProductsQuery = query(relatedProductsQuery, limit(5));


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
    if (!product) { // Only check if product data is available
        setModalMessage('Product details are not available for inquiry.');
        setModalType('error');
        setShowModal(true);
        return;
    }

    try {
        const whatsappNumber = '+918446442204'; // Replace with your WhatsApp number
        // Construct the message without requiring selected size or color
        const message = `Hello, I'm interested in renting the product "${product.name}" (Product Code: ${product.productCode}).\n\nDetails:\nRent: ₹${product.rent.toLocaleString('en-IN')} for 3 days.\n\nPlease provide more details.`;

        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank'); // Open in a new tab

        setModalMessage(`Your inquiry for "${product.name}" has been sent! We will get back to you shortly on WhatsApp.`);
        setModalType('success');
        setShowModal(true);

    } catch (error) {
        console.error("Error sending inquiry:", error);
        setModalMessage('Failed to open WhatsApp. Please ensure you have WhatsApp installed or try again.');
        setModalType('error');
        setShowModal(true);
    }
};
    const closeModal = () => {
        setShowModal(false);
        setModalMessage('');
        setModalType('');
    };
    const checkServiceability = async () => {
          console.log('Pincode being sent:', deliveryPincode);
        if (!deliveryPincode || !/^\d{6}$/.test(deliveryPincode)) {
            setServiceabilityResult({ success: false, message: 'Please enter a valid 6-digit Pincode.' });
            return;
        }

        setLoadingServiceability(true);
        setServiceabilityResult(null);

        try {
            // Call the Cloud Function
            const result = await checkPincodeServiceability({ deliveryPincode });
            setServiceabilityResult(result.data);

        } catch (error) {
            console.error("Cloud Function Error:", error.code, error.message);
            let errorMessage = "Delivery check failed. Please try again.";
            
            // Use the detailed error message from the cloud function if available
            if (error.details && typeof error.details === 'string') {
                errorMessage = error.details;
            } else if (error.message) {
                errorMessage = error.message;
            }

            setServiceabilityResult({ success: false, message: errorMessage });
        } finally {
            setLoadingServiceability(false);
        }
    };

    // --- New Zoom Modal Functions ---
    const openZoomModal = (imageUrl) => {
        setZoomImageUrl(imageUrl);
        setZoomLevel(1); // Reset zoom level
        setImageOffset({ x: 0, y: 0 }); // Reset offset
        setShowZoomModal(true);
        document.body.style.overflow = 'hidden'; // Prevent scrolling background
    };

    const closeZoomModal = () => {
        setShowZoomModal(false);
        setZoomImageUrl('');
        setZoomLevel(1);
        setImageOffset({ x: 0, y: 0 });
        document.body.style.overflow = 'unset'; // Re-enable scrolling
    };

    const handleZoomIn = () => {
        setZoomLevel((prev) => Math.min(prev + 0.2, 3)); // Max zoom 3x
    };

    const handleZoomOut = () => {
        setZoomLevel((prev) => Math.max(prev - 0.2, 1)); // Min zoom 1x
    };

    const handleMouseDown = (e) => {
        if (zoomLevel > 1) { // Only pan if zoomed in
            setIsPanning(true);
            setStartPan({ x: e.clientX - imageOffset.x, y: e.clientY - imageOffset.y });
        }
    };

    const handleMouseMove = (e) => {
        if (!isPanning || zoomLevel === 1) return;

        const newX = e.clientX - startPan.x;
        const newY = e.clientY - startPan.y;

        // Optional: Clamp offsets to prevent panning too far
        // This is a basic clamp, can be more sophisticated based on image dimensions
        const img = imageRef.current;
        if (img) {
            const containerWidth = img.parentElement.clientWidth;
            const containerHeight = img.parentElement.clientHeight;
            const imgWidth = img.naturalWidth * zoomLevel;
            const imgHeight = img.naturalHeight * zoomLevel;

            // Simple clamping to keep image within container bounds
            const maxPanX = (imgWidth - containerWidth) / 2;
            const maxPanY = (imgHeight - containerHeight) / 2;

            // Adjust newX and newY to respect boundaries if necessary
            // This is a more complex calculation involving the image's original dimensions
            // For now, allow free panning and rely on the user to recenter if needed.
        }

        setImageOffset({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    // Reset pan and zoom on double click
    const handleDoubleClick = () => {
        setZoomLevel(1);
        setImageOffset({ x: 0, y: 0 });
    };

    if (loadingProduct) {
        return (
            <div className="loading-spinner-container">
                <Loader2  className="loading-spinner" />
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
        <div className="product-detail-page new-layout">
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
                <div className="product-gallery-column">
                    <div className="main-image-display" onClick={() => openZoomModal(mainImageUrl)}> {/* Added onClick */}
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
                                        console.error(`Error loading thumbnail image ${index + 1} for "${product.name}". Attempted URL: ${e.target.src}`, e);
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
                    <p className="product-code-display">Product Code: **{product.productCode}**</p>

                    <div className="product-price-block">
                        <span className="rent-price-large"><IndianRupee size={30} className="inline-icon" />{product.rent.toLocaleString('en-IN')}</span> <span className="price-term">for 3 days</span>
                        {product.originalPrice && (
                            <span className="original-price-strike">M.R.P: <IndianRupee size={20} className="inline-icon" />{product.originalPrice.toLocaleString('en-IN')}</span>
                        )}
                    </div>

                    <div className="product-description-block">
                        <h3 className="section-heading">Description</h3>
                        <p>{product.description || 'No detailed description available.'}</p>
                    </div>

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
                     <div className="pincode-check-block">
                        <h3 className="section-heading"><MapPin size={20} className="icon-mr" /> Check Delivery Serviceability</h3>
                        <div className="pincode-input-group">
                            <input
                                type="text"
                                className="pincode-input"
                                placeholder="Enter 6-digit Pincode"
                                value={deliveryPincode}
                                onChange={(e) => {
                                    // Only allow 6 digits
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                    setDeliveryPincode(value);
                                    setServiceabilityResult(null); // Clear result on change
                                }}
                                maxLength={6}
                                aria-label="Delivery Pincode"
                            />
                            <button
                                className="btn btn-secondary check-pincode-button"
                                onClick={checkServiceability}
                                disabled={loadingServiceability || deliveryPincode.length !== 6}
                            >
                                {loadingServiceability ? <Loader2 size={20} className="loading-spinner spin-fast" /> : 'Check'}
                            </button>
                        </div>
                        
                        {serviceabilityResult && (
                            <div className={`serviceability-message ${serviceabilityResult.success ? 'success' : 'error'}`}>
                                {serviceabilityResult.success ? (
                                    <>
                                        <CheckCircle size={20} className="inline-icon" />
                                        <p>Delivery available! Est. delivery: **{serviceabilityResult.estimatedDate}** via **{serviceabilityResult.courierName}**.</p>
                                    </>
                                ) : (
                                    <>
                                        <XCircle size={20} className="inline-icon" />
                                        <p>{serviceabilityResult.message}</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="action-area">
                        <button
                            onClick={handleEnquire}
                            disabled={!product || !selectedSize || (!selectedColor && (product.colors && product.colors.length > 0 && product.color === undefined))}
                            className="btn btn-primary enquire-button"
                        >
                            <MessageSquare size={20} className="icon-mr" /> Enquire Now
                        </button>
                    </div>

                    <div className="additional-info-block">
                        <h3 className="section-heading">Product Specifications:</h3>
                        <ul>
                            <li><strong>Material:</strong> {product.material || 'Not specified'}</li>
                            <li><strong>Care Instructions:</strong> {product.careInstructions || 'Dry clean only'}</li>
                            <li><strong>Available at:</strong> {product.availableStores ? product.availableStores.join(', ') : 'Check in-store'}</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* --- Related Products Section --- */}
            {loadingRelatedProducts && (
                <div className="loading-spinner-container">
                    <Loader2 className="loading-spinner" />
                    <p>Loading similar products...</p>
                </div>
            )}
            {relatedProductsError && (
                <div className="error-message">
                    <p>{relatedProductsError}</p>
                </div>
            )}
            {!loadingRelatedProducts && relatedProducts.length > 0 && (
                <section className="related-products-section container">
                    <h2 className="section-heading">Explore More Styles</h2>
                    <div className="related-products-grid">
                        {relatedProducts.map((p) => (
                            <Link to={`/product/${gender}/${subcategoryName}/${p.id}`} key={p.id} className="related-product-card">
                                <img
                                    src={p.imageUrl || `https://placehold.co/300x400/e0e0e0/333333?text=${p.name}`}
                                    alt={p.name}
                                    className="related-product-image"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `https://placehold.co/300x400/cccccc/333333?text=${p.name}`;
                                    }}
                                />
                                <h3 className="related-product-name">{p.name}</h3>
                                <p className="related-product-price">
                                    <IndianRupee size={16} className="inline-icon" />{p.rent.toLocaleString('en-IN')}
                                </p>
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

            {/* --- New Zoom Image Modal --- */}
            {showZoomModal && (
                <div className="zoom-modal-overlay" onClick={closeZoomModal}>
                    <div className="zoom-modal-content" onClick={(e) => e.stopPropagation()}> {/* Prevent closing when clicking image */}
                        <button className="zoom-close-button" onClick={closeZoomModal}>&times;</button>

                        <div
                            className="zoomed-image-wrapper"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp} // Stop panning if mouse leaves
                            onDoubleClick={handleDoubleClick} // Reset on double click
                            style={{ cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in' }}
                        >
                            <img
                                ref={imageRef}
                                src={zoomImageUrl}
                                alt="Zoomed Product"
                                className="zoomed-image"
                                style={{
                                    transform: `scale(${zoomLevel}) translate(${imageOffset.x / zoomLevel}px, ${imageOffset.y / zoomLevel}px)`,
                                    transformOrigin: 'center center', // Keep origin centered for simple pan
                                    transition: isPanning ? 'none' : 'transform 0.1s ease-out' // Smooth zoom, no pan transition
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