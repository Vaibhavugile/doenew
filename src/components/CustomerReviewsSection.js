import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import "./CustomerReviewsSection.css";

// Autoplay settings
const AUTOPLAY_INTERVAL = 4000; // 4 seconds between slides

export default function CustomerReviewsSection({
  sectionTitle = "Customer Reviews",
  sectionSubtitle = "Real people. Real fits. Real love ✦",
  threshold = 0.35,
  maxItems = 12,
}) {
  const [reviews, setReviews] = useState([]);
  const vidsRef = useRef([]);
  const cardsRef = useRef([]);
  const carouselRef = useRef(null); // New ref for the carousel container

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

  // Intersection Observer for video autoplay (remains the same)
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

  // Autoplay/Automatic Scrolling Logic
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || items.length === 0) return;

    // Scroll function to move to the next item
    const scrollNext = () => {
      // Find the currently visible card that is closest to the left edge
      const firstCard = cardsRef.current[0];
      if (!firstCard) return;

      // Calculate the scroll distance: Card Width + Gap.
      // We will use the offsetWidth of the first card as the slide width.
      // NOTE: Because CSS Scroll Snap is enabled, the `scrollLeft` change will snap
      // to the next card's start point automatically and smoothly.
      const scrollDistance = firstCard.offsetWidth + 
                             parseFloat(getComputedStyle(carousel).gap || '0');

      // Calculate maximum scrollable distance
      const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
      
      if (carousel.scrollLeft >= maxScrollLeft) {
        // If at the end, smoothly scroll back to the start (0)
        carousel.scrollLeft = 0;
      } else {
        // Otherwise, scroll forward by one card width
        carousel.scrollLeft += scrollDistance;
      }
    };

    let autoplayTimer = setInterval(scrollNext, AUTOPLAY_INTERVAL);

    // Pause autoplay on user interaction
    const pauseAutoplay = () => clearInterval(autoplayTimer);
    const resumeAutoplay = () => {
        pauseAutoplay(); // Clear any existing timer
        autoplayTimer = setInterval(scrollNext, AUTOPLAY_INTERVAL);
    };

    carousel.addEventListener('mouseenter', pauseAutoplay);
    carousel.addEventListener('mouseleave', resumeAutoplay);
    carousel.addEventListener('touchstart', pauseAutoplay);
    carousel.addEventListener('touchend', resumeAutoplay);
    
    // Cleanup on unmount
    return () => {
      pauseAutoplay();
      carousel.removeEventListener('mouseenter', pauseAutoplay);
      carousel.removeEventListener('mouseleave', resumeAutoplay);
      carousel.removeEventListener('touchstart', pauseAutoplay);
      carousel.removeEventListener('touchend', resumeAutoplay);
    };
  }, [items.length]);


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

      <div 
        className="reviews-carousel stagger-grid is-visible"
        ref={carouselRef} // Attach ref for automatic scrolling
      >
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