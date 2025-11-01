// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

// -----------------------------
// Your Firebase Project Config
// -----------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBmeU2_tCAmhMlsZ3laAvwM6R1J309Y0hk",
  authDomain: "pidr-c644e.firebaseapp.com",
  projectId: "pidr-c644e",
  // ✅ using your bucket
  storageBucket: "pidr-c644e.firebasestorage.app",
  messagingSenderId: "344167777219",
  appId: "1:344167777219:web:a12bdbe8dbc5efab1e7376",
  measurementId: "G-PGRBXP6XK5",
};

// -----------------------------
// Firebase Initialization
// -----------------------------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ explicitly bind Storage to your bucket (good even if config changes)
const storage = getStorage(app, "gs://pidr-c644e.firebasestorage.app");

// ✅ Functions in asia-south1 (matches your deploy)
const functions = getFunctions(app, "asia-south1");

// -----------------------------
// SAVE RENTAL ORDER FUNCTION
// -----------------------------
export const saveRentalOrder = async (orderData) => {
  try {
    const docRef = await addDoc(collection(db, "orders"), {
      ...orderData,
      orderStatus: "Awaiting Payment",
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving rental order:", error);
    throw new Error("Failed to save order to the database: " + error.message);
  }
};

// -----------------------------
// CLOUD FUNCTION CALLS (region-aware)
// -----------------------------
export const checkPincodeServiceability = httpsCallable(
  functions,
  "checkPincodeServiceability"
);

// ✅ callable used by BulkProductsWizard CSV import
export const commitProductRow = httpsCallable(functions, "commitProductRow");

// -----------------------------
// EXPORTS FOR PROJECT USE
// -----------------------------
export { app, db, storage, functions };
