// src/BulkProductsWizard.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { db, storage, functions } from './firebaseConfig';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import Papa from 'papaparse';
import './components/CategoryPage.css'; // reuse your premium admin styles

// Group by base code: "ABC.jpg", "ABC_1.png" -> "ABC"
const groupKey = (filename) => {
  const base = filename.replace(/\.[^.]+$/, '');
  return base.split('_')[0];
};

export default function BulkProductsWizard() {
  // Context
  const [gender, setGender] = useState('men');
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [batchId, setBatchId] = useState(() => String(Date.now()));

  // Upload state
  const [files, setFiles] = useState([]); // File[]
  const [uploads, setUploads] = useState([]); // {name, storagePath, url}
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Import state
  const [rows, setRows] = useState([]); // CSV rows to import
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState([]); // [{index, status:'ok'|'fail', error?}]
  const resultsRef = useRef([]);

  // Load categories per gender
  useEffect(() => {
    const load = async () => {
      const col = gender === 'men' ? 'menCategories' : 'womenCategories';
      const snap = await getDocs(query(collection(db, col), orderBy('order')));
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    setCategoryId('');
    setCategoryName('');
    load().catch(console.error);
  }, [gender]);

  // STEP 1 — Upload images to inbox/{batchId}/
  const onPick = (list) => {
    setFiles(Array.from(list || []));
  };

  const uploadAll = async () => {
    if (!files.length) return;
    setBusy(true); setMsg('Uploading images…'); setErr('');
    try {
      const outs = [];
      for (const f of files) {
        const storagePath = `inbox/${batchId}/${f.name}`;
        const r = ref(storage, storagePath);
        await uploadBytes(r, f, { contentType: f.type });
        const url = await getDownloadURL(r);
        outs.push({ name: f.name, storagePath, url });
      }
      setUploads(outs);
      setMsg(`✅ Uploaded ${outs.length} images to inbox/${batchId}`);
    } catch (e) {
      console.error(e); setErr(e.message || 'Upload failed');
    } finally { setBusy(false); }
  };

  // If the user already uploaded via Console: allow manual batchId entry and skip upload
  const useExistingInbox = async () => {
    // We cannot list from client for security by default. Keep this as a manual path mode:
    // Just set an info message; CSV will be built only from files you upload here.
    setErr('Listing Storage from client is usually blocked by rules. If you uploaded via Console, still export CSV after uploading at least one file here OR use the Node script to generate CSV. For now this button is informational.');
  };

  // Build groups from uploaded files
  const groups = useMemo(() => {
    const map = new Map();
    for (const u of uploads) {
      const key = groupKey(u.name);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(u);
    }
    return map;
  }, [uploads]);

  // STEP 2 — Export CSV template (paths + preview URLs)
  const exportCSV = () => {
    if (!uploads.length) {
      setErr('No uploaded files to export. Upload images first.');
      return;
    }
    const catName = categoryName || (categories.find(c => c.id === categoryId)?.name || '');
    const out = [];
    for (const [code, arr] of groups.entries()) {
      const exact = arr.find(x => x.name.replace(/\.[^.]+$/, '') === code);
      const main = exact || arr[0];
      const gallery = arr.filter(x => x !== main);
      out.push({
        batchId,
        productCode: code,
        // Storage paths used by server to copy
        mainImagePath: main.storagePath,
        galleryImagePaths: gallery.map(g => g.storagePath).join('|'),
        // Preview URLs (for you while editing)
        mainImageUrl: main.url,
        galleryImageUrls: gallery.map(g => g.url).join('|'),
        // Fields to fill
        gender,
        categoryId,
        categoryName: catName,
        name: '',
        description: '',
        originalPrice: '',
        rent: '',
        color: '',
        sizes: '', // e.g. S|M|L|XL
        material: '',
        careInstructions: '',
        stores: '', // e.g. Camp|Pune|Wakad
      });
    }
    const csv = Papa.unparse(out, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `products_template_${batchId}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg(`✅ CSV exported for ${out.length} products.`);
  };

  // STEP 3 — Import filled CSV (calls commitProductRow)
  const onImportCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: (res) => {
        const cleaned = res.data
          .map((r, idx) => ({ ...r, __row: idx + 1 }))
          .filter(r => r.productCode && r.mainImagePath);
        setRows(cleaned);
        setResults([]);
        resultsRef.current = [];
        setMsg(`Read ${cleaned.length} rows from CSV. Click "Start Import".`);
      }
    });
  };

  const startImport = async () => {
    if (!rows.length) { setErr('No rows loaded yet.'); return; }
    setImporting(true); setErr(''); setMsg('Importing…');
    const commit = httpsCallable(functions, 'commitProductRow');

    let ok = 0, fail = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const payload = {
          gender: (r.gender || gender).trim().toLowerCase(),
          categoryId: (r.categoryId || '').trim(),
          categoryName: (r.categoryName || '').trim(),
          productCode: (r.productCode || '').trim(),
          name: (r.name || '').trim(),
          description: (r.description || '').trim(),
          originalPrice: r.originalPrice || '',
          rent: r.rent || '',
          color: (r.color || '').trim(),
          sizes: (r.sizes || '').trim(),               // pipe supported server-side
          material: (r.material || '').trim(),
          careInstructions: (r.careInstructions || '').trim(),
          stores: (r.stores || '').trim(),             // pipe supported server-side
          mainImagePath: (r.mainImagePath || '').trim(),
          galleryImagePaths: (r.galleryImagePaths || '')
            .split('|').map(s => s.trim()).filter(Boolean),
        };
        await commit(payload);
        ok++;
        pushResult({ index: i, status: 'ok' });
      } catch (e) {
        console.error('Row failed', r.__row, e);
        fail++;
        pushResult({ index: i, status: 'fail', error: e.message || 'Error' });
      }
    }

    setMsg(`✅ Import finished: ${ok} succeeded, ${fail} failed`);
    setImporting(false);
  };

  const pushResult = (r) => {
    resultsRef.current = [...resultsRef.current, r];
    setResults(resultsRef.current.slice());
  };

  // Progress
  const progress = rows.length ? Math.round((results.length / rows.length) * 100) : 0;

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <h1>Bulk Products Wizard</h1>
        <p>1) Upload images → 2) Export CSV (with previews) → 3) Fill & Import</p>
      </header>

      {/* Context */}
      <section className="admin-card">
        <div className="form-row">
          <div className="form-group">
            <label>Gender</label>
            <select value={gender} onChange={(e)=>setGender(e.target.value)}>
              <option value="men">Men</option>
              <option value="women">Women</option>
            </select>
          </div>
          <div className="form-group">
            <label>Category (optional)</label>
            <select value={categoryId} onChange={(e)=>setCategoryId(e.target.value)}>
              <option value="">— Select —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <small className="muted">or type a name</small>
            <input value={categoryName} onChange={(e)=>setCategoryName(e.target.value)} placeholder="e.g., Lehenga" />
          </div>
          <div className="form-group">
            <label>Batch ID</label>
            <input value={batchId} onChange={(e)=>setBatchId(e.target.value)} />
            <small className="muted">You can change this to match an existing inbox folder name.</small>
          </div>
        </div>
      </section>

      {/* Step 1 — Upload */}
      <section className="admin-card">
        <h2>Step 1 — Upload Images</h2>
        <input type="file" multiple accept="image/*" onChange={(e)=>onPick(e.target.files)} />
        <div style={{ display:'flex', gap:12, marginTop:8 }}>
          <button className="admin-btn secondary" onClick={uploadAll} disabled={!files.length || busy}>
            {busy ? 'Uploading…' : `Upload ${files.length || 0} files`}
          </button>
          <button className="admin-btn ghost" onClick={useExistingInbox}>I already uploaded in Console</button>
        </div>
        {!!uploads.length && <p className="success-message" style={{marginTop:8}}>{uploads.length} images in inbox/{batchId}</p>}
      </section>

      {/* Step 2 — Export CSV */}
      <section className="admin-card">
        <h2>Step 2 — Export CSV (with previews)</h2>
        <p>We group files by base name (e.g., <code>ABC.jpg</code> + <code>ABC_1.jpg</code> → product code <b>ABC</b>).</p>
        <button className="admin-btn primary" onClick={exportCSV} disabled={!uploads.length}>Export CSV Template</button>
      </section>

      {/* Step 3 — Import */}
      <section className="admin-card">
        <h2>Step 3 — Import Filled CSV</h2>
        <input type="file" accept=".csv" onChange={onImportCSV} disabled={importing} />
        {rows.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <button className="admin-btn secondary" onClick={startImport} disabled={importing}>
              {importing ? 'Importing…' : 'Start Import'}
            </button>
            <div className="progressbar" style={{ marginTop: 8, height: 6, background: '#eee', borderRadius: 4 }}>
              <div style={{ width: `${progress}%`, height: '100%', borderRadius: 4, background: 'var(--accent, #111)' }} />
            </div>
            <small className="muted">{results.length}/{rows.length} processed</small>
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <div className="admin-table" style={{ marginTop: 12, overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product Code</th>
                  <th>Status</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const row = rows[r.index] || {};
                  return (
                    <tr key={i}>
                      <td>{row.__row}</td>
                      <td>{row.productCode}</td>
                      <td style={{ color: r.status === 'ok' ? 'green' : 'crimson' }}>
                        {r.status}
                      </td>
                      <td>{r.error || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {msg && <p className="success-message" style={{marginTop:8}}>{msg}</p>}
      {err && <p className="error-message" style={{marginTop:8}}>{err}</p>}
    </div>
  );
}
