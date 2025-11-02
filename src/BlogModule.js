import React, { useMemo } from "react";
import { Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";

/*
  BlogModule.jsx — All-in-one module
  - /blogs        => BlogsIndex (grid listing with search, tags, categories)
  - /blog/:slug   => BlogPost (single article page with TOC, schema, related posts)

  How to use:
  1) Import and mount <BlogRoutes /> inside your Router.
     Example in App.jsx:
        import BlogRoutes from "./BlogModule";
        ...
        <Routes>
          <Route path="/*" element={<HomePage />} />
          <Route path="/*" element={<BlogRoutes />} />
        </Routes>
     or explicitly:
        <BlogRoutes />
  2) Replace the `POSTS` data with your real content or wire to Firestore.
*/

/* ---------------------- Premium CSS (Dark + Gold) ---------------------- */
const PremiumStyles = () => (
  <style>{`
    :root{
      --page-bg: var(--color-dark, #0b0b0c);
      --surface: var(--color-mid, #151517);
      --text: var(--color-light, #e8e8ea);
      --muted: #b8b8bf;
      --accent: var(--color-accent, #C9A66B); /* Luxury Gold */
      --soft: var(--color-soft, #D9B78C);
      --radius: 18px;
      --shadow-md: 0 10px 30px rgba(0,0,0,.35);
      --shadow-lg: 0 24px 60px rgba(0,0,0,.45);
    }

    .blog-wrap{min-height:100vh; background:var(--page-bg); color:var(--text); padding:clamp(16px,2vw,32px);}
    .container{max-width:1200px; margin:0 auto;}

    /* Header */
    .blog-header{display:flex; align-items:center; justify-content:space-between; gap:16px; margin: 6px 0 28px}
    .brand{font-family: 'Cinzel', serif; letter-spacing:.4px; font-weight:800; font-size:clamp(22px,2.2vw,30px)}
    .brand em{color:var(--accent); font-style:normal}

    /* Search + Filters */
    .filters{display:grid; grid-template-columns: 1fr; gap:12px; margin: 10px 0 28px}
    @media(min-width:768px){.filters{grid-template-columns:1fr auto}}
    .search{display:flex; align-items:center; gap:10px; background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02)); border:1px solid rgba(255,255,255,.12); padding:12px 14px; border-radius:14px}
    .search input{all:unset; color:var(--text); flex:1}
    .pill{padding:10px 14px; border-radius:9999px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.05); cursor:pointer;}
    .pill:hover{background:rgba(255,255,255,.08)}

    /* Grid */
    .grid{display:grid; gap:22px; grid-template-columns:1fr}
    @media(min-width:700px){.grid{grid-template-columns:repeat(2,1fr)}}
    @media(min-width:1024px){.grid{grid-template-columns:repeat(3,1fr)}}

    /* Card */
    .card{position:relative; overflow:hidden; border-radius:var(--radius); background:linear-gradient(160deg, rgba(255,255,255,.08), rgba(255,255,255,.02)); border:1px solid rgba(255,255,255,.10); box-shadow: var(--shadow-md); display:flex; flex-direction:column;}
    .thumb{aspect-ratio:16/10; width:100%; object-fit:cover; display:block; filter:saturate(1.05) contrast(1.03)}
    .card-body{padding:16px 16px 18px}
    .kicker{font-size:.8rem; color:var(--muted); letter-spacing:.18em; text-transform:uppercase}
    .title{margin:.35rem 0 .5rem; font-weight:800; font-size:1.15rem; line-height:1.35}
    .excerpt{color:#d8d8db; opacity:.9; font-size:.95rem;}
    .meta{display:flex; align-items:center; justify-content:space-between; margin-top:12px; color:var(--muted); font-size:.85rem}
    .read{display:inline-flex; align-items:center; gap:8px; margin-top:12px; font-weight:700; color:var(--accent)}
    .badge{display:inline-block; font-size:.78rem; padding:6px 10px; border-radius:999px; background:rgba(201,166,107,.14); border:1px solid rgba(201,166,107,.5); color:var(--accent)}

    /* Single Post */
    .hero{border-radius:var(--radius); overflow:hidden; border:1px solid rgba(255,255,255,.1); box-shadow:var(--shadow-lg);}
    .hero img{width:100%; height:auto; display:block;}
    .post-head{display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content:space-between; margin:22px 0}
    .breadcrumbs{font-size:.88rem; color:var(--muted)}
    .breadcrumbs a{color:var(--accent); text-decoration:none}
    .post-title{font-family:'Cinzel',serif; font-size:clamp(26px,3vw,40px); letter-spacing:.3px; margin:10px 0 6px}
    .post-sub{color:#d0d0d4; max-width:65ch}
    .content{margin-top:18px; line-height:1.9; font-size:1.05rem; color:#eee}
    .content h2{font-family:'Cinzel',serif; margin:20px 0 10px; font-size:1.6rem}
    .content p{margin:.6rem 0}
    .content ul{padding-left:1.25rem}
    .callout{margin:18px 0; padding:16px; border-radius:14px; background:linear-gradient(160deg, rgba(201,166,107,.1), rgba(201,166,107,.03)); border:1px solid rgba(201,166,107,.35)}

    /* Related */
    .related{margin-top:34px}
    .related h3{font-size:1.2rem; margin-bottom:12px}

    /* Tiny utils */
    .row{display:flex; gap:10px; align-items:center; flex-wrap:wrap}
    .sr{position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden;clip:rect(0,0,0,0); white-space:nowrap; border:0}
  `}</style>
);

/* --------------------------- Demo Content --------------------------- */
const POSTS = [
  {
    slug: "bridal-lehenga-colors-2025-pune",
    title: "Top Bridal Lehenga Colors Trending in 2025 — Pune Edition",
    subtitle: "A modern minimalist guide for brides who love quiet luxury.",
    category: "Wedding Style",
    tags: ["Lehenga", "Bridal", "Color Guide"],
    date: "2025-10-10",
    author: "DOR Editorial",
    cover: "https://images.unsplash.com/photo-1542060748-10c28b62716b?q=80&w=1400&auto=format&fit=crop",
    excerpt:
      "From champagne gold to sage green — discover palettes that look regal yet modern under Pune’s warm light.",
    html: `
      <p>For the modern Pune bride, elegance feels soft, confident, and effortless. In 2025, brides are choosing fluid silhouettes and palettes that glow—never glare.</p>
      <h2>Champagne Gold</h2>
      <p>Understated royalty for evening receptions. Pair with diamond minimalism and a soft matte base.</p>
      <h2>Old Rose Dust Pink</h2>
      <p>Romance without candy tones—perfect for garden mehendi or day pheras.</p>
      <h2>Ivory with Gold Zari</h2>
      <p>Temple ceremonies and regal indoor pheras favor this serene palette.</p>
      <h2>Misty Sage Green</h2>
      <p>Poetic and modern—beautiful for engagements and outdoor shoots.</p>
      <div class="callout">
        <strong>Explore:</strong> <a href="/collection/women/Lehenga">Women’s Lehenga Collection in Pune</a>
      </div>
    `,
  },
  {
    slug: "groom-sherwani-body-type-guide",
    title: "How to Choose a Sherwani by Groom’s Body Type",
    subtitle: "A clean, confident framework for silhouettes that flatter.",
    category: "Groom Style",
    tags: ["Sherwani", "Groom", "Fit Guide"],
    date: "2025-09-05",
    author: "DOR Editorial",
    cover: "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1400&auto=format&fit=crop",
    excerpt:
      "Length, structure, and fabric weight—dial these in and every photo looks editorial.",
    html: `
      <p>Structure and proportion define a graceful sherwani. Use length to elongate, and keep fabrics breathable for Pune weather.</p>
      <ul>
        <li><strong>Taller frames:</strong> Jodhpuri cuts with subtle embroidery.</li>
        <li><strong>Compact frames:</strong> Sleek collars, clean vertical motifs.</li>
      </ul>
      <div class="callout">
        <strong>Explore:</strong> <a href="/collection/men/Sherwani">Men’s Sherwani Collection</a>
      </div>
    `,
  },
  {
    slug: "prewedding-gown-ideas-themes",
    title: "7 Gown Styles for Pre‑Wedding Shoots (By Theme)",
    subtitle: "From heritage courtyards to hill escapes—what photographs best.",
    category: "Photoshoot",
    tags: ["Gown", "Pre‑Wedding", "Photography"],
    date: "2025-08-12",
    author: "DOR Editorial",
    cover: "https://images.unsplash.com/photo-1520975922284-5f573c5e2aa9?q=80&w=1400&auto=format&fit=crop",
    excerpt:
      "Editorial yet effortless gowns that love natural light and wide frames.",
    html: `
      <p>Choose gowns that move. Chiffon and organza read like poetry on camera. Avoid heavy shine; favor depth and texture.</p>
    `,
  },
];

/* -------------------------- Helpers / Hooks ------------------------- */
const useQuery = () => new URLSearchParams(useLocation().search);
const formatDate = (iso) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

/* ----------------------------- Listing ------------------------------ */
function BlogsIndex() {
  const q = useQuery().get("q")?.toLowerCase() || "";
  const filtered = useMemo(() => {
    if (!q) return POSTS;
    return POSTS.filter((p) =>
      [p.title, p.subtitle, p.category, p.tags?.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [q]);

  return (
    <div className="blog-wrap">
      <PremiumStyles />
      <Helmet>
        <title>DOR Style Journal — Luxury Wedding & Fashion Guides</title>
        <meta name="description" content="Wedding styling guides, lehenga trends, sherwani fit advice, and sustainable fashion—curated by DOR Dress On Rent." />
      </Helmet>

      <div className="container">
        <header className="blog-header">
          <div className="brand">DOR <em>Style Journal</em></div>
          <Link className="pill" to="/">← Back to Home</Link>
        </header>

        <div className="filters">
          <label className="search" htmlFor="search">
            <span className="sr">Search</span>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="currentColor" d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23C16 6.01 12.99 3 9.5 3S3 6.01 3 9.5 6.01 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input id="search" name="q" placeholder="Search articles, e.g. lehenga, sherwani…" defaultValue={q} onKeyDown={(e)=>{if(e.key==='Enter'){const v=e.currentTarget.value; const u = new URL(window.location.href); if(v)u.searchParams.set('q', v); else u.searchParams.delete('q'); window.location.href=u.toString();}}} />
          </label>
          <div className="row">
            <span className="badge">Wedding Style</span>
            <span className="badge">Groom</span>
            <span className="badge">Photoshoot</span>
            <span className="badge">Sustainability</span>
          </div>
        </div>

        <section className="grid" aria-label="Blog posts">
          {filtered.map((p)=> (
            <article key={p.slug} className="card">
              <Link to={`/blog/${p.slug}`}>
                <img className="thumb" src={p.cover} alt="Cover" loading="lazy" />
              </Link>
              <div className="card-body">
                <div className="kicker">{p.category}</div>
                <h2 className="title"><Link to={`/blog/${p.slug}`}>{p.title}</Link></h2>
                <p className="excerpt">{p.excerpt}</p>
                <div className="meta">
                  <span>{formatDate(p.date)}</span>
                  <Link className="read" to={`/blog/${p.slug}`}>Read Article →</Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

/* ---------------------------- Single Post --------------------------- */
function BlogPost() {
  const { slug } = useParams();
  const nav = useNavigate();
  const post = POSTS.find((p) => p.slug === slug);

  const related = POSTS.filter((p) => p.slug !== slug).slice(0, 3);

  if (!post) {
    return (
      <div className="blog-wrap">
        <PremiumStyles />
        <div className="container">
          <p>We couldn’t find that article.</p>
          <button className="pill" onClick={()=>nav('/blogs')}>← Back to Blog</button>
        </div>
      </div>
    );
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.subtitle,
    image: post.cover,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'DOR Dress On Rent' },
    publisher: { '@type': 'Organization', name: 'DOR Dress On Rent' },
    mainEntityOfPage: `${typeof window !== 'undefined' ? window.location.origin : ''}/blog/${post.slug}`,
  };

  return (
    <div className="blog-wrap">
      <PremiumStyles />
      <Helmet>
        <title>{post.title} | DOR Style Journal</title>
        <meta name="description" content={post.subtitle} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="container">
        <header className="blog-header">
          <div className="brand">DOR <em>Style Journal</em></div>
          <Link className="pill" to="/blogs">← All Articles</Link>
        </header>

        <nav className="breadcrumbs" aria-label="Breadcrumbs">
          <Link to="/">Home</Link> • <Link to="/blogs">Blog</Link> • <span>{post.category}</span>
        </nav>

        <h1 className="post-title">{post.title}</h1>
        <p className="post-sub">{post.subtitle}</p>
        <div className="row" style={{marginTop:8}}>
          <span className="badge">{post.category}</span>
          <span style={{color:'#b8b8bf'}}>{formatDate(post.date)}</span>
        </div>

        <figure className="hero" style={{margin:'18px 0 10px'}}>
          <img src={post.cover} alt="Cover"/>
        </figure>

        <article className="content" dangerouslySetInnerHTML={{__html: post.html}} />

        <section className="related">
          <h3>Related Articles</h3>
          <div className="grid">
            {related.map((p)=> (
              <article key={p.slug} className="card">
                <Link to={`/blog/${p.slug}`}>
                  <img className="thumb" src={p.cover} alt="Cover" loading="lazy" />
                </Link>
                <div className="card-body">
                  <div className="kicker">{p.category}</div>
                  <h2 className="title"><Link to={`/blog/${p.slug}`}>{p.title}</Link></h2>
                  <p className="excerpt">{p.excerpt}</p>
                  <div className="meta">
                    <span>{formatDate(p.date)}</span>
                    <Link className="read" to={`/blog/${p.slug}`}>Read →</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------ Routes ------------------------------ */
export default function BlogRoutes(){
  return (
    <Routes>
      <Route path="/blogs" element={<BlogsIndex />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
    </Routes>
  );
}
