import React, { useRef, useState } from "react";
import { storage, db } from "../firebaseConfig";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import "./CustomerReviewUpload.css";

export default function CustomerReviewUpload({ onSubmitted }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewURL, setPreviewURL] = useState("");
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [agree, setAgree] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState({ type: "", msg: "" });

  const MAX_SIZE_MB = 200;

  const onPick = (f) => {
    if (!f) return;
    if (!/^video\//i.test(f.type)) {
      return setStatus({ type: "error", msg: "Please select a video file." });
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      return setStatus({ type: "error", msg: `Max ${MAX_SIZE_MB}MB allowed.` });
    }
    setStatus({ type: "", msg: "" });
    setFile(f);
    setPreviewURL(URL.createObjectURL(f));
  };

  const onDrop = (e) => {
    e.preventDefault();
    onPick(e.dataTransfer.files?.[0]);
  };

  const startUpload = async (e) => {
    e.preventDefault();
    if (!file) return setStatus({ type: "error", msg: "Choose a video first." });
    if (!agree) return setStatus({ type: "error", msg: "Please confirm consent." });

    setStatus({ type: "info", msg: "Uploading to Firebase..." });
    setProgress(0);

    // unique path in Storage
    const ext = file.name.split(".").pop() || "mp4";
    const storageRef = ref(storage, `reviews/review-${Date.now()}.${ext}`);

    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type || "video/mp4",
    });

    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setProgress(pct);
      },
      (err) => {
        console.error(err);
        setStatus({ type: "error", msg: err.message || "Upload failed." });
      },
      async () => {
        const downloadURL = await getDownloadURL(task.snapshot.ref);

        // Save metadata in Firestore
        await addDoc(collection(db, "reviews"), {
          url: downloadURL,
          name: name || "Anonymous",
          rating: Number(rating) || 5,
          message: message || "",
          createdAt: serverTimestamp(),
        });

        setStatus({ type: "success", msg: "Thanks! Your review was sent." });
        setFile(null); setPreviewURL(""); setName(""); setRating(5); setMessage(""); setAgree(false);
        setProgress(0);
        onSubmitted?.();
      }
    );
  };

  return (
    <section className="review-upload-section">
      <div className="ru-header">
        <h3 className="ru-title">Share Your Review</h3>
        <p className="ru-sub">Upload a short video and tell others how it felt ✦</p>
      </div>

      <form className="ru-form" onSubmit={startUpload}>
        <div
          className="ru-drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e)=> (e.key==="Enter"||e.key===" ") && fileRef.current?.click()}
        >
          {!previewURL ? (
            <div className="ru-drop-empty">
              <span className="ru-emoji">🎥</span>
              <p>Drag & drop your review video here<br/>or <u>click to browse</u></p>
              <small>MP4/WebM • up to {MAX_SIZE_MB}MB</small>
            </div>
          ) : (
            <div className="ru-preview">
              <video src={previewURL} controls playsInline />
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => onPick(e.target.files?.[0])}
          />
        </div>

        <div className="ru-row">
          <label className="ru-field">
            <span>Name</span>
            <input type="text" placeholder="Your name" value={name} onChange={(e)=>setName(e.target.value)} required />
          </label>

          <label className="ru-field">
            <span>Rating</span>
            <select value={rating} onChange={(e)=>setRating(Number(e.target.value))}>
              {[5,4.5,4,3.5,3].map((r)=> <option key={r} value={r}>{r} ★</option>)}
            </select>
          </label>
        </div>

        <label className="ru-field">
          <span>Message (optional)</span>
          <textarea rows={3} placeholder="What did you love?" value={message} onChange={(e)=>setMessage(e.target.value)} />
        </label>

        <label className="ru-consent">
          <input type="checkbox" checked={agree} onChange={(e)=> setAgree(e.target.checked)} />
          <span>I agree to let you feature this review on your site & socials.</span>
        </label>

        {progress > 0 && (
          <div className="ru-progress" aria-label="Upload progress">
            <i style={{ width: `${progress}%` }} />
            <span>{progress}%</span>
          </div>
        )}

        {status.msg && <div className={`ru-status ${status.type}`}>{status.msg}</div>}

        <div className="ru-actions">
          <button className="ru-btn" type="submit">Send Review</button>
        </div>
      </form>
    </section>
  );
}
