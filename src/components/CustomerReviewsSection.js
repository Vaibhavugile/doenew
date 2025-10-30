import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import "./CustomerReviewsSection.css";

export default function CustomerReviewsSection({
  sectionTitle = "Customer Reviews",
  sectionSubtitle = "Real people. Real fits. Real love ✦",
  threshold = 0.35,
  maxItems = 12,
}) {
  const [reviews, setReviews] = useState([]);
  const vidsRef = useRef([]);
  const cardsRef = useRef([]);

  // live Firestore subscription
  useEffect(() => {
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"), limit(maxItems));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReviews(items);
    });
    return () => unsub();
  }, [maxItems]);

  const items = useMemo(
    () => reviews.map((r, i) => ({ key: r.id || `rev-${i}`, ...r, src: r.url })),
    [reviews]
  );

  useEffect(() => {
    const onEnter = async (video, card) => {
      if (!video) return;
      if (!video.dataset.loaded) {
        video.src = video.dataset.src;
        video.dataset.loaded = "1";
      }
      card?.classList.add("is-playing");
      video.muted = true; video.loop = true; video.playsInline = true;
      try { await video.play(); } catch {}
    };
    const onLeave = (video, card) => {
      if (!video) return;
      card?.classList.remove("is-playing");
      video.pause(); video.removeAttribute("src"); delete video.dataset.loaded; video.load();
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const idx = Number(entry.target.dataset.index);
        const v = vidsRef.current[idx];
        const c = cardsRef.current[idx];
        if (entry.isIntersecting) onEnter(v, c); else onLeave(v, c);
      });
    }, { threshold });

    vidsRef.current.forEach((v) => v && io.observe(v));
    return () => io.disconnect();
  }, [threshold, items.length]);

  const toggleSound = (i) => {
    const v = vidsRef.current[i];
    if (!v) return;
    v.muted = !v.muted;
    if (v.paused) v.play().catch(()=>{});
  };

  const Stars = ({ value = 5 }) => {
    const full = Math.floor(value);
    const half = value - full >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return (
      <span aria-label={`${value} out of 5`}>
        {"★".repeat(full)}{half ? "☆" : ""}{"☆".repeat(empty)}
      </span>
    );
  };

  return (
    <section className="reviews-section">
      <div className="reviews-header">
        <h2 className="reviews-title">{sectionTitle}</h2>
        {sectionSubtitle && <p className="reviews-subtitle">{sectionSubtitle}</p>}
      </div>

      <div className="reviews-grid stagger-grid is-visible">
        {items.map((it, i) => (
          <article
            key={it.key}
            className="review-card reveal-item"
            ref={(el) => (cardsRef.current[i] = el)}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="review-frame">
              <video
                ref={(el) => (vidsRef.current[i] = el)}
                data-index={i}
                data-src={it.src}
                preload="none"
                poster={it.poster || undefined}
              />
              <button type="button" className="review-soundtap" onClick={() => toggleSound(i)} />
              <div className="review-badge" aria-hidden="true">Tap for sound</div>
            </div>

            {(it.name || it.rating) && (
              <div className="review-meta">
                {it.name && <span className="review-name">{it.name}</span>}
                {it.rating && (
                  <span className="review-rating">
                    <Stars value={it.rating} />
                    <em>{Number(it.rating).toFixed(1)}</em>
                  </span>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
