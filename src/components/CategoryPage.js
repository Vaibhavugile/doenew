import React, { useEffect, useMemo, useState } from 'react';
import { db, storage } from '../firebaseConfig';
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  deleteDoc,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './CategoryPage.css'; // premium standalone CSS

/**
 * CategoryPage — FULL CRUD + Search/Filter/Sort + Pagination
 * + Debug logs for load, render, and delete
 * + Overlay-safe drawer backdrop + click stack inspector
 */
export default function CategoryPage() {
  // Data
  const [men, setMen] = useState([]);
  const [women, setWomen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('all'); // all | men | women
  const [sortKey, setSortKey] = useState('order'); // order | name | addedDate
  const [sortDir, setSortDir] = useState('asc'); // asc | desc
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Add form
  const [gender, setGender] = useState('men');
  const [name, setName] = useState('');
  const [orderVal, setOrderVal] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Edit drawer
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null); // { id, gender, name, order, imageUrl, addedDate }
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState('');
  const [editGender, setEditGender] = useState('men');
  const [editFile, setEditFile] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // TEMP: global click logger to detect overlays
  useEffect(() => {
    const handler = (e) => {
      const els = document.elementsFromPoint(e.clientX, e.clientY) || [];
      const stack = els
        .map(el => {
          const cls = (el.className || '').toString().trim().replace(/\s+/g, '.');
          return `${el.tagName}${cls ? '.' + cls : ''}`;
        })
        .join('  >  ');
      // Comment out if noisy:
      // console.log('👆 Click stack:', stack);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  // Helpers
  const uploadFileAndGetURL = async (f, g) => {
    if (!f) return null;
    const storageRef = ref(storage, `category_images/${g}/${Date.now()}_${f.name}`);
    const snap = await uploadBytes(storageRef, f);
    return await getDownloadURL(snap.ref);
  };

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const menSnap = await getDocs(query(collection(db, 'menCategories'), orderBy('order')));
      const womenSnap = await getDocs(query(collection(db, 'womenCategories'), orderBy('order')));

      const menData = menSnap.docs.map(d => ({ id: d.id, gender: 'men', ...d.data() }));
      const womenData = womenSnap.docs.map(d => ({ id: d.id, gender: 'women', ...d.data() }));

      console.log('✅ Loaded Men:', menData);
      console.log('✅ Loaded Women:', womenData);

      setMen(menData);
      setWomen(womenData);
    } catch (e) {
      console.error('❌ fetchAll failed:', e);
      setError('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Merge + derive
  const merged = useMemo(() => [...men, ...women], [men, women]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return merged.filter(c => {
      const matchGender = genderFilter === 'all' || c.gender === genderFilter;
      const matchText = !s || (c.name || '').toLowerCase().includes(s);
      return matchGender && matchText;
    });
  }, [merged, search, genderFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'order') cmp = (a.order ?? 0) - (b.order ?? 0);
      else if (sortKey === 'name') cmp = (a.name || '').localeCompare(b.name || '');
      else if (sortKey === 'addedDate') cmp = new Date(a.addedDate || 0) - new Date(b.addedDate || 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page]);

  useEffect(() => { setPage(1); }, [search, genderFilter, sortKey, sortDir]);

  // Add
  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    if (!file) {
      setError('Please select an image.');
      setSubmitting(false);
      return;
    }
    try {
      const imageUrl = await uploadFileAndGetURL(file, gender);
      const col = gender === 'men' ? 'menCategories' : 'womenCategories';
      await addDoc(collection(db, col), {
        name: name.trim(),
        order: parseInt(orderVal) || 0,
        imageUrl,
        addedDate: new Date().toISOString(),
      });
      setMessage('Category added ✅');
      setName(''); setOrderVal(''); setFile(null);
      await fetchAll();
    } catch (e) {
      console.error('❌ Add failed:', e);
      setError(e.message || 'Failed to add category.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete — with defensive checks + console diagnostics
  const handleDelete = async (item) => {
    console.log('🟡 Delete clicked. Item received:', item);

    if (!item) return alert('⚠️ No item received');
    if (!item.id) return alert('⚠️ Item has no id');
    if (!item.gender) return alert('⚠️ Item has no gender');

    const col =
      item.gender === 'men' ? 'menCategories'
      : item.gender === 'women' ? 'womenCategories'
      : null;

    console.log('📂 Target collection:', col);
    console.log('🆔 Document ID:', item.id);

    if (!col) return alert(`Bad gender on item: ${item.gender ?? '(missing)'}`);

    const ok = window.confirm(`Delete "${item.name || ''}" permanently?`);
    if (!ok) return;

    try {
      const ref_ = doc(db, col, item.id);
      console.log('✳️ Ref path:', `${col}/${item.id}`);
      await deleteDoc(ref_);
      console.log('✅ Delete success!');
      await fetchAll();
    } catch (err) {
      console.error('❌ Delete failed:', err);
      alert(`Delete failed: ${err.code || ''} ${err.message || err}`);
    }
  };

  // Edit open
  const openEdit = (item) => {
    setEditItem(item);
    setEditName(item.name || '');
    setEditOrder(String(item.order ?? ''));
    setEditGender(item.gender || 'men');
    setEditFile(null);
    setEditOpen(true);
  };

  // Edit save (supports moving between gender collections)
  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editItem) return;
    setEditSaving(true);
    try {
      const newGender = editGender;
      let imageUrl = editItem.imageUrl || null;
      if (editFile) {
        imageUrl = await uploadFileAndGetURL(editFile, newGender);
      }

      if (newGender !== editItem.gender) {
        const fromCol = editItem.gender === 'men' ? 'menCategories' : 'womenCategories';
        const toCol = newGender === 'men' ? 'menCategories' : 'womenCategories';

        await addDoc(collection(db, toCol), {
          name: editName.trim(),
          order: parseInt(editOrder) || 0,
          imageUrl,
          addedDate: editItem.addedDate || new Date().toISOString(),
        });
        await deleteDoc(doc(db, fromCol, editItem.id));
      } else {
        const col = newGender === 'men' ? 'menCategories' : 'womenCategories';
        await updateDoc(doc(db, col, editItem.id), {
          name: editName.trim(),
          order: parseInt(editOrder) || 0,
          imageUrl,
        });
      }

      setEditOpen(false);
      setEditItem(null);
      await fetchAll();
    } catch (e) {
      console.error('❌ Edit save failed:', e);
      alert(e.message || 'Failed to save changes.');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <h1>Categories</h1>
        <p>Manage categories with search, filter, sort, edit and delete.</p>
      </header>

      {/* Toolbar */}
      <div className="toolbar-row gap">
        <div className="toolbar-left">
          <input
            className="input"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
            <option value="all">All genders</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
          </select>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="order">Sort by: Order</option>
            <option value="name">Sort by: Name</option>
            <option value="addedDate">Sort by: Date</option>
          </select>
          <button
            className="admin-btn ghost"
            onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
          >
            {sortDir === 'asc' ? 'Asc' : 'Desc'}
          </button>
        </div>
        <div className="toolbar-right">
          <button className="admin-btn primary" onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Close' : 'Add Category'}
          </button>
        </div>
      </div>

      {/* Collapsible Add Form */}
      {showForm && (
        <section className="admin-card" style={{ marginTop: 12 }}>
          <h2>Add Category</h2>
          <form className="admin-form" onSubmit={handleAdd}>
            <div className="form-row">
              <div className="form-group one-third-width">
                <label>Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                  <option value="men">Men</option>
                  <option value="women">Women</option>
                </select>
              </div>
              <div className="form-group one-third-width">
                <label>Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sherwanis / Gowns"
                  required
                />
              </div>
              <div className="form-group one-third-width">
                <label>Display Order</label>
                <input
                  type="number"
                  value={orderVal}
                  onChange={(e) => setOrderVal(e.target.value)}
                  placeholder="e.g., 1"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Category Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
              {file && <p className="file-preview-name">Selected: {file.name}</p>}
            </div>
            <button type="submit" className="admin-btn secondary" disabled={submitting || !name || !file}>
              {submitting ? 'Saving...' : 'Save Category'}
            </button>
            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
          </form>
        </section>
      )}

      {/* List */}
      <section className="admin-card" style={{ marginTop: 12 }}>
        <div className="list-header">
          <h2>All Categories</h2>
          {loading && <span>Loading…</span>}
        </div>
        {sorted.length === 0 && !loading ? (
          <p>No categories found.</p>
        ) : (
          <>
            <div className="category-grid">
              {paged.map(cat => {
                console.log('🎨 Rendering Card:', cat);
                return (
                  <article key={`${cat.gender}-${cat.id}`} className="category-card">
                    <div className="category-thumb">
                      {cat.imageUrl ? (
                        <img src={cat.imageUrl} alt={cat.name || 'Category'} />
                      ) : (
                        <div className="thumb-placeholder">No Image</div>
                      )}
                    </div>
                    <div className="category-body">
                      <div className="category-row">
                        <h3 className="category-title">{cat.name || '—'}</h3>
                        <span className={`badge ${cat.gender}`}>{cat.gender}</span>
                      </div>
                      <div className="muted">Order: {cat.order ?? 0}</div>
                      <div className="card-actions">
                        <button className="admin-btn tiny" onClick={() => openEdit(cat)}>Edit</button>
                        <button className="admin-btn tiny danger" onClick={() => handleDelete(cat)}>Delete</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            {/* Pagination */}
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <span>Page {page} / {Math.max(1, Math.ceil(sorted.length / pageSize))}</span>
              <button disabled={page >= Math.ceil(sorted.length / pageSize)} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </>
        )}
      </section>

      {/* Edit Drawer — backdrop only intercepts clicks when open */}
      <div
        className={`drawer-backdrop ${editOpen ? 'open' : ''}`}
        onClick={() => setEditOpen(false)}
        style={{ display: editOpen ? 'flex' : 'none' }}
      >
        <div className="drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <h3>Edit Category</h3>
            <button className="icon-btn" onClick={() => setEditOpen(false)}>✕</button>
          </div>
          <form className="admin-form" onSubmit={handleEditSave}>
            <div className="form-row">
              <div className="form-group one-third-width">
                <label>Gender</label>
                <select value={editGender} onChange={(e) => setEditGender(e.target.value)} required>
                  <option value="men">Men</option>
                  <option value="women">Women</option>
                </select>
              </div>
              <div className="form-group one-third-width">
                <label>Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div className="form-group one-third-width">
                <label>Display Order</label>
                <input type="number" value={editOrder} onChange={(e) => setEditOrder(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Replace Image (optional)</label>
              <input type="file" accept="image/*" onChange={(e) => setEditFile(e.target.files?.[0] || null)} />
              {editItem?.imageUrl && (
                <div className="current-image">
                  <img src={editItem.imageUrl} alt="current" />
                </div>
              )}
            </div>
            <div className="drawer-actions">
              <button type="button" className="admin-btn ghost" onClick={() => setEditOpen(false)}>Cancel</button>
              <button type="submit" className="admin-btn secondary" disabled={editSaving}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
