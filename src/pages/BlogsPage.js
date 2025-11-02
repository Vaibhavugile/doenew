
// ------------------------------
// src/pages/BlogsPage.js
// ------------------------------
import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { collection, getDocs, limit, orderBy, query, startAfter, where } from "firebase/firestore";
import { Helmet } from "react-helmet-async";
import { db } from "../firebaseConfig";
import "./blog.css";

export default function BlogsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const q = (searchParams.get("q") || "").trim();
  const tag = (searchParams.get("tag") || "").trim();

  const pageTitle = useMemo(() => {
    const base = "DOR Blog — Style stories & rental wisdom";
    if (q) return `${base} · Search: ${q}`;
    if (tag) return `${base} · #${tag}`;
    return base;
  }, [q, tag]);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError("");
      try {
        const preload = query(
          collection(db, "blogs"),
          where("status", "==", "published"),
          orderBy("createdAt", "desc"),
          limit(50)
        );
        const baseQuery = query(
          collection(db, "blogs"),
          where("status", "==", "published"),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const snap = await getDocs(q || tag ? preload : baseQuery);
        let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        if (q) {
          const needle = q.toLowerCase();
          rows = rows.filter((p) =>
            (p.title || "").toLowerCase().includes(needle) ||
            (p.excerpt || "").toLowerCase().includes(needle) ||
            (p.content || "").toLowerCase().includes(needle)
          );
        }
        if (tag) {
          rows = rows.filter((p) => Array.isArray(p.tags) && p.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase()));
        }

        setPosts(rows);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === 10 && !q && !tag);
      } catch (e) {
        console.error(e);
        setError("Couldn't load blog posts. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [q, tag]);

  const loadMore = async () => {
    if (!lastDoc) return;
    try {
      const nextQ = query(
        collection(db, "blogs"),
        where("status", "==", "published"),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(10)
      );
      const snap = await getDocs(nextQ);
      setPosts((prev) => [...prev, ...snap.docs.map((d) => ({ id: d.id, ...d.data() }))]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === 10);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section className="blox-pad">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content="Read outfit tips, wedding style guides, lehenga & sherwani care, pricing, and DOR updates." />
        <link rel="canonical" href={typeof window!=="undefined" ? window.location.href : "https://example.com/blog"} />
      </Helmet>

      <div className="blox-shell">
        {/* HERO + TOOLS */}
        <header className="blox-hero">
          <div className="blox-heroCard">
            <h1 className="blox-title">DOR Blog</h1>
            <p className="blox-heroSub">Style stories & rental wisdom.</p>
            <div className="blox-tools">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = new FormData(e.currentTarget).get("q");
                  const next = {};
                  if (input) next.q = input;
                  if (tag) next.tag = tag;
                  setSearchParams(next);
                }}
                className="blox-search"
                role="search"
              >
                <input name="q" defaultValue={q} placeholder="Search tips, trends, guides…" aria-label="Search blog" className="blox-input" />
                <button className="blox-btn" aria-label="Run search">Search</button>
              </form>
              {tag && (
                <button className="blox-btn blox-btnGhost" onClick={() => setSearchParams(q ? { q } : {})}>Clear Tag</button>
              )}
            </div>
          </div>
        </header>

        {/* GRID */}
        {loading && (
          <ul className="blox-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="blox-skel">
                <div className="blox-skelImg" />
                <div className="blox-skelLine blox-w70" />
                <div className="blox-skelLine blox-w40" />
              </li>
            ))}
          </ul>
        )}

        {error && <p className="blox-text" style={{color:'#ef4444'}}>{error}</p>}

        {!loading && (
          <>
            <ul className="blox-grid">
              {posts.map((p) => (
                <li key={p.id} className="blox-card">
                  <Link to={`/blog/${p.slug || p.id}`} className="blox-cardLink" aria-label={`Open ${p.title}`}>
                    {p.coverImage && (
                      <img className="blox-cardImg" src={p.coverImage} alt={p.title} loading="lazy" />
                    )}
                    <div className="blox-cardBody">
                      <h3 className="blox-cardTitle">{p.title}</h3>
                      <p className="blox-cardSub">{p.excerpt || "Read more"}</p>
                      {Array.isArray(p.tags) && p.tags.length > 0 && (
                        <div className="blox-tags">
                          {p.tags.slice(0,3).map((t) => (
                            <button
                              key={t}
                              className="blox-chip"
                              onClick={(e) => {
                                e.preventDefault();
                                setSearchParams({ tag: t });
                              }}
                            >
                              #{t}
                            </button>
                          ))}
                        </div>
                      )}
                      <div style={{marginTop:12}}>
                        <Link to={`/blog/${p.slug || p.id}`} className="blox-btn blox-btnGhost">Read more</Link>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {posts.length === 0 && (
              <div className="blox-empty">
                <p>No posts yet. Try clearing filters or add your first post.</p>
              </div>
            )}

            {hasMore && (
              <div className="blox-loadWrap">
                <button className="blox-btn" onClick={loadMore}>Load more</button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
