// src/services/firestore.js
// Thin wrappers around Firestore queries used by HomePage sections.
import { db } from "../firebaseConfig";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

export async function fetchCategories(gender) {
  const col = gender === "men" ? "menCategories" : "womenCategories";
  const q = query(collection(db, col), orderBy("order"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchStores() {
  const storesCollectionRef = collection(db, "filterOptions", "stores", "list");
  const snap = await getDocs(storesCollectionRef);
  return snap.docs.map(doc => ({
    id: doc.id,
    name: doc.id,
    image: doc.data().imageUrl || `https://placehold.co/1200x600/404040/e0e0e0?text=${doc.id.replace(/\s/g, '+')}`
  }));
}