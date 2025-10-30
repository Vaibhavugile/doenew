// CollaborationSection.js — Soft Luxury (matches HomePage.css)
// 4-up native videos, autoplay muted on view, tap to unmute, CTA -> Instagram

import React, { useEffect, useMemo, useRef } from "react";
import "./CollaborationSection.css";

export default function CollaborationSection({
  sectionTitle = "Collaboration",
  sectionSubtitle = "Our favorite creator moments ✦",
  videos = [
    { src: "/videos/Video-682.mp4", ig: "https://www.instagram.com/reel/DPjEUKmDOsj/?igsh=eXlyejRoZHE1ODlk" },
    { src: "/videos/Video-369.mp4", ig: "https://www.instagram.com/reel/DPgJ3BIjd5J/?igsh=cXV0eDZpdDlqZWNr" },
    { src: "/videos/Video-949.mp4", ig: "https://www.instagram.com/reel/DNbdZDqsCyW/?igsh=ZHM3N2F1cnFmNHYw" },
    { src: "/videos/Video-520.mp4", ig: "https://www.instagram.com/reel/DNQwKm3CPeW/?igsh=MTJwN2w2d3hrem84NQ%3D%3D" },
  ],
  threshold = 0.35, // % visible before play
}) {
  const vidsRef = useRef([]);
  const cardsRef = useRef([]);

  const items = useMemo(
    () => videos.map((v, i) => ({ key: v.src || `vid-${i}`, ...v })),
    [videos]
  );

  useEffect(() => {
    const onEnter = async (video, card) => {
      if (!video) return;
      card?.classList.add("is-playing");

      if (!video.dataset.loaded) {
        video.src = video.dataset.src;
        video.dataset.loaded = "1";
      }
      video.muted = true;       // autoplay-safe
      video.loop = true;
      video.playsInline = true;

      try {
        await video.play();
      } catch {
        // if blocked, user tap will start
      }
    };

    const onLeave = (video, card) => {
      if (!video) return;
      card?.classList.remove("is-playing");
      video.pause();
      video.removeAttribute("src");
      delete video.dataset.loaded;
      video.load(); // release decoder/buffers
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.dataset.index);
          const video = vidsRef.current[idx];
          const card = cardsRef.current[idx];
          if (entry.isIntersecting) onEnter(video, card);
          else onLeave(video, card);
        });
      },
      { root: null, threshold }
    );

    vidsRef.current.forEach((v) => v && io.observe(v));
    return () => io.disconnect();
  }, [threshold]);

  const toggleSound = (i) => {
    const v = vidsRef.current[i];
    if (!v) return;
    v.muted = !v.muted;
    if (v.paused) v.play().catch(() => {});
  };

  return (
    <section className="vgrid-section">
      <div className="header-wrapper">
        <h2 className="section-title">{sectionTitle}</h2>
        {sectionSubtitle && <p className="section-subtitle">{sectionSubtitle}</p>}
      </div>

      <div className="vgrid">
        {items.map((item, i) => (
          <article
            key={item.key}
            className="vcard"
            ref={(el) => (cardsRef.current[i] = el)}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="vframe">
              <video
                ref={(el) => (vidsRef.current[i] = el)}
                data-index={i}
                data-src={item.src}
                preload="none"
                // poster={item.poster || undefined}
              />
              <button
                type="button"
                className="soundtap"
                aria-label="Toggle sound"
                onClick={() => toggleSound(i)}
              />
              <div className="badge" aria-hidden="true">Tap for sound</div>
            </div>

            <a
              className="cta"
              href={item.ig}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Instagram →
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
