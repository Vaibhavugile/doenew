
// ------------------------------
// src/pages/BlogDetails.js
// ------------------------------
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { Helmet } from "react-helmet-async";
import { db } from "../firebaseConfig";
import "./blog.css";

export function BlogDetails() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError("");
        const q = query(
          collection(db, "blogs"),
          where("slug", "==", slug),
          where("status", "==", "published"),
          limit(1)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          setError("Post not found.");
          setPost(null);
        } else {
          setPost({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
      } catch (e) {
        console.error(e);
        setError("Couldn't load this post.");
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  if (loading) return <div className="blox-pad"><div className="blox-shell"><p className="blox-text">Loading…</p></div></div>;
  if (error) return <div className="blox-pad"><div className="blox-shell"><p className="blox-text" style={{color:'#ef4444'}}>{error}</p></div></div>;
  if (!post) return null;

  const publishedISO = post.createdAt?.toDate ? post.createdAt.toDate().toISOString() : new Date().toISOString();
  const canonical = typeof window!=="undefined" ? window.location.href : `https://example.com/blog/${slug}`;
  const metaTitle = post.metaTitle || `${post.title} — DOR Blog`;
  const metaDesc = post.metaDescription || post.excerpt || "Read outfit tips, rental guides and more on DOR Blog.";

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: publishedISO,
    image: post.coverImage ? [post.coverImage] : [],
    author: post.author || "DOR",
    description: metaDesc,
    mainEntityOfPage: canonical,
  };

  return (
    <article className="blox-pad">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        {post.coverImage && <meta property="og:image" content={post.coverImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDesc} />
        {post.coverImage && <meta name="twitter:image" content={post.coverImage} />}
        <script type="application/ld+json">{JSON.stringify(articleLd)}</script>
      </Helmet>

      <div className="blox-shell">
        <header className="blox-articleHead">
          <h1 className="blox-title">{post.title}</h1>
          {post.author && <p className="blox-byline">By {post.author}</p>}
          {Array.isArray(post.tags) && post.tags.length > 0 && (
            <div className="blox-tags">
              {post.tags.map((t) => (
                <span className="blox-chip" key={t}>#{t}</span>
              ))}
            </div>
          )}
        </header>

        {post.coverImage && (
          <img className="blox-heroImg" src={post.coverImage} alt={post.title} />
        )}

        <div className="blox-article-shell" dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>
    </article>
  );
}
