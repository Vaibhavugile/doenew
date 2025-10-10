import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { useParams, Link } from 'react-router-dom';
import './ProductDetailPage.css';
import { db, checkPincodeServiceability } from './firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';

// Import icons from lucide-react
import { IndianRupee, MessageSquare, Info, CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight, Ruler, Palette, ZoomIn, ZoomOut, Maximize2, MapPin, Clock } from 'lucide-react'; // Added Clock icon
import axios from 'axios';
import AvailabilityCalendarAndBooking from './AvailabilityCalendarAndBooking';

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

    // Tracks the user's final choice (Fastest or Cheapest)
    const [selectedDeliveryOption, setSelectedDeliveryOption] = useState(null);
    // Check if the product is available for Pan India delivery based on the stores array
    const isPanIndiaDelivery = product && product.availableStores && product.availableStores.includes('PAN INDIA Delivery');
    const [logisticsETDs, setLogisticsETDs] = useState({ forwardETD: 0, reverseETD: 0 });
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
const calculateDaysDifference = (etdDateString) => {
    // 1. Input Validation and Conversion
    if (!etdDateString) {
        return 0; // Fallback to 0 days if the date string is missing
    }

    // Try to parse the date string. This is robust for various formats.
    const etdDate = new Date(etdDateString);

    // Check if parsing failed (e.g., invalid date string)
    if (isNaN(etdDate.getTime())) {
        console.error("Failed to parse ETD date string:", etdDateString);
        return 0; // Fallback to 0 days if the date is invalid
    }
    
    // 2. Define Today's Date (Start of Day)
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // 3. Define ETD Date (Start of ETD Day)
    const etdDayStart = new Date(etdDate.getFullYear(), etdDate.getMonth(), etdDate.getDate());

    // 4. Calculate Difference
    const diffTime = etdDayStart.getTime() - todayStart.getTime();
    
    // Calculate the difference in days. Use Math.ceil to round up, ensuring 
    // that any part of a day counts as a full delivery day.
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Ensure the result is at least 0 (or 1 if you never want 0 days)
    // Based on your previous request for 0, we'll use Math.max(0, diffDays)
    return Math.max(0, diffDays);
};

    const handleDeliveryOptionSelect = (optionType) => {
        if (!serviceabilityResult?.options) return;

        const forward = serviceabilityResult.options.forward;
        const reverse = serviceabilityResult.options.reverse;
        let selectedForward, selectedReverse;

        // Map optionType to the two legs (Fastest Delivery + Fastest Return) or (Cheapest Delivery + Cheapest Return)
        if (optionType === 'fastest') {
            selectedForward = forward.fastest;
            selectedReverse = reverse.fastest;
        } else if (optionType === 'cheapest') {
            selectedForward = forward.cheapest;
            selectedReverse = reverse.cheapest;
        } else {
            return;
        }

        // --- NEW LOGIC: Convert ETD day-of-month to buffer days ---
        const forwardBufferDays = calculateDaysDifference(selectedForward.etd);
        const reverseBufferDays = calculateDaysDifference(selectedReverse.etd);
        console.log("--- ProductDetailPage Logistics Check ---");
console.log("1. Calculated Forward Buffer Days (fETD):", forwardBufferDays); // Expected: 3
console.log("2. Calculated Reverse Buffer Days (rETD):", reverseBufferDays); // Expected: 4
console.log("3. Prop Passed to Calendar (forwardETD):", forwardBufferDays); // Expected: 3
console.log("-----------------------------------------");

        // --- END NEW LOGIC ---

        const totalRate = selectedForward.rate + selectedReverse.rate;
        const totalETD = forwardBufferDays + reverseBufferDays; // Use the calculated buffer days for total ETD display

        setSelectedDeliveryOption({
            type: optionType,
            // Total Combined Values
            charge: totalRate.toFixed(2),
            etd: totalETD, // This is now correctly the total days
            // Forward Details (The individual leg data)
            forwardETD: forwardBufferDays, // Pass the calculated days
            forwardCourierName: selectedForward.courierName,
            forwardRate: selectedForward.rate.toFixed(2),
            // Reverse Details (The individual leg data)
            reverseETD: reverseBufferDays, // Pass the calculated days
            reverseCourierName: selectedReverse.courierName,
            reverseRate: selectedReverse.rate.toFixed(2),
        });

        // Set the state to pass the calculated days buffer to the calendar component
        setLogisticsETDs({
            forwardETD: forwardBufferDays,
            reverseETD: reverseBufferDays
        });
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
    // Replace the existing checkServiceability function:
    const checkServiceability = async () => {
        console.log('Pincode being sent:', deliveryPincode);
        if (!deliveryPincode || !/^\d{6}$/.test(deliveryPincode)) {
            setServiceabilityResult({ success: false, message: 'Please enter a valid 6-digit Pincode.' });
            return;
        }

        setLoadingServiceability(true);
        setServiceabilityResult(null);
        setSelectedDeliveryOption(null); // Crucial: Clear previous selection before new check

        try {
            // Call the Cloud Function
            const result = await checkPincodeServiceability({ deliveryPincode });
            setServiceabilityResult(result.data);

            // --- NEW LOGIC: Set the fastest option as default selection ---
            if (result.data.success && result.data.options?.fastest) {
                // Use the handleDeliveryOptionSelect function for consistency
                handleDeliveryOptionSelect('fastest');
            }
            // --- END NEW LOGIC ---

        } catch (error) {
            console.error("Cloud Function Error:", error.code, error.message);
            let errorMessage = "Delivery check failed. Please try again.";

            // Attempt to extract the error message from the detailed error object
            if (error.details && typeof error.details === 'string') {
                errorMessage = error.details;
            } else if (error.message) {
                // Catch the message thrown from the Cloud Function's final catch block
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
                                        <p className="font-bold mb-2 text-green-700">✅ Two-Way Logistics Available!</p>

                                        <p className="text-sm text-gray-600 mb-3">Select your combined scenario:</p>

                                        {/* Since we don't have the final combined options, we must calculate the labels here */}
                                        {/* Calculate the total cost/time for the two main scenarios */}
                                        {(() => {
                                            const options = serviceabilityResult.options;
                                            const fastestForwardDays = calculateDaysDifference(options.forward.fastest.etd);
                                            const fastestReverseDays = calculateDaysDifference(options.reverse.fastest.etd);
                                            const fastestTotalETD = fastestForwardDays + fastestReverseDays;

                                            const fastestTotalRate = (options.forward.fastest.rate + options.reverse.fastest.rate).toFixed(2);
                                                                                        const cheapestForwardDays = calculateDaysDifference(options.forward.cheapest.etd);
                                            const cheapestReverseDays = calculateDaysDifference(options.reverse.cheapest.etd);
                                            const cheapestTotalETD = cheapestForwardDays + cheapestReverseDays;

                                            const cheapestTotalRate = (options.forward.cheapest.rate + options.reverse.cheapest.rate).toFixed(2);
                                            // Repeat for cheapest (around line 458)


                                            return (
                                                <div className="delivery-options-selection space-y-3">
                                                    {/* OPTION 1: FASTEST (Delivery + Return) */}
                                                    <label className={`delivery-option flex items-center p-3 border rounded-lg cursor-pointer transition duration-150 ease-in-out ${selectedDeliveryOption?.type === 'fastest' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}>
                                                        <input
                                                            type="radio"
                                                            name="delivery-option"
                                                            value="fastest"
                                                            checked={selectedDeliveryOption?.type === 'fastest'}
                                                            onChange={() => handleDeliveryOptionSelect('fastest')}
                                                            className="mr-3 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <div className="flex justify-between w-full items-center">
                                                            <div>
                                                                <p className="font-semibold text-gray-800">🚀 Fastest Round Trip</p>
                                                                <p className="text-sm text-gray-600">Total Time: **{fastestTotalETD} days**</p>
                                                            </div>
                                                            <p className="font-bold text-xl text-indigo-700">
                                                                <IndianRupee size={16} className="inline-icon" />{fastestTotalRate}
                                                            </p>
                                                        </div>
                                                    </label>

                                                    {/* OPTION 2: CHEAPEST (Delivery + Return) */}
                                                    {(cheapestTotalRate !== fastestTotalRate || cheapestTotalETD !== fastestTotalETD) && (
                                                        <label className={`delivery-option flex items-center p-3 border rounded-lg cursor-pointer transition duration-150 ease-in-out ${selectedDeliveryOption?.type === 'cheapest' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'}`}>
                                                            <input
                                                                type="radio"
                                                                name="delivery-option"
                                                                value="cheapest"
                                                                checked={selectedDeliveryOption?.type === 'cheapest'}
                                                                onChange={() => handleDeliveryOptionSelect('cheapest')}
                                                                className="mr-3 text-teal-600 focus:ring-teal-500"
                                                            />
                                                            <div className="flex justify-between w-full items-center">
                                                                <div>
                                                                    <p className="font-semibold text-gray-800">💰 Cheapest Round Trip</p>
                                                                    <p className="text-sm text-gray-600">Total Time: **{cheapestTotalETD} days**</p>
                                                                </div>
                                                                <p className="font-bold text-xl text-teal-700">
                                                                    <IndianRupee size={16} className="inline-icon" />{cheapestTotalRate}
                                                                </p>
                                                            </div>
                                                        </label>
                                                    )}
                                                </div>
                                            );
                                        })()}


                                        {/* Detailed Breakdown for the SELECTED option (Fulfills the request for separate data) */}
                                        {selectedDeliveryOption && (
                                            <div className="delivery-breakdown mt-4 p-4 border rounded-lg bg-gray-100">
                                                <h4 className="font-bold text-md mb-2">
                                                    Breakdown of the {selectedDeliveryOption.type.toUpperCase()} Combined Option
                                                </h4>

                                                {/* FORWARD (DELIVERY) BREAKDOWN */}
                                                <div className="mb-3 p-2 border-b border-gray-300">
                                                    <h5 className="font-semibold text-gray-800">📦 Delivery to You (Forward Leg):</h5>
                                                    <ul className="list-disc ml-5 text-sm text-gray-700">
                                                        <li>**Time:** **{selectedDeliveryOption.forwardETD}** day{Number(selectedDeliveryOption.forwardETD) > 1 ? 's' : ''}.</li>
                                                        <li>**Cost:** <IndianRupee size={12} className="inline-icon" />**{selectedDeliveryOption.forwardRate}**.</li>
                                                        <li>**Agency:** **{selectedDeliveryOption.forwardCourierName || 'N/A'}**.</li>
                                                    </ul>
                                                </div>

                                                {/* REVERSE (RETURN) BREAKDOWN */}
                                                <div className="mb-3 p-2">
                                                    <h5 className="font-semibold text-gray-800">↩️ Return Pickup from You (Reverse Leg):</h5>
                                                    <ul className="list-disc ml-5 text-sm text-gray-700">
                                                        <li>**Time:** **{selectedDeliveryOption.reverseETD}** day{Number(selectedDeliveryOption.reverseETD) > 1 ? 's' : ''}.</li>
                                                        <li>**Cost:** <IndianRupee size={12} className="inline-icon" />**{selectedDeliveryOption.reverseRate}**.</li>
                                                        <li>**Agency:** **{selectedDeliveryOption.reverseCourierName || 'N/A'}**.</li>
                                                    </ul>
                                                </div>

                                                <p className="mt-4 pt-2 border-t font-bold text-lg text-indigo-700">
                                                    Total Combined Cost: <IndianRupee size={16} className="inline-icon" />{selectedDeliveryOption.charge}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <XCircle size={20} className="inline-icon" />
                                        <p className="mt-2 text-red-600">{serviceabilityResult.message}</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* --- START OF CONDITIONAL ONLINE BOOKING BLOCK --- */}

                    {isPanIndiaDelivery && (
                        <div className="online-booking-block">
                            <h3 className="section-heading"><Clock size={20} className="icon-mr" /> Select Rental Dates</h3>

                            {/* CONDITIONALLY RENDER THE BOOKING COMPONENT */}
                            {serviceabilityResult?.success && selectedDeliveryOption ? (
                                <AvailabilityCalendarAndBooking
                productName={product.name}
                productRent={product.rent}
                productId={product.productCode} 
                selectedSize={selectedSize}
                selectedColor={selectedColor}
                deliveryCharge={selectedDeliveryOption?.charge} 
                // --- ADD NEW PROPS ---
                forwardETD={logisticsETDs.forwardETD}
                reverseETD={logisticsETDs.reverseETD}
                // --- END NEW PROPS ---
            />
                            ) : (
                                <p className="text-red-500 font-semibold mt-2">
                                    Please enter a valid Pincode and select a delivery option above to proceed with booking.
                                </p>
                            )}
                        </div>
                    )}
                    {/* --- END OF CONDITIONAL ONLINE BOOKING BLOCK --- */}

                    {/* The Enquire button should only show if NOT a Pan India product, or as a fallback if online booking is complex */}
                    {!isPanIndiaDelivery && (
                        <div className="action-area">
                            <button
                                onClick={handleEnquire}
                                disabled={!product || !selectedSize || (!selectedColor && (product.colors && product.colors.length > 0 && product.color === undefined))}
                                className="btn btn-primary enquire-button"
                            >
                                <MessageSquare size={20} className="icon-mr" /> Enquire Now (via WhatsApp)
                            </button>
                            <p className="enquire-note mt-2 text-sm text-gray-600">
                                This product is available for store pickup or local delivery only. Please enquire to confirm.
                            </p>
                        </div>
                    )}

                    {/* If it IS a Pan India product, we can still show a secondary "Enquire" button below the booking, or just rely on the booking flow. 
                       For simplicity, I'll only show "Enquire" if it's NOT Pan India. If you need both, adjust the logic above. */}

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

            {/* ... (Related Products, Modals, Zoom Modal remain unchanged) ... */}

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