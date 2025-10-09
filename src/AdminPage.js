import React, { useState, useEffect, useCallback } from 'react';
import { db, storage } from './firebaseConfig'; // 🔥 NOTE: You MUST add 'storage' to your imports
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // 🔥 New imports for file storage
import './AdminPage.css';

// Utility function to upload a file to Firebase Storage and return the URL
const uploadFileAndGetURL = async (file, path) => {
    if (!file) return null;
    const storageRef = ref(storage, `${path}/${file.name}_${Date.now()}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
};

function AdminPage() {
    // --- State for Adding Categories ---
    const [menCategoryName, setMenCategoryName] = useState('');
    const [menCategoryFile, setMenCategoryFile] = useState(null); // Changed to File object
    const [menCategoryOrder, setMenCategoryOrder] = useState('');
    const [menCategoryMessage, setMenCategoryMessage] = useState('');
    const [menCategoryError, setMenCategoryError] = useState('');
    const [menCategoryLoading, setMenCategoryLoading] = useState(false);

    const [womenCategoryName, setWomenCategoryName] = useState('');
    const [womenCategoryFile, setWomenCategoryFile] = useState(null); // Changed to File object
    const [womenCategoryOrder, setWomenCategoryOrder] = useState('');
    const [womenCategoryMessage, setWomenCategoryMessage] = useState('');
    const [womenCategoryError, setWomenCategoryError] = useState('');
    const [womenCategoryLoading, setWomenCategoryLoading] = useState(false);

    // --- State for Adding Products ---
    const [allMenCategories, setAllMenCategories] = useState([]);
    const [allWomenCategories, setAllWomenCategories] = useState([]);
    const [selectedProductGender, setSelectedProductGender] = useState('men');
    const [selectedProductCategoryId, setSelectedProductCategoryId] = useState('');
    const [productName, setProductName] = useState('');
    const [productDescription, setProductDescription] = useState('');
    const [productMainImageFile, setProductMainImageFile] = useState(null); // Changed to File object
    const [productAdditionalImageFiles, setProductAdditionalImageFiles] = useState([]); // Array of File objects
    const [productCode, setProductCode] = useState('');
    const [productOriginalPrice, setProductOriginalPrice] = useState('');
    const [productRent, setProductRent] = useState('');
    const [productColor, setProductColor] = useState('');
    const [productSizes, setProductSizes] = useState('');
    const [productMaterial, setProductMaterial] = useState('');
    const [productCareInstructions, setProductCareInstructions] = useState('');
    const [productAvailableStores, setProductAvailableStores] = useState('');
    const [productMessage, setProductMessage] = useState('');
    const [productError, setProductError] = useState('');
    const [productLoading, setProductLoading] = useState(false);

    // State for Dynamic Filter Options (for Admin Page dropdowns)
    const [dynamicStoreOptions, setDynamicStoreOptions] = useState([]);
    const [dynamicColorOptions, setDynamicColorOptions] = useState([]);
    const [dynamicSizeOptions, setDynamicSizeOptions] = useState([]);

    // --- Fetch Categories (Memoized for cleaner logic) ---
    const fetchCategories = useCallback(async () => {
        const menCategoriesCol = collection(db, 'menCategories');
        const womenCategoriesCol = collection(db, 'womenCategories');

        const menSnapshot = await getDocs(query(menCategoriesCol, orderBy('order')));
        const womenSnapshot = await getDocs(query(womenCategoriesCol, orderBy('order')));

        setAllMenCategories(menSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setAllWomenCategories(womenSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // --- Fetch Dynamic Filter Options ---
    useEffect(() => {
        const fetchDynamicFilterOptions = async () => {
            try {
                // Fetch Stores
                const storesSnapshot = await getDocs(collection(db, 'filterOptions', 'stores', 'list'));
                setDynamicStoreOptions(storesSnapshot.docs.map(doc => doc.data().name || doc.id)); // Use name field if available, else id

                // Fetch Colors
                const colorsSnapshot = await getDocs(collection(db, 'filterOptions', 'colors', 'list'));
                setDynamicColorOptions(colorsSnapshot.docs.map(doc => doc.data().name || doc.id));

                // Fetch Sizes
                const sizesSnapshot = await getDocs(collection(db, 'filterOptions', 'sizes', 'list'));
                setDynamicSizeOptions(sizesSnapshot.docs.map(doc => doc.data().name || doc.id));

            } catch (error) {
                console.error("Error fetching dynamic filter options for Admin:", error);
            }
        };
        fetchDynamicFilterOptions();
    }, []);

    // --- Handlers for adding Categories ---
    const handleAddMenCategory = async (e) => {
        e.preventDefault();
        setMenCategoryLoading(true);
        setMenCategoryMessage('');
        setMenCategoryError('');

        if (!menCategoryFile) {
            setMenCategoryError('Please upload an image for the category.');
            setMenCategoryLoading(false);
            return;
        }

        try {
            // 1. Upload Image
            const imageUrl = await uploadFileAndGetURL(menCategoryFile, 'category_images/men');

            // 2. Add Category to Firestore
            await addDoc(collection(db, 'menCategories'), {
                name: menCategoryName,
                imageUrl: imageUrl, // Use the uploaded URL
                order: parseInt(menCategoryOrder) || 0,
                addedDate: new Date().toISOString(),
            });

            setMenCategoryMessage('Men category added successfully! 🎉');
            // Clear form
            setMenCategoryName('');
            setMenCategoryFile(null);
            setMenCategoryOrder('');
            // Refresh categories list
            fetchCategories();
        } catch (e) {
            console.error("Error adding men category: ", e);
            setMenCategoryError('Error adding men category. Check console for details.');
        } finally {
            setMenCategoryLoading(false);
        }
    };

    const handleAddWomenCategory = async (e) => {
        e.preventDefault();
        setWomenCategoryLoading(true);
        setWomenCategoryMessage('');
        setWomenCategoryError('');

        if (!womenCategoryFile) {
            setWomenCategoryError('Please upload an image for the category.');
            setWomenCategoryLoading(false);
            return;
        }

        try {
            // 1. Upload Image
            const imageUrl = await uploadFileAndGetURL(womenCategoryFile, 'category_images/women');

            // 2. Add Category to Firestore
            await addDoc(collection(db, 'womenCategories'), {
                name: womenCategoryName,
                imageUrl: imageUrl, // Use the uploaded URL
                order: parseInt(womenCategoryOrder) || 0,
                addedDate: new Date().toISOString(),
            });

            setWomenCategoryMessage('Women category added successfully! 🥳');
            // Clear form
            setWomenCategoryName('');
            setWomenCategoryFile(null);
            setWomenCategoryOrder('');
            // Refresh categories list
            fetchCategories();
        } catch (e) {
            console.error("Error adding women category: ", e);
            setWomenCategoryError('Error adding women category. Check console for details.');
        } finally {
            setWomenCategoryLoading(false);
        }
    };

    // --- Handler for adding Products ---
    const handleAddProduct = async (e) => {
        e.preventDefault();
        setProductLoading(true);
        setProductMessage('');
        setProductError('');

        if (!selectedProductCategoryId) {
            setProductError('Please select a category.');
            setProductLoading(false);
            return;
        }

        if (!productMainImageFile) {
            setProductError('Please upload a main product image.');
            setProductLoading(false);
            return;
        }

        try {
            // 1. Upload Images
            setProductMessage('Uploading images...');
            const mainImageUrl = await uploadFileAndGetURL(productMainImageFile, 'product_images');

            const additionalImageUrls = await Promise.all(
                productAdditionalImageFiles.map(file => uploadFileAndGetURL(file, 'product_images_additional'))
            );

            // 2. Prepare Data and Add Product to Firestore
            setProductMessage('Saving product data...');
            const parentCollection = selectedProductGender === 'men' ? 'menCategories' : 'womenCategories';
            const productsCollectionRef = collection(db, parentCollection, selectedProductCategoryId, 'products');

            // Convert comma-separated strings to arrays
            const availableStoresArray = productAvailableStores.split(',').map(s => s.trim()).filter(s => s);
            const sizesArray = productSizes.split(',').map(s => s.trim()).filter(s => s);

            const newProduct = {
                name: productName,
                description: productDescription,
                imageUrl: mainImageUrl, // Use the uploaded URL
                images: additionalImageUrls.filter(url => url), // Filter out any nulls
                productCode: productCode,
                originalPrice: productOriginalPrice ? parseFloat(productOriginalPrice) : null,
                rent: parseFloat(productRent) || 0,
                color: productColor,
                sizes: sizesArray,
                material: productMaterial,
                careInstructions: productCareInstructions,
                availableStores: availableStoresArray,
                addedDate: new Date().toISOString(),
            };

            await addDoc(productsCollectionRef, newProduct);
            setProductMessage('Product added successfully! ✅');

            // 3. Add/Update filter options in dedicated collections
            // Create a function to handle the upsert logic for filters
            const upsertFilter = async (type, value) => {
                if (!value) return;
                const docRef = doc(db, 'filterOptions', type, 'list', value);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    await setDoc(docRef, { name: value, addedDate: new Date().toISOString() });
                }
            };

            for (const store of availableStoresArray) { await upsertFilter('stores', store); }
            await upsertFilter('colors', productColor);
            for (const size of sizesArray) { await upsertFilter('sizes', size); }
            
            // Clear form fields
            setProductName('');
            setProductDescription('');
            setProductMainImageFile(null);
            setProductAdditionalImageFiles([]);
            setProductCode('');
            setProductOriginalPrice('');
            setProductRent('');
            setProductColor('');
            setProductSizes('');
            setProductMaterial('');
            setProductCareInstructions('');
            setProductAvailableStores('');
            setSelectedProductCategoryId('');

        } catch (e) {
            console.error("Error adding product: ", e);
            setProductError(`Error adding product: ${e.message}. Check console for details.`);
        } finally {
            setProductLoading(false);
        }
    };

    return (
        <div className="admin-page-container">
            <header className="admin-header">
                <h1>Commerce Admin Dashboard 🛍️</h1>
                <p>Manage Categories and Products for the Renting Service.</p>
            </header>
            
            <div className="admin-content-grid">
                {/* ======================= Add Men's Category ======================= */}
                <section className="admin-card">
                    <h2>+ Add Men's Category</h2>
                    <form onSubmit={handleAddMenCategory} className="admin-form">
                        <div className="form-group">
                            <label htmlFor="menCategoryName">Category Name:</label>
                            <input
                                type="text"
                                id="menCategoryName"
                                value={menCategoryName}
                                onChange={(e) => setMenCategoryName(e.target.value)}
                                placeholder="e.g., Sherwanis"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="menCategoryFile">Category Image (Upload):</label>
                            <input
                                type="file"
                                id="menCategoryFile"
                                accept="image/*"
                                onChange={(e) => setMenCategoryFile(e.target.files[0])}
                                required
                            />
                             {menCategoryFile && <p className="file-preview-name">Selected: {menCategoryFile.name}</p>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="menCategoryOrder">Display Order:</label>
                            <input
                                type="number"
                                id="menCategoryOrder"
                                value={menCategoryOrder}
                                onChange={(e) => setMenCategoryOrder(e.target.value)}
                                placeholder="e.g., 1 (lower is first)"
                            />
                        </div>
                        <button type="submit" disabled={menCategoryLoading || !menCategoryName || !menCategoryFile} className="admin-btn primary">
                            {menCategoryLoading ? 'Processing...' : 'Add Men Category'}
                        </button>
                        {menCategoryMessage && <p className="success-message">{menCategoryMessage}</p>}
                        {menCategoryError && <p className="error-message">🚨 {menCategoryError}</p>}
                    </form>
                </section>

                {/* ======================= Add Women's Category ======================= */}
                <section className="admin-card">
                    <h2>+ Add Women's Category</h2>
                    <form onSubmit={handleAddWomenCategory} className="admin-form">
                        <div className="form-group">
                            <label htmlFor="womenCategoryName">Category Name:</label>
                            <input
                                type="text"
                                id="womenCategoryName"
                                value={womenCategoryName}
                                onChange={(e) => setWomenCategoryName(e.target.value)}
                                placeholder="e.g., Gowns"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="womenCategoryFile">Category Image (Upload):</label>
                            <input
                                type="file"
                                id="womenCategoryFile"
                                accept="image/*"
                                onChange={(e) => setWomenCategoryFile(e.target.files[0])}
                                required
                            />
                             {womenCategoryFile && <p className="file-preview-name">Selected: {womenCategoryFile.name}</p>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="womenCategoryOrder">Display Order:</label>
                            <input
                                type="number"
                                id="womenCategoryOrder"
                                value={womenCategoryOrder}
                                onChange={(e) => setWomenCategoryOrder(e.target.value)}
                                placeholder="e.g., 1 (lower is first)"
                            />
                        </div>
                        <button type="submit" disabled={womenCategoryLoading || !womenCategoryName || !womenCategoryFile} className="admin-btn primary">
                            {womenCategoryLoading ? 'Processing...' : 'Add Women Category'}
                        </button>
                        {womenCategoryMessage && <p className="success-message">{womenCategoryMessage}</p>}
                        {womenCategoryError && <p className="error-message">🚨 {womenCategoryError}</p>}
                    </form>
                </section>

            </div>
            
            <hr />

            {/* ======================= Section for Adding Products ======================= */}
            <section className="admin-section product-section">
                <h2>Add New Product 👗👔</h2>
                <form onSubmit={handleAddProduct} className="admin-form full-width">
                    <div className="form-row">
                        <div className="form-group half-width">
                            <label htmlFor="productGender">Product Gender:</label>
                            <select
                                id="productGender"
                                value={selectedProductGender}
                                onChange={(e) => {
                                    setSelectedProductGender(e.target.value);
                                    setSelectedProductCategoryId(''); // Reset category when gender changes
                                }}
                                required
                            >
                                <option value="men">Men</option>
                                <option value="women">Women</option>
                            </select>
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="productCategory">Select Category:</label>
                            <select
                                id="productCategory"
                                value={selectedProductCategoryId}
                                onChange={(e) => setSelectedProductCategoryId(e.target.value)}
                                required
                            >
                                <option value="">-- Select a Category --</option>
                                {(selectedProductGender === 'men' ? allMenCategories : allWomenCategories).map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="productName">Product Name:</label>
                        <input
                            type="text"
                            id="productName"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="e.g., Elegant Bridal Lehenga"
                            required
                        />
                    </div>
                    
                    <div className="form-row image-upload-row">
                         <div className="form-group half-width">
                            <label htmlFor="productMainImageFile">📸 Main Image (Required):</label>
                            <input
                                type="file"
                                id="productMainImageFile"
                                accept="image/*"
                                onChange={(e) => setProductMainImageFile(e.target.files[0])}
                                required
                            />
                            {productMainImageFile && <p className="file-preview-name">Selected: {productMainImageFile.name}</p>}
                        </div>

                        <div className="form-group half-width">
                            <label htmlFor="productAdditionalImageFiles">🖼️ Additional Images (Optional, Multi-Select):</label>
                            <input
                                type="file"
                                id="productAdditionalImageFiles"
                                accept="image/*"
                                multiple
                                onChange={(e) => setProductAdditionalImageFiles(Array.from(e.target.files))}
                            />
                            {productAdditionalImageFiles.length > 0 && <p className="file-preview-name">Selected: {productAdditionalImageFiles.length} files</p>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="productDescription">Description:</label>
                        <textarea
                            id="productDescription"
                            value={productDescription}
                            onChange={(e) => setProductDescription(e.target.value)}
                            placeholder="Detailed description of the product."
                            rows="4"
                        ></textarea>
                    </div>

                    <div className="form-row">
                         <div className="form-group one-third-width">
                            <label htmlFor="productCode">Product Code:</label>
                            <input
                                type="text"
                                id="productCode"
                                value={productCode}
                                onChange={(e) => setProductCode(e.target.value)}
                                placeholder="e.g., LHNGA001"
                            />
                        </div>
                        <div className="form-group one-third-width">
                            <label htmlFor="productOriginalPrice">Original Price (₹):</label>
                            <input
                                type="number"
                                id="productOriginalPrice"
                                value={productOriginalPrice}
                                onChange={(e) => setProductOriginalPrice(e.target.value)}
                                placeholder="e.g., 15000"
                                step="0.01"
                            />
                        </div>
                        <div className="form-group one-third-width">
                            <label htmlFor="productRent">Rent per day (₹):</label>
                            <input
                                type="number"
                                id="productRent"
                                value={productRent}
                                onChange={(e) => setProductRent(e.target.value)}
                                placeholder="e.g., 1000"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group half-width">
                            <label htmlFor="productColor">Color:</label>
                            <input
                                type="text"
                                id="productColor"
                                list="color-options"
                                value={productColor}
                                onChange={(e) => setProductColor(e.target.value)}
                                placeholder="e.g., Red, Marron Valvet"
                                required
                            />
                            <datalist id="color-options">
                                {dynamicColorOptions.map(option => (<option key={option} value={option} />))}
                            </datalist>
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="productSizes">Sizes (comma-separated):</label>
                            <input
                                type="text"
                                id="productSizes"
                                list="size-options"
                                value={productSizes}
                                onChange={(e) => setProductSizes(e.target.value)}
                                placeholder="e.g., S, M, L, XL"
                                required
                            />
                            <datalist id="size-options">
                                {dynamicSizeOptions.map(option => (<option key={option} value={option} />))}
                            </datalist>
                        </div>
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group half-width">
                            <label htmlFor="productAvailableStores">Available Stores (comma-separated):</label>
                            <input
                                type="text"
                                id="productAvailableStores"
                                list="store-options"
                                value={productAvailableStores}
                                onChange={(e) => setProductAvailableStores(e.target.value)}
                                placeholder="e.g., Camp, Pune, Wakad"
                                required
                            />
                            <datalist id="store-options">
                                {dynamicStoreOptions.map(option => (<option key={option} value={option} />))}
                            </datalist>
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="productMaterial">Material:</label>
                            <input
                                type="text"
                                id="productMaterial"
                                value={productMaterial}
                                onChange={(e) => setProductMaterial(e.target.value)}
                                placeholder="e.g., Silk, Cotton Blend"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="productCareInstructions">Care Instructions:</label>
                        <input
                            type="text"
                            id="productCareInstructions"
                            value={productCareInstructions}
                            onChange={(e) => setProductCareInstructions(e.target.value)}
                            placeholder="e.g., Dry clean only"
                        />
                    </div>

                    <button type="submit" disabled={productLoading || !selectedProductCategoryId || !productMainImageFile} className="admin-btn secondary">
                        {productLoading ? 'Uploading & Saving...' : 'Add Product to Inventory'}
                    </button>
                    {productMessage && <p className="success-message">{productMessage}</p>}
                    {productError && <p className="error-message">🚫 {productError}</p>}
                </form>
            </section>
        </div>
    );
}

export default AdminPage;