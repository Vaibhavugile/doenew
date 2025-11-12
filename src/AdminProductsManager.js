import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  collection,
  collectionGroup,
  deleteDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  listAll,
  deleteObject,
  getBytes,
} from "firebase/storage";
import { db, storage } from "./firebaseConfig";
import "./AdminProductsManager.css";

const PAGE = 25;


export default function AdminProductsManager() {
  const [gender, setGender] = useState("men");
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [loadingCats, setLoadingCats] = useState(false);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [atEnd, setAtEnd] = useState(false);
const [moveProgress, setMoveProgress] = useState(0); // 0 → 100

  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");

  const [editing, setEditing] = useState(null);
  const [busyEdit, setBusyEdit] = useState(false);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
// Move-category inline UI state
const [moveFor, setMoveFor] = useState(null);      // product object being moved
const [moveOptions, setMoveOptions] = useState([]); // categories for that product's gender
const [moveCatId, setMoveCatId] = useState("");     // selected target category id
const [busyMove, setBusyMove] = useState(false);

  // Load categories for current gender
  useEffect(() => {
    const loadCats = async () => {
      setLoadingCats(true);
      try {
        const col = gender === "men" ? "menCategories" : "womenCategories";
        const snap = await getDocs(query(collection(db, col), orderBy("order")));
        setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCats(false);
      }
    };
    setCategoryId("");
    loadCats();
  }, [gender]);

  // Load products (first page) when filters change
  useEffect(() => {
    let cancel = false;
    const run = async () => {
      setLoading(true);
      setMsg(""); setErr("");
      setItems([]); setCursor(null); setAtEnd(false);
      try {
        let snap;
        if (categoryId) {
          const col = gender === "men" ? "menCategories" : "womenCategories";
          const q1 = query(
            collection(db, col, categoryId, "products"),
            orderBy("addedDate", "desc"),
            limit(PAGE)
          );
          snap = await getDocs(q1);
        } else {
          // All categories for this gender via collectionGroup
          const q1 = query(
            collectionGroup(db, "products"),
            orderBy("addedDate", "desc"),
            limit(PAGE)
          );
          snap = await getDocs(q1);
        }

        if (cancel) return;

        const data = snap.docs.map((d) => {
          const obj = { id: d.id, ...d.data(), _ref: d.ref };
          // menCategories/{cat}/products/{id}
          const parts = d.ref.path.split("/");
          if (parts[0] === "menCategories" || parts[0] === "womenCategories") {
            obj.gender = parts[0] === "menCategories" ? "men" : "women";
            obj.categoryId = parts[1];
          }
          return obj;
        });

        const filtered = categoryId ? data : data.filter((p) => (p.gender ? p.gender === gender : true));

        setItems(filtered);
        setCursor(snap.docs[snap.docs.length - 1] || null);
        setAtEnd(snap.empty || snap.docs.length < PAGE);
      } catch (e) {
        console.error(e);
        setErr("Failed to load products.");
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    run();
    return () => { cancel = true; };
  }, [gender, categoryId]);

  const loadMore = async () => {
    if (loading || atEnd || !cursor) return;
    setLoading(true);
    try {
      let snap;
      if (categoryId) {
        const col = gender === "men" ? "menCategories" : "womenCategories";
        snap = await getDocs(
          query(
            collection(db, col, categoryId, "products"),
            orderBy("addedDate", "desc"),
            startAfter(cursor),
            limit(PAGE)
          )
        );
      } else {
        const qn = query(
          collectionGroup(db, "products"),
          orderBy("addedDate", "desc"),
          startAfter(cursor),
          limit(PAGE)
        );
        snap = await getDocs(qn);
      }
      const data = snap.docs.map((d) => {
        const obj = { id: d.id, ...d.data(), _ref: d.ref };
        const parts = d.ref.path.split("/");
        if (parts[0] === "menCategories" || parts[0] === "womenCategories") {
          obj.gender = parts[0] === "menCategories" ? "men" : "women";
          obj.categoryId = parts[1];
        }
        return obj;
      });
      const filtered = categoryId ? data : data.filter((p) => (p.gender ? p.gender === gender : true));
      setItems((prev) => [...prev, ...filtered]);
      setCursor(snap.docs[snap.docs.length - 1] || cursor);
      if (snap.empty || snap.docs.length < PAGE) setAtEnd(true);
    } catch (e) {
      console.error(e);
      setErr("Failed to load more.");
    } finally {
      setLoading(false);
    }
  };

  // Build filter options
  const colorOptions = useMemo(() => {
    const s = new Set();
    items.forEach((p) => { if (p.color) s.add(p.color); });
    return Array.from(s).sort();
  }, [items]);

  const storeOptions = useMemo(() => {
    const s = new Set();
    items.forEach((p) => (p.availableStores || []).forEach((st) => s.add(st)));
    return Array.from(s).sort();
  }, [items]);

  // Visible rows (search + color + store)
  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((p) => {
      const hay = `${p.name || ""} ${p.productCode || ""} ${p.color || ""} ${(p.availableStores || []).join(" ")}`.toLowerCase();
      const passSearch = s ? hay.includes(s) : true;
      const passColor = colorFilter ? (p.color === colorFilter) : true;
      const passStore = storeFilter ? (p.availableStores || []).includes(storeFilter) : true;
      return passSearch && passColor && passStore;
    });
  }, [items, search, colorFilter, storeFilter]);

  // Edit modal state (no deep clone of refs)
  const openEdit = (p) => {
    setEditing({
      _ref: p._ref,
      id: p.id || "",
      productCode: p.productCode || "",
      name: p.name || "",
      description: p.description || "",
      rent: p.rent ?? 0,
      originalPrice: p.originalPrice ?? "",
      color: p.color || "",
      sizes: Array.isArray(p.sizes) ? [...p.sizes] : [],
      availableStores: Array.isArray(p.availableStores) ? [...p.availableStores] : [],
      material: p.material || "",
      careInstructions: p.careInstructions || "",
      imageUrl: p.imageUrl || "",
      thumbs: p.thumbs || null,
    });
  };
  const closeEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing || !editing._ref) return;
    setBusyEdit(true);
    setMsg(""); setErr("");
    try {
      const payload = {
        productCode: (editing.productCode || "").trim() || null,
        name: (editing.name || "").trim(),
        description: (editing.description || "").trim(),
        rent: editing.rent ? Number(editing.rent) : 0,
        originalPrice: editing.originalPrice ? Number(editing.originalPrice) : null,
        color: (editing.color || "").trim(),
        sizes: normalizePipesOrArray(editing.sizes),
        availableStores: normalizePipesOrArray(editing.availableStores),
        material: (editing.material || "").trim() || null,
        careInstructions: (editing.careInstructions || "").trim() || null,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(editing._ref, payload);
      setItems((prev) =>
        prev.map((x) => (x._ref.path === editing._ref.path ? { ...x, ...payload } : x))
      );
      setMsg("✅ Saved.");
      setEditing(null);
    } catch (e) {
      console.error(e);
      setErr(e.message || "Save failed");
    } finally {
      setBusyEdit(false);
    }
  };
const openMove = async (p) => {
  try {
    setBusyMove(true);
    setMoveFor(p);
    // Load categories for THIS product's gender
    const col = p.gender === "men" ? "menCategories" : "womenCategories";
    const snap = await getDocs(query(collection(db, col), orderBy("order")));
    const opts = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
    setMoveOptions(opts);
    setMoveCatId(p.categoryId || "");
  } finally {
    setBusyMove(false);
  }
};

const closeMove = () => {
  setMoveFor(null);
  setMoveOptions([]);
  setMoveCatId("");
};
// helper: count total files under a storage folder (recursive)
// helper: count total files under a storage folder (recursive)
async function countFiles(ref) {
  const list = await listAll(ref);
  let count = list.items.length;
  for (const sub of list.prefixes) {
    count += await countFiles(sub);
  }
  return count;
}

// helper: copy folder and report progress via callback
async function copyFolder(srcRef, destRef, progressCallback) {
  const list = await listAll(srcRef);

  // copy files in this folder
  for (const item of list.items) {
    const bytes = await getBytes(item);
    const target = storageRef(storage, destRef.fullPath + "/" + item.name);
    await uploadBytes(target, bytes);
    progressCallback?.(1); // one file done
  }

  // recurse into subfolders
  for (const sub of list.prefixes) {
    const destSub = storageRef(storage, destRef.fullPath + "/" + sub.name);
    await copyFolder(sub, destSub, progressCallback);
  }
}

// OPTIONAL: refresh thumb URLs at the new location if you store them
async function refreshThumbUrls(baseRef, oldThumbs) {
  const sizes = ["xs","sm","md","lg"];
  const patched = {};
  for (const k of sizes) {
    try {
      const r = storageRef(storage, `${baseRef.fullPath}/thumbs/${k}.jpg`);
      const url = await getDownloadURL(r);
      patched[k] = { ...(oldThumbs?.[k] || {}), url };
    } catch { /* size might not exist; skip */ }
  }
  return Object.keys(patched).length ? patched : oldThumbs || null;
}

const moveNow = async () => {
  if (!moveFor || !moveCatId || moveCatId === moveFor.categoryId) {
    closeMove();
    return;
  }

  setBusyMove(true);
  setMoveProgress(0);
  setMsg(""); setErr("");

  try {
    // Parse old path: ["menCategories", "{catId}", "products", "{productId}"]
    const parts = moveFor._ref.path.split("/");
    const oldGender = parts[0] === "menCategories" ? "men" : "women";
    const oldCat = parts[1];
    const productId = parts[3];

    const newGenderCol = oldGender === "men" ? "menCategories" : "womenCategories";
    const newDocRef = doc(db, `${newGenderCol}/${moveCatId}/products/${productId}`);

    // Build payload from existing product object
    const payload = {
      productCode: moveFor.productCode || null,
      name: moveFor.name || "",
      description: moveFor.description || "",
      rent: moveFor.rent ? Number(moveFor.rent) : 0,
      originalPrice: moveFor.originalPrice ? Number(moveFor.originalPrice) : null,
      color: moveFor.color || "",
      sizes: normalizePipesOrArray(moveFor.sizes),
      availableStores: normalizePipesOrArray(moveFor.availableStores),
      material: moveFor.material || null,
      careInstructions: moveFor.careInstructions || null,
      imageUrl: moveFor.imageUrl || null,   // will refresh below
      thumbs: moveFor.thumbs || null,       // may refresh below
      addedDate: moveFor.addedDate || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1) Create new doc
    await setDoc(newDocRef, payload);

    // 2) Copy Storage folder with progress
    const srcRef = storageRef(storage, `products/${oldGender}/${oldCat}/${productId}`);
    const destRef = storageRef(storage, `products/${oldGender}/${moveCatId}/${productId}`);

    const total = await countFiles(srcRef);
    if (total === 0) {
      setMoveProgress(100);
    } else {
      let done = 0;
      await copyFolder(srcRef, destRef, () => {
        done += 1;
        const pct = Math.min(100, Math.round((done / total) * 100));
        setMoveProgress(pct);
      });
    }

    // 2.1) Refresh the main hero URL at the NEW path so ProductDetailPage can load it
    let newHeroUrl = payload.imageUrl;
    try {
      const newHeroRef = storageRef(storage, `${destRef.fullPath}/hero.jpg`);
      newHeroUrl = await getDownloadURL(newHeroRef);
      await updateDoc(newDocRef, { imageUrl: newHeroUrl, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.warn("Hero URL refresh failed (continuing):", e);
    }

    // 2.2) OPTIONAL: refresh thumb URLs if you store them
    try {
      const newThumbs = await refreshThumbUrls(destRef, moveFor.thumbs);
      if (newThumbs !== moveFor.thumbs) {
        await updateDoc(newDocRef, { thumbs: newThumbs, updatedAt: new Date().toISOString() });
        payload.thumbs = newThumbs; // keep local payload in sync
      }
    } catch (e) {
      console.warn("Thumb URL refresh failed (continuing):", e);
    }

    // 3) Delete old storage + old doc
    await deleteFolderRecursive(srcRef);
    await deleteDoc(moveFor._ref);

    // 4) Update UI list (also sync imageUrl & thumbs in the UI)
    setItems(prev => {
      const without = prev.filter(x => x._ref.path !== moveFor._ref.path);
      const shouldShow =
        (gender === oldGender) && // top-level gender filter
        (!categoryId || categoryId === moveCatId); // top-level category filter

      if (shouldShow) {
        return [
          {
            ...moveFor,
            categoryId: moveCatId,
            _ref: newDocRef,
            imageUrl: newHeroUrl,
            thumbs: payload.thumbs,
            updatedAt: payload.updatedAt
          },
          ...without
        ];
      }
      return without;
    });

    setMoveProgress(100);
    setMsg("✅ Moved to selected category.");
    closeMove();
  } catch (e) {
    console.error(e);
    setErr(e.message || "Move failed");
    setBusyMove(false);
  }
};


  // Replace hero image (uploads to canonical path; onProductImage regenerates thumbs)
  const onReplaceImage = async (file) => {
    if (!editing || !editing._ref || !file) return;
    try {
      setBusyEdit(true);
      const parts = editing._ref.path.split("/");
      const g = parts[0] === "menCategories" ? "men" : "women";
      const catId = parts[1];
      const productId = parts[3];
      const heroPath = `products/${g}/${catId}/${productId}/hero.jpg`;
      const r = storageRef(storage, heroPath);
      await uploadBytes(r, file, { contentType: file.type });
      const url = await getDownloadURL(r);
      await updateDoc(editing._ref, { imageUrl: url, updatedAt: new Date().toISOString() });
      setItems((prev) =>
        prev.map((x) => (x._ref.path === editing._ref.path ? { ...x, imageUrl: url } : x))
      );
      setMsg("✅ Image replaced (thumbs will refresh automatically).");
    } catch (e) {
      console.error(e);
      setErr(e.message || "Image upload failed");
    } finally {
      setBusyEdit(false);
    }
  };

  // Delete product (doc + storage folder)
  const onDelete = async (p) => {
    if (!p || !p._ref) return;
    const ok = window.confirm(`Delete "${p.name || p.productCode || p.id}"? This cannot be undone.`);
    if (!ok) return;
    try {
      setMsg(""); setErr("");
      const parts = p._ref.path.split("/"); // ["menCategories", "{cat}", "products", "{id}"]
      const g = parts[0] === "menCategories" ? "men" : "women";
      const catId = parts[1];
      const productId = parts[3];
      const folder = storageRef(storage, `products/${g}/${catId}/${productId}`);
      await deleteFolderRecursive(folder);
      await deleteDoc(p._ref);
      setItems((prev) => prev.filter((x) => x._ref.path !== p._ref.path));
      setMsg("🗑️ Deleted.");
    } catch (e) {
      console.error(e);
      setErr(e.message || "Delete failed");
    }
  };

  return (
    <div className="apm-container">
      <Helmet><title>Admin • Products</title></Helmet>

      <header className="apm-header">
        <h1>Products</h1>
        <div className="apm-actions">
          <Link to="/admin/add-product" className="apm-btn">+ Add product</Link>
          <Link to="/admin/bulk-products" className="apm-btn primary">+ Bulk import</Link>
        </div>
      </header>

      {/* Filters */}
      <section className="apm-filters">
        <div className="row">
          <div className="group">
            <label>Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="men">Men</option>
              <option value="women">Women</option>
            </select>
          </div>

          <div className="group">
            <label>Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={loadingCats}>
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="group">
            <label>Color</label>
            <select value={colorFilter} onChange={(e)=>setColorFilter(e.target.value)}>
              <option value="">All</option>
              {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="group">
            <label>Store</label>
            <select value={storeFilter} onChange={(e)=>setStoreFilter(e.target.value)}>
              <option value="">All</option>
              {storeOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="group flex1">
            <label>Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / code / color / store"
            />
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="apm-card">
        {loading && items.length === 0 ? <SkeletonRows /> : (
          <>
            <table className="apm-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Color</th>
                  <th>Stores</th>
                  <th>Rent</th>
                  <th>Sizes</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p._ref.path}>
                    <td>
                      <img
                        src={p.thumbs?.xs?.url || p.thumbs?.sm?.url || p.imageUrl}
                        alt=""
                        className="apm-thumb"
                        width="56"
                        height="42"
                      />
                    </td>
                    <td className="apm-ellipsis">{p.name || "—"}</td>
                    <td className="apm-ellipsis">{p.productCode || "—"}</td>
                    <td>{p.color || "—"}</td>
                    <td className="apm-ellipsis">{(p.availableStores || []).join(", ") || "—"}</td>
                    <td>₹{p.rent || 0}</td>
                    <td className="apm-ellipsis">{(p.sizes || []).join(", ")}</td>
                    <td>{formatDate(p.addedDate)}</td>
                    <td className="apm-actions-cell">
                      <button className="apm-btn ghost" onClick={() => openEdit(p)}>Edit</button>
                      <button className="apm-btn danger" onClick={() => onDelete(p)}>Delete</button>
                      <button className="apm-btn ghost" onClick={() => openMove(p)}>Move</button>

 {moveFor && moveFor._ref.path === p._ref.path && (
   <div className="apm-move-inline">
     <select
       value={moveCatId}
       onChange={(e)=> setMoveCatId(e.target.value)}       disabled={busyMove}
    >
       {moveOptions.map(c => (
         <option key={c.id} value={c.id}>{c.name}</option>
       ))}
     </select>
   <button className="apm-btn" onClick={moveNow} disabled={busyMove || !moveCatId || moveCatId === p.categoryId}>
  {busyMove ? `Moving… ${moveProgress}%` : "Confirm"}
</button>

     <button className="apm-btn ghost" onClick={closeMove} disabled={busyMove}>Cancel</button>
   </div>
 )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!atEnd && (
              <div className="apm-more">
                <button className="apm-btn" onClick={loadMore} disabled={loading}>
                  {loading ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {msg && <p className="apm-success">{msg}</p>}
      {err && <p className="apm-error">{err}</p>}

      {/* Edit modal */}
      {editing && (
        <div className="apm-modal" onClick={closeEdit}>
          <div className="apm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="apm-modal-head">
              <h3>Edit product</h3>
              <button className="apm-x" onClick={closeEdit}>×</button>
            </div>

            <div className="apm-modal-body">
              <div className="apm-edit-grid">
                <div className="apm-edit-left">
                  <div className="row">
                    <div className="group">
                      <label>Product Code</label>
                      <input value={editing.productCode || ""} onChange={(e) => setEditing({ ...editing, productCode: e.target.value })} />
                    </div>
                    <div className="group">
                      <label>Color</label>
                      <input value={editing.color || ""} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
                    </div>
                  </div>

                  <div className="group">
                    <label>Name</label>
                    <input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                  </div>

                  <div className="group">
                    <label>Description</label>
                    <textarea rows={4} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                  </div>

                  <div className="row">
                    <div className="group">
                      <label>Rent (₹/day)</label>
                      <input type="number" value={editing.rent || 0} onChange={(e) => setEditing({ ...editing, rent: e.target.value })} />
                    </div>
                    <div className="group">
                      <label>Original Price</label>
                      <input type="number" value={editing.originalPrice || ""} onChange={(e) => setEditing({ ...editing, originalPrice: e.target.value })} />
                    </div>
                  </div>

                  <div className="row">
                    <div className="group">
                      <label>Sizes (S|M|L|XL)</label>
                      <input value={toPipes(editing.sizes)} onChange={(e) => setEditing({ ...editing, sizes: fromPipes(e.target.value) })} />
                    </div>
                    <div className="group">
                      <label>Stores (Camp|Pune|Wakad)</label>
                      <input value={toPipes(editing.availableStores)} onChange={(e) => setEditing({ ...editing, availableStores: fromPipes(e.target.value) })} />
                    </div>
                  </div>

                  <div className="row">
                    <div className="group">
                      <label>Material</label>
                      <input value={editing.material || ""} onChange={(e) => setEditing({ ...editing, material: e.target.value })} />
                    </div>
                    <div className="group">
                      <label>Care Instructions</label>
                      <input value={editing.careInstructions || ""} onChange={(e) => setEditing({ ...editing, careInstructions: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="apm-edit-right">
                  <div className="group">
                    <label>Hero image</label>
                    <div className="apm-hero">
                      <img src={editing.thumbs?.sm?.url || editing.imageUrl} alt="" />
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => onReplaceImage(e.target.files?.[0])} disabled={busyEdit} />
                    <small className="muted">Uploading a new hero regenerates thumbs automatically.</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="apm-modal-foot">
              <button className="apm-btn" onClick={saveEdit} disabled={busyEdit}>
                {busyEdit ? "Saving…" : "Save"}
              </button>
              <button className="apm-btn ghost" onClick={closeEdit}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */
function normalizePipesOrArray(v) {
  if (Array.isArray(v)) return v.map((s) => (s || "").toString().trim()).filter(Boolean);
  return (v || "").toString().split("|").map((s) => s.trim()).filter(Boolean);
}
function toPipes(v) { return Array.isArray(v) ? v.join("|") : (v || "").toString(); }
function fromPipes(s) { return (s || "").split("|").map((x) => x.trim()).filter(Boolean); }
function formatDate(d) {
  if (!d) return "—";
  try {
    const dt = typeof d === "string" ? new Date(d) : d.toDate ? d.toDate() : new Date(d);
    return dt.toLocaleDateString();
  } catch { return "—"; }
}
async function deleteFolderRecursive(folderRef) {
  const listing = await listAll(folderRef);
  await Promise.all(listing.items.map((f) => deleteObject(f)));
  await Promise.all(listing.prefixes.map((sub) => deleteFolderRecursive(sub)));
}

/* ---------- lightweight skeleton ---------- */
function SkeletonRows() {
  return (
    <div className="apm-skeleton">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="sk-row" key={i}>
          <div className="sk-thumb" />
          <div className="sk-line" />
          <div className="sk-line sm" />
        </div>
      ))}
    </div>
  );
}
