// AddProductPage.js — form UX preserved; save uses inbox + commitProductRow
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { db, storage, functions } from "./firebaseConfig";
import {
  collection, getDocs, orderBy, query, doc, getDoc, setDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
//import "./AdminPage.css";

/** Upload a file to inbox/{batchId}/{filename} and return { storagePath, url } */
async function uploadToInbox(batchId, file, suggestedName) {
  const name = suggestedName || file.name;
  const storagePath = `inbox/${batchId}/${name}`;
  const r = ref(storage, storagePath);
  await uploadBytes(r, file, { contentType: file.type });
  const url = await getDownloadURL(r);
  return { storagePath, url };
}

export default function AddProductPage() {
  // ---------- Category state (same UX as before) ----------
  const [gender, setGender] = useState("men");
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");

  // ---------- Product fields (same as before) ----------
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productCode, setProductCode] = useState(""); // optional/manual like before
  const [originalPrice, setOriginalPrice] = useState("");
  const [rent, setRent] = useState("");
  const [color, setColor] = useState("");
  const [sizes, setSizes] = useState(""); // comma or pipe; normalized on submit
  const [material, setMaterial] = useState("");
  const [careInstructions, setCareInstructions] = useState("");
  const [stores, setStores] = useState(""); // comma or pipe; normalized on submit

  // ---------- Images (main + gallery) ----------
  const [mainImageFile, setMainImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);

  // ---------- Options (for datalist like before) ----------
  const [dynamicStoreOptions, setDynamicStoreOptions] = useState([]);
  const [dynamicColorOptions, setDynamicColorOptions] = useState([]);
  const [dynamicSizeOptions, setDynamicSizeOptions] = useState([]);

  // ---------- UX state ----------
  const [batchId, setBatchId] = useState(() => String(Date.now())); // just like Bulk Wizard
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Load categories when gender changes (same query style as BulkProductsWizard)
  useEffect(() => {
    setCategoryId("");
    (async () => {
      const col = gender === "men" ? "menCategories" : "womenCategories";
      const snap = await getDocs(query(collection(db, col), orderBy("order")));
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    })().catch(console.error);
  }, [gender]);

  // Load dynamic filter options (to power datalists)
  useEffect(() => {
    (async () => {
      try {
        const storesSnapshot = await getDocs(collection(db, "filterOptions", "stores", "list"));
        setDynamicStoreOptions(storesSnapshot.docs.map(d => d.data().name || d.id));

        const colorsSnapshot = await getDocs(collection(db, "filterOptions", "colors", "list"));
        setDynamicColorOptions(colorsSnapshot.docs.map(d => d.data().name || d.id));

        const sizesSnapshot = await getDocs(collection(db, "filterOptions", "sizes", "list"));
        setDynamicSizeOptions(sizesSnapshot.docs.map(d => d.data().name || d.id));
      } catch (e) {
        console.error("Failed loading filter options", e);
      }
    })();
  }, []);

  // Normalize comma/pipe user input to server-accepted pipe string
  const toPipes = useCallback((v) =>
    (v || "").toString().split(/[,|]/).map(s => s.trim()).filter(Boolean).join("|"), []);

  // Optional: upsert filter options like your previous form did
  const upsertFilter = useCallback(async (type, value) => {
    const clean = (value || "").trim();
    if (!clean) return;
    const refDoc = doc(db, "filterOptions", type, "list", clean);
    const snap = await getDoc(refDoc);
    if (!snap.exists()) {
      await setDoc(refDoc, { name: clean, addedDate: new Date().toISOString() });
    }
  }, [db]);

  // Derive default filenames when saving (nice, stable names for inbox)
  const fileNames = useMemo(() => {
    const safeCode = (productCode || name || "product")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return {
      hero: `${safeCode || "hero"}.jpg`,
      gallery: (galleryFiles || []).map((_, i) => `${safeCode || "img"}_${i + 1}.jpg`)
    };
  }, [productCode, name, galleryFiles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setErr("");

    if (!categoryId) {
      setErr("Please select a category.");
      setLoading(false);
      return;
    }
    if (!mainImageFile) {
      setErr("Please choose a main image.");
      setLoading(false);
      return;
    }
    try {
      // 1) Upload images to inbox/{batchId}/… (same as Bulk Wizard) :contentReference[oaicite:1]{index=1}
      setMsg("Uploading images to inbox…");
      const mainUp = await uploadToInbox(batchId, mainImageFile, fileNames.hero);
      const galleryUps = [];
      for (let i = 0; i < galleryFiles.length; i++) {
        const f = galleryFiles[i];
        const fname = fileNames.gallery[i] || f.name;
        // keep extensions as-is; server copies to .jpg targets; source type can be png/jpg/etc
        const up = await uploadToInbox(batchId, f, fname);
        galleryUps.push(up);
      }

      // 2) Build payload and call the same Callable used by Bulk import :contentReference[oaicite:2]{index=2}
      setMsg("Finalizing product (server)…");
      const commit = httpsCallable(functions, "commitProductRow");
      const payload = {
        gender,
        categoryId,
        categoryName: "",                // not needed since we're passing categoryId
        productCode: productCode || "",
        name,
        description,
        originalPrice: originalPrice || "",
        rent: rent || "",
        color,
        sizes: toPipes(sizes),           // server accepts arrays or pipes; wizard uses pipes
        material,
        careInstructions,
        stores: toPipes(stores),
        mainImagePath: mainUp.storagePath,
        galleryImagePaths: galleryUps.map(g => g.storagePath), // array ok; server normalizes
      };
      const res = await commit(payload);
      // server creates doc and copies to: products/{gender}/{categoryId}/{productId}/...
      // onProductImage Cloud Function will generate thumbs + LQIP automatically

      // 3) Upsert filters (to keep your datalists rich, like before)
      await upsertFilter("colors", color);
      for (const s of toPipes(sizes).split("|")) await upsertFilter("sizes", s);
      for (const st of toPipes(stores).split("|")) await upsertFilter("stores", st);

      setMsg("✅ Product created! Thumbnails will appear shortly (generated by Cloud Function).");
      // 4) Reset form
      setName(""); setDescription(""); setProductCode("");
      setOriginalPrice(""); setRent(""); setColor("");
      setSizes(""); setMaterial(""); setCareInstructions(""); setStores("");
      setMainImageFile(null); setGalleryFiles([]);
      setBatchId(String(Date.now()));
    } catch (e) {
      console.error(e);
      setErr(e.message || "Error while saving product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <h1>Add Product</h1>
        <p>Uploads go to <code>inbox/{batchId}</code> → server copies to the product and generates thumbs.</p>
        <div style={{ marginTop: 12, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <label style={{ fontSize: 12, opacity: .8 }}>Batch ID</label>
          <input
            value={batchId}
            onChange={(e)=>setBatchId(e.target.value)}
            style={{ maxWidth: 220 }}
          />
          <Link to="/admin/products" className="admin-btn">← Back to Products</Link>
        </div>
      </header>

      <section className="admin-section product-section">
        <h2>New Product Details</h2>
        <form onSubmit={handleSubmit} className="admin-form full-width">
          <div className="form-row">
            <div className="form-group half-width">
              <label>Product Gender</label>
              <select value={gender} onChange={(e)=>setGender(e.target.value)} required>
                <option value="men">Men</option>
                <option value="women">Women</option>
              </select>
            </div>

            <div className="form-group half-width">
              <label>Select Category</label>
              <select value={categoryId} onChange={(e)=>setCategoryId(e.target.value)} required>
                <option value="">-- Select a Category --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Product Name</label>
            <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., Elegant Bridal Lehenga" required />
          </div>

          <div className="form-row image-upload-row">
            <div className="form-group half-width">
              <label>📸 Main Image (required)</label>
              <input type="file" accept="image/*" onChange={(e)=>setMainImageFile(e.target.files?.[0] || null)} required />
              {mainImageFile && <small className="muted">Will save as <b>{fileNames.hero}</b> in inbox/{batchId}</small>}
            </div>

            <div className="form-group half-width">
              <label>🖼️ Gallery Images (optional)</label>
              <input type="file" accept="image/*" multiple onChange={(e)=>setGalleryFiles(Array.from(e.target.files || []))} />
              {galleryFiles.length > 0 && (
                <small className="muted">Will save as: {fileNames.gallery.join(", ")}</small>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows="4" />
          </div>

          <div className="form-row">
            <div className="form-group one-third-width">
              <label>Product Code</label>
              <input value={productCode} onChange={(e)=>setProductCode(e.target.value)} placeholder="e.g., LHNGA001" />
            </div>
            <div className="form-group one-third-width">
              <label>Original Price (₹)</label>
              <input type="number" step="0.01" value={originalPrice} onChange={(e)=>setOriginalPrice(e.target.value)} placeholder="e.g., 15000" />
            </div>
            <div className="form-group one-third-width">
              <label>Rent per day (₹)</label>
              <input type="number" step="0.01" value={rent} onChange={(e)=>setRent(e.target.value)} placeholder="e.g., 1000" required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group half-width">
              <label>Color</label>
              <input list="color-options" value={color} onChange={(e)=>setColor(e.target.value)} placeholder="e.g., Maroon Velvet" required />
              <datalist id="color-options">
                {dynamicColorOptions.map(o => <option key={o} value={o} />)}
              </datalist>
            </div>

            <div className="form-group half-width">
              <label>Sizes (comma or |)</label>
              <input list="size-options" value={sizes} onChange={(e)=>setSizes(e.target.value)} placeholder="e.g., S, M, L, XL" required />
              <datalist id="size-options">
                {dynamicSizeOptions.map(o => <option key={o} value={o} />)}
              </datalist>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group half-width">
              <label>Available Stores (comma or |)</label>
              <input list="store-options" value={stores} onChange={(e)=>setStores(e.target.value)} placeholder="e.g., Camp|Pune|Wakad" required />
              <datalist id="store-options">
                {dynamicStoreOptions.map(o => <option key={o} value={o} />)}
              </datalist>
            </div>

            <div className="form-group half-width">
              <label>Material</label>
              <input value={material} onChange={(e)=>setMaterial(e.target.value)} placeholder="e.g., Silk, Cotton Blend" />
            </div>
          </div>

          <div className="form-group">
            <label>Care Instructions</label>
            <input value={careInstructions} onChange={(e)=>setCareInstructions(e.target.value)} placeholder="e.g., Dry clean only" />
          </div>

          <button type="submit" className="admin-btn secondary" disabled={loading || !categoryId || !mainImageFile}>
            {loading ? "Uploading & Finalizing…" : "Add Product to Inventory"}
          </button>

          {msg && <p className="success-message">{msg}</p>}
          {err && <p className="error-message">🚫 {err}</p>}
        </form>
      </section>
    </div>
  );
}
