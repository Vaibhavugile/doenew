// ------------------------------
// src/pages/AddEditBlog.js — WYSIWYG Editor (React Quill)
// ------------------------------
import React, { useEffect, useState } from "react";
import {
  addDoc, collection, doc, getDocs, limit, query,
  serverTimestamp, updateDoc, where
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import slugify from "./slugify";

// EDITOR
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import "./blog.css";

const quillModules = {
  toolbar: [
    [{ header: [2, 3, 4, false] }],     // Headings H2/H3/H4 + Normal
    ["bold", "italic", "underline", "strike"], // Emphasis
    [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
    ["blockquote", "link"],              // Quote + Link
    ["clean"],                           // Remove formatting
  ],
};
const quillFormats = [
  "header", "bold", "italic", "underline", "strike",
  "list", "bullet", "indent", "blockquote", "link"
];

export function AddEditBlog() {
  const params = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(params.id);

  const [values, setValues] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "<p>Write your post…</p>", // HTML from editor
    coverImage: "",
    tags: "",
    author: "DOR",
    status: "draft",
    metaTitle: "",
    metaDescription: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load if editing
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const q = query(collection(db, "blogs"), where("id", "==", params.id), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
          setValues({
            title: data.title || "",
            slug: data.slug || "",
            excerpt: data.excerpt || "",
            content: data.content || "<p></p>",
            coverImage: data.coverImage || "",
            tags: (data.tags || []).join(", "),
            author: data.author || "DOR",
            status: data.status || "draft",
            metaTitle: data.metaTitle || "",
            metaDescription: data.metaDescription || "",
          });
        }
      } catch (e) { console.error(e); }
    })();
  }, [isEdit, params.id]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (name === "title") {
      setValues((v) => ({ ...v, slug: slugify(value) }));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: values.title.trim(),
        slug: values.slug.trim(),
        excerpt: values.excerpt.trim(),
        content: values.content, // React Quill HTML
        coverImage: values.coverImage.trim(),
        tags: values.tags.split(",").map((t) => t.trim()).filter(Boolean),
        author: values.author.trim() || "DOR",
        status: values.status,
        metaTitle: values.metaTitle.trim(),
        metaDescription: values.metaDescription.trim(),
        updatedAt: serverTimestamp(),
      };

      if (isEdit) {
        const postRef = doc(collection(db, "blogs"), params.id);
        await updateDoc(postRef, payload);
      } else {
        await addDoc(collection(db, "blogs"), { ...payload, createdAt: serverTimestamp() });
      }
      navigate("/blog");
    } catch (e) {
      console.error(e);
      setError("Couldn't save the post. Please check required fields.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="blox-pad">
      <Helmet>
        <title>{isEdit ? "Edit Post — DOR" : "New Post — DOR"}</title>
      </Helmet>

      <div className="blox-shell blox-cmsShell">
        <h1 className="blox-title">{isEdit ? "Edit Blog Post" : "Create Blog Post"}</h1>
        {error && <p className="blox-text" style={{ color: "#ef4444" }}>{error}</p>}

        <form className="blox-form" onSubmit={onSubmit}>
          <div className="blox-grid2">
            <label className="blox-field">
              <span className="blox-label">Title*</span>
              <input className="blox-control" name="title" value={values.title} onChange={onChange} required />
            </label>
            <label className="blox-field">
              <span className="blox-label">Slug</span>
              <input className="blox-control" name="slug" value={values.slug} onChange={onChange} placeholder="auto from title" />
            </label>
          </div>

          <label className="blox-field">
            <span className="blox-label">Excerpt</span>
            <textarea className="blox-area" name="excerpt" value={values.excerpt} onChange={onChange} rows={3} />
          </label>

          <div className="blox-grid2">
            <label className="blox-field">
              <span className="blox-label">Cover Image URL</span>
              <input className="blox-control" name="coverImage" value={values.coverImage} onChange={onChange} placeholder="https://…" />
            </label>
            <label className="blox-field">
              <span className="blox-label">Tags (comma separated)</span>
              <input className="blox-control" name="tags" value={values.tags} onChange={onChange} placeholder="lehenga, wedding, tips" />
            </label>
          </div>

          <div className="blox-grid2">
            <label className="blox-field">
              <span className="blox-label">Author</span>
              <input className="blox-control" name="author" value={values.author} onChange={onChange} />
            </label>
            <label className="blox-field">
              <span className="blox-label">Status</span>
              <select className="blox-select" name="status" value={values.status} onChange={onChange}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          {/* Rich Text Editor */}
          <label className="blox-field">
            <span className="blox-label">Content (Editor)</span>
            <div className="blox-editor">
              <ReactQuill
                theme="snow"
                modules={quillModules}
                formats={quillFormats}
                value={values.content}
                onChange={(html) => setValues((v) => ({ ...v, content: html }))}
                placeholder="Start writing… Use H2/H3, bullets, quotes, links from the toolbar."
              />
            </div>
          </label>

          <div className="blox-actions">
            <button className="blox-btn" disabled={saving}>
              {saving ? "Saving…" : "Save Post"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
